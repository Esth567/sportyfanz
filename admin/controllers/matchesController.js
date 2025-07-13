// controllers/matchesController.js
const fetch = require("node-fetch");
const cache = require("../utils/cache/redisCache");
require("dotenv").config();

const API_KEY = process.env.FOOTBALL_API_KEY;

const baseUrl = `https://apiv3.apifootball.com`;

exports.getLeagues = async (req, res) => {
  const cacheKey = "leagues";
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const response = await fetch(`${baseUrl}/?action=get_leagues&APIkey=${API_KEY}`);
    const data = await response.json();
    cache.set(cacheKey, data);
    res.json(data);
  } catch (err) {
    console.error("Error fetching leagues:", err);
    res.status(500).json({ error: "Failed to fetch leagues" });
  }
};

exports.getMatches = async (req, res) => {
  const { from, to } = req.query;
  const cacheKey = `matches_${from}_${to}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const url = `${baseUrl}/?action=get_events&from=${from}&to=${to}&APIkey=${API_KEY}`;
    const response = await fetch(url, {
      headers: { 'Accept-Encoding': 'identity' } // Prevent gzip issues
    });

    const text = await response.text();
    const data = JSON.parse(text);

    cache.set(cacheKey, data);
    res.json(data);
  } catch (err) {
    console.error("Error fetching matches:", err);
    res.status(500).json({ error: "Failed to fetch match data" });
  }
};


exports.getMatchVideo = async (req, res) => {
  const { matchId } = req.params;
  const cacheKey = `video_${matchId}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const url = `${baseUrl}/?action=get_videos&match_id=${matchId}&APIkey=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    cache.set(cacheKey, data);
    res.json(data);
  } catch (err) {
    console.error("Error fetching video:", err);
    res.status(500).json({ error: "Failed to fetch video" });
  }
};
