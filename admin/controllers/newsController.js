
const express = require("express");
const router = express.Router();
const { fetchNews } = require("../utils/fetchNews");

exports.getNews = async (req, res) => {
  try {
    const force = req.query.force === "true";
    const news = await fetchNews(force);

    const trending = news?.trending;
    const updates = news?.updates;

    if (!Array.isArray(trending) || !Array.isArray(updates) || trending.length === 0 || updates.length === 0) {
      try {
        const fallbackRaw = require("fs").readFileSync(
          require("path").join(__dirname, "../utils/cache/news.json")
        );
        const fallback = JSON.parse(fallbackRaw);
        const trending = fallback?.trending;
        const updates = fallback?.updates;

        if (!Array.isArray(trending) || !Array.isArray(updates)) {
          throw new Error("Fallback cache also has invalid structure");
        }

        res.json({ trending, updates });  // ✅ FIXED

      } catch (fsErr) {
        console.error("❌ Failed to read fallback cache:", fsErr.message);
        res.status(500).json({ error: "Failed to load news" });
      }
    } else {
      res.json({ trending, updates });  // ✅ FIXED
    }

  } catch (err) {
    console.error("❌ Failed to fetch news:", err.message);
    res.status(500).json({ error: "Failed to load news" });
  }
};



