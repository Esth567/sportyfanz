// index.js

require("dotenv").config();
const { spawn } = require("child_process");
const axios = require("axios");
const express = require("express");
const cors = require("cors");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path = require("path");

const newsRoutes = require("../routes/news");
const imageProxyRoutes = require("../routes/imageProxy");

const app = express();
const port = 3000;

const fastapi = spawn(
  "uvicorn",
  ["app.main:app", "--host", "0.0.0.0", "--port", "8000"],
  {
    cwd: path.join(__dirname, "../../summarizer-api"), // 👈 run from summarizer-api folder
    env: {
      ...process.env,
      PYTHONPATH: ".", // 👈 this tells Python to resolve from cwd, which now has `app/`
    },
  }
);



fastapi.stdout.on("data", (data) => {
  console.log(`🔥 FastAPI: ${data}`);
});
fastapi.stderr.on("data", (data) => {
  console.error(`❗ FastAPI error: ${data}`);
});
fastapi.on("close", (code) => {
  console.log(`⚠️ FastAPI process exited with code ${code}`);
});

// 🕐 Wait for FastAPI to be ready
async function waitForFastAPI(timeout = 15000, interval = 1000) {
  const url = "http://localhost:8000/v1/chat/completions";
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      await axios.post(url, {
        model: "google/flan-t5-small",
        messages: [{ role: "user", content: "ping" }]
      });
      console.log("✅ FastAPI is ready.");
      return true;
    } catch (err) {
      console.log("⌛ Waiting for FastAPI...");
      await new Promise((res) => setTimeout(res, interval));
    }
  }

  console.warn("❌ Timed out waiting for FastAPI.");
  return false;
}

// 🚀 Start Express app after FastAPI is up
(async () => {
  await waitForFastAPI();

  app.use(cors({ origin: ["https://sports-news.onrender.com"] }));
  app.use(compression());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, "public")));

  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: process.env.NODE_ENV === "production" ? 20 : 1000
  });
  app.use("/api/", limiter);

  app.use("/api/news", newsRoutes);
  app.use("/api", imageProxyRoutes);

  app.get("/", (req, res) => res.send("Server running."));

  app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
  });
})();
