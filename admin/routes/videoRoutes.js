// routes/videoRoutes.js
const express = require("express");
const router = express.Router();
const { getMatchVideo } = require("../controllers/videoController");

// GET /api/videos/:matchId
router.get("/:matchId", getMatchVideo);

module.exports = router;

