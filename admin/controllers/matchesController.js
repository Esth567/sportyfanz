// controllers/matchesController.js
const axios = require('axios');
const cache = require('../utils/cache/redisCache');
require('dotenv').config();

const API_KEY = process.env.API_KEY;
const LEAGUE_FILTER_TTL = 60 * 60; // 1 hour cache
const MATCHES_TTL = 60 * 5; // 5 minutes cache

const leaguesSelected = {
  "Premier League": { country: "England" },
  "La Liga": { country: "Spain" },
  "Ligue 1": { country: "France" },
  "Ligue 2": { country: "France" },
  "Serie A": { country: "Italy" },
  "NPFL": { country: "Nigeria" },
  "Bundesliga": { country: "Germany" },
  "UEFA Champions League": { country: "eurocups" },
  "Africa Cup of Nations Qualification": { country: "intl" }
};

exports.getSelectedLeagues = async (req, res) => {
  const cacheKey = 'leagues:selected';

  try {
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const url = `https://apiv3.apifootball.com/?action=get_leagues&APIkey=${API_KEY}`;
    const response = await axios.get(url);
    const allLeagues = response.data;

    const filteredLeagues = allLeagues.filter(league => {
      const name = league.league_name?.trim();
      const country = league.country_name?.trim().toLowerCase();

      return leaguesSelected[name] && leaguesSelected[name].country.toLowerCase() === country;
    });

    await cache.set(cacheKey, JSON.stringify(filteredLeagues), LEAGUE_FILTER_TTL);
    res.status(200).json(filteredLeagues);
  } catch (err) {
    console.error("Failed to fetch selected leagues:", err.message);
    res.status(500).json({ error: "Failed to fetch selected leagues" });
  }
};



// Get matches from 7 days before today to 7 days ahead
exports.getMatches = async (req, res) => {
  const from = req.query.from;
  const to = req.query.to;
  const cacheKey = `matches:from:${from}:to:${to}`;

  try {
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const url = `https://apiv3.apifootball.com/?action=get_events&from=${from}&to=${to}&APIkey=${API_KEY}`;
    const { data } = await axios.get(url);

    if (!Array.isArray(data)) {
      console.error("Invalid match data from API", data);
      return res.status(500).json({ error: "Invalid match data from API" });
    }

    await cache.set(cacheKey, JSON.stringify(data), MATCHES_TTL);
    res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching match data:", err.message);
    res.status(500).json({ error: "Failed to fetch match data" });
  }
};
