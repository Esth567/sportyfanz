const express = require('express');
const router = express.Router();
const {
    getLeagues,
    clearLeaguesCache,
    getStandings,
    getRecentForms,
    getTeamForm,
    getTeamDetails  
} = require('../controllers/leagueController');

router.get('/leagues', getLeagues);
router.delete('/leagues/cache', clearLeaguesCache); 
router.get('/standings/:leagueId', getStandings);
router.get('/recent-form/:leagueId', getRecentForms);
router.get('/team-form/:teamId', getTeamForm);
router.get('/team/:teamId', getTeamDetails);

module.exports = router;
