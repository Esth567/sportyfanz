
const fetch = require('node-fetch');
const NodeCache = require("node-cache");
const cache = require('../utils/cache/redisCache');
const playerImageMap = require('../utils/playerImageMap');


const APIkey = process.env.APIFOOTBALL_API_KEY;

// Reusable fetch with retry + timeout-------------------------
async function fetchRetry(url, retries = 3, timeout = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, { signal: controller.signal });

    if (!res.ok) {
      if (retries > 0) {
        return fetchRetry(url, retries - 1, timeout);
      }
      throw new Error("Bad response: " + res.status);
    }

    clearTimeout(timer);
    return res.json();

  } catch (err) {
    clearTimeout(timer);
    if (retries > 0) {
      return fetchRetry(url, retries - 1, timeout);
    }
    throw err;
  }
}


// Display matches for live-match-demo
const getMatchesCache = new NodeCache({ stdTTL: 60 });

exports.getMatches = async (req, res) => {
  const { from, to } = req.query;
  const limit = parseInt(req.query.limit) || 100;

  if (!from || !to) {
    return res.status(400).json({ error: "Missing query parameters" });
  }

  const cacheKey = `matches_${from}_${to}_${limit}`;
  const cached = getMatchesCache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    //DIRECT MATCHES FETCH — No league loop
    const url = `https://apiv3.apifootball.com/?action=get_events&from=${from}&to=${to}&timezone=Europe/Berlin&APIkey=${APIkey}`;
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(502).json({ error: "Failed to fetch events" });
    }

    let data;
    try {
      data = await response.json();
    } catch (err) {
      return res.status(500).json({ error: "Unable to parse match data" });
    }

    if (!Array.isArray(data)) {
      return res.status(500).json({ error: "Invalid match data format" });
    }

    // Sort by date/time
    data.sort((a, b) => {
      const A = new Date(`${a.match_date}T${a.match_time}`);
      const B = new Date(`${b.match_date}T${b.match_time}`);
      return A - B;
    });

    // Apply limit
    const result = data.slice(0, limit);

    // Cache result
    getMatchesCache.set(cacheKey, result);

    res.json(result);

  } catch (err) {
    console.error("Error fetching matches:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};


// function to fetch top scorer

const topScorersCache = new NodeCache({ stdTTL: 60 });

// --- CONFIG ---
const leaguesToFetch = [
  152, // EPL
  302, // La Liga
  175, // Serie A
  168, // Bundesliga
  207, // Ligue 1
  28,  // World Cup
  24,  // UEFA Qualifiers
  195, // NPFL
];

// Display names for leagues
const leagueNames = {
  152: "EPL",
  302: "La Liga",
  175: "Serie A",
  168: "Bundesliga",
  207: "Ligue 1",
  28:  "World Cup",
  24:  "UEFA Qualifiers",
  195: "NPFL",
};

// truncate helper
function truncateWords(str, limit = 2) {
  if (!str) return str;
  return str.split(" ").slice(0, limit).join(" ");
}

// season helper
function getCurrentSeason() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

// MAIN ENDPOINT
exports.getTopScorers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 200;
    const season = getCurrentSeason();
    const cacheKey = `topscorers_${season}_${limit}`;

    // Serve cached version
    const cached = topScorersCache.get(cacheKey);
    if (cached) {
      console.log("Returning cached top scorers");
      return res.json(cached);
    }

    let results = [];

    for (const leagueId of leaguesToFetch) {
      try {
        const url = `https://apiv3.apifootball.com/?action=get_topscorers&league_id=${leagueId}&season=${season}&APIkey=${APIkey}`;
        const data = await fetchRetry(url);

        if (!Array.isArray(data) || data.length === 0) continue;

        // sort by highest goals
        data.sort((a, b) => b.goals - a.goals);

        const highestGoals = parseInt(data[0].goals) || 0;
        if (highestGoals === 0) continue;

        // include ties
        const topPlayers = data.filter(
          (p) => parseInt(p.goals) === highestGoals
        );

        for (const p of topPlayers) {
          results.push({
            league: leagueNames[leagueId] || "Unknown League",
            player: p.player_name,
            goals: highestGoals,
            team: truncateWords(p.team_name),
            image: p.player_image,
          });
        }
      } catch (leagueErr) {
        console.warn(`Skipped league ${leagueId}:`, leagueErr.message);
      }
    }

    // limit
    if (results.length > limit) {
      results = results.slice(0, limit);
    }

    // save to cache
    topScorersCache.set(cacheKey, results);

    return res.json(results);

  } catch (err) {
    console.error("❌ Topscorers backend error:", err.stack);
    return res.status(500).json({
      error: "Failed to fetch top scorers",
      details: err.message,
    });
  }
};


// Get the active league ID

// cache for 10 minutes
const leaguesCache = new NodeCache({ stdTTL: 500 }); 

exports.getLeagues = async (req, res) => {
  const cacheKey = 'allLeagues';
  const cached = leaguesCache.get(cacheKey);

  if (cached) {
    return res.json(cached);
  }

  try {
    const response = await fetch(`https://apiv3.apifootball.com/?action=get_leagues&APIkey=${APIkey}`);
    
    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ error: 'Failed to fetch leagues', details: text });
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      return res.status(500).json({ error: 'Invalid response structure for leagues' });
    }

    //Set to cache
    leaguesCache.set(cacheKey, data);

    res.json(data);
  } catch (err) {
    console.error("Error fetching leagues:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
};



//league table for 5 team top beased on ranking

const standingCache = new NodeCache({ stdTTL: 500 }); // cache for 10 minutes

exports.getTopStandings = async (req, res) => {
  const { leagueId } = req.params;
  const cacheKey = `standings_${leagueId}`;

  // Check cache
  const cached = standingCache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {
    const response = await fetch(`https://apiv3.apifootball.com/?action=get_standings&league_id=${leagueId}&APIkey=${APIkey}`);
    
    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ error: 'Failed to fetch standings', details: text });
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(404).json({ error: 'No standings data found.' });
    }

    const topFive = data.slice(0, 5);

    // Save to cache
    standingCache.set(cacheKey, topFive);

    res.json(topFive);
  } catch (error) {
    console.error("Error fetching standings:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


// Function to fetch all matches with caching

const allMatchesCache = new NodeCache({ stdTTL: 900 }); // cache for 5 minutes

// Format YYYY-MM-DD
const formatDate = (date) => date.toISOString().split("T")[0];

// Fetch matches for ONE day (fast)
async function fetchDay(date) {
  const cacheKey = `day_${date}`;
  const cached = allMatchesCache.get(cacheKey);
  if (cached) return cached;

  const url = `https://apiv3.apifootball.com/?action=get_events&from=${date}&to=${date}&APIkey=${APIkey}&timezone=Europe/Berlin`;

  try {
    const res = await fetch(url, { timeout: 5000 });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    allMatchesCache.set(cacheKey, data);
    return data;
  } catch (e) {
    return [];
  }
}

exports.getAllMatches = async (req, res) => {
  try {
    const today = new Date();
    const todayStr = formatDate(today);

    // Fetch TODAY ONLY (fast!)
    const todayMatches = await fetchDay(todayStr);

    const matchesData = {
      live: todayMatches.filter(m => {
        const s = m.match_status?.trim().toLowerCase();
        return s === "live" || (parseInt(s) > 0 && parseInt(s) < 90);
      }),
      highlight: todayMatches.filter(m => m.match_status === "Finished"),
      upcoming: todayMatches.filter(m => !m.match_status),
    };

    // Return instantly
    res.json(matchesData);

    // 🔥 Background: prefetch other days (non-blocking)
    const datesToPrefetch = [];
    for (let i = -7; i <= 7; i++) {
      if (i !== 0) {
        const d = new Date();
        d.setDate(today.getDate() + i);
        datesToPrefetch.push(formatDate(d));
      }
    }

    datesToPrefetch.forEach(date => fetchDay(date)); // runs silently

  } catch (err) {
    res.status(500).json({ error: "Failed to fetch match data" });
  }
};


//cntroller to get matches by date and cache 

const matchesByDateCache = new NodeCache({ stdTTL: 60 }); // cache for 1 minutes

exports.getMatchesByDate = async (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: 'Missing date parameter' });
  }

  const cacheKey = `matchesByDate_${date}`;
  const cached = matchesByDateCache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {
    const url = `https://apiv3.apifootball.com/?action=get_events&from=${date}&to=${date}&APIkey=${APIkey}`;
    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ error: "Failed to fetch from API", details: text });
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      return res.status(500).json({ error: 'Invalid response from API' });
    }

    const filtered = {
      live: [],
      highlight: [],
      upcoming: []
    };

    for (const match of data) {
      const status = match.match_status?.toLowerCase() || "";

      if (status.includes("ht") || (parseInt(status) > 0 && parseInt(status) < 90)) {
        filtered.live.push(match);
      } else if (status === "ft" || status === "finished") {
        filtered.highlight.push(match);
      } else {
        filtered.upcoming.push(match);
      }
    }

    // ✅ Set cache
    matchesByDateCache.set(cacheKey, filtered);

    res.json(filtered);
  } catch (err) {
    console.error("Error fetching matches by date:", err);
    res.status(500).json({ error: "Failed to fetch match data" });
  }
};



//function to load statistic

const matchStatsCache = new NodeCache({ stdTTL: 60 }); // cache for 1 minutes

exports.getMatchStatistics = async (req, res) => {
  const { matchId } = req.query;

  if (!matchId) {
    return res.status(400).json({ error: 'Missing matchId parameter' });
  }

  const cacheKey = `matchStats_${matchId}`;
  const cached = matchStatsCache.get(cacheKey);
  if (cached) {
    return res.json({ statistics: cached });
  }

  try {
    const response = await fetch(`https://apiv3.apifootball.com/?action=get_statistics&match_id=${matchId}&APIkey=${APIkey}`);

    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ error: "Failed to fetch from API", details: text });
    }

    const data = await response.json();

    const stats = data[matchId]?.statistics || [];

    // ✅ Set cache
    matchStatsCache.set(cacheKey, stats);

    res.json({ statistics: stats });
  } catch (error) {
    console.error("📉 Error fetching match statistics:", error);
    res.status(500).json({ error: 'Failed to fetch match statistics' });
  }
};


//functkion to det h2h
const h2hCache = new NodeCache({ stdTTL: 600 }); // Cache duration: 10 minutes

//function to det h2h
exports.getH2HData = async (req, res) => {
  const { homeTeam, awayTeam } = req.query;

  if (!homeTeam || !awayTeam) {
    return res.status(400).json({ error: 'Missing homeTeam or awayTeam' });
  }

  const cacheKey = `h2h_${homeTeam}_${awayTeam}`;
  const cached = h2hCache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {
    const url = `https://apiv3.apifootball.com/?action=get_H2H&firstTeam=${encodeURIComponent(homeTeam)}&secondTeam=${encodeURIComponent(awayTeam)}&APIkey=${APIkey}`;
    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ error: 'API Error', details: text });
    }

    const data = await response.json();

    const result = {
      h2h: data.firstTeam_VS_secondTeam || [],
      homeLast: data.firstTeam_lastResults || [],
      awayLast: data.secondTeam_lastResults || []
    };

    //Cache
    h2hCache.set(cacheKey, result);

    res.json(result);
  } catch (error) {
    console.error("H2H Fetch Error:", error);
    res.status(500).json({ error: 'Internal server error while fetching H2H data' });
  }
};



//function to load standings
const standingsCache = new NodeCache({ stdTTL: 300 }); // 5 minutes TTL

// controller
exports.getStandings = async (req, res) => {
  const { leagueId } = req.query;

  if (!leagueId) {
    return res.status(400).json({ error: "Missing leagueId parameter" });
  }

  const cacheKey = `standings_${leagueId}`;
  const cached = standingsCache.get(cacheKey);

  if (cached) {
    return res.json({ leagueId, standings: cached }); //include leagueId
  }

  try {
    const url = `https://apiv3.apifootball.com/?action=get_standings&league_id=${leagueId}&APIkey=${APIkey}`;
    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({
        leagueId,
        error: "Failed to fetch standings",
        details: text
      });
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      console.warn("Invalid API response structure:", data);
      standingsCache.set(cacheKey, []); 
      return res.json({ leagueId, standings: [] }); //include leagueId
    }

    //Save to cache
    standingsCache.set(cacheKey, data);

    //Always return consistent shape
    res.json({ leagueId, standings: data });

  } catch (error) {
    console.error("Standings fetch error (backend):", error);
    res.status(500).json({ leagueId, error: "Server error fetching standings" });
  }
};

async function safeJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON response: ${text.slice(0, 200)}`);
  }
}

//lineupController.js
const lineupCache = new NodeCache({ stdTTL: 300 }); // 5 min cache

exports.getLineups = async (req, res) => {
  const { matchId } = req.query;

  if (!matchId) {
    return res.status(400).json({ error: "Missing matchId parameter" });
  }

  const cacheKey = `lineup_${matchId}`;
  const cached = lineupCache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {
    // Fetch both endpoints in parallel
    const [lineupRes, eventRes] = await Promise.all([
      fetch(`https://apiv3.apifootball.com/?action=get_lineups&match_id=${matchId}&APIkey=${APIkey}`),
      fetch(`https://apiv3.apifootball.com/?action=get_events&match_id=${matchId}&APIkey=${APIkey}`)
    ]);

    if (!lineupRes.ok || !eventRes.ok) {
      return res.status(502).json({ error: "API response failed" });
    }

    const lineupData = await safeJson(lineupRes);
    const eventData = await safeJson(eventRes);

    const lineup = lineupData[matchId]?.lineup || null;
    const match = Array.isArray(eventData) ? eventData[0] : eventData[matchId];

    const responsePayload = { lineup, match };

    lineupCache.set(cacheKey, responsePayload);

    res.json(responsePayload);
  } catch (err) {
    console.error("Error fetching lineups/events:", err);
    res.status(500).json({ error: "Failed to fetch lineup data" });
  }
};


// prediction 
const predictionCache = new NodeCache({ stdTTL: 300 });

const getDateString = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split("T")[0];
};

exports.getTodayPredictions = async (req, res) => {
  const cacheKey = "todayPredictions";
  const cached = predictionCache.get(cacheKey);
  if (cached) return res.json(cached);

  const today = getDateString();
 
try {
    const response = await fetch(
      `https://apiv3.apifootball.com/?action=get_predictions&from=${today}&to=${today}&APIkey=${APIkey}`
    );

    const data = await response.json();

    if (!Array.isArray(data)) {
      console.error("Prediction API error:", data);
      return res.status(500).json([]);
    }

    const enriched = data.map(match => ({
     match_id: match.match_id,
     home: match.match_hometeam_name,
     away: match.match_awayteam_name,
     time: match.match_time,
     status: match.match_status,
     live: match.match_live,
     league_name: match.league_name,
     homeScore: match.match_hometeam_score,
     awayScore: match.match_awayteam_score,
     prob_home: parseFloat(match.prob_HW || 0),
     prob_away: parseFloat(match.prob_AW || 0),
     prob_draw: parseFloat(match.prob_D || 0)
   }));

    predictionCache.set(cacheKey, enriched);
    res.json(enriched);

  } catch (error) {
    console.error("Backend prediction error:", error);
    res.status(500).json([]);
  }
};
