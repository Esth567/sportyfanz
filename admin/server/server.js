const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { User, Data } = require("../database/db");  // ✅ Correct Import
require("dotenv").config();
const fetch = require('node-fetch');

const app = express();
app.use(bodyParser.json());
app.use(cors({ origin: "*", methods: ["GET", "POST"], allowedHeaders: ["Content-Type", "Authorization"] }));

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const users = [
    { username: "admin", password: "$2b$10$GjGWA1HRyM3nEd1blk/DD.sdCmes8IUQj1H9eIIAyD4lvesQ/4yTq", role: "super-admin" }, // Password: Admin@123
    { username: "editor", password: "$2b$10$iphbCHYYvUQ7fl239Hf6Ge2K6yO2NdBYRcGwN.LPjUbVtOsigNYLa", role: "editor" }  // Password: Editor@123
];

// 🔐 Secure Login Endpoint
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const user = users.find((u) => u.username === username);

    if (!user) return res.status(401).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ token });
});

// 🛡️ Middleware to Protect Routes
const verifyToken = (req, res, next) => {
    const token = req.headers["authorization"];
    if (!token) return res.status(403).json({ message: "Access denied" });

    jwt.verify(token.split(" ")[1], process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ message: "Invalid token" });
        req.user = decoded;
        next();
    });
};

// 📌 Protected Admin Dashboard Route
app.get("/admin-dashboard", verifyToken, (req, res) => {
    console.log("User Data from Token:", req.user);
    if (req.user.role !== "super-admin") {
        return res.status(403).json({ message: "Access denied. Admins only." });
    }
    res.json({ message: "Welcome to Admin Dashboard" });
});

// 📌 API Routes
app.get("/data", async (req, res) => {
    try {
        const data = await Data.findOne();
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});

app.post("/update", async (req, res) => {
    try {
        const { team1, team2, league, image, headline } = req.body;
        let data = await Data.findOne();

        if (!data) data = new Data({ liveMatch: {}, newsUpdate: {} });

        if (team1) data.liveMatch.team1 = team1;
        if (team2) data.liveMatch.team2 = team2;
        if (league) data.liveMatch.league = league;
        if (image) data.newsUpdate.image = image;
        if (headline) data.newsUpdate.headline = headline;

        await data.save();
        res.json({ message: "Updated successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});

app.get('/api/news', async (req, res) => {
    try {
      const response = await axios.post('http://localhost:5001/summarize', {
        rss_url: 'https://www.espn.com/espn/rss/news'
      });
  
      res.json(response.data);
    } catch (err) {
      console.error("Node proxy failed:", err.message);
      res.status(500).json({ error: 'Summarizer failed' });
    }
  });
  
// ✅ Export Express App
module.exports = app;
