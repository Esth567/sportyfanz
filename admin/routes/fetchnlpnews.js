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

function isTopNewsArticle(article) {
  const topNewsKeywords = [
    'transfer', 'signing', 'departure', 'rumor',
    'match preview', 'match result', 'score', 'analysis',
    'injury', 'suspension', 'tactics', 'strategy', 'form',
    'performance', 'milestone', 'award', 'manager', 'coach',
    'appointed', 'sacked', 'tournament', 'world cup',
    'champions league', 'euros', 'controversy', 'scandal',
    'investigation', 'allegation', 'ballon d\'or', 'golden boot',
    'speculation'
  ];

  const content = `${article.title || ''} ${article.fullSummary || ''}`.toLowerCase();
  return topNewsKeywords.some(keyword => content.includes(keyword));
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

router.get('/sports-summaries', async (req, res) => {
  try {
    // Redis cache check
    const cachedData = await redisClient.get(CACHE_KEY);
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      if (parsed?.trending?.length || parsed?.updates?.length) {
        console.log('⚡ Serving from Redis cache');
        return res.status(200).json(parsed);
      }
      console.warn('⚠️ Redis cache was empty, refetching...');
    }

    const topNews = [];
    const updates = [];

    for (const feedUrl of feedUrls) {
      try {
        const feed = await parser.parseURL(feedUrl);

        for (const item of feed.items.slice(0, 2)) {
          try {
            const articleUrl = item.link;
            if (!articleUrl || !/^https?:\/\//.test(articleUrl) || articleUrl.includes('/live/')) continue;

            const articleHtml = await fetchArticleHtmlWithMercury(articleUrl);
            if (!articleHtml) continue;

            const articleText = extractTextFromHtml(articleHtml);
            if (!articleText || articleText.length < 300) continue;

            let imageUrl = await extractImageFromURL(articleUrl);
            if (!imageUrl?.trim()) {
              imageUrl = fallbackImage;
            }

            const chunks = chunkSummary(articleText, 5);
            const fullSummary = chunks.join(' ');
            const entities = extractEntities(articleText);
            const sentiment = analyzeSentiment(fullSummary);
            const seoTitle = slugify(item.title, { lower: true, strict: true });

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
            };

            if (isFootballArticle(item)) {
              if (isTopNewsArticle(articleData)) {
                console.log('🔥 Top news match:', articleData.title);
                topNews.push(articleData);
              } else {
                updates.push(articleData);
              }
            }
          } catch (articleErr) {
            console.warn(`❌ Article processing error: ${item.link}`, articleErr.message);
          }
        }
      } catch (feedErr) {
        console.warn(`⚠️ Failed to process ${feedUrl}:`, feedErr.message);
      }
    }

    const responseData = {
      trending: topNews.slice(0, 10),
      updates: updates.slice(0, 20),
      count: topNews.length + updates.length,
    };

    // Save to Redis cache
    try {
      await redisClient.set(CACHE_KEY, JSON.stringify(responseData), { EX: TTL });
      console.log('📝 Cached sports news in Redis');
    } catch (redisErr) {
      console.error('❌ Redis cache write error:', redisErr.message);
    }

    res.status(200).json(responseData);
  } catch (err) {
    console.error('🛑 Error in /sports-summaries route:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cache clearing endpoint
router.delete('/clear-cache', async (req, res) => {
  try {
    await redisClient.del(CACHE_KEY);
    console.log('🧹 Cache cleared');
    res.status(200).json({ message: 'Cache cleared' });
  } catch (err) {
    console.error('❌ Failed to clear cache:', err.message);
    res.status(500).json({ error: 'Cache clear failed' });
  }
});

module.exports = router;
