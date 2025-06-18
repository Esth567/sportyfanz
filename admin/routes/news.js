// routes/news.js
const express = require("express");
const router = express.Router();
const { fetchNews } = require("../utils/fetchNews");

router.get("/", async (req, res) => {
  try {
    const force = req.query.force === "true";
    const news = await fetchNews(force);

    if (!news || !news.trending || !news.updates) {
      throw new Error("Invalid or empty news data");
    }

    res.json(news);
  } catch (err) {
    console.error("❌ Failed to fetch news:", err.message);

    try {
      const fallback = require("fs").readFileSync(
        require("path").join(__dirname, "../utils/cache/news.json")
      );
      res.json(JSON.parse(fallback));
    } catch (fsErr) {
      console.error("❌ Failed to read fallback cache:", fsErr.message);
      res.status(500).json({ error: "Failed to load news" });
    }
  }
});

module.exports = router;
