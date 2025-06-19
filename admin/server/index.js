require("dotenv").config();
const express = require("express");
const cors = require("cors");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path = require("path");

const newsRoutes = require(path.join(__dirname, "../routes/news"));
const imageProxyRoutes = require(path.join(__dirname, "../routes/imageProxy"));

const app = express();
const port = process.env.PORT || 3000;

// CORS (allow everything in development)
app.use(cors({
  origin: function (origin, callback) {
    if (process.env.NODE_ENV !== "production") return callback(null, true);
    const allowedOrigins = ["https://your-production-url.com"];
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error("Not allowed by CORS"));
  }
}));

app.use(compression());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 30 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", limiter);

// API routes
app.use("/api/news", newsRoutes);
app.use("/api", imageProxyRoutes);

// Fallback to index.html (for SPA routing, optional)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
