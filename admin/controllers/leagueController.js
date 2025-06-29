// controllers/leagueController.js
const fetch = require('node-fetch');
const NodeCache = require("node-cache");

const API_KEY = process.env.API_KEY;

// league cache (5 min)
const getLeaguesCache = new NodeCache({ stdTTL: 300 });

//functin to get league
exports.getLeagues = async (req, res) => {

    const cacheKey = "allLeagues";
    const cached = getLeaguesCache.get(cacheKey);
    if (cached) return res.json(cached)

  try {
    const response = await fetch(`https://apiv3.apifootball.com/?action=get_leagues&APIkey=${API_KEY}`);
    const leagues = await response.json();

    if (!Array.isArray(leagues)) {
      return res.status(500).json({ error: "Invalid leagues data" });
    }

    getLeaguesCache.set(cacheKey, leagues);
    res.json(leagues);
  } catch (error) {
    console.error("❌ League fetch error:", error);
    res.status(500).json({ error: "Failed to fetch leagues" });
  }
};


// Standings cache (5 min)
const standingsCache = new NodeCache({ stdTTL: 300 }); 
//update league table
exports.getStandingsByLeague = async (req, res) => {
  const { leagueId } = req.params;

  if (!leagueId) return res.status(400).json({ error: "Missing leagueId" });

    const cacheKey = `standings_${leagueId}`;
    const cached = standingsCache.get(cacheKey);
    if (cached) return res.json(cached);

  try {
    const response = await fetch(`https://apiv3.apifootball.com/?action=get_standings&league_id=${leagueId}&APIkey=${API_KEY}`);
    const data = await response.json();

    if (!Array.isArray(data)) {
      return res.status(500).json({ error: "Invalid data from standings API" });
    }

    standingsCache.set(cacheKey, data);

    res.json(data);
  } catch (error) {
    console.error("❌ Standings fetch error:", error);
    res.status(500).json({ error: "Failed to fetch standings" });
  }
};

// form cache (5 min)
const formsCache = new NodeCache({ stdTTL: 300 }); // 5 minutes

function getTodayDate(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split("T")[0];
}

// function to get form
exports.getRecentForms = async (req, res) => {
  const { leagueId } = req.params;
  if (!leagueId) return res.status(400).json({ error: "Missing leagueId" });

  const cacheKey = `forms_${leagueId}`;
  const cached = formsCache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const from = getTodayDate(-30);
    const to = getTodayDate();

    const response = await fetch(`https://apiv3.apifootball.com/?action=get_events&from=${from}&to=${to}&league_id=${leagueId}&APIkey=${API_KEY}`);
    const data = await response.json();

    const formMap = {};

    data.forEach(match => {
      const home = match.match_hometeam_name;
      const away = match.match_awayteam_name;
      const homeScore = parseInt(match.match_hometeam_score);
      const awayScore = parseInt(match.match_awayteam_score);

      if (!formMap[home]) formMap[home] = [];
      if (!formMap[away]) formMap[away] = [];

      if (!isNaN(homeScore) && !isNaN(awayScore)) {
        formMap[home].push(homeScore > awayScore ? "W" : homeScore === awayScore ? "D" : "L");
        formMap[away].push(awayScore > homeScore ? "W" : awayScore === homeScore ? "D" : "L");
      }
    });

    Object.keys(formMap).forEach(team => {
      formMap[team] = formMap[team].slice(-5).reverse().join("");
    });

    formsCache.set(cacheKey, formMap);
    res.json(formMap);

  } catch (error) {
    console.error("❌ Error fetching recent forms:", error);
    res.status(500).json({ error: "Failed to fetch recent forms" });
  }
};

// teaam form cache (5 min)
const teamFormCache = new NodeCache({ stdTTL: 300 }); 

// get team form function
exports.getTeamForm = async (req, res) => {
  const { teamId } = req.params;

  if (!teamId) return res.status(400).json({ error: "Missing teamId" });

  const cacheKey = `team_form_${teamId}`;
  const cached = teamFormCache.get(cacheKey);
  if (cached) return res.json({ form: cached });

  try {
    const startDate = "2025-01-01";

    const response = await fetch(`https://apiv3.apifootball.com/?action=get_events&team_id=${teamId}&from=${startDate}&APIkey=${API_KEY}`);
    const matches = await response.json();

    if (!Array.isArray(matches)) {
      return res.status(500).json({ error: "Invalid match data" });
    }

    const form = matches
      .filter(m => m.match_status === "Finished")
      .map(m => {
        const homeScore = parseInt(m.match_hometeam_score);
        const awayScore = parseInt(m.match_awayteam_score);

        if (isNaN(homeScore) || isNaN(awayScore)) return "";

        const isHome = m.team_home_id === teamId;
        const teamScore = isHome ? homeScore : awayScore;
        const opponentScore = isHome ? awayScore : homeScore;

        if (teamScore > opponentScore) return "W";
        if (teamScore < opponentScore) return "L";
        return "D";
      })
      .filter(Boolean)
      .slice(-5)
      .reverse()
      .join("");

    teamFormCache.set(cacheKey, form);
    res.json({ form });

  } catch (error) {
    console.error("❌ Error fetching team form:", error);
    res.status(500).json({ error: "Failed to fetch team form" });
  }
};


// get team deatils
const teamDetailsCache = new NodeCache({ stdTTL: 600 });

//function to get team details
exports.getTeamDetails = async (req, res) => {
  const { teamId } = req.params;

  if (!teamId) return res.status(400).json({ error: "Missing teamId" });

  const cacheKey = `team_details_${teamId}`;
  const cached = teamDetailsCache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const response = await fetch(`https://apiv3.apifootball.com/?action=get_teams&team_id=${teamId}&APIkey=${API_KEY}`);
    const data = await response.json();

    if (!Array.isArray(data) || !data[0]) {
      return res.status(404).json({ error: "Team not found" });
    }

    const team = data[0];
    teamDetailsCache.set(cacheKey, team);

    res.json(team);
  } catch (error) {
    console.error("❌ Error fetching team details:", error);
    res.status(500).json({ error: "Failed to fetch team details" });
  }
};