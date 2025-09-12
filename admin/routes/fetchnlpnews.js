const express = require('express');
const router = express.Router();
const RSSParser = require('rss-parser');
const slugify = require('slugify');
const axios = require('axios');
const axiosRetry = require('axios-retry').default || require('axios-retry');
const cheerio = require('cheerio');
const pLimit = require('p-limit').default;
const { cleanUnicode } = require('../utils/cleanText');
const boilerplateFilters = require('../config/boilerplateFilters.json');
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
const keywords = require('../config/footballKeywords.json');

const parser = new RSSParser();
const CACHE_KEY = 'news:sports-summaries';
const TTL = 60 * 30; // 30 minutes

// Retry strategy for axios
axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
});


function isTopNewsArticle(article) {
  const topNewsKeywords = [
    'transfer', 'signing', 'departure', 'rumor',
    'match preview', 'match result', 'score', 'analysis',
    'injury', 'suspension', 'tactics', 'strategy', 'form',
    'performance', 'milestone', 'award', 'manager', 'coach',
    'appointed', 'sacked', 'tournament', 'world cup',
    'champions league', 'euros', 'controversy', 'scandal',
    'investigation', 'allegation', 'ballon d\'or',
    'golden boot', 'speculation'
  ];
  const content = `${article.title || ''} ${article.fullSummary || ''}`.toLowerCase();
  return topNewsKeywords.some(keyword => content.includes(keyword));
}

function isFootballArticle(article) {
  const footballKeywords = [
    'football', 'soccer', 'futbol',
    'premier league', 'la liga', 'serie a', 'bundesliga', 'ligue 1',
    'champions league', 'europa league', 'conference league',
    'world cup', 'afcon', 'africa cup of nations',
    'caf champions league', 'caf confederation cup',
    'super eagles', 'nigeria', 'ghana', 'cameroon', 'senegal',
    'fifa', 'uefa', 'caf'
  ];

  // Non-soccer exclusions (American football, other sports)
  const excludedKeywords = [
    'nfl', 'american football', 'super bowl', 'college football',
    'nba', 'basketball', 'mlb', 'baseball',
    'nhl', 'hockey', 'rugby', 'cricket',
    'golf', 'tennis', 'volleyball', 'handball'
  ];

  const textParts = [
    article.title || '',
    article.fullSummary || '',
    article.description || '',
    article.link || '',
    Array.isArray(article.categories) ? article.categories.join(' ') : ''
  ].map(s => s.toString().toLowerCase());

  // If excluded sport keywords appear → reject immediately
  if (excludedKeywords.some(keyword => 
        textParts.some(txt => txt.includes(keyword)))) {
    return false;
  }

  // ✅ Otherwise, require soccer-related keywords
  return footballKeywords.some(keyword =>
    textParts.some(txt => 
      txt.includes(keyword) || txt.includes(keyword.replace(/\s+/g, '-')))
  );
}




function cleanArticleText(text) {
  if (!text) return '';

  let stripped = text
  // remove possessives like "Adam Schefter's"
    .replace(/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*'s\s+/g, '')
    // remove fantasy/promo boilerplate
    .replace(/\bfantasy football cheat sheet\b/gi, '')
    .replace(/\bcheat sheet\b/gi, '')
    .replace(/\bfantasy football\b/gi, '')
    // remove leading/trailing separators
    .replace(/^[\s\-:|]+|[\s\-:|]+$/g, '')
    // collapse excessive whitespace
    .replace(/\s{2,}/g, ' ')
    // remove embedded JSON-LD / schema.org objects
    .replace(/{"@context":.*?"\}\}/gs, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    // remove navigation & accessibility boilerplate
    .replace(/BBC Homepage.*?More menu/gi, '')
    .replace(/Skip to content/gi, '')
    .replace(/Accessibility Help/gi, '')
    .replace(/Your account/gi, '')
    .replace(/Share pageCopy linkAbout sharing/gi, '')
    .replace(/Close menu/gi, '')
    .replace(/Close panel/gi, '')
    // remove video / player text
    .replace(/This video can not be played/gi, '')
    .replace(/To play this video you need to enable JavaScript.*/gi, '')
    // remove leftover meta stuff
    .replace(/Published\d+ minutes ago/gi, '')
    .replace(/Explore more/gi, '')
    .replace(/READ MORE:.*/gi, '')
    .replace(/LISTEN:.*/gi, '')

    // NEW FILTERS for intros/promo
    .replace(/introducing[^.]+(\.|\n)/gi, '') 
    .replace(/subscribe to .*? youtube channel/gi, '') 
    .replace(/watch (the )?video(s)? (here|above)/gi, '') 
    .replace(/click here to find out more/gi, '') 
    .trim();

  // Apply boilerplate filters from JSON config
  boilerplateFilters.patterns.forEach(phrase => {
    const regex = new RegExp(phrase, 'gi');
    stripped = stripped.replace(regex, '');
  });

  return cleanUnicode(stripped).trim();
}


const fetchArticleHtmlWithAxios = async (url) => {
  try {
    const { data: html } = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const $ = cheerio.load(html);

    // Common article containers
    const selectors = [
      'article',
      '.article-content',
      '.entry-content',
      '#article-body',
      '[itemprop="articleBody"]',
      '.story-body',
      '.main-content',
      '.sdc-article-body', // Sky Sports specific
    ];

    for (const selector of selectors) {
      const paragraphs = $(selector).find('p')
        .map((i, el) => $(el).text().trim())
        .get()
        .filter(Boolean);

      const content = paragraphs.join('\n\n');
      if (content.length > 300) {
        return cleanArticleText(content);
      }
    }

    // fallback: take whole body text (but still clean it)
    const fallback = $('body').text().trim();
    return fallback.length > 300 ? cleanArticleText(fallback) : null;

  } catch (err) {
    console.warn(`❌ Axios fetch failed for ${url}: ${err.message}`);
    try {
      const fallbackRes = await axios.get(url);
      return cleanArticleText(fallbackRes.data);
    } catch (fallbackErr) {
      console.warn(`⚠️ Fallback fetch also failed for ${url}`);
      return null;
    }
  }
};


// 👇 Add this helper function above generateFreshNews
function isExcludedArticle(articleUrl, title = '') {
  const excludedPatterns = [
    '/watch/',         // Sky Sports shows/videos
    '/transfer-talk',  // Transfer Talk show
    '/live-blog',      // Live blogs
    '/video/',         // Pure video content
    '/shows/',         // Talk shows
  ];

  const excludedKeywords = [
    'transfer talk live',
    'free stream',
    'watch live',
    'live show',
  ];

  const lowerUrl = articleUrl.toLowerCase();
  const lowerTitle = title.toLowerCase();

  return excludedPatterns.some(p => lowerUrl.includes(p)) ||
         excludedKeywords.some(k => lowerTitle.includes(k));
}


async function generateFreshNews() {
  const redisClient = await getRedisClient();
  const rawEntityDB = await redisClient.get('entity:database');
  const entityDb = rawEntityDB ? JSON.parse(rawEntityDB) : {};

  const topNews = [];
  const updates = [];

  const limit = pLimit(5);

  await Promise.allSettled(feedUrls.map(feedUrl =>
    limit(async () => {
      try {
        const feed = await parser.parseURL(feedUrl);
        for (const item of feed.items) {
         const articleUrl = item.link;
         if (
          !articleUrl || 
          !/^https?:\/\//.test(articleUrl) || 
          isExcludedArticle(articleUrl, item.title)
          ) {
          return;
          }


          const articleHtml = await fetchArticleHtmlWithAxios(articleUrl);
          if (!articleHtml || articleHtml.length < 300) return;

          const articleText = extractTextFromHtml(articleHtml);
          if (!articleText || articleText.length < 300) return;

          let imageUrl = await extractImageFromURL(articleUrl);
           if (!imageUrl || !/^https?:\/\//.test(imageUrl)) {
            console.warn(`⚠️ Invalid image found for: ${item.link}, using fallback.`);
           imageUrl = 'https://sportyfanz.com/assets/images/default-player.png';
          }


          const chunks = chunkSummary(articleText, 5);
          const fullSummary = chunks.join('\n\n');
          const entities = extractEntities(articleText);
          const sentiment = analyzeSentiment(fullSummary);
          const seoTitle = slugify(item.title, { lower: true, strict: true });
          const matchedEntity = detectEntityFromText(item.title, entityDb);

          const articleData = {
            title: cleanArticleText(cleanUnicode(item.title)),
            seoTitle,
            link: articleUrl,
            image: imageUrl,
            paragraphs: chunks.map(cleanUnicode),
            fullSummary: cleanUnicode(fullSummary),
            description: cleanUnicode(chunks[0]),
            date: item.isoDate || item.pubDate || new Date().toISOString(),
            entities,
            sentiment,
            entity: matchedEntity || null,
          };

          if (isTopNewsArticle(articleData) && isFootballArticle(articleData)) {
            topNews.push(articleData);
          } else {
            updates.push(articleData);
          }
        }
      } catch (err) {
        console.warn(`⚠️ Failed to process ${feedUrl}:\n`, err);
      }
    })
  ));

  topNews.sort((a, b) => new Date(b.date) - new Date(a.date));
  updates.sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    trending: topNews.slice(0, 10),
    updates: updates.slice(0, 20),
    count: topNews.length + updates.length,
  };
}

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

router.get('/sports-summaries', async (req, res) => {
  try {
    const redisClient = await getRedisClient();
    const cached = await redisClient.get(CACHE_KEY);
    res.setHeader('Cache-Control', 'public, max-age=60');

    if (cached) {
      console.log('⚡ Serving cached sports data');
      res.status(200).json(JSON.parse(cached));
      refreshNewsInBackground(); // Trigger non-blocking refresh
      return;
    }

    const freshData = await generateFreshNews();
    await redisClient.setEx(CACHE_KEY, TTL, JSON.stringify(freshData));
    console.log('📝 Cached fresh sports news');
    res.status(200).json(freshData);
  } catch (err) {
    console.error('🛑 Error in /sports-summaries route:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// SSR HTML page route
router.get('/', async (req, res) => {
  try {
    const redisClient = await getRedisClient();
    const cached = await redisClient.get(CACHE_KEY);
    const data = cached ? JSON.parse(cached) : { trending: [], updates: [] };

    res.render('index', {
      trending: data.trending || [],
      updates: data.updates || [],
      sliderNews: data.updates.slice(0, 5), // e.g. first 5 for slider
    });
  } catch (err) {
    console.error('SSR render failed:', err);
    res.render('index', { trending: [], updates: [], sliderNews: [] });
  }
});


module.exports = router;
