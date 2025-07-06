// routes/news.js
const express = require("express");
const router = express.Router();
const { fetchNews } = require("../utils/fetchNews");

exports.getNews = async (req, res) => {
  try {
    const force = req.query.force === "true";
    const news = await fetchNews(force);

    const trending = news?.trending;
    const updates = news?.updates;

    if (!Array.isArray(trending) || !Array.isArray(updates)) {
      throw new Error("Invalid or empty news data");
    }

    res.json({ trending, updates });

  } catch (err) {
    console.error("❌ Failed to fetch news:", err.message);

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

      res.json({ trending, updates });

    } catch (fsErr) {
      console.error("❌ Failed to read fallback cache:", fsErr.message);
      res.status(500).json({ error: "Failed to load news" });
    }
  }
};


exports.getTopstories = async (req, res) => {
  try {
    const force = req.query.force === "true";
    const news = await fetchNews(force);

    const trending = news?.trending; // ✅ Use news, not fallback

    if (!Array.isArray(trending)) {
      throw new Error("Invalid or empty news data");
    }

    res.json({ trending });

  } catch (err) {
    console.error("❌ Failed to fetch news:", err.message);

    try {
      const fallbackRaw = require("fs").readFileSync(
        require("path").join(__dirname, "../utils/cache/news.json")
      );
      const fallback = JSON.parse(fallbackRaw);

      const trending = fallback?.trending;

      if (!Array.isArray(trending)) {
        throw new Error("Fallback cache also has invalid structure");
      }

      res.json({ trending });

    } catch (fsErr) {
      console.error("❌ Failed to read fallback cache:", fsErr.message);
      res.status(500).json({ error: "Failed to load news" });
    }
  }
};


//update highlight news
exports.getUpdatestories = async (req, res) => {
  try {
    const force = req.query.force === "true";
    const news = await fetchNews(force);

    const updates = news?.updates; // ✅ use news, not fallback

    if (!Array.isArray(updates)) {
      throw new Error("Invalid or empty news data");
    }

    res.json({ updates });

  } catch (err) {
    console.error("❌ Failed to fetch news:", err.message);

    try {
      const fallbackRaw = require("fs").readFileSync(
        require("path").join(__dirname, "../utils/cache/news.json")
      );
      const fallback = JSON.parse(fallbackRaw);

      const updates = fallback?.updates;

      if (!Array.isArray(updates)) {
        throw new Error("Fallback cache also has invalid structure");
      }

      res.json({ updates });

    } catch (fsErr) {
      console.error("❌ Failed to read fallback cache:", fsErr.message);
      res.status(500).json({ error: "Failed to load news" });
    }
  }
};


