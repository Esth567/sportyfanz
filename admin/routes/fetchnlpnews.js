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
const { detectEntityFromText } = require('../utils/entityDetect');

const parser = new RSSParser();
const CACHE_KEY = 'news:sports-summaries';
const TTL = 60 * 30; // 30 minutes


async function refreshNewsInBackground() {
  try {
    const data = await generateFreshNews(); // Move the fetching logic into a function
    await redisClient.setEx(CACHE_KEY, TTL, JSON.stringify(data));
    console.log('🔄 Refreshed sports data in background');
  } catch (err) {
    console.error('🚨 Background refresh failed:', err.message);
  }
}


function isTopNewsArticle(article) {
  const topNewsKeywords = [
    'transfer', 'signing', 'departure', 'rumor',
    'match preview', 'match result', 'score', 'analysis',
    'injury', 'suspension',
    'tactics', 'strategy', 'form',
    'performance', 'milestone', 'award',
    'manager', 'coach', 'appointed', 'sacked',
    'tournament', 'world cup', 'champions league', 'euros',
    'controversy', 'scandal', 'investigation', 'allegation',
    'ballon d\'or', 'golden boot',
    'speculation'
  ];

  const content = `${article.title || ''} ${article.fullSummary || ''}`.toLowerCase();
  return topNewsKeywords.some(keyword => content.includes(keyword));
}

function isFootballArticle(item) {
  const title = item.title?.toLowerCase() || '';
  const categories = item.categories?.join(' ').toLowerCase() || '';
  const link = item.link?.toLowerCase() || '';

  return (
    title.includes('football') ||
    title.includes('soccer') ||
    categories.includes('football') ||
    link.includes('/football') ||
    link.includes('/soccer')
  );
}


async function fetchArticleHtmlWithMercury(url) {
  try {
    const result = await Mercury.parse(url);
    return typeof result.content === 'string' ? result.content : null;
  } catch (err) {
    console.warn('Mercury failed:', url, err.message);
    return null;
  }
}



async function generateFreshNews() {

  const rawEntityDB = await redisClient.get('entity:database');
  const entityDb = rawEntityDB ? JSON.parse(rawEntityDB) : {};

  const topNews = [];
  const updates = [];

  for (const feedUrl of feedUrls) {
    try {
      const feed = await parser.parseURL(feedUrl);

      for (const item of feed.items) {
        const articleUrl = item.link;
        if (!articleUrl || !/^https?:\/\//.test(articleUrl) || articleUrl.includes('/live/')) continue;

        const articleHtml = await fetchArticleHtmlWithMercury(articleUrl);
        if (!articleHtml) continue;

        const articleText = extractTextFromHtml(articleHtml);
        if (!articleText || articleText.length < 300) continue;

        let imageUrl = await extractImageFromURL(articleUrl);
        if (!imageUrl?.trim()) {
          imageUrl = 'https://example.com/default-news.jpg';
        }

        
        const chunks = chunkSummary(articleText, 5);
        const fullSummary = chunks.join('\n\n');
        const entities = extractEntities(articleText);
        const sentiment = analyzeSentiment(fullSummary);
        const seoTitle = slugify(item.title, { lower: true, strict: true });
       
        // 👇 Detect main entity (team, player, country) using pre-built database
        const matchedEntity = detectEntityFromText(item.title, entityDb);

        const articleData = {
          title: cleanUnicode(item.title),
          seoTitle,
          link: item.link,
          image: imageUrl,
          paragraphs: chunks.map(cleanUnicode),
          fullSummary: cleanUnicode(fullSummary),
          description: cleanUnicode(chunks[0]),
          date: item.isoDate || item.pubDate || new Date().toISOString(),
          entities,
          sentiment,
          entity: matchedEntity || null
        };

        if (isTopNewsArticle(articleData) && isFootballArticle(item)) {
          topNews.push(articleData); // Only top FOOTBALL news goes to trending
          } else {
           updates.push(articleData); // All other sports go to updates
          }
        }
      } catch (err) {
      console.warn(`⚠️ Failed to process ${feedUrl}:`, err.message);
    }
  }

  // Sort both arrays so the latest articles are first
  topNews.sort((a, b) => new Date(b.date) - new Date(a.date));
  updates.sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    trending: topNews.slice(0, 10),  // latest top 10
    updates: updates.slice(0, 20),   // latest 20 updates
    count: topNews.length + updates.length,
  };
}



router.get('/sports-summaries', async (req, res) => {
  try {
    const staleData = await redisClient.get(CACHE_KEY);
    if (staleData) {
      console.log('⚡ Serving cached sports data (stale)');
      res.status(200).json(JSON.parse(staleData));

      // Trigger background refresh (non-blocking)
      refreshNewsInBackground();
      return;
    }

    // No cache available, generate fresh data synchronously
    const freshData = await generateFreshNews();
    await redisClient.setEx(CACHE_KEY, TTL, JSON.stringify(freshData));
    console.log('📝 Cached sports news in Redis');

    res.status(200).json(freshData);
  } catch (err) {
    console.error('🛑 Error in /sports-summaries route:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});




module.exports = router;

