// routes/fetchnlpnews.js
const express = require('express');
const router = express.Router();
const RSSParser = require('rss-parser');
const axios = require('axios');
const {
  extractTextFromHtml,
  extractEntities,
  analyzeSentiment,
  chunkSummary,
} = require('../utils/nlpfetchnews');
const { summarizeText } = require('../utils/nlpsummarize');
const feedUrls = require('../utils/rssFeeds');

const parser = new RSSParser();

// ✅ Utility to split article into overlapping chunks
function splitArticle(text, maxLen = 1800, overlap = 200) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + maxLen));
    i += (maxLen - overlap);
  }
  return chunks;
}

router.get('/sports-summaries', async (req, res) => {
  const allSummaries = [];

  try {
    for (const feedUrl of feedUrls) {
      try {
        const feed = await parser.parseURL(feedUrl);

        for (const item of feed.items.slice(0, 2)) {
          const articleUrl = item.link;
          const articleHtml = (await axios.get(articleUrl)).data;
          const articleText = extractTextFromHtml(articleHtml);

          if (!articleText || articleText.length < 1000) continue;

          const chunks = splitArticle(articleText, 1800, 200);
          const summaries = [];

          for (const chunk of chunks.slice(0, 3)) {
            const summary = await summarizeText(chunk);
            summaries.push(summary);
          }

          const fullSummary = summaries.join(' ');
const paragraphs = chunkSummary(fullSummary, 300);

// 🛑 Skip if paragraphs are empty or blank
if (paragraphs.length === 0 || paragraphs.some(p => !p.trim())) {
  console.warn(`Skipping article "${item.title}" due to empty summary`);
  continue;
}

    const entities = extractEntities(articleText);
    const sentiment = analyzeSentiment(fullSummary);

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

    res.status(200).json({ count: allSummaries.length, results: allSummaries });

  } catch (err) {
    console.error('🛑 Error in /sports-summaries route:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
