const express = require("express");
const router = express.Router();
const { rewriteWithMistral } = require("../utils/rewriteWithMistral");

router.post("/rewrite", async (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: "Missing title or content." });
  }

  try {
    const rewritten = await rewriteWithMistral(title, content);
    res.json({ rewritten });
  } catch (err) {
    console.error("🛑 Rewrite error:", err.message);
    res.status(500).json({ error: "Failed to rewrite article." });
  }
});

module.exports = router;

