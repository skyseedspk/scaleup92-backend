import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    status: "online",
    app: "ScaleUp92 Backend",
    message: "Backend is running successfully",
    emailApi: "ready",
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server OK",
  });
});

app.post("/send-email", async (req, res) => {
  try {
    const { to, subject, message, html } = req.body;

    if (!to || !subject || (!message && !html)) {
      return res.status(400).json({
        success: false,
        error: "to, subject, and message/html required",
      });
    }

    const smtpPort = Number(process.env.SMTP_PORT || 587);

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.hostinger.com",
      port: smtpPort,
      secure: smtpPort === 465,
      requireTLS: smtpPort === 587,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000,
      tls: {
        rejectUnauthorized: false,
      },
    });

    await transporter.verify();

    const info = await transporter.sendMail({
      from: `"${process.env.FROM_NAME || "ScaleUp92"}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text: message || "",
      html: html || message || "",
    });

    res.json({
      success: true,
      message: "Email sent successfully",
      messageId: info.messageId,
    });
  } catch (error) {
    console.log("EMAIL SEND ERROR:", error);

    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code || null,
      command: error.command || null,
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`ScaleUp92 server running on port ${PORT}`);
});
