const express = require('express');
const router = express.Router();
const redisClient = require('../utils/redisClient');
const { buildEntityDatabase } = require('../utils/entityDetect');
const fetch = require('node-fetch'); 

const APIkey = process.env.FOOTBALL_API_KEY;

router.get('/entity-database', async (req, res) => {
  const cacheKey = 'entity:database';

  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const response = await fetch(`https://apiv3.apifootball.com/?action=get_teams&APIkey=${APIkey}`);
    const teams = await response.json();

    const players = [];
    const countriesMap = new Map();

    teams.forEach(team => {
      if (team.players?.length) {
        players.push(...team.players);
      }

      if (team.team_country) {
        countriesMap.set(team.team_country.toLowerCase(), {
          country_name: team.team_country,
          country_logo: team.country_logo || null
        });
      }
    });

    const db = buildEntityDatabase({
      teams,
      players,
      countries: Array.from(countriesMap.values()) // avoid duplicate country entries
    });

    await redisClient.setEx(cacheKey, 3600 * 12, JSON.stringify(db)); // cache for 12 hours
    res.status(200).json(db);

  } catch (err) {
    console.error('🛑 Error in /entity-database:', err.message);
    res.status(500).json({ error: 'Failed to build entity database' });
  }
});


module.exports = router; 