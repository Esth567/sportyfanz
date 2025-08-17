
const fetch = require('node-fetch');
const NodeCache = require("node-cache");
const cache = require('../utils/cache/redisCache');
const playerImageMap = require('../utils/playerImageMap');


const APIkey = process.env.FOOTBALL_API_KEY;

// Display matches for live-match-demo
const getMatchesCache = new NodeCache({ stdTTL: 300 });

exports.getMatches = async (req, res) => {
  const { from, to } = req.query;
  const limit = parseInt(req.query.limit) || 100;

  if (!from || !to) {
    return res.status(400).json({ error: 'Missing query parameters' });
  }

  const cacheKey = `matches_${from}_${to}_${limit}`; // ✅ specific key
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
    getMatchesCache.set(cacheKey, result); // ✅ cache based on key
    res.json(result);

  } catch (err) {
    console.error('Error fetching matches:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
    
};



// function to fetch top scorer
const topScorersCache = new NodeCache({ stdTTL: 300 });

exports.getTopScorers = async (req, res) => {
  const limitPerLeague = parseInt(req.query.limitPerLeague) || 3;
  const globalLimit = parseInt(req.query.limit) || 100;

  // ✅ Generate a specific cache key
  const cacheKey = `topScorers_${limitPerLeague}_${globalLimit}`;
  const cached = topScorersCache.get(cacheKey);
 if (cached) return res.json(cached);

 try {
    const leaguesRes = await fetch(`https://apiv3.apifootball.com/?action=get_leagues&APIkey=${APIkey}`);
    if (!leaguesRes.ok) return res.status(502).json({ error: "Failed to fetch leagues" });

    const leaguesData = await leaguesRes.json();
    if (!Array.isArray(leaguesData)) return res.status(500).json({ error: "Invalid leagues structure" });

    let allScorers = [];

    for (const league of leaguesData) {
      const leagueId = league.league_id;
      const leagueName = league.league_name;

      try {
        const scorerRes = await fetch(`https://apiv3.apifootball.com/?action=get_topscorers&league_id=${leagueId}&APIkey=${APIkey}`);
        if (!scorerRes.ok) {
          console.warn(`Failed to fetch scorers for league ${leagueName}: ${scorerRes.status}`);
          continue;
        }

        const scorers = await scorerRes.json();
        if (!Array.isArray(scorers) || scorers.length === 0) continue;

        const filteredScorers = scorers
          .filter(p => parseInt(p.goals) >= 10)
          .slice(0, limitPerLeague)
          .map(p => ({
            player_name: p.player_name,
            player_image: p.player_image || "",
            team_name: p.team_name,
            league_name: leagueName,
            goals: parseInt(p.goals)
          }));

        allScorers.push(...filteredScorers);
      } catch (err) {
        console.warn(`Error processing league ${leagueName}:`, err.message);
      }
    }

    allScorers.sort((a, b) => b.goals - a.goals);
    const finalList = allScorers.slice(0, globalLimit);

    topScorersCache.set(cacheKey, finalList);
    res.json(finalList);

  } catch (err) {
    console.error("Error fetching global top scorers:", err);
    res.status(500).json({ error: "Failed to fetch top scorers" });
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

    // ✅ Set to cache
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

const allMatchesCache = new NodeCache({ stdTTL: 300 }); // cache for 5 minutes

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

const matchesByDateCache = new NodeCache({ stdTTL: 300 }); // cache for 5 minutes

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

const matchStatsCache = new NodeCache({ stdTTL: 300 }); // cache for 5 minutes

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

exports.getH2HData = async (req, res) => {
  const { homeTeam, awayTeam } = req.query;

  if (!homeTeam || !awayTeam) {
    return res.status(400).json({ error: 'Missing homeTeam or awayTeam' });
  }

  const cacheKey = `h2h_${homeTeam}_${awayTeam}`;
  const cached = h2hCache.get(cacheKey);
  if (cached) {
    return res.json({ matches: cached });
  }

  try {
    const url = `https://apiv3.apifootball.com/?action=get_H2H&firstTeam=${encodeURIComponent(homeTeam)}&secondTeam=${encodeURIComponent(awayTeam)}&APIkey=${APIkey}`;
    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ error: 'API Error', details: text });
    }

    const data = await response.json();
    const h2hArray = data.firstTeam_VS_secondTeam;

    if (!Array.isArray(h2hArray)) {
      return res.status(404).json({ error: 'No H2H data found' });
    }

    // ✅ Store result in cache
    h2hCache.set(cacheKey, h2hArray);

    res.json({ matches: h2hArray });
  } catch (error) {
    console.error("H2H Fetch Error:", error);
    res.status(500).json({ error: 'Internal server error while fetching H2H data' });
  }
};


//function to load standings

const standingsCache = new NodeCache({ stdTTL: 300 }); // 5 minutes TTL

exports.getStandings = async (req, res) => {
  const { leagueId } = req.query;

  if (!leagueId) {
    return res.status(400).json({ error: "Missing leagueId parameter" });
  }

  const cacheKey = `standings_${leagueId}`;
  const cached = standingsCache.get(cacheKey);

  if (cached) {
    return res.json({ standings: cached });
  }

  try {
    const url = `https://apiv3.apifootball.com/?action=get_standings&league_id=${leagueId}&APIkey=${APIkey}`;
    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ error: "Failed to fetch standings", details: text });
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
       console.warn("⚠️ Invalid API response structure:", data);
       standingsCache.set(cacheKey, []); // still cache empty to avoid repeated bad calls
      return res.json({ standings: [] }); // ensure consistent response
     }

     // ✅ Save to cache
      standingsCache.set(cacheKey, data);

      // ✅ Always return consistent shape
    res.json({ standings: Array.isArray(data) ? data : [] });

  } catch (error) {
    console.error("❌ Standings fetch error (backend):", error);
    res.status(500).json({ error: "Server error fetching standings" });
  }
};



// ✅ Fetch lineup and dynamically infer formation
const lineupCache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache

exports.getLineups = async (req, res) => {
  const { matchId } = req.query;

  if (!matchId) {
    return res.status(400).json({ error: "Missing matchId parameter" });
  }

  const cacheKey = `lineup_${matchId}`;
  const cached = lineupCache.get(cacheKey);

  if (cached) {
    return res.json({ lineup: cached });
  }

  try {
    const url = `https://apiv3.apifootball.com/?action=get_lineups&match_id=${matchId}&APIkey=${APIkey}`;
    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ error: "API response failed", details: text });
    }

    const data = await response.json();

    if (!data || typeof data !== 'object') {
      return res.status(500).json({ error: "Invalid API response" });
    }

    const lineup = data[matchId]?.lineup || null;

    // ✅ Store in cache
    lineupCache.set(cacheKey, lineup);

    res.json({ lineup });
  } catch (error) {
    console.error("❌ Error fetching lineups (backend):", error);
    res.status(500).json({ error: "Failed to fetch lineups" });
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









