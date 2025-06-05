require("dotenv").config();
const express = require("express");
const cors = require("cors");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path = require("path");

const newsRoutes = require("../routes/news");
const imageProxyRoutes = require("../routes/imageProxy");

const app = express();
const port = process.env.PORT || 3000;

const allowedOrigin = process.env.ALLOWED_ORIGIN || "*"; // Customize per deploy

app.use(cors({
  origin: allowedOrigin,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));

app.use(compression());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 30 : 1000,
});

app.use("/api/", limiter);
app.use("/api/news", newsRoutes);
app.use("/api", imageProxyRoutes);

app.get("/", (req, res) => res.send("✅ API is live."));

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
