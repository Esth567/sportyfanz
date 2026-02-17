// routes/newsRouter.js
const express = require('express');
const router = express.Router();
const RSSParser = require('rss-parser');
const axios = require('axios');
const axiosRetry = require('axios-retry').default || require('axios-retry');
const pLimit = require('p-limit').default;
const { marked } = require('marked');
const cheerio = require('cheerio');
const slugify = require('slugify');

const { extractImageFromURL } = require('../utils/extractImageFromURL');
const getRedisClient = require('../utils/redisClient');
const { feedUrls, cafNewsUrls }  = require('../utils/rssFeeds');


const {
  extractTextFromHtml,
  cleanArticleText,
  extractEntities,
  analyzeSentiment,
  chunkSummary,
  addSeoSubheadingsToChunks,
  isTopNewsArticle,
  isFootballArticle,
  isExcludedArticle,
  isDuplicateArticle,
  getDomainFromUrl,
  SOURCE_PRIORITY
} = require('../utils/nlpfetchnews');

const CACHE_KEY = 'news:sports-summaries';
const TTL = 60 * 60; // 1 hour

const parser = new RSSParser();

// Retry axios on failure
axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

// Fetch & process articles
const fetchArticleHtmlWithAxios = async (url, title = '') => {
  try {
    const { data: html } = await axios.get(url, {
      timeout: 30000,
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-US,en;q=0.9' },
    });

    const $ = cheerio.load(html);

    const selectors = [
      'article',
      '.article-content',
      '.entry-content',
      '#article-body',
      '[itemprop="articleBody"]',
      '.story-body',
      '.main-content',
      '.sdc-article-body',
      '.news-listing__item p',
    ];

    let articleText = '';

    for (const selector of selectors) {
      const paragraphs = $(selector)
        .find('p')
        .map((i, el) => $(el).text().trim())
        .get()
        .filter(Boolean);

      if (paragraphs.length) {
        articleText = paragraphs.join('\n\n');
        break;
      }
    }

    if (!articleText) articleText = $('body').text().trim();
    if (!articleText || articleText.length < 300) return null;

    // Remove repeated title & subheading in first paragraph
    articleText = removeTitleAndSubheading(articleText, title);

    // Final cleaning
    return cleanArticleText(articleText);

  } catch (err) {
    console.warn(`Fetch failed for ${url}: ${err.message}`);
    try {
      const fallbackRes = await axios.get(url);
      return cleanArticleText(fallbackRes.data);
    } catch {
      return null;
    }
  }
};


function removeTitleAndSubheading(text, title) {
  if (!text) return '';

  let paragraphs = text.split('\n').filter(Boolean);

  // --- Remove repeated title (fuzzy) ---
  if (title && paragraphs.length) {
    const firstPara = paragraphs[0].trim();
    const titleWords = title.toLowerCase().split(/\s+/);
    const firstParaWords = firstPara.toLowerCase().split(/\s+/);
    const commonWords = firstParaWords.filter(word => titleWords.includes(word));

    if (commonWords.length / Math.max(titleWords.length, 1) > 0.6) {
      paragraphs = paragraphs.slice(1);
    }
  }

  // --- Remove first paragraph if it looks like a subheading ---
  if (paragraphs.length) {
    const firstPara = paragraphs[0];
    const wordCount = firstPara.split(/\s+/).length;
    const uppercaseRatio = firstPara.replace(/[^A-Z]/g, '').length / Math.max(firstPara.length, 1);

    if (wordCount < 15 || uppercaseRatio > 0.4) {
      paragraphs = paragraphs.slice(1);
    }
  }

  return paragraphs.join('\n\n').trim();
}

const generateFreshNews = async () => {
  const redisClient = await getRedisClient();
  const rawEntityDB = await redisClient.get('entity:database');
  const entityDb = rawEntityDB ? JSON.parse(rawEntityDB) : {};

  const topNews = [];
  const updates = [];
  const seenArticles = new Map();

  const limit = pLimit(5);

  // Handle normal RSS feeds
  const rssTasks = feedUrls.map(feedUrl =>
    limit(async () => {
      try {
        const feed = await parser.parseURL(feedUrl);
        for (const item of feed.items.slice(0, 10)) {
          await processArticle(item.link, item.title, item.isoDate || item.pubDate);
        }
      } catch (err) {
        console.warn(`Failed to process feed: ${feedUrl}\n`, err.message);
      }
    })
  );

  // Run feeds in parallel
  await Promise.allSettled(rssTasks);

  topNews.sort((a, b) => new Date(b.date) - new Date(a.date));
  updates.sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    trending: topNews.slice(0, 10),
    updates: updates.slice(0, 20),
    count: topNews.length + updates.length
  };

  async function processArticle(articleUrl, title = '', pubDate = new Date().toISOString()) {
    try {
      if (!articleUrl || !/^https?:\/\//.test(articleUrl) || isExcludedArticle(articleUrl, title)) return;
      const articleText = await fetchArticleHtmlWithAxios(articleUrl, title);
      if (!articleText || articleText.length < 300) return;

      const combinedText = `${title}\n\n${articleText}`;
      let imageUrl = await extractImageFromURL(articleUrl);
      if (!imageUrl || !/^https?:\/\//.test(imageUrl))
        imageUrl = 'https://sportyfanz.com/assets/images/default-player.png';

      const entities = extractEntities(combinedText);
      let chunks = chunkSummary(combinedText, 5);
      chunks = addSeoSubheadingsToChunks(chunks, entities.all, {
        maxEntitiesPerChunk: 2,
        minWordsForSubheading: 20,
        similarityThreshold: 0.9,
        skipFirstParagraph: true
      });

      if (chunks.length > 0)
        chunks[0] = chunks[0].replace(new RegExp(`^${title}`, 'i'), '').trim();

      const fullSummary = autoLinkSources(chunks.join('\n\n'));
      const sentiment = analyzeSentiment(fullSummary);
      const seoTitle = slugify(title, { lower: true, strict: true });

      const articleData = {
        title: cleanArticleText(title),
        seoTitle,
        link: articleUrl,
        image: imageUrl,
        paragraphs: chunks,
        fullSummary,
        description: chunks[0],
        date: pubDate,
        entities,
        sentiment,
        entity: null
      };

      if (isDuplicateArticle(articleData, seenArticles, { similarityThreshold: 0.85, timeWindowMinutes: 60 })) return;
      seenArticles.set(articleData.link, articleData);

      if (isTopNewsArticle(articleData) && isFootballArticle(articleData))
        topNews.push(articleData);
      else
        updates.push(articleData);
    } catch (err) {
      console.warn(`Error processing article: ${articleUrl}\n`, err.message);
    }
  }
};

function autoLinkSources(text) {
  if (!text) return text;
  const sources = {
    'BBC': 'https://www.bbc.com/sport',
    'BBC Sport': 'https://www.bbc.com/sport',
    'ESPN': 'https://www.espn.com',
    'Sky Sports': 'https://www.skysports.com',
    'The Guardian': 'https://www.theguardian.com/sport',
    'CAF': 'https://www.cafonline.com',
    'FIFA': 'https://www.fifa.com'
  };

  for (const [name, url] of Object.entries(sources)) {
    // prevent replacing inside existing href attributes
    const pattern = new RegExp(`(?<!href="[^"]*)\\b${name}\\b`, 'gi');
    text = text.replace(
      pattern,
      `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #70c172; text-decoration: none;">${name}</a>`
    );
  }

  return text;
}


// Background refresh
const refreshNewsInBackground = async () => {
  try {
    const redisClient = await getRedisClient();
    const data = await generateFreshNews();
    await redisClient.setEx(CACHE_KEY, TTL, JSON.stringify(data));
    console.log('Refreshed sports data in background');
  } catch (err) {
    console.error('Background refresh failed:', err.message);
  }
};


// Routes
router.get('/sports-summaries', async (req, res) => {
  try {
    const redisClient = await getRedisClient();
    const cached = await redisClient.get(CACHE_KEY);

    res.setHeader('Cache-Control', 'public, max-age=60');

    if (cached) {
      // Serve cached instantly
      refreshNewsInBackground(); // update in background
      return res.status(200).json(JSON.parse(cached));
    }

    // DO NOT generate fresh news inside request
    // Just trigger background refresh
    refreshNewsInBackground();

    // Return empty (or skeleton data)
    return res.status(200).json({
      trending: [],
      updates: []
    });

  } catch (err) {
    console.error('Error in /sports-summaries route:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// SSR HTML route
router.get('/', async (req, res) => {
  try {
    const redisClient = await getRedisClient();
    const cached = await redisClient.get(CACHE_KEY);
    const data = cached ? JSON.parse(cached) : { trending: [], updates: [] };

    const renderParagraphs = (articles) => {
      return articles.map(article => ({
        ...article,
        paragraphsHtml: article.paragraphs.map(p => p.startsWith('<strong>') ? p : marked.parse(p))
      }));
    };

    res.render('index', {
      trending: renderParagraphs(data.trending),
      updates: renderParagraphs(data.updates),
      sliderNews: renderParagraphs(data.updates.slice(0, 5))
    });
  } catch (err) {
    console.error('SSR render failed:', err);
    res.render('index', { trending: [], updates: [], sliderNews: [] });
  }
});

module.exports = {
  router,
  refreshNewsInBackground
};

