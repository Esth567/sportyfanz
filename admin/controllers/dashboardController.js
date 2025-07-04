
const fetch = require('node-fetch');
const NodeCache = require("node-cache");
const playerImageMap = require('../utils/playerImageMap');


const APIkey = process.env.FOOTBALL_API_KEY;

// Controller 1: Get Matches
exports.getMatches = async (req, res) => {
  const { from, to } = req.query;

  if (!from || !to) {
    return res.status(400).json({ error: 'Missing query parameters' });
  }

  try {
    const leaguesRes = await fetch(`https://apiv3.apifootball.com/?action=get_leagues&APIkey=${APIkey}`);
    const leagues = await leaguesRes.json();

    if (!Array.isArray(leagues)) {
      return res.status(500).json({ error: 'Failed to retrieve leagues' });
    }

    let matchesList = [];

    for (const league of leagues) {
      try {
        const url = `https://apiv3.apifootball.com/?action=get_events&from=${from}&to=${to}&league_id=${league.league_id}&timezone=Europe/Berlin&APIkey=${APIkey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (Array.isArray(data)) {
          matchesList.push(...data);
        }
      } catch (err) {
        console.warn(`Failed to fetch matches for league ${league.league_name}:`, err.message);
      }
    }

    matchesList.sort((a, b) => {
      const aTime = new Date(`${a.match_date}T${a.match_time}`);
      const bTime = new Date(`${b.match_date}T${b.match_time}`);
      return aTime - bTime;
    });

    //Apply limit before sending the response
    const limit = parseInt(req.query.limit) || 100;
    res.json(matchesList.slice(0, limit));

  } catch (err) {
    console.error('Error fetching matches:', err);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
};


// Controller 2: Get Top Scorers

exports.getTopScorers = async (req, res) => {
  try {
    const limitPerLeague = parseInt(req.query.limitPerLeague) || 3;
    const globalLimit = parseInt(req.query.limit) || 100;

    const leaguesRes = await fetch(`https://apiv3.apifootball.com/?action=get_leagues&APIkey=${APIkey}`);
    const leaguesData = await leaguesRes.json();

    let allScorers = [];

    for (const league of leaguesData) {
      const leagueId = league.league_id;
      const leagueName = league.league_name;

      try {
        const scorerRes = await fetch(`https://apiv3.apifootball.com/?action=get_topscorers&league_id=${leagueId}&APIkey=${APIkey}`);
        const scorers = await scorerRes.json();

        if (!Array.isArray(scorers) || scorers.length === 0) continue;

        const filteredScorers = scorers
          .filter(p => parseInt(p.goals) >= 10)
          .slice(0, limitPerLeague)
          .map(p => ({
            player_name: p.player_name,
            player_image: p.player_image || (playerImageMap[p.player_name]
              ? `/assets/players/${playerImageMap[p.player_name]}`
              : ''),
            team_name: p.team_name,
            league_name: leagueName,
            goals: parseInt(p.goals)
          }));

        allScorers.push(...filteredScorers);
      } catch (innerErr) {
        console.warn(`Failed league ${leagueName}:`, innerErr.message);
      }
    }

    // Sort globally by goals scored, descending
    allScorers.sort((a, b) => b.goals - a.goals);

    // Optional: Limit final list to top N scorers globally
    res.json(allScorers.slice(0, globalLimit));
  } catch (err) {
    console.error("Error fetching global top scorers:", err);
    res.status(500).json({ error: "Failed to fetch top scorers" });
  }
};

//get all leagues
exports.getLeagues = async (req, res) => {
  try {
    const response = await fetch(`https://apiv3.apifootball.com/?action=get_leagues&APIkey=${APIkey}`);
    const data = await response.json();

    if (!Array.isArray(data)) {
      return res.status(500).json({ error: 'Failed to fetch leagues' });
    }

    res.json(data);
  } catch (err) {
    console.error("Error fetching leagues:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
};


// Controller 3: Get Standings
exports.getTopStandings = async (req, res) => {
  const { leagueId } = req.params;

  try {
    const response = await fetch(`https://apiv3.apifootball.com/?action=get_standings&league_id=${leagueId}&APIkey=${APIkey}`);
    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(404).json({ error: 'No standings data found.' });
    }

    res.json(data.slice(0, 5));
  } catch (error) {
    console.error("Error fetching standings:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
};



//function to fetch matches
exports.getAllMatches = async (req, res) => {
  
  const getTodayDate = (offsetDays) => {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    return date.toISOString().split("T")[0];
  };

  try {
    const from = getTodayDate(-7);
    const to = getTodayDate(7);

    const response = await fetch(`https://apiv3.apifootball.com/?action=get_events&from=${from}&to=${to}&APIkey=${APIkey}`);
    const data = await response.json();

    if (!Array.isArray(data)) {
      return res.status(500).json({ error: 'Unexpected API response format' });
    }

    const matchesData = {
      live: data.filter(match => {
        const status = match.match_status?.trim().toLowerCase();
        return status === "live" || (parseInt(status) > 0 && parseInt(status) < 90);
      }),
      highlight: data.filter(match => match.match_status === "Finished"),
      upcoming: data.filter(match => match.match_status === "" || match.match_status == null),
    };

    res.json(matchesData);
  } catch (error) {
    console.error("Error fetching matches:", error);
    res.status(500).json({ error: "Failed to fetch match data" });
  }
};


exports.getMatchesByDate = async (req, res) => {
  
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: 'Missing date parameter' });
  }

  try {
    const url = `https://apiv3.apifootball.com/?action=get_events&from=${date}&to=${date}&APIkey=${APIkey}`;
    const response = await fetch(url);
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

    res.json(filtered);
  } catch (err) {
    console.error("Error fetching matches by date:", err);
    res.status(500).json({ error: "Failed to fetch match data" });
  }
};



//function to load statistic
exports.getMatchStatistics = async (req, res) => {
  const { matchId } = req.query;

  if (!matchId) {
    return res.status(400).json({ error: 'Missing matchId parameter' });
  }

  try {
    const response = await fetch(`https://apiv3.apifootball.com/?action=get_statistics&match_id=${matchId}&APIkey=${APIkey}`);
    const data = await response.json();

    // API structure is object keyed by matchId, e.g., { "match_id": { statistics: [...] } }
    const stats = data[matchId]?.statistics || [];

    res.json({ statistics: stats });
  } catch (error) {
    console.error("📉 Error fetching match statistics:", error);
    res.status(500).json({ error: 'Failed to fetch match statistics' });
  }
};


//functkion to det h2h
exports.getH2HData = async (req, res) => {
  const { homeTeam, awayTeam } = req.query;

  if (!homeTeam || !awayTeam) {
    return res.status(400).json({ error: 'Missing homeTeam or awayTeam' });
  }

  try {
    const url = `https://apiv3.apifootball.com/?action=get_H2H&firstTeam=${encodeURIComponent(homeTeam)}&secondTeam=${encodeURIComponent(awayTeam)}&APIkey=${APIkey}`;
    const response = await fetch(url);
    const data = await response.json();

    const h2hArray = data.firstTeam_VS_secondTeam;

    if (!Array.isArray(h2hArray)) {
      return res.status(404).json({ error: 'No H2H data found' });
    }

    res.json({ matches: h2hArray });
  } catch (error) {
    console.error("H2H Fetch Error:", error);
    res.status(500).json({ error: 'Internal server error while fetching H2H data' });
  }
};


//function to load standings
exports.getStandings = async (req, res) => {
  const { leagueId } = req.query;

  if (!leagueId) {
    return res.status(400).json({ error: "Missing leagueId parameter" });
  }

  try {
    const url = `https://apiv3.apifootball.com/?action=get_standings&league_id=${leagueId}&APIkey=${APIkey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!Array.isArray(data)) {
      return res.status(500).json({ error: "Invalid API response" });
    }

    res.json({ standings: data });
  } catch (error) {
    console.error("❌ Standings fetch error (backend):", error);
    res.status(500).json({ error: "Server error fetching standings" });
  }
};


// ✅ Fetch lineup and dynamically infer formation
exports.getLineups = async (req, res) => {
  const { matchId } = req.query;

  if (!matchId) {
    return res.status(400).json({ error: "Missing matchId parameter" });
  }

  try {
    const url = `https://apiv3.apifootball.com/?action=get_lineups&match_id=${matchId}&APIkey=${APIkey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data || typeof data !== 'object') {
      return res.status(500).json({ error: "Invalid API response" });
    }

    res.json({ lineup: data[matchId]?.lineup || null });
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
    if (cached) return res.json(cached);

  const today = getDateString();

  try {
    const [oddsRes, eventsRes] = await Promise.all([
      fetch(`https://apiv3.apifootball.com/?action=get_odds&from=${today}&to=${today}&APIkey=${APIkey}`),
      fetch(`https://apiv3.apifootball.com/?action=get_events&from=${today}&to=${today}&APIkey=${APIkey}`)
    ]);

    const oddsData = await oddsRes.json();
    const eventsData = await eventsRes.json();

    if (!Array.isArray(oddsData) || !Array.isArray(eventsData)) {
      return res.status(500).json({ error: "Invalid API data" });
    }

    const enriched = oddsData.map(oddMatch => {
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
    }).filter(Boolean);

     predictionCache.set(cacheKey, enriched);
     res.json(enriched);

  } catch (error) {
    console.error("❌ Backend prediction error:", error);
    res.status(500).json({ error: "Failed to fetch predictions" });
  }
};









