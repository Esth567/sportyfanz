const express = require('express');
const router = express.Router();
const {
    getLeagues,
    clearLeaguesCache,
    getStandings 
} = require('../controllers/leagueController');

router.get('/leagues', getLeagues);
router.delete('/leagues/cache', clearLeaguesCache); 
router.get('/standings/:leagueId', getStandings);

module.exports = router;
