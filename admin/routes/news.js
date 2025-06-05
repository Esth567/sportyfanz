// routes/news.js
const express = require("express");
const router = express.Router();
const { fetchNews } = require("../utils/fetchNews");

router.get("/", async (req, res) => {
  try {
    const force = req.query.force === "true"; // /api/news?force=true
    const news = await fetchNews(force);
    res.json(news);
  } catch (err) {
    console.error("❌ Failed to fetch news:", err.message);

    // Optional fallback: load from disk cache
    try {
      const fallback = require("fs").readFileSync(require("path").join(__dirname, "../utils/cache/news.json"));
      res.json(JSON.parse(fallback).data);
    } catch (fsErr) {
      res.status(500).json({ error: "Failed to load news" });
    }
  }
});

module.exports = router;
