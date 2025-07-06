const express = require('express');
const router = express.Router();

const {
  getNews,
  getTopstories,
  getUpdatestories 
} = require('../controllers/newsController');



router.get('/news', getNews);
router.get('/trendstories', getTopstories);
router.get('/updatestories', getUpdatestories);



module.exports = router;
