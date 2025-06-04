require("dotenv").config();
const { spawn } = require("child_process");
const axios = require("axios");
const express = require("express");
const cors = require("cors");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");

const newsRoutes = require("../routes/news");
const imageProxyRoutes = require("../routes/imageProxy");

const app = express();
const port = 3000;

// Resolve paths
const pythonPath = path.resolve(__dirname, "../../summarizer-api/.venv/bin/python");
const summarizerApiPath = path.resolve(__dirname, "../../summarizer-api");

const fastapi = spawn(
  pythonPath,
  ["-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"],
  {
    cwd: summarizerApiPath,
    env: {
      ...process.env,
      PYTHONPATH: ".",  // Ensure relative imports in Python work
    },
    stdio: "inherit",
  }
);

fastapi.on("error", (err) => {
  console.error("❌ Failed to start FastAPI:", err);
});

fastapi.on("exit", (code) => {
  console.log(`FastAPI exited with code ${code}`);
});


// Wait until FastAPI is up before starting Express
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
      await new Promise(res => setTimeout(res, interval));
    }
  }
  console.warn("❌ Timed out waiting for FastAPI.");
  return false;
}

(async () => {
  await waitForFastAPI();

  app.use(cors({
  origin: ['https://friendly-parakeet-jwqpvgwxjqvf5464-5500.app.github.dev']
}));

  //app.use(cors({ origin: ["https://sports-news.onrender.com"] }));
  app.use(compression());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, "public")));

  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: process.env.NODE_ENV === "production" ? 20 : 1000,
  });

  app.use("/api/", limiter);
  app.use("/api/news", newsRoutes);
  app.use("/api", imageProxyRoutes);

  app.get("/", (req, res) => res.send("Server running."));

  app.listen(port, () => {
    console.log(`🚀 Express server running on http://localhost:${port}`);
  });
})();
