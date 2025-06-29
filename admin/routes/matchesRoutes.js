const express = require('express');
const router = express.Router();

const { 
  getLeaguesNames,
  getMatches,
  getMatchesByDate

} = require('../controllers/matchesController');

router.get('/leagues_name', getLeaguesNames);
router.get('/matches', getMatches);
router.get('/matches-by-date', getMatchesByDate);



module.exports = router;