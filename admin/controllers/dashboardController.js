
const fetch = require('node-fetch');
const NodeCache = require("node-cache");


const APIkey = process.env.FOOTBALL_API_KEY;

// Controller 1: Get Matches
exports.getMatches = async (req, res) => {
  const { from, to, leagueIDs } = req.query;

  if (!from || !to || !leagueIDs) {
    return res.status(400).json({ error: 'Missing query parameters' });
  }

  try {
    const ids = leagueIDs.split(',');
    let matchesList = [];

    for (let id of ids) {
      const url = `https://apiv3.apifootball.com/?action=get_events&from=${from}&to=${to}&league_id=${id}&timezone=Europe/Berlin&APIkey=${APIkey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (Array.isArray(data)) {
        matchesList = [...matchesList, ...data];
      }
    }

    matchesList.sort((a, b) => {
      const aTime = new Date(`${a.match_date}T${a.match_time}`);
      const bTime = new Date(`${b.match_date}T${b.match_time}`);
      return aTime - bTime;
    });

    res.json(matchesList);
  } catch (err) {
    console.error('Error fetching matches:', err);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
};

// Controller 2: Get Top Scorers
exports.getTopScorers = async (req, res) => {
  try {
    const topLeagues = [
      "Premier League", "La Liga", "Bundesliga", "Serie A", "Ligue 1"
    ];

    const leaguesRes = await fetch(`https://apiv3.apifootball.com/?action=get_leagues&APIkey=${APIkey}`);
    const leaguesData = await leaguesRes.json();

    let topScorers = [];

    for (const league of leaguesData) {
      if (!topLeagues.includes(league.league_name)) continue;

      const leagueId = league.league_id;
      const scorerRes = await fetch(`https://apiv3.apifootball.com/?action=get_topscorers&league_id=${leagueId}&APIkey=${APIkey}`);
      const scorers = await scorerRes.json();

      if (!Array.isArray(scorers) || scorers.length === 0) continue;

      const topScorer = scorers.sort((a, b) => b.goals - a.goals)[0];
      if (topScorer.goals < 15) continue;

      topScorers.push({
        player_name: topScorer.player_name,
        player_image: topScorer.player_image,
        team_name: topScorer.team_name,
        league_name: league.league_name,
        goals: topScorer.goals
      });
    }

    res.json(topScorers);
  } catch (err) {
    console.error("Error fetching top scorers:", err);
    res.status(500).json({ error: "Failed to fetch top scorers" });
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

    const topFive = data.slice(0, 5);
    res.json(topFive);
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









