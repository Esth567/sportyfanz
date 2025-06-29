const express = require('express');
const router = express.Router();
const { getMatchVideo } = require('../controllers/videoController');

router.get('/match-video/:matchId', getMatchVideo); // /api/match-video/:matchId

module.exports = router;
