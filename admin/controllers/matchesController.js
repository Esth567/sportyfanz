//controller
const fetch = require("node-fetch");
const NodeCache = require("node-cache");

const API_KEY = process.env.API_KEY;

// league cache (5 min)
const getLeagueCache = new NodeCache({ stdTTL: 600 }); // Cache for 10 minutes

//function to dispay listed league name
exports.getLeaguesNames = async (req, res) => {
  const cacheKey = "leagues";
  const cached = getLeagueCache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const response = await fetch(`https://apiv3.apifootball.com/?action=get_leagues&APIkey=${API_KEY}`);
    const data = await response.json();

    if (!Array.isArray(data)) {
      console.error("⚠️ Unexpected response:", data);
      return res.status(500).json({ error: "Invalid response from API", raw: data });
     }

    getLeagueCache.set(cacheKey, data);
    res.json(data);
  } catch (err) {
    console.error("❌ Failed to fetch leagues:", err);
    res.status(500).json({ error: "Failed to fetch leagues" });
  }
};



const matchCache = new NodeCache({ stdTTL: 300 }); // Cache for 5 minutes

const getTodayDate = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split("T")[0];
};

//function to get matches
exports.getMatches = async (req, res) => {
  const cacheKey = 'matches';
  const cached = matchCache.get(cacheKey);
  if (cached) return res.json(cached);

  const fromDate = getTodayDate(-7);
  const toDate = getTodayDate(7);

  try {
    const response = await fetch(`https://apiv3.apifootball.com/?action=get_events&from=${fromDate}&to=${toDate}&APIkey=${API_KEY}`);
    const data = await response.json();

    if (!API_KEY) {
      return res.status(500).json({ error: "Missing API key" });
     }


    if (!Array.isArray(data)) {
      return res.status(500).json({ error: "Invalid match data" });
    }

    const matchesData = {
      live: data.filter(match => {
        const status = match.match_status.trim().toLowerCase();
        return status === "live" || (parseInt(status) > 0 && parseInt(status) < 90);
      }),
      highlight: data.filter(match => match.match_status === "Finished"),
      upcoming: data.filter(match => match.match_status === "" || match.match_status === null),
    };

    matchCache.set(cacheKey, matchesData);
    res.json(matchesData);
  } catch (error) {
    console.error("❌ Match fetch error:", error);
    res.status(500).json({ error: "Failed to fetch match data" });
  }
};


// Function to filter matches by the selected date
exports.getMatchesByDate = async (req, res) => {
    const { date } = req.query;

    if (!date) return res.status(400).json({ error: "Missing date parameter" });

    try {
        const response = await fetch(`https://apiv3.apifootball.com/?action=get_events&from=${date}&to=${date}&APIkey=${API_KEY}`);
        const data = await response.json();

        if (!Array.isArray(data)) {
            return res.status(500).json({ error: "Invalid match data" });
        }

        const categorized = {
            live: [],
            highlight: [],
            upcoming: []
        };

        data.forEach(match => {
            const status = match.match_status.toLowerCase();
            if (status.includes("ht") || parseInt(status) > 0) {
                categorized.live.push(match);
            } else if (status === "ft" || status === "finished") {
                categorized.highlight.push(match);
            } else {
                categorized.upcoming.push(match);
            }
        });

        res.json(categorized);
    } catch (error) {
        console.error("❌ Match filter error:", error);
        res.status(500).json({ error: "Failed to fetch match data" });
    }
};
