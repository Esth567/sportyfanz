require("dotenv").config();

const express = require("express");
const cors = require("cors");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path = require("path");
const mime = require("mime");

const imageProxyRoutes = require("../routes/imageProxy");
const dashboardRoutes = require("../routes/dashboard");
const leagueRoutes = require("../routes/leagueRoutes");
const videoRoutes = require("../routes/videoRoutes");
const playerImageRoutes = require("../routes/playerImageRoutes");
const fetchnlpnews = require("../routes/fetchnlpnews");
const entitydadabase = require("../routes/entitydatabase");

const app = express();
const port = process.env.PORT || 3000;

// ✅ Trust reverse proxy in production
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// ✅ Serve static files from admin/public (React build, CSS, JS, etc.)
app.use(express.static(path.join(__dirname, "public")));

// ✅ Serve /assets with UTF-8 safe decoding
app.use("/assets", (req, res, next) => {
  try {
    // Decode URL so %20 → space, %C4%B1 → ı, etc.
    const decodedPath = decodeURIComponent(req.path);

    // Build absolute file path
    const filePath = path.join(__dirname, "public/assets", decodedPath);

    // Log request (optional)
    console.log("👉 Serving asset:", filePath);

    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("❌ Asset not found:", filePath);
        res.status(404).send("Asset not found");
      }
    });
  } catch (e) {
    console.error("❌ Error decoding asset path:", e);
    res.status(400).send("Invalid asset path");
  }
});

// ✅ Middleware
app.use(compression());
app.use(express.json());

// ✅ CORS Configuration
app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        "https://sportyfanz.com",
        "https://www.sportyfanz.com",
        "http://localhost:3000",
      ];

      const allowedPatterns = [/^https:\/\/your-username-.*\.app\.github\.dev$/];

      if (!origin) {
        return callback(null, true); // Allow curl/Postman
      }

      if (
        allowedOrigins.includes(origin) ||
        allowedPatterns.some((pattern) => pattern.test(origin))
      ) {
        callback(null, true);
      } else {
        callback(new Error(`❌ Not allowed by CORS: ${origin}`));
      }
    },
  })
);

// ✅ Rate Limiting for API routes
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === "production" ? 30 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// ✅ API Routes
app.use("/api", imageProxyRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", leagueRoutes);
app.use("/api", videoRoutes);
app.use("/api", playerImageRoutes);
app.use("/api", fetchnlpnews);
app.use("/api", entitydadabase);

// ✅ Health check route
app.get("/api/health", (req, res) => res.send("✅ API is live."));

// ✅ Serve frontend (React index.html) for non-API routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});
// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong" });
});

// ✅ Start the server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
