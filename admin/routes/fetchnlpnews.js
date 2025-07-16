// routes/fetchnlpnews.js
const express = require('express');
const router = express.Router(); // ✅ this is correct
const RSSParser = require('rss-parser');
const axios = require('axios');
const {
  extractTextFromHtml,
  extractEntities,
  analyzeSentiment,
  chunkSummary,
} = require('../utils/nlpfetchnews'); // ✅ fix relative path
const { summarizeText } = require('../utils/nlpsummarize');
const feedUrls = require('../utils/rssFeeds');

const parser = new RSSParser();

router.get('/sports-summaries', async (req, res) => {
  const allSummaries = [];

  for (const feedUrl of feedUrls) {
    try {
      const feed = await parser.parseURL(feedUrl);

      for (const item of feed.items.slice(0, 2)) {
        const articleUrl = item.link;
        const articleHtml = (await axios.get(articleUrl)).data;
        const articleText = extractTextFromHtml(articleHtml);

        if (!articleText || articleText.length < 1000) continue;

        const summary = await summarizeText(articleText);
        const paragraphs = chunkSummary(summary, 4);
        const entities = extractEntities(articleText);
        const sentiment = analyzeSentiment(summary);

        allSummaries.push({
          source: feedUrl,
          title: item.title,
          link: item.link,
          paragraphs,
          entities,
          sentiment,
        });
      }
    } catch (err) {
      console.warn(`Failed to process ${feedUrl}:`, err.message);
    }
  }

  res.json({ count: allSummaries.length, results: allSummaries });
});

module.exports = router; // ✅ now correct
