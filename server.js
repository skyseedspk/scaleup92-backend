import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import sgMail from "@sendgrid/mail";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

const PORT = process.env.PORT || 10000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const FROM_EMAIL = process.env.FROM_EMAIL || "";

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

// -------------------------------
// In-memory demo storage
// -------------------------------
let drafts = [];
let history = [];
let settings = {
  isPremiumUser: false,
};

let contacts = [
  {
    id: "c1",
    name: "Demo User",
    email: "skyseedspk@gmail.com",
    createdAt: new Date().toISOString(),
  },
  {
    id: "c2",
    name: "Second User",
    email: "azclhr@gmail.com",
    createdAt: new Date().toISOString(),
  },
];

const premiumTemplates = [
  {
    id: "tpl_1",
    title: "Fresh Green Promo",
    subtitle: "Clean gardening promotion style",
    category: "Gardening",
    subject: "Summer Season Seeds Available Now",
    body:
      "Hello,\n\nWe are pleased to share that our summer season seeds are now available for home gardening and seasonal planting needs.\n\nOur seed range is selected to support healthy growth, better germination, and a productive gardening experience.\n\nIf you would like product details, pricing, or order support, please contact us today.\n\nBest regards,\nSkySeeds.pk\nwww.skyseeds.pk",
    isPremium: false,
    badge: "FREE",
    colors: ["#16A34A", "#86EFAC"],
    icon: "eco",
  },
  {
    id: "tpl_2",
    title: "Luxury Gold Offer",
    subtitle: "Premium elegant promotion",
    category: "Luxury",
    subject: "Premium Gardening Products for Better Results",
    body:
      "Hello,\n\nWe are delighted to present our premium gardening range designed for customers who value quality, performance, and dependable results.\n\nOur selected products help create a smoother and more professional gardening experience.\n\nFor pricing, product details, and order support, please contact us today.\n\nBest regards,\nSkySeeds.pk\nwww.skyseeds.pk",
    isPremium: true,
    badge: "PREMIUM",
    colors: ["#D97706", "#FDE68A"],
    icon: "premium",
  },
  {
    id: "tpl_3",
    title: "Color Burst Sale",
    subtitle: "Bright seasonal campaign",
    category: "Seasonal",
    subject: "Seasonal Gardening Essentials Available",
    body:
      "Hello,\n\nWe are excited to share our seasonal gardening essentials for customers looking for reliable products and better planting support.\n\nOur collection is designed to help make gardening easier, smoother, and more rewarding.\n\nFor product information and pricing, feel free to contact us.\n\nBest regards,\nSkySeeds.pk\nwww.skyseeds.pk",
    isPremium: false,
    badge: "FREE",
    colors: ["#7C3AED", "#C084FC"],
    icon: "celebration",
  },
  {
    id: "tpl_4",
    title: "Dark Elite Business",
    subtitle: "High-end professional tone",
    category: "Business",
    subject: "Professional Supply Available for Business Needs",
    body:
      "Hello,\n\nWe are pleased to offer professional supply options designed for business customers who need dependable products and smooth service.\n\nOur range supports better performance, practical use, and strong customer confidence.\n\nPlease contact us for pricing, supply details, and order support.\n\nBest regards,\nSkySeeds.pk\nwww.skyseeds.pk",
    isPremium: true,
    badge: "PREMIUM",
    colors: ["#111827", "#6D28D9"],
    icon: "business",
  },
  {
    id: "tpl_5",
    title: "Festive Sparkle",
    subtitle: "Colorful festive campaign style",
    category: "Festive",
    subject: "Special Festive Offer Available Now",
    body:
      "Hello,\n\nWe are pleased to share a festive offer for customers looking for quality products and better value.\n\nThis special collection is designed to bring more excitement, better presentation, and premium appeal to your campaign.\n\nPlease contact us for product details and pricing.\n\nBest regards,\nSkySeeds.pk\nwww.skyseeds.pk",
    isPremium: true,
    badge: "PREMIUM",
    colors: ["#EC4899", "#F9A8D4"],
    icon: "sparkle",
  },
];

function cleanText(text = "") {
  return String(text).replace(/\s+/g, " ").trim();
}

function extractJson(text = "") {
  try {
    return JSON.parse(text);
  } catch (_) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch (_) {
      return null;
    }
  }
}

function fallbackTemplates(prompt = "") {
  const topic = cleanText(prompt) || "your product";

  return [
    {
      name: "Template 1",
      subject: `${topic} Available Now`,
      body: `Hello,

We are pleased to share that ${topic} is now available.

Our products are selected to support better results, practical use, and reliable performance for customer needs.

If you would like product details, pricing, or order support, please contact us today.

Best regards,
SkySeeds.pk
www.skyseeds.pk`,
    },
    {
      name: "Template 2",
      subject: `Professional ${topic} for Better Results`,
      body: `Hello,

We are pleased to offer ${topic} for customers looking for reliable quality and better performance.

Our selected range supports practical use, smooth results, and customer satisfaction.

For product details, pricing, and support, please contact us today.

Best regards,
SkySeeds.pk
www.skyseeds.pk`,
    },
    {
      name: "Template 3",
      subject: `Order ${topic} Today`,
      body: `Hello,

${topic} is now available for customers who want dependable quality and better value.

We are ready to help you with product information, pricing, and order support.

Best regards,
SkySeeds.pk
www.skyseeds.pk`,
    },
  ];
}

function buildHtmlEmail({ subject, body, theme = "classic" }) {
  const safeBody = String(body)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  const themes = {
    classic: {
      bg: "#f5f0fa",
      card: "#ffffff",
      head: "#6D28D9",
      text: "#1F2937",
    },
    green: {
      bg: "#edfdf3",
      card: "#ffffff",
      head: "#15803D",
      text: "#1F2937",
    },
    gold: {
      bg: "#fff8eb",
      card: "#ffffff",
      head: "#D97706",
      text: "#1F2937",
    },
    dark: {
      bg: "#111827",
      card: "#1f2937",
      head: "#7C3AED",
      text: "#F9FAFB",
    },
  };

  const selected = themes[theme] || themes.classic;

  return `
  <!DOCTYPE html>
  <html>
    <body style="margin:0;padding:0;background:${selected.bg};font-family:Arial,sans-serif;">
      <div style="max-width:700px;margin:0 auto;padding:30px 16px;">
        <div style="background:${selected.card};border-radius:20px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.08);">
          <div style="background:${selected.head};padding:24px 28px;">
            <h1 style="margin:0;font-size:26px;color:#ffffff;">${subject}</h1>
          </div>
          <div style="padding:28px;color:${selected.text};font-size:16px;line-height:1.8;">
            ${safeBody}
          </div>
        </div>
      </div>
    </body>
  </html>`;
}

// -------------------------------
// HEALTH
// -------------------------------
app.get("/", (req, res) => {
  res.send("ScaleUp92 backend running");
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is healthy",
    openaiConfigured: !!OPENAI_API_KEY,
    sendgridConfigured: !!SENDGRID_API_KEY,
    fromEmailConfigured: !!FROM_EMAIL,
  });
});

// -------------------------------
// SETTINGS
// -------------------------------
app.get("/settings", (req, res) => {
  res.json({
    success: true,
    settings,
  });
});

app.post("/settings/premium", (req, res) => {
  const { isPremiumUser } = req.body || {};
  settings.isPremiumUser = !!isPremiumUser;

  return res.json({
    success: true,
    message: "Premium status updated",
    settings,
  });
});

// -------------------------------
// TEMPLATES
// -------------------------------
app.get("/templates", (req, res) => {
  const category = cleanText(req.query.category || "All");

  let result = premiumTemplates;
  if (category && category !== "All") {
    result = premiumTemplates.filter((item) => item.category === category);
  }

  res.json({
    success: true,
    templates: result,
  });
});

// -------------------------------
// CONTACTS
// -------------------------------
app.get("/contacts", (req, res) => {
  res.json({
    success: true,
    contacts,
  });
});

app.post("/contacts", (req, res) => {
  const { name, email } = req.body || {};

  if (!name || !email || !String(email).includes("@")) {
    return res.status(400).json({
      success: false,
      message: "Invalid name or email",
    });
  }

  const newContact = {
    id: `c_${Date.now()}`,
    name: String(name),
    email: String(email),
    createdAt: new Date().toISOString(),
  };

  contacts.unshift(newContact);

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

  contacts[index] = {
    ...contacts[index],
    name: name || contacts[index].name,
    email: email || contacts[index].email,
  };

  return res.json({
    success: true,
    message: "Contact updated",
    contact: contacts[index],
  });
});

app.delete("/contacts/:id", (req, res) => {
  const id = req.params.id;
  contacts = contacts.filter((c) => c.id !== id);

  return res.json({
    success: true,
    message: "Contact deleted",
  });
});

// -------------------------------
// AI GENERATE
// -------------------------------
app.post("/generate", async (req, res) => {
  try {
    const prompt = cleanText(req.body?.prompt || "");

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: "Prompt is required",
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
      messages: [
        {
          role: "system",
          content: `
You are NOT a chatbot.
You are a STRICT EMAIL MARKETING GENERATOR.

Return ONLY valid JSON in this exact format:
{
  "topic": "main topic",
  "purpose": "promotional email",
  "templates": [
    {
      "name": "Template 1",
      "subject": "Email subject",
      "body": "Ready-to-send email body"
    },
    {
      "name": "Template 2",
      "subject": "Email subject",
      "body": "Ready-to-send email body"
    },
    {
      "name": "Template 3",
      "subject": "Email subject",
      "body": "Ready-to-send email body"
    }
  ]
}

Rules:
- No chat
- No explanation
- No irrelevant content
- Simple professional English
- Direct promotional emails only
- End each body with:
Best regards,
SkySeeds.pk
www.skyseeds.pk
`,
        },
        {
          role: "user",
          content: `Create 3 promotional email templates for: "${prompt}"`,
        },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content || "";
    const parsed = extractJson(raw);

    if (
      !parsed ||
      !Array.isArray(parsed.templates) ||
      parsed.templates.length === 0
    ) {
      const templates = fallbackTemplates(prompt);
      return res.json({
        success: true,
        topic: prompt,
        purpose: "promotional email",
        templates,
      });
    }

    return res.json({
      success: true,
      topic: cleanText(parsed.topic || prompt),
      purpose: cleanText(parsed.purpose || "promotional email"),
      templates: parsed.templates.map((item, index) => ({
        name: cleanText(item.name || `Template ${index + 1}`),
        subject: cleanText(item.subject || ""),
        body: String(item.body || "").trim(),
      })),
    });
  } catch (error) {
    console.error("Generate error:", error);
    return res.json({
      success: true,
      topic: cleanText(req.body?.prompt || ""),
      purpose: "promotional email",
      templates: fallbackTemplates(req.body?.prompt || ""),
    });
  }
});

// -------------------------------
// DRAFTS
// -------------------------------
app.get("/drafts", (req, res) => {
  res.json({
    success: true,
    drafts,
  });
});

app.post("/drafts", (req, res) => {
  const { sender, subject, body } = req.body || {};

  const item = {
    id: `draft_${Date.now()}`,
    sender: String(sender || ""),
    subject: String(subject || ""),
    body: String(body || ""),
    createdAt: new Date().toISOString(),
  };

  drafts.unshift(item);

  return res.json({
    success: true,
    message: "Draft saved successfully",
    draft: item,
  });
});

app.delete("/drafts/:id", (req, res) => {
  const id = req.params.id;
  drafts = drafts.filter((item) => item.id !== id);

  return res.json({
    success: true,
    message: "Draft deleted successfully",
  });
});

// -------------------------------
// HISTORY
// -------------------------------
app.get("/history", (req, res) => {
  res.json({
    success: true,
    history,
  });
});

// -------------------------------
// PREVIEW HTML
// -------------------------------
app.post("/preview-html", (req, res) => {
  const subject = cleanText(req.body?.subject || "");
  const body = String(req.body?.body || "").trim();
  const theme = cleanText(req.body?.theme || "classic");

  if (!subject || !body) {
    return res.status(400).json({
      success: false,
      error: "Subject and body are required",
    });
  }

  const html = buildHtmlEmail({ subject, body, theme });

  return res.json({
    success: true,
    html,
  });
});

// -------------------------------
// SEND EMAIL
// -------------------------------
app.post("/send-email", async (req, res) => {
  try {
    const { name, emails, subject, message, theme, attachments } = req.body;

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

    const validEmails = emails
      .map((e) => String(e).trim())
      .filter((e) => e.includes("@"));

    if (validEmails.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid emails found",
      });
    }

    if (!SENDGRID_API_KEY || !FROM_EMAIL) {
      return res.status(500).json({
        success: false,
        message: "SendGrid environment variables missing",
      });
    }

    const html = buildHtmlEmail({
      subject: cleanText(subject),
      body: String(message || "").trim(),
      theme: cleanText(theme || "classic"),
    });

    const safeAttachments = Array.isArray(attachments)
      ? attachments
          .filter((item) => item && item.filename && item.content)
          .map((item) => ({
            content: item.content,
            filename: item.filename,
            type: item.type || "application/octet-stream",
            disposition: "attachment",
          }))
      : [];

    const msg = {
      to: validEmails,
      from: {
        email: FROM_EMAIL,
        name: name,
      },
      subject: cleanText(subject),
      text: String(message || "").trim(),
      html,
      attachments: safeAttachments,
    };

    await sgMail.sendMultiple(msg);

    const historyItem = {
      id: `history_${Date.now()}`,
      subject: cleanText(subject),
      body: String(message || "").trim(),
      count: String(validEmails.length),
      date: new Date().toISOString(),
    };

    history.unshift(historyItem);

    return res.json({
      success: true,
      message: `Bulk email sent to ${validEmails.length} contacts`,
      sentCount: validEmails.length,
    });
  } catch (error) {
    console.error("SEND EMAIL ERROR:", error?.response?.body || error.message);

    return res.status(500).json({
      success: false,
      message: "Email sending failed",
      error: error?.response?.body || error.message,
    });
  }
});

// -------------------------------
// REPORTS
// -------------------------------
app.get("/reports", (req, res) => {
  res.json({
    success: true,
    reports: {
      sentCount: history.reduce(
        (sum, item) => sum + Number(item.count || 0),
        0
      ),
      draftCount: drafts.length,
      historyCount: history.length,
      premiumEnabled: settings.isPremiumUser,
    },
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});