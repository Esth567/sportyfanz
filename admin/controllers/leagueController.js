// controllers/leagueController.js
const axios = require('axios');
const cache = require('../utils/cache/redisCache');
require('dotenv').config();

const API_KEY = process.env.APIFOOTBALL_API_KEY;
const API_URL = 'https://apiv3.apifootball.com/';

const LEAGUE_TTL = 60 * 60;      // 1 hour
const STANDINGS_TTL = 60 * 15;   // 15 minutes
const FORMS_TTL = 60 * 15;
const TTL = 60 * 60; // 1 hour cache

// Fetch all leagues with Redis caching
exports.getLeagues = async (req, res) => {
    const cacheKey = 'leagues:all';

    try {
        const cached = await cache.get(cacheKey);
        if (cached) {
            return res.status(200).json(JSON.parse(cached));
        }

        const response = await axios.get(`${API_URL}?action=get_leagues&APIkey=${API_KEY}`);
        const data = response.data;

        await cache.set(cacheKey, JSON.stringify(data), LEAGUE_TTL);

        return res.status(200).json(data);
    } catch (err) {
        console.error('API Error:', err.message);
        return res.status(500).json({ error: 'Failed to fetch leagues' });
    }
};

// Invalidate league cache manually
exports.clearLeaguesCache = async (req, res) => {
    try {
        await cache.del('leagues:all');
        return res.status(200).json({ message: 'Leagues cache cleared' });
    } catch (err) {
        console.error('Cache clear error:', err.message);
        return res.status(500).json({ error: 'Failed to clear cache' });
    }
};

// Get standings with cache
exports.getStandings = async (req, res) => {
    const leagueId = req.params.leagueId;
    const cacheKey = `standings:${leagueId}`;

    try {
        const cached = await cache.get(cacheKey);
        if (cached) {
            return res.status(200).json(JSON.parse(cached));
        }

        const response = await axios.get(`${API_URL}?action=get_standings&league_id=${leagueId}&APIkey=${API_KEY}`);
        const data = response.data;

        await cache.set(cacheKey, JSON.stringify(data), STANDINGS_TTL);

        return res.status(200).json(data);
    } catch (err) {
        console.error('Error fetching standings:', err.message);
        return res.status(500).json({ error: 'Failed to fetch league standings' });
    }
};


// Helper: Get date in YYYY-MM-DD format
const getTodayDate = (offsetDays = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split('T')[0];
};

// Controller: Fetch recent match form
exports.getRecentForms = async (req, res) => {
  const leagueId = req.params.leagueId;
  const cacheKey = `form:${leagueId}`;

  try {
    const cached = await cache.get(cacheKey);
    if (cached) return res.status(200).json(JSON.parse(cached));

    const url = (`${API_URL}?action=get_events&from=${getTodayDate(-30)}&to=${getTodayDate()}&league_id=${leagueId}&APIkey=${API_KEY}`);
    const axiosResponse = await axios.get(url);
    const data = axiosResponse.data;

    if (!Array.isArray(data)) {
      console.error("Unexpected response format:", data);
      return res.status(500).json({ error: 'Unexpected API response format' });
    }

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

    await cache.set(cacheKey, JSON.stringify(formMap), FORMS_TTL);

    return res.status(200).json(formMap);

  } catch (err) {
    console.error('Error fetching form data:', err.message);
    return res.status(500).json({ error: 'Failed to fetch form data' });
  }
};




//function to get team form

const API_TIMEZONE = "Europe/Berlin";
const SEASON_START_DATE = "2024-08-01";
const CACHE_TTL_SECONDS = 3600; // 1 hour cache

exports.getTeamForm = async (req, res) => {
    const teamId = req.params.teamId;
    const cacheKey = `teamForm-${teamId}`;

    try {
        // Try Redis cache
        const cached = await cache.get(cacheKey);
        if (cached) {
            return res.json(JSON.parse(cached));
        }

        // Validate API key
        if (!API_KEY) {
            return res.status(500).json({ error: "Missing API key" });
        }

        // Fetch from API
        const url = `${API_URL}?action=get_events&team_id=${teamId}&from=${SEASON_START_DATE}&timezone=${API_TIMEZONE}&APIkey=${API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!Array.isArray(data)) {
            return res.status(400).json({ error: "Invalid data received from API" });
        }

        // Cache the response
        await cache.set(cacheKey, JSON.stringify(data), 'EX', CACHE_TTL_SECONDS);

        res.json(data);
    } catch (err) {
        console.error("API Error:", err);
        res.status(500).json({ error: "Failed to fetch team form data" });
    }
};


// function to get team details
exports.getTeamDetails = async (req, res) => {
  const teamId = req.params.teamId;
  const cacheKey = `team:details:${teamId}`;

  try {
    // Check Redis first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    // Fetch from external API
    const url = `${API_URL}?action=get_teams&team_id=${teamId}&APIkey=${API_KEY}`;
    const { data } = await axios.get(url);

    if (!Array.isArray(data) || !data.length) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const team = data[0];

    // Cache result
    await cache.set(cacheKey, JSON.stringify(team), TTL);

    res.status(200).json(team);
  } catch (err) {
    console.error('Error fetching team details:', err.message);
    res.status(500).json({ error: 'Failed to fetch team details' });
  }
};
