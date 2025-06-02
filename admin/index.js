require("dotenv").config();

const { spawn } = require("child_process");
const axios = require("axios");
const express = require("express");
const cors = require("cors");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path = require("path");

const newsRoutes = require("./routes/news");
const imageProxyRoutes = require("./routes/imageProxy");

const app = express();
const port = process.env.PORT || 3000;

// Start vLLM server
const vllmProcess = spawn("vllm", ["serve", "--model", "deepseek-ai/DeepSeek-R1-0528"]);

vllmProcess.stdout.on("data", (data) => {
  console.log(`🧠 vLLM: ${data}`);
});
vllmProcess.stderr.on("data", (data) => {
  console.error(`❗ vLLM error: ${data}`);
});
vllmProcess.on("close", (code) => {
  console.log(`⚠️ vLLM process exited with code ${code}`);
});

// Wait for vLLM to be ready
async function waitForVLLM(timeout = 15000, interval = 1000) {
  const url = "http://localhost:8000/v1/chat/completions";
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      await axios.post(url, {
        model: "deepseek-ai/DeepSeek-R1-0528",
        messages: [{ role: "user", content: "ping" }]
      });
      console.log("✅ vLLM is ready.");
      return true;
    } catch (err) {
      console.log("⌛ Waiting for vLLM to be ready...");
      await new Promise((res) => setTimeout(res, interval));
    }
  }

  console.warn("❌ Timed out waiting for vLLM. Continuing anyway.");
  return false;
}

// Start server after vLLM is ready
(async () => {
  await waitForVLLM();

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

  app.get("/", (req, res) => {
    res.send("Server running.");
  });

  app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
  });
})();
