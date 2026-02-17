require("dotenv").config();

const express = require("express");
const cors = require("cors");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path = require("path");

const imageProxyRoutes = require("../routes/imageProxy");
const dashboardRoutes = require("../routes/dashboard");
const leagueRoutes = require("../routes/leagueRoutes");
const videoRoutes = require("../routes/videoRoutes");
const playerImageRoutes = require("../routes/playerImageRoutes");
const { router: fetchnews, refreshNewsInBackground } = require("../routes/newsRoutes");

const entityDatabase = require("../routes/entitydatabase");



const app = express();
const port = process.env.PORT || 3000;

//Trust reverse proxy in production
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

//Middleware
app.use(compression());
app.use(express.json());

//CORS configuration
app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        "https://sportyfanz.com",
        "https://www.sportyfanz.com",
        "https://sportyfanz.onrender.com",
      ];
      const allowedPatterns = [/^https:\/\/your-username-.*\.app\.github\.dev$/];

      if (!origin) return callback(null, true); // allow curl/Postman

      if (
        allowedOrigins.includes(origin) ||
        allowedPatterns.some((pattern) => pattern.test(origin))
      ) {
        callback(null, true);
      } else {
        callback(new Error(`Not allowed by CORS: ${origin}`));
      }
    },
  })
);

//Rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === "production" ? 30 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", apiLimiter);

//Serve static assets
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use(express.static(path.join(__dirname, "public")));

//API routes
app.use("/api", imageProxyRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", leagueRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api", playerImageRoutes);
app.use("/api", fetchnews);
app.use("/api", entityDatabase);


//Health check
app.get("/api/health", (req, res) => res.send("API is live."));

//SPA fallback: serve index.html only for non-API GET requests
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

//404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: "Route not found" });
});



//Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong" });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);

  refreshNewsInBackground().catch(err =>
    console.error("Initial news refresh failed:", err)
  );
});

