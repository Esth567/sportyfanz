const express = require('express');
const router = express.Router();

const { 
  getSelectedLeagues,
  getMatches 
} = require('../controllers/matchesController');

router.get('/leagues_names', getSelectedLeagues);
router.get("/matches", getMatches);



module.exports = router;