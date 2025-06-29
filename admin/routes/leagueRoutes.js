const express = require('express');
const router = express.Router();

const { 
  getLeagues,
  getStandingsByLeague,
  getRecentForms,
  getTeamForm,
  getTeamDetails 

} = require('../controllers/leagueController');

router.get('/api/leagues', getLeagues);
router.get('/standings/:leagueId', getStandingsByLeague);
router.get('/api/forms/:leagueId', getRecentForms);
router.get('/form/:teamId', getTeamForm);
router.get('/details/:teamId', getTeamDetails);


module.exports = router;
