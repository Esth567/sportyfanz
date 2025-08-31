// controllers/videoController.js
const axios = require('axios');

const API_KEY = process.env.APIFOOTBALL_KEY; // 🔑 Use env variable

// Fetch match video
async function getMatchVideo(req, res) {
  const { matchId } = req.params;

  if (!matchId) {
    return res.status(400).json({ error: "matchId is required" });
  }

  try {
    const response = await axios.get("https://apiv3.apifootball.com/", {
      params: {
        action: "get_videos",
        match_id: matchId,
        APIkey: API_KEY,
      },
    });

    const data = response.data;

    if (Array.isArray(data) && data.length > 0) {
      return res.json({ videoUrl: data[0].video_url });
    } else {
      return res.json({ videoUrl: null });
    }
  } catch (error) {
    console.error("❌ Error fetching match video:", error.message);
    return res.status(500).json({ error: "Failed to fetch match video" });
  }
}

module.exports = { getMatchVideo };
