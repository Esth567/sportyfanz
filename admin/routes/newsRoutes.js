const express = require('express');
const router = express.Router();

const {
  getNews,
  getTopstories,
  getUpdatestories 
} = require('../controllers/newsController');



router.get('/news', getNews);
router.get('/trendStories', getTopstories);
router.get('/updateStories', getUpdatestories);



module.exports = router;
