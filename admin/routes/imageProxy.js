const express = require("express");
const axios = require("axios");
const sharp = require("sharp");
const router = express.Router();

router.get('/image-proxy', async (req, res) => {
  const { url, width = 600, height = 400 } = req.query;
  if (!url) return res.status(400).send("Missing image URL");

  try {
    const imageRes = await axios.get(url, { responseType: "arraybuffer" });
    const buffer = await sharp(imageRes.data)
      .resize(Number(width), Number(height))
      .jpeg({ quality: 80 })
      .toBuffer();

    res.set("Content-Type", "image/jpeg");
    res.send(buffer);
  } catch (err) {
    console.error("❌ Image proxy error:", err.message);
    res.status(500).send("Failed to proxy image");
  }
});

module.exports = router;
