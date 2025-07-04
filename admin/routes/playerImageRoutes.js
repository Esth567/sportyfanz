// routes/playerImages.js 
const express = require('express');
const router = express.Router();
const playerImageMap = require('../utils/playerImageMap');

router.get('/player-image-map', (req, res) => {
  res.json(playerImageMap);
});

module.exports = router;
