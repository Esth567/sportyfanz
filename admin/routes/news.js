const express = require("express");
const router = express.Router();
const { fetchNews } = require("../utils/fetchNews.js");

router.get("/", async (req, res) => {
  try {
    const news = await fetchNews();
    res.json(news);  // This sends { trending: [...], updates: [...] }
  } catch (err) {
    console.error("❌ Failed to fetch news:", err.message);
    res.status(500).json({ error: "Failed to fetch news." });
  }
});

module.exports = router;
