
const fetch = require('node-fetch');
const NodeCache = require("node-cache");
const cache = require('../utils/cache/redisCache');
const playerImageMap = require('../utils/playerImageMap');


const APIkey = process.env.APIFOOTBALL_API_KEY;

async function fetchRetry(url, retries = 3, timeout = 10000) {
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, { signal: controller.signal });

    if (!res.ok) {
      if (retries > 1) {
        return fetchRetry(url, retries - 1, timeout);
      }
      throw new Error("API request failed: " + res.status);
    }

    clearTimeout(to);
    return res.json();

  } catch (err) {
    clearTimeout(to);
    if (retries > 1) {
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
    return res.status(400).json({ error: 'Missing query parameters' });
  }

  const cacheKey = `matches_${from}_${to}_${limit}`; //specific key
  const cached = getMatchesCache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const leaguesRes = await fetch(`https://apiv3.apifootball.com/?action=get_leagues&APIkey=${APIkey}`);
    if (!leaguesRes.ok) {
      return res.status(502).json({ error: 'Failed to fetch leagues from external API' });
    }

    const leagues = await leaguesRes.json();
    if (!Array.isArray(leagues)) {
      return res.status(500).json({ error: 'Invalid league response structure' });
    }

    let matchesList = [];

    for (const league of leagues) {
      try {
        const url = `https://apiv3.apifootball.com/?action=get_events&from=${from}&to=${to}&league_id=${league.league_id}&timezone=Europe/Berlin&APIkey=${APIkey}`;
        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`Bad response for league ${league.league_name}: ${response.status}`);
          continue;
        }

        let data;
        try {
          data = await response.json();
        } catch (jsonErr) {
          console.warn(`JSON parse error for league ${league.league_name}`);
          continue;
        }

        if (Array.isArray(data)) {
          matchesList.push(...data);
        }
      } catch (err) {
        console.warn(`Error fetching matches for league ${league.league_name}:`, err.message);
      }
    }

    matchesList.sort((a, b) => {
      const aTime = new Date(`${a.match_date}T${a.match_time}`);
      const bTime = new Date(`${b.match_date}T${b.match_time}`);
      return aTime - bTime;
    });

    const result = matchesList.slice(0, limit);
    getMatchesCache.set(cacheKey, result); //cache based on key
    res.json(result);

  } catch (err) {
    console.error('Error fetching matches:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
    
};


// function to fetch top scorer
const topScorersCache = new NodeCache({ stdTTL: 60 });

function truncateWords(str, limit = 2) {
  if (!str || typeof str !== "string") return str;
  return str.split(" ").slice(0, limit).join(" ");
}

// Utility to get current season as string, e.g., "2025-2026"
function getCurrentSeason() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // JS months 0-11
  // Season usually starts around August, ends May
  return month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

exports.getTopScorers = async (req, res) => {
  try {
    const globalLimit = parseInt(req.query.limit) || 50;
    const currentSeason = getCurrentSeason();

    const leaguesToFetch = [
      152, // EPL
      302, // La Liga
      175, // Serie A
      168, // Bundesliga
      207, // Ligue 1
      28,  // World Cup
      24,  // UEFA Qualifiers
    ];

    const cacheKey = `topscorers_${currentSeason}`;
    const cached = topScorersCache.get(cacheKey);

    if (cached) return res.json(cached);

    let results = [];

    for (const id of leaguesToFetch) {

      const url = `https://apiv3.apifootball.com/?action=get_topscorers&league_id=${id}&season=${currentSeason}&APIkey=${APIkey}`;

      const data = await fetch(url).then(r => r.json());

      if (!Array.isArray(data) || !data.length) continue;

      data.sort((a, b) => b.goals - a.goals);

      const topGoals = parseInt(data[0].goals) || 0;

      const tiedPlayers = data.filter(s => parseInt(s.goals) === topGoals);

      for (const scorer of topScorers) {
          result.push({
            league: displayLeagueName,
            player: scorer.player_name,
            goals: highestGoals,
            team: truncateWords(scorer.team_name),
            image: scorer.player_image,
          });
      }
    }

    results = results.slice(0, globalLimit);

    topScorersCache.set(cacheKey, results);

    res.json(results);

  } catch (err) {
    res.status(500).json({ error: err.message });
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

const allMatchesCache = new NodeCache({ stdTTL: 60 }); // cache for 1 minutes

exports.getAllMatches = async (req, res) => {
  const cacheKey = "allMatches_last14days";
  const cached = allMatchesCache.get(cacheKey);

  if (cached) {
    return res.json(cached);
  }

  const getTodayDate = (offsetDays) => {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    return date.toISOString().split("T")[0];
  };

  try {
    const from = getTodayDate(-7);
    const to = getTodayDate(7);

    const response = await fetch(`https://apiv3.apifootball.com/?action=get_events&from=${from}&to=${to}&APIkey=${APIkey}`);
    
    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ error: "Failed to fetch from API", details: text });
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      return res.status(500).json({ error: "Unexpected API response format" });
    }

    const matchesData = {
      live: data.filter(match => {
        const status = match.match_status?.trim().toLowerCase();
        return status === "live" || (parseInt(status) > 0 && parseInt(status) < 90);
      }),
      highlight: data.filter(match => match.match_status === "Finished"),
      upcoming: data.filter(match => match.match_status === "" || match.match_status == null),
    };

    // ✅ Cache the result
    allMatchesCache.set(cacheKey, matchesData);

    res.json(matchesData);
  } catch (error) {
    console.error("Error fetching matches:", error);
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

    // ✅ Cache
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
    return res.json({ leagueId, standings: cached }); // ✅ include leagueId
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
      console.warn("⚠️ Invalid API response structure:", data);
      standingsCache.set(cacheKey, []); 
      return res.json({ leagueId, standings: [] }); // ✅ include leagueId
    }

    // ✅ Save to cache
    standingsCache.set(cacheKey, data);

    // ✅ Always return consistent shape
    res.json({ leagueId, standings: data });

  } catch (error) {
    console.error("❌ Standings fetch error (backend):", error);
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

// backend/controllers/lineupController.js
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
    console.error("❌ Error fetching lineups/events:", err);
    res.status(500).json({ error: "Failed to fetch lineup data" });
  }
};



const predictionCache = new NodeCache({ stdTTL: 300 }); // cache for 5 min

const getDateString = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split("T")[0];
};


// Fetch and display predictions
exports.getTodayPredictions = async (req, res) => {
  const cacheKey = "todayPredictions";
  const cached = predictionCache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const today = getDateString();

  try {
    // Fetch odds & events in parallel
    const [oddsRes, eventsRes] = await Promise.all([
      fetch(`https://apiv3.apifootball.com/?action=get_odds&from=${today}&to=${today}&APIkey=${APIkey}`),
      fetch(`https://apiv3.apifootball.com/?action=get_events&from=${today}&to=${today}&APIkey=${APIkey}`)
    ]);

    // Parse JSON
    const oddsData = await oddsRes.json();
    const eventsData = await eventsRes.json();

    // Handle API errors gracefully
    if (!Array.isArray(oddsData)) {
      console.error("❌ Odds API error:", oddsData);
      return res.status(500).json({ error: oddsData.error || "Invalid odds data" });
    }
    if (!Array.isArray(eventsData)) {
      console.error("❌ Events API error:", eventsData);
      return res.status(500).json({ error: eventsData.error || "Invalid events data" });
    }

    // Merge odds with events
    const enriched = oddsData
      .map(oddMatch => {
        const event = eventsData.find(ev => ev.match_id === oddMatch.match_id);
        if (!event) return null;

        return {
          match_id: oddMatch.match_id,
          home: event.match_hometeam_name,
          away: event.match_awayteam_name,
          homeLogo: event.team_home_badge,
          awayLogo: event.team_away_badge,
          time: event.match_time,
          league_name: event.league_name,
          score: `${event.match_hometeam_score} - ${event.match_awayteam_score}`,
          odd_1: parseFloat(oddMatch.odd_1),
          odd_2: parseFloat(oddMatch.odd_2)
        };
      })
      .filter(Boolean); // remove nulls

    // Cache result
    predictionCache.set(cacheKey, enriched);

    // Return JSON
    res.json(enriched);

  } catch (error) {
    console.error("❌ Backend prediction error:", error);
    res.status(500).json({ error: "Failed to fetch predictions" });
  }
};
