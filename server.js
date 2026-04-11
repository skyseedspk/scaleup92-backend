import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 10000;

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_SECURE = String(process.env.SMTP_SECURE || "true") === "true";
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER || "";
const FROM_NAME = process.env.FROM_NAME || "ScaleUp92";

const APP_BASE_URL =
  process.env.APP_BASE_URL || `http://localhost:${PORT}`;

const JAZZCASH_MERCHANT_ID = process.env.JAZZCASH_MERCHANT_ID || "";
const JAZZCASH_PASSWORD = process.env.JAZZCASH_PASSWORD || "";
const JAZZCASH_INTEGERITY_SALT =
  process.env.JAZZCASH_INTEGERITY_SALT || "";
const JAZZCASH_RETURN_URL =
  process.env.JAZZCASH_RETURN_URL ||
  `${APP_BASE_URL}/payments/callback/jazzcash`;

const EASYPAISA_STORE_ID = process.env.EASYPAISA_STORE_ID || "";
const EASYPAISA_HASH_KEY = process.env.EASYPAISA_HASH_KEY || "";
const EASYPAISA_RETURN_URL =
  process.env.EASYPAISA_RETURN_URL ||
  `${APP_BASE_URL}/payments/callback/easypaisa`;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, "data");
const contactsFile = path.join(dataDir, "contacts.json");
const draftsFile = path.join(dataDir, "drafts.json");
const historyFile = path.join(dataDir, "history.json");
const settingsFile = path.join(dataDir, "settings.json");
const paymentOrdersFile = path.join(dataDir, "payment_orders.json");

function ensureDataFiles() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(contactsFile)) {
    fs.writeFileSync(
      contactsFile,
      JSON.stringify(
        [
          {
            id: "c1",
            name: "Demo User",
            email: "demo@example.com",
            createdAt: new Date().toISOString(),
          },
          {
            id: "c2",
            name: "Second User",
            email: "second@example.com",
            createdAt: new Date().toISOString(),
          },
        ],
        null,
        2
      )
    );
  }

  if (!fs.existsSync(draftsFile)) {
    fs.writeFileSync(draftsFile, JSON.stringify([], null, 2));
  }

  if (!fs.existsSync(historyFile)) {
    fs.writeFileSync(historyFile, JSON.stringify([], null, 2));
  }

  if (!fs.existsSync(settingsFile)) {
    fs.writeFileSync(
      settingsFile,
      JSON.stringify(
        {
          isPremiumUser: false,
          premiumPlan: "free",
          premiumActivatedAt: null,
          premiumExpiresAt: null,
          premiumProvider: null,
          premiumOrderId: null,
          dailyFreeSendLimit: 5,
        },
        null,
        2
      )
    );
  }

  if (!fs.existsSync(paymentOrdersFile)) {
    fs.writeFileSync(paymentOrdersFile, JSON.stringify([], null, 2));
  }
}

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, "utf8");
    if (!raw.trim()) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Read error for ${filePath}:`, error.message);
    return fallback;
  }
}

function writeJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (error) {
    console.error(`Write error for ${filePath}:`, error.message);
    return false;
  }
}

ensureDataFiles();

let contacts = readJson(contactsFile, []);
let drafts = readJson(draftsFile, []);
let history = readJson(historyFile, []);
let settings = readJson(settingsFile, {
  isPremiumUser: false,
  premiumPlan: "free",
  premiumActivatedAt: null,
  premiumExpiresAt: null,
  premiumProvider: null,
  premiumOrderId: null,
  dailyFreeSendLimit: 5,
});
let paymentOrders = readJson(paymentOrdersFile, []);

function saveContacts() {
  return writeJson(contactsFile, contacts);
}

function saveDrafts() {
  return writeJson(draftsFile, drafts);
}

function saveHistory() {
  return writeJson(historyFile, history);
}

function saveSettings() {
  return writeJson(settingsFile, settings);
}

function savePaymentOrders() {
  return writeJson(paymentOrdersFile, paymentOrders);
}

function refreshData() {
  contacts = readJson(contactsFile, contacts);
  drafts = readJson(draftsFile, drafts);
  history = readJson(historyFile, history);
  settings = readJson(settingsFile, settings);
  paymentOrders = readJson(paymentOrdersFile, paymentOrders);
}

function cleanText(text = "") {
  return String(text).replace(/\s+/g, " ").trim();
}

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

function isValidEmail(email = "") {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(String(email).trim().toLowerCase());
}

function mapThemeNameToKey(themeName = "") {
  const value = String(themeName).trim().toLowerCase();
  if (value.includes("fresh green") || value === "green") return "green";
  if (value.includes("luxury gold") || value === "gold") return "gold";
  if (value.includes("dark elite") || value === "dark") return "dark";
  return "classic";
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function generateId(prefix = "id") {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

function createTransporter() {
  if (!SMTP_USER || !SMTP_PASS || !FROM_EMAIL) {
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

function getPlanCatalog() {
  return [
    {
      id: "monthly_basic",
      name: "ScaleUp92 Monthly Basic",
      amount: 499,
      currency: "PKR",
      durationDays: 30,
      description: "Premium access for 30 days",
    },
    {
      id: "monthly_pro",
      name: "ScaleUp92 Monthly Pro",
      amount: 999,
      currency: "PKR",
      durationDays: 30,
      description: "Advanced premium access for 30 days",
    },
    {
      id: "yearly_pro",
      name: "ScaleUp92 Yearly Pro",
      amount: 9999,
      currency: "PKR",
      durationDays: 365,
      description: "Premium access for 365 days",
    },
  ];
}

function getPlanById(planId = "") {
  return getPlanCatalog().find((plan) => plan.id === planId) || null;
}

function calculateExpiry(durationDays = 30) {
  const now = new Date();
  now.setDate(now.getDate() + Number(durationDays || 30));
  return now.toISOString();
}

function markOrderPaid(order, providerPayload = {}) {
  order.status = "paid";
  order.paymentStatus = "verified";
  order.verifiedAt = new Date().toISOString();
  order.providerPayload = providerPayload;

  settings.isPremiumUser = true;
  settings.premiumPlan = order.planId;
  settings.premiumActivatedAt = order.verifiedAt;
  settings.premiumExpiresAt = calculateExpiry(order.durationDays);
  settings.premiumProvider = order.provider;
  settings.premiumOrderId = order.orderId;

  savePaymentOrders();
  saveSettings();

  return {
    success: true,
    message: "Premium activated successfully",
    order,
    settings,
  };
}

function buildHtmlEmail({
  subject,
  body,
  senderName = "ScaleUp92",
  themeName = "Classic Purple",
}) {
  const safeSubject = escapeHtml(subject);
  const safeSender = escapeHtml(senderName || "ScaleUp92");
  const safeBody = escapeHtml(body).replace(/\n/g, "<br>");
  const theme = mapThemeNameToKey(themeName);

  const themes = {
    classic: {
      bg: "#f5f0fa",
      card: "#ffffff",
      head1: "#6D28D9",
      head2: "#8B5CF6",
      text: "#1F2937",
      soft: "#F7F1FF",
      badge: "#7C3AED",
      border: "#E5D9FF",
    },
    green: {
      bg: "#edfdf3",
      card: "#ffffff",
      head1: "#15803D",
      head2: "#22C55E",
      text: "#1F2937",
      soft: "#EEFFF5",
      badge: "#166534",
      border: "#D8F3E2",
    },
    gold: {
      bg: "#fff8eb",
      card: "#ffffff",
      head1: "#D97706",
      head2: "#F6C453",
      text: "#1F2937",
      soft: "#FFF8E8",
      badge: "#9A6700",
      border: "#F5E3AF",
    },
    dark: {
      bg: "#0F172A",
      card: "#111827",
      head1: "#5B21B6",
      head2: "#9333EA",
      text: "#F9FAFB",
      soft: "#1F2937",
      badge: "#D8B4FE",
      border: "#2D3748",
    },
  };

  const selected = themes[theme] || themes.classic;
  const footerTextColor = theme === "dark" ? "#E5E7EB" : "#4B5563";

  return `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:${selected.bg};font-family:Arial,sans-serif;">
    <div style="max-width:720px;margin:0 auto;padding:30px 16px;">
      <div style="background:${selected.card};border-radius:26px;overflow:hidden;box-shadow:0 12px 32px rgba(0,0,0,0.10);">
        <div style="background:linear-gradient(135deg, ${selected.head1}, ${selected.head2});padding:28px;">
          <div style="display:inline-block;background:rgba(255,255,255,0.16);color:#ffffff;padding:8px 14px;border-radius:999px;font-size:12px;font-weight:700;">
            ${escapeHtml(themeName)}
          </div>
          <h1 style="margin:18px 0 10px 0;font-size:28px;line-height:1.3;color:#ffffff;">${safeSubject}</h1>
          <p style="margin:0;color:rgba(255,255,255,0.92);font-size:14px;line-height:1.7;">
            Premium email preview generated by ScaleUp92
          </p>
        </div>

        <div style="padding:24px 28px 0 28px;">
          <div style="background:${selected.soft};border-radius:18px;padding:16px;border:1px solid ${selected.border};">
            <div style="font-size:12px;font-weight:700;color:${selected.badge};margin-bottom:6px;">SENDER NAME</div>
            <div style="font-size:16px;font-weight:700;color:${selected.text};">${safeSender}</div>
          </div>
        </div>

        <div style="padding:24px 28px 8px 28px;color:${selected.text};font-size:16px;line-height:1.85;">
          ${safeBody}
        </div>

        <div style="padding:0 28px 28px 28px;">
          <div style="background:${selected.soft};border-radius:18px;padding:16px;border:1px solid ${selected.border};">
            <div style="font-size:16px;font-weight:800;color:${selected.badge};margin-bottom:8px;">Powered by ScaleUp92</div>
            <div style="font-size:14px;line-height:1.7;color:${footerTextColor};">
              AI email generation • premium templates • manual editing • bulk campaign sending
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

app.get("/", (req, res) => {
  res.send("ScaleUp92 backend running");
});

app.get("/health", (req, res) => {
  refreshData();

  res.json({
    success: true,
    message: "ScaleUp92 server is healthy",
    smtpConfigured: !!SMTP_USER && !!SMTP_PASS && !!FROM_EMAIL,
    paymentProviders: {
      jazzcashConfigured:
        !!JAZZCASH_MERCHANT_ID &&
        !!JAZZCASH_PASSWORD &&
        !!JAZZCASH_INTEGERITY_SALT,
      easypaisaConfigured: !!EASYPAISA_STORE_ID && !!EASYPAISA_HASH_KEY,
    },
    storedContacts: contacts.length,
    storedDrafts: drafts.length,
    storedHistory: history.length,
    storedPaymentOrders: paymentOrders.length,
    premiumEnabled: !!settings.isPremiumUser,
    premiumPlan: settings.premiumPlan || "free",
  });
});

app.get("/settings", (req, res) => {
  refreshData();
  res.json({
    success: true,
    settings,
  });
});

app.post("/settings/premium", (req, res) => {
  const { isPremiumUser, premiumPlan } = req.body || {};

  settings.isPremiumUser = !!isPremiumUser;
  settings.premiumPlan = cleanText(premiumPlan || settings.premiumPlan || "free");

  if (!settings.isPremiumUser) {
    settings.premiumPlan = "free";
    settings.premiumActivatedAt = null;
    settings.premiumExpiresAt = null;
    settings.premiumProvider = null;
    settings.premiumOrderId = null;
  }

  saveSettings();

  return res.json({
    success: true,
    message: "ScaleUp92 premium status updated",
    settings,
  });
});

/* -----------------------------
   PAYMENT-READY ENDPOINTS
----------------------------- */

app.get("/payments/providers", (req, res) => {
  res.json({
    success: true,
    providers: [
      {
        id: "jazzcash",
        name: "JazzCash",
        configured:
          !!JAZZCASH_MERCHANT_ID &&
          !!JAZZCASH_PASSWORD &&
          !!JAZZCASH_INTEGERITY_SALT,
        mode: "placeholder-ready",
      },
      {
        id: "easypaisa",
        name: "Easypaisa",
        configured: !!EASYPAISA_STORE_ID && !!EASYPAISA_HASH_KEY,
        mode: "placeholder-ready",
      },
    ],
    plans: getPlanCatalog(),
  });
});

app.post("/payments/create-order", (req, res) => {
  refreshData();

  const provider = cleanText(req.body?.provider || "").toLowerCase();
  const planId = cleanText(req.body?.planId || "");
  const customerName = cleanText(req.body?.customerName || "ScaleUp92 User");
  const customerEmail = cleanText(req.body?.customerEmail || "");
  const customerPhone = cleanText(req.body?.customerPhone || "");
  const returnUrl =
    cleanText(req.body?.returnUrl || "") ||
    `${APP_BASE_URL}/payments/return`;

  if (!provider || !["jazzcash", "easypaisa"].includes(provider)) {
    return res.status(400).json({
      success: false,
      message: "Valid payment provider is required",
    });
  }

  const plan = getPlanById(planId);
  if (!plan) {
    return res.status(400).json({
      success: false,
      message: "Valid planId is required",
    });
  }

  const orderId = generateId("order");
  const transactionRef = generateId("txn");

  const order = {
    orderId,
    transactionRef,
    provider,
    planId: plan.id,
    planName: plan.name,
    amount: plan.amount,
    currency: plan.currency,
    durationDays: plan.durationDays,
    description: plan.description,
    customerName,
    customerEmail,
    customerPhone,
    status: "pending",
    paymentStatus: "created",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    returnUrl,
    callbackUrl:
      provider === "jazzcash" ? JAZZCASH_RETURN_URL : EASYPAISA_RETURN_URL,
    providerPayload: {},
  };

  if (provider === "jazzcash") {
    order.providerPayload = {
      merchantId: JAZZCASH_MERCHANT_ID || "JAZZCASH_MERCHANT_ID_HERE",
      password: JAZZCASH_PASSWORD ? "********" : "JAZZCASH_PASSWORD_HERE",
      integeritySalt: JAZZCASH_INTEGERITY_SALT
        ? "********"
        : "JAZZCASH_INTEGERITY_SALT_HERE",
      note: "JazzCash live signing abhi placeholder mode mein hai. Merchant credentials ke baad final signature logic add hoga.",
    };
  }

  if (provider === "easypaisa") {
    order.providerPayload = {
      storeId: EASYPAISA_STORE_ID || "EASYPAISA_STORE_ID_HERE",
      hashKey: EASYPAISA_HASH_KEY ? "********" : "EASYPAISA_HASH_KEY_HERE",
      note: "Easypaisa live hash / request signing abhi placeholder mode mein hai. Merchant credentials ke baad final hash logic add hoga.",
    };
  }

  paymentOrders.unshift(order);
  savePaymentOrders();

  return res.json({
    success: true,
    message: "Payment order created successfully",
    order,
    nextStep: {
      action: "redirect-to-provider-or-complete-provider-signing",
      callbackUrl: order.callbackUrl,
      returnUrl: order.returnUrl,
    },
  });
});

app.get("/payments/pending", (req, res) => {
  refreshData();

  const pending = paymentOrders.filter(
    (item) =>
      item.status === "pending" ||
      item.paymentStatus === "created" ||
      item.paymentStatus === "pending"
  );

  res.json({
    success: true,
    count: pending.length,
    orders: pending,
  });
});

app.get("/payments/orders", (req, res) => {
  refreshData();

  res.json({
    success: true,
    count: paymentOrders.length,
    orders: paymentOrders,
  });
});

app.get("/payments/order/:orderId", (req, res) => {
  refreshData();

  const order = paymentOrders.find(
    (item) => item.orderId === req.params.orderId
  );

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Payment order not found",
    });
  }

  return res.json({
    success: true,
    order,
  });
});

app.post("/payments/callback/:provider", (req, res) => {
  refreshData();

  const provider = cleanText(req.params.provider || "").toLowerCase();
  const body = req.body || {};
  const query = req.query || {};

  const orderId =
    cleanText(body.orderId || body.pp_BillReference || body.merchantOrderId || query.orderId || query.pp_BillReference || query.merchantOrderId);

  if (!provider || !["jazzcash", "easypaisa"].includes(provider)) {
    return res.status(400).json({
      success: false,
      message: "Unsupported payment provider",
    });
  }

  if (!orderId) {
    return res.status(400).json({
      success: false,
      message: "Order ID not found in callback payload",
      received: { body, query },
    });
  }

  const order = paymentOrders.find((item) => item.orderId === orderId);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Matching payment order not found",
      receivedOrderId: orderId,
    });
  }

  order.updatedAt = new Date().toISOString();
  order.callbackReceivedAt = new Date().toISOString();
  order.provider = provider;
  order.rawCallback = { body, query };

  /*
    IMPORTANT:
    Abhi yahan placeholder verification hai.
    Live JazzCash / Easypaisa credentials milne ke baad
    isi jagah real signature / hash / response code verification add hogi.
  */

  const paidLike =
    cleanText(body.status || query.status || body.pp_ResponseCode || query.pp_ResponseCode || body.paymentStatus || query.paymentStatus).toLowerCase();

  const isSuccessfulPlaceholder =
    paidLike === "success" ||
    paidLike === "paid" ||
    paidLike === "verified" ||
    paidLike === "000" ||
    paidLike === "0000";

  if (isSuccessfulPlaceholder) {
    const result = markOrderPaid(order, { body, query });
    return res.json(result);
  }

  order.status = "pending";
  order.paymentStatus = "callback-received-awaiting-verification";
  savePaymentOrders();

  return res.json({
    success: true,
    message:
      "Callback received. Live verification logic will confirm payment after provider credentials are configured.",
    order,
  });
});

app.get("/payments/return", (req, res) => {
  const orderId = cleanText(req.query.orderId || "");
  const status = cleanText(req.query.status || "pending");

  res.json({
    success: true,
    message: "ScaleUp92 payment return endpoint reached",
    orderId,
    status,
  });
});

/*
  MANUAL VERIFY ENDPOINT
  Testing ke liye useful hai.
  Live credentials ke baad is endpoint ko admin-only banana chahiye.
*/
app.post("/payments/verify-manual", (req, res) => {
  refreshData();

  const orderId = cleanText(req.body?.orderId || "");
  const markPaid = !!req.body?.markPaid;
  const providerPayload = req.body?.providerPayload || {};

  if (!orderId) {
    return res.status(400).json({
      success: false,
      message: "orderId is required",
    });
  }

  const order = paymentOrders.find((item) => item.orderId === orderId);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Payment order not found",
    });
  }

  if (!markPaid) {
    order.status = "pending";
    order.paymentStatus = "manual-review";
    order.updatedAt = new Date().toISOString();
    savePaymentOrders();

    return res.json({
      success: true,
      message: "Order marked for manual review",
      order,
    });
  }

  const result = markOrderPaid(order, providerPayload);
  return res.json(result);
});

/* -----------------------------
   CONTACTS
----------------------------- */

app.get("/contacts", (req, res) => {
  refreshData();
  res.json({
    success: true,
    contacts,
  });
});

app.post("/contacts", (req, res) => {
  const { name, email } = req.body || {};

  if (!name || !email) {
    return res.status(400).json({
      success: false,
      message: "Name and email required",
    });
  }

  const cleanName = String(name).trim();
  const cleanEmail = normalizeEmail(email);

  if (!cleanName) {
    return res.status(400).json({
      success: false,
      message: "Invalid name",
    });
  }

  if (!isValidEmail(cleanEmail)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email format",
    });
  }

  const exists = contacts.find((c) => normalizeEmail(c.email) === cleanEmail);

  if (exists) {
    return res.status(400).json({
      success: false,
      message: "Email already exists",
    });
  }

  const newContact = {
    id: generateId("contact"),
    name: cleanName,
    email: cleanEmail,
    createdAt: new Date().toISOString(),
  };

  contacts.unshift(newContact);
  saveContacts();

  return res.json({
    success: true,
    message: "Contact added successfully",
    contact: newContact,
  });
});

app.put("/contacts/:id", (req, res) => {
  const id = req.params.id;
  const { name, email } = req.body || {};

  const index = contacts.findIndex((c) => c.id === id);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: "Contact not found",
    });
  }

  const updatedName = name ? String(name).trim() : contacts[index].name;
  const updatedEmail = email ? normalizeEmail(email) : contacts[index].email;

  if (!updatedName) {
    return res.status(400).json({
      success: false,
      message: "Invalid name",
    });
  }

  if (!isValidEmail(updatedEmail)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email format",
    });
  }

  const duplicate = contacts.find(
    (c) => c.id !== id && normalizeEmail(c.email) === updatedEmail
  );

  if (duplicate) {
    return res.status(400).json({
      success: false,
      message: "Email already exists",
    });
  }

  contacts[index] = {
    ...contacts[index],
    name: updatedName,
    email: updatedEmail,
    updatedAt: new Date().toISOString(),
  };

  saveContacts();

  return res.json({
    success: true,
    message: "Contact updated successfully",
    contact: contacts[index],
  });
});

app.delete("/contacts/:id", (req, res) => {
  const id = req.params.id;
  contacts = contacts.filter((c) => c.id !== id);
  saveContacts();

  return res.json({
    success: true,
    message: "Contact deleted successfully",
  });
});

/* -----------------------------
   DRAFTS
----------------------------- */

app.get("/drafts", (req, res) => {
  refreshData();
  res.json({
    success: true,
    drafts,
  });
});

app.post("/drafts", (req, res) => {
  const { sender, subject, body, themeName } = req.body || {};

  const item = {
    id: generateId("draft"),
    sender: String(sender || "ScaleUp92"),
    subject: String(subject || ""),
    body: String(body || ""),
    themeName: String(themeName || "Classic Purple"),
    createdAt: new Date().toISOString(),
  };

  drafts.unshift(item);
  saveDrafts();

  return res.json({
    success: true,
    message: "Draft saved successfully",
    draft: item,
  });
});

app.delete("/drafts/:id", (req, res) => {
  const id = req.params.id;
  drafts = drafts.filter((item) => item.id !== id);
  saveDrafts();

  return res.json({
    success: true,
    message: "Draft deleted successfully",
  });
});

/* -----------------------------
   HISTORY / PREVIEW / SEND
----------------------------- */

app.get("/history", (req, res) => {
  refreshData();
  res.json({
    success: true,
    history,
  });
});

app.post("/preview-html", (req, res) => {
  const subject = cleanText(req.body?.subject || "");
  const body = String(req.body?.body || "").trim();
  const senderName = cleanText(req.body?.senderName || "ScaleUp92");
  const themeName = cleanText(req.body?.themeName || "Classic Purple");

  if (!subject || !body) {
    return res.status(400).json({
      success: false,
      message: "Subject and body are required",
    });
  }

  const html = buildHtmlEmail({
    subject,
    body,
    senderName,
    themeName,
  });

  return res.json({
    success: true,
    html,
  });
});

app.post("/send-email", async (req, res) => {
  try {
    const { name, emails, subject, message, themeName, attachments } =
      req.body || {};

    if (!name || !emails || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Emails list is invalid",
      });
    }

    const transporter = createTransporter();

    if (!transporter) {
      return res.status(500).json({
        success: false,
        message:
          "SMTP is not configured. Please add SMTP_USER, SMTP_PASS and FROM_EMAIL in environment variables.",
      });
    }

    const uniqueValidEmails = [
      ...new Set(
        emails
          .map((e) => normalizeEmail(e))
          .filter((e) => isValidEmail(e))
      ),
    ];

    if (uniqueValidEmails.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid emails found",
      });
    }

    const finalSenderName = String(name || "ScaleUp92").trim();
    const finalThemeName = cleanText(themeName || "Classic Purple");
    const cleanedSubject = cleanText(subject);
    const cleanedMessage = String(message || "").trim();

    const html = buildHtmlEmail({
      subject: cleanedSubject,
      body: cleanedMessage,
      senderName: finalSenderName,
      themeName: finalThemeName,
    });

    const safeAttachments = Array.isArray(attachments)
      ? attachments
          .filter((item) => item && item.filename && item.content)
          .map((item) => ({
            filename: item.filename,
            content: item.content,
            encoding: "base64",
            contentType: item.type || "application/octet-stream",
          }))
      : [];

    const results = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const email of uniqueValidEmails) {
      try {
        await transporter.sendMail({
          from: `"${finalSenderName}" <${FROM_EMAIL}>`,
          to: email,
          subject: cleanedSubject,
          text: cleanedMessage,
          html,
          attachments: safeAttachments,
        });

        sentCount += 1;
        results.push({
          email,
          status: "sent",
        });
      } catch (error) {
        failedCount += 1;
        results.push({
          email,
          status: "failed",
          error: error.message,
        });
      }
    }

    const historyItem = {
      id: generateId("history"),
      subject: cleanedSubject,
      body: cleanedMessage,
      senderName: finalSenderName,
      themeName: finalThemeName,
      totalCount: uniqueValidEmails.length,
      sentCount,
      failedCount,
      results,
      createdAt: new Date().toISOString(),
    };

    history.unshift(historyItem);
    saveHistory();

    return res.json({
      success: failedCount === 0,
      message:
        failedCount === 0
          ? `Bulk email sent successfully to ${sentCount} contacts`
          : `Bulk email completed. Sent: ${sentCount}, Failed: ${failedCount}`,
      sentCount,
      failedCount,
      totalCount: uniqueValidEmails.length,
      results,
      historyId: historyItem.id,
    });
  } catch (error) {
    console.error("SEND EMAIL ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message: "Email sending failed",
      error: error.message,
    });
  }
});

/* -----------------------------
   REPORTS
----------------------------- */

app.get("/reports", (req, res) => {
  refreshData();

  const totalSent = history.reduce(
    (sum, item) => sum + Number(item.sentCount || 0),
    0
  );
  const totalFailed = history.reduce(
    (sum, item) => sum + Number(item.failedCount || 0),
    0
  );
  const totalCampaigns = history.length;
  const paidOrders = paymentOrders.filter((item) => item.status === "paid");
  const pendingOrders = paymentOrders.filter((item) => item.status === "pending");

  res.json({
    success: true,
    reports: {
      sentCount: totalSent,
      failedCount: totalFailed,
      totalCampaigns,
      draftCount: drafts.length,
      contactCount: contacts.length,
      premiumEnabled: !!settings.isPremiumUser,
      premiumPlan: settings.premiumPlan || "free",
      premiumExpiresAt: settings.premiumExpiresAt || null,
      paymentSummary: {
        totalOrders: paymentOrders.length,
        paidOrders: paidOrders.length,
        pendingOrders: pendingOrders.length,
      },
      recentPayments: paymentOrders.slice(0, 5),
      recentHistory: history.slice(0, 5),
    },
  });
});

app.listen(PORT, () => {
  console.log(`ScaleUp92 server running on port ${PORT}`);
});
