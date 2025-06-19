// routes/news.js
const express = require("express");
const router = express.Router();
const { fetchNews } = require("../utils/fetchNews");

router.get("/", async (req, res) => {
  try {
    const force = req.query.force === "true";
    const news = await fetchNews(force);

    // ✅ Extract the correct shape
    const trending = news?.data?.trending;
    const updates = news?.data?.updates;

    if (!Array.isArray(trending) || !Array.isArray(updates)) {
      throw new Error("Invalid or empty news data");
    }

    res.json({ trending, updates }); // ✅ only send required structure

  } catch (err) {
    console.error("❌ Failed to fetch news:", err.message);

    try {
<
      const fallbackRaw = require("fs").readFileSync(
        require("path").join(__dirname, "../utils/cache/news.json")
      );
      const fallback = JSON.parse(fallbackRaw);

      const trending = fallback?.data?.trending;
      const updates = fallback?.data?.updates;

      if (!Array.isArray(trending) || !Array.isArray(updates)) {
        throw new Error("Fallback cache also has invalid structure");
      }

      res.json({ trending, updates });

    } catch (fsErr) {
      console.error("❌ Failed to read fallback cache:", fsErr.message);
      res.status(500).json({ error: "Failed to load news" });
    }
  }
});


module.exports = router;
