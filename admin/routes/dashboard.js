const express = require('express');
const router = express.Router();

const {
  getMatches,
  getTopScorers,
  getLeagues,
  getTopStandings,
  getAllMatches,
  getMatchesByDate,
  getMatchStatistics,
  getH2HData,
  getStandings,
  getLineups,
  getTodayPredictions
} = require('../controllers/dashboardController');



router.get('/matches', getMatches);
router.get('/topscorers', getTopScorers);
router.get('/leagues', getLeagues);
router.get('/standings/:leagueId', getTopStandings);
router.get('/all_matches', getAllMatches);
router.get('/matches/by-date', getMatchesByDate);
router.get('/match/statistics', getMatchStatistics);
router.get('/h2h', getH2HData);
router.get('/standings', getStandings);
router.get('/lineups', getLineups);
router.get('/predictions', getTodayPredictions);


module.exports = router;
