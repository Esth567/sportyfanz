const express = require("express");
const router = express.Router();
const {
  getLeagues,
  getMatches,
  getMatchVideo
} = require("../controllers/matchesController");

router.get("/leagues", getLeagues);
router.get("/matches", getMatches);
router.get("/video/:matchId", getMatchVideo);

module.exports = router;
