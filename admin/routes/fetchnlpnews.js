const express = require('express');
const router = express.Router();
const RSSParser = require('rss-parser');
const Mercury = require('@postlight/mercury-parser');
const slugify = require('slugify');
const { cleanUnicode } = require('../utils/cleanText');
const {
  extractTextFromHtml,
  extractEntities,
  analyzeSentiment,
  chunkSummary,
} = require('../utils/nlpfetchnews');
const feedUrls = require('../utils/rssFeeds');
const { extractImageFromURL } = require('../utils/extractImageFromURL');
const redisClient = require('../utils/redisClient');

const fallbackImage = process.env.DEFAULT_NEWS_IMAGE || 'https://example.com/default-news.jpg';

const parser = new RSSParser();
const CACHE_KEY = 'sports-news-cache';
const TTL = 60 * 30; // 30 minutes

function extractCategories(categoryList) {
  if (!Array.isArray(categoryList)) return [];
  return categoryList.map(cat => {
    if (typeof cat === 'string') return cat;
    if (typeof cat === 'object' && '_' in cat) return cat._;
    return '';
  }).filter(Boolean);
}


function isTopNewsArticle(article) {
  const safeTitle = typeof article.title === 'string' ? article.title : '';
  const safeSummary = typeof article.fullSummary === 'string' ? article.fullSummary : '';
  const content = `${safeTitle} ${safeSummary}`.toLowerCase();

  const topNewsKeywords = [
    'transfer', 'signing', 'departure', 'rumor', 
    'match preview', 'match result', 'score', 'analysis','signing', 'record',
    'injury', 'suspension', 'tactics', 'strategy', 'form',"title",
    'performance', 'milestone', 'award', 'manager', 'coach',
    'appointed', 'sacked', 'tournament', 'world cup', 'win', 'victory',
    'champions league', 'euros', 'controversy', 'scandal', 'championship', 'final',
    'investigation', 'allegation', 'ballon d\'or', 'golden boot', 
    'speculation', "defeat",
  ];

  return topNewsKeywords.some(keyword => content.includes(keyword));
}

const fetchArticleHtmlWithMercury = async (url) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const result = await Mercury.parse(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!result || !result.content) return null;
    return typeof result.content === 'string' ? result.content : null;
  } catch (err) {
    console.error(`Error fetching article HTML from ${url}:`, err.message);
    return null;
  }
};

router.get('/sports-summaries', async (req, res) => {
  const allSummaries = [];

  try {
    for (const feedUrl of feedUrls) {
      try {
        const feed = await parser.parseURL(feedUrl);

        for (const item of feed.items) {
          try {
            const articleUrl = item.link;
            if (!articleUrl || !/^https?:\/\//.test(articleUrl)) continue;

            const articleHtml = await fetchArticleHtmlWithMercury(articleUrl);
            if (!articleHtml) continue;

            const articleText = extractTextFromHtml(articleHtml);
            if (!articleText || articleText.length < 300) continue;

            // ✅ Get image URL or fallback
            let imageUrl = item.enclosure?.url || item.image || '';
            if (!imageUrl?.trim()) {
              imageUrl = 'https://example.com/default-news.jpg'; // Replace with a real fallback image URL
            }

            const title = cleanUnicode(item.title);
            const chunks = chunkSummary(articleText, 5);
            const fullSummary = chunks.join(' ');
            if (!fullSummary || typeof fullSummary !== 'string') continue;

            const description = cleanUnicode(chunks[0] || '');
            const entities = extractEntities(articleText);
            const sentiment = analyzeSentiment(articleText);
            const seoTitle = slugify(title, { lower: true, strict: true });

            allSummaries.push({
              title,
              seoTitle,
              link: articleUrl,
              image: imageUrl,
              paragraphs: chunks.map(cleanUnicode),
              fullSummary: cleanUnicode(fullSummary),
              description,
              date: item.isoDate || item.pubDate || new Date().toISOString(),
              entities,
              sentiment,
            });
          } catch (err) {
            console.warn(`⚠️ Failed to process item from ${feedUrl}:`, err.message);
            continue;
          }
        }
      } catch (err) {
        console.warn(`⚠️ Failed to parse feed ${feedUrl}:`, err.message);
        continue;
      }
    }

    res.status(200).json({ count: allSummaries.length, results: allSummaries });
  } catch (err) {
    console.error('🛑 Error in /sports-summaries route:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.delete('/clear-cache', async (req, res) => {
  try {
    await redisClient.del(CACHE_KEY);
    res.status(200).json({ message: 'Cache cleared' });
  } catch (err) {
    console.error('❌ Failed to clear cache:', err.message);
    res.status(500).json({ error: 'Cache clear failed' });
  }
});

module.exports = router;
