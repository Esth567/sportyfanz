const express = require('express');
const router = express.Router();
const RSSParser = require('rss-parser');
const Mercury = require('@postlight/mercury-parser');
const slugify = require('slugify');
const axios = require('axios');
const cheerio = require('cheerio');
const { cleanUnicode } = require('../utils/cleanText');
const {
  extractTextFromHtml,
  extractEntities,
  analyzeSentiment,
  chunkSummary,
} = require('../utils/nlpfetchnews');
const feedUrls = require('../utils/rssFeeds');
const { extractImageFromURL } = require('../utils/extractImageFromURL');
const getRedisClient = require('../utils/redisClient');
const { detectEntityFromText } = require('../utils/entityDetect');

const parser = new RSSParser();
const CACHE_KEY = 'news:sports-summaries';
const TTL = 60 * 30; // 30 minutes


async function refreshNewsInBackground() {
  try {
    const redisClient = await getRedisClient();
    const data = await generateFreshNews();
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


const fetchArticleHtmlWithAxios = async (url) => {
  try {
    const { data: html } = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const $ = cheerio.load(html);

    // Try to extract main content from typical article containers
    const selectors = [
      'article',
      '.article-content',
      '.entry-content',
      '#article-body',
      '[itemprop="articleBody"]',
      '.story-body',
      '.main-content',
    ];

    for (const selector of selectors) {
      const content = $(selector).text().trim();
      if (content.length > 300) return content;
    }

    // fallback: return entire page text if we can't extract main section
    const fallback = $('body').text().trim();
    return fallback.length > 300 ? fallback : null;

  } catch (err) {
    console.warn(`❌ Axios fetch failed for ${url}: ${err.message}`);
    return null;
  }
};



async function generateFreshNews() {

  const redisClient = await getRedisClient();
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

        const articleHtml = await fetchArticleHtmlWithAxios(articleUrl);
        if (!articleHtml) continue;

        const articleText = extractTextFromHtml(articleHtml);
        if (!articleText || articleText.length < 300) continue;

        let imageUrl = await extractImageFromURL(articleUrl);
        if (!imageUrl?.trim()) {
          console.warn(`⚠️ No image found for: ${item.link}`);
          imageUrl = 'https://sportyfanz.com/assets/images/default-payer.png';
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
      console.warn(`⚠️ Failed to process ${feedUrl}:\n`, err);  // Full stack trace
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
    const redisClient = await getRedisClient();
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

