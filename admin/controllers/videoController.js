const fetch = require('node-fetch');
const API_KEY = process.env.API_KEY;

// Get video highlight by match ID
exports.getMatchVideo = async (req, res) => {
    const { matchId } = req.params;

    if (!matchId) {
        return res.status(400).json({ error: "Missing matchId" });
    }

    try {
        const response = await fetch(`https://apiv3.apifootball.com/?action=get_videos&match_id=${matchId}&APIkey=${API_KEY}`);
        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
            return res.json({ videoUrl: data[0].video_url });
        } else {
            return res.json({ videoUrl: null });
        }
    } catch (error) {
        console.error("❌ Video fetch error:", error);
        res.status(500).json({ error: "Failed to fetch video" });
    }
};
