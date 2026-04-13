import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

// ================= ROOT =================
app.get("/", (req, res) => {
  res.send("ScaleUp92 backend running");
});

// ================= HEALTH =================
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server working",
  });
});

// ================= AI GENERATE =================
app.post("/generate-ai", (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.json({
      success: false,
      message: "Prompt required",
    });
  }

  // 🔥 Simple AI (demo)
  const email = `
Subject: Special Offer 🚀

Hello,

We are excited to share that ${prompt}.

Don't miss this opportunity!

Best Regards,
ScaleUp92
`;

  res.json({
    success: true,
    email: email,
  });
});

// ================= SEND EMAIL =================
app.post("/send-email", async (req, res) => {
  try {
    const { to, subject, text } = req.body;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"ScaleUp92" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
    });

    res.json({
      success: true,
      message: "Email sent successfully",
    });

  } catch (error) {
    res.json({
      success: false,
      error: error.message,
    });
  }
});

// ================= SETTINGS =================
app.get("/settings", (req, res) => {
  res.json({
    success: true,
    settings: {
      isPremiumUser: false,
      dailyFreeSendLimit: 5,
    },
  });
});

// ================= REPORTS =================
app.get("/reports", (req, res) => {
  res.json({
    success: true,
    reports: {
      sentCount: 0,
      failedCount: 0,
    },
  });
});

// ================= START =================
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
