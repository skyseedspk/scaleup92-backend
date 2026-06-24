import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
