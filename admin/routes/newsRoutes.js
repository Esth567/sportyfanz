const express = require('express');
const router = express.Router();

const {
  getNews,
  getTopstories 
} = require('../controllers/newsController');



router.get('/news', getNews);
router.get('/topStories', getTopstories);



module.exports = router;
