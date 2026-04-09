const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const sgMail = require("@sendgrid/mail");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const FROM_EMAIL = process.env.FROM_EMAIL || "";

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

app.get("/", (req, res) => {
  res.send("Backend running");
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is healthy",
    sendgridConfigured: !!SENDGRID_API_KEY,
    fromEmailConfigured: !!FROM_EMAIL,
  });
});

app.post("/generate", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({
        success: false,
        message: "Prompt is required",
      });
    }

    const cleanPrompt = String(prompt).trim();

    const result = `Subject: Special Offer on Termite Control Chemicals

Dear Customer,

We are excited to share an important promotional update with you.

${cleanPrompt}

We offer quality termite control chemicals designed to help protect your home, office, and wooden structures with reliable results.

For product details, pricing, and order support, please contact us today.

Best regards,
ScaleUp92`;

    return res.json({
      success: true,
      result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "AI generation failed",
      error: error.message,
    });
  }
});

app.post("/send-email", async (req, res) => {
  try {
    const { name, emails, subject, message } = req.body;

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

    const msg = {
      to: validEmails,
      from: {
        email: FROM_EMAIL,
        name: name,
      },
      subject: subject,
      text: message,
      html: `<div style="white-space:pre-wrap;font-family:Arial,sans-serif;">${message}</div>`,
    };

    await sgMail.sendMultiple(msg);

    return res.json({
      success: true,
      message: `Bulk email sent to ${validEmails.length} contacts`,
      sentCount: validEmails.length,
    });
  } catch (error) {
    console.log("SEND EMAIL ERROR:", error?.response?.body || error.message);

    return res.status(500).json({
      success: false,
      message: "Email sending failed",
      error: error?.response?.body || error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});