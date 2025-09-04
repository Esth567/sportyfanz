// controllers/videoController.js
const axios = require("axios");

async function getMatchVideo(req, res) {
  const { matchId } = req.params;
  const { homeTeam, awayTeam } = req.query; // 👈 pass team names from frontend

  if (!matchId || !homeTeam || !awayTeam) {
    return res.status(400).json({ error: "matchId, homeTeam and awayTeam are required" });
  }

  try {
    const response = await axios.get(
      "https://free-football-soccer-videos.p.rapidapi.com/",
      {
        headers: {
          "x-rapidapi-key": process.env.RAPIDAPI_KEY,
          "x-rapidapi-host": "free-football-soccer-videos.p.rapidapi.com",
        },
      }
    );

    const data = response.data;

    // Normalize text (lowercase, remove spaces/special chars)
    const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, "");

    const homeNorm = normalize(homeTeam);
    const awayNorm = normalize(awayTeam);

    // Try to find a video where the title contains both team names
    const matchVideo = data.find((item) => {
      const titleNorm = normalize(item.title || "");
      return titleNorm.includes(homeNorm) && titleNorm.includes(awayNorm);
    });

    if (matchVideo) {
      return res.json({
        title: matchVideo.title,
        embed: matchVideo.embed,     // ✅ iframe HTML
        url: matchVideo.url,         // page link
        thumbnail: matchVideo.thumbnail,
        date: matchVideo.date,
      });
    } else {
      return res.json({ videoUrl: null });
    }
  } catch (error) {
    console.error("❌ Error fetching match video:", error.message);
    return res.status(500).json({ error: "Failed to fetch match video" });
  }
}

module.exports = { getMatchVideo };
