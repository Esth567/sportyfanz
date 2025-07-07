// controllers/leagueController.js
const axios = require('axios');
const cache = require('../utils/cache/redisCache');
require('dotenv').config();

const API_KEY = process.env.API_KEY;
const LEAGUE_TTL = 60 * 60;      // 1 hour
const STANDINGS_TTL = 60 * 15;   // 15 minutes

// Fetch all leagues with Redis caching
exports.getLeagues = async (req, res) => {
    const cacheKey = 'leagues:all';

    try {
        const cached = await cache.get(cacheKey);
        if (cached) {
            return res.status(200).json(JSON.parse(cached));
        }

        const response = await axios.get(`https://apiv3.apifootball.com/?action=get_leagues&APIkey=${API_KEY}`);
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

        const response = await axios.get(`https://apiv3.apifootball.com/?action=get_standings&league_id=${leagueId}&APIkey=${API_KEY}`);
        const data = response.data;

        await cache.set(cacheKey, JSON.stringify(data), STANDINGS_TTL);

        return res.status(200).json(data);
    } catch (err) {
        console.error('Error fetching standings:', err.message);
        return res.status(500).json({ error: 'Failed to fetch league standings' });
    }
};
