const express = require("express");
const nodemailer = require("nodemailer");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    status: "online",
    app: "ScaleUp92 Backend",
    message: "Backend is running successfully"
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true
  });
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

app.post("/send-email", async (req, res) => {

  try {

    const { to, subject, html } = req.body;

    await transporter.sendMail({
      from: `${process.env.FROM_NAME} <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });

    return res.json({
      success: true,
      message: "Email sent successfully"
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      error: error.message
    });

  }

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
