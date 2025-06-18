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

app.use(cors({
  origin: 'https://friendly-parakeet-jwqpvgwxjqvf5464-5500.app.github.dev',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: false  // only true if you're using cookies/auth
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
