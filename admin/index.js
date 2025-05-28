const express = require("express");
const bodyParser = require("body-parser");
const Parser = require("rss-parser");
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const cors = require("cors");
const sanitizeHtml = require('sanitize-html');
const axios = require('axios');
const compression = require('compression');
const { extractFullArticle } = require('./extractArticle');
const Redis = require('ioredis');
const cron = require('node-cron');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');


app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(compression());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
  console.log('Origin:', req.headers.origin);
  next();
});

// Rate limiting: max 20 requests per minute per IP on /api routes
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

const parser = new Parser();

const rssFeeds = [
  "http://www.espn.com/espn/rss/news",
  "http://feeds.bbci.co.uk/sport/rss.xml?edition=uk",
  "https://www.skysports.com/rss/12040",
  "https://www.goal.com/en/feeds/news?fmt=rss"
];



async function expandWithGroq(title, shortDescRaw) {
  const shortDesc = (shortDescRaw || '').slice(0, 2000); // Prevent too-long payloads

  const prompt = `You're a seasoned British football pundit with a flair for dramatic, Premier League-style commentary. Rewrite and expand this breaking sports news into a vivid, engaging 1500-word article. Include tactical analysis, dramatic language, and reactions from players, coaches, and fans.

Title: ${title}
Description: ${shortDesc}`;

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-guard-4-12b',
        messages: [
          {
            role: 'system',
            content: 'You are a professional football journalist writing Premier League-style commentary with energy, insight, and flair.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000 // Safe limit
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data?.choices?.[0]?.message?.content || '(No content returned)';
  } catch (error) {
    console.error('❌ Groq API error:', error.message);

    // Log detailed response if available
    if (error.response) {
      console.error('Groq response status:', error.response.status);
      console.error('Groq response data:', error.response.data);
    }

    return `${shortDescRaw || 'No original content'} (Original content, expansion failed.)`;
  }
}


// Cache keys & TTL
const CACHE_KEY = 'news:cache';
const CACHE_TTL = 5 * 60; // 5 minutes in seconds
const CACHE_FILE = path.join(__dirname, 'cache/news.json');

// Fetch news with Redis caching and fallback to file
async function fetchNews(forceRefresh = false) {
  try {
    if (!forceRefresh) {
      // Try Redis cache first
      const cachedData = await redis.get(CACHE_KEY);
      if (cachedData) {
        console.log('✅ Serving news from Redis cache...');
        return JSON.parse(cachedData);
      }
    }

    // No cache or forced refresh, fetch fresh data
    const allItems = [];

    for (let feed of rssFeeds) {
      const res = await parser.parseURL(feed);

      for (const item of res.items) {
        const rawContent = item['content:encoded'] || item.content || item.contentSnippet || '';
        const sanitized = sanitizeHtml(rawContent, {
          allowedTags: ['p', 'b', 'i', 'strong', 'em', 'ul', 'li', 'a', 'br', 'img'],
          allowedAttributes: {
            'a': ['href', 'target'],
            'img': ['src', 'alt']
          }
        });

        // Try extracting image URL from the RSS content first
        let imageUrl = null;
        const imageMatch = sanitized.match(/<img[^>]+src="([^">]+)"/);
        if (imageMatch) {
          imageUrl = imageMatch[1];
        } else {
          // If no image from RSS, try Getty Images API with improved query
          const searchQuery = getGettySearchQuery(item.title);
          imageUrl = await fetchGettyImage(searchQuery);
        }

        // Use placeholder if no image found
        if (!imageUrl) {
          imageUrl = PLACEHOLDER_IMAGE;
        }

        let longFormDescription;
        try {
          const fullContent = await extractFullArticle(item.link);
          const descriptionToUse = sanitized || item.contentSnippet || item.title;
          const longFormDescription = await expandWithGroq(item.title, descriptionToUse);

        } catch (err) {
          console.warn('⚠️ Groq or extraction failed. Using fallback.');
          longFormDescription = sanitized + ' (Original content used due to expansion failure.)';
        }

        allItems.push({
          title: item.title,
          description: longFormDescription,
          pubDate: item.pubDate,
          link: item.link,
          source: res.title,
          image: imageUrl
        });
      }
    }

    const sortedItems = allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    const trending = sortedItems.slice(0, 5);
    const updates = sortedItems.slice(5, 20);

    const result = { trending, updates };

    // Cache to Redis with TTL
    await redis.set(CACHE_KEY, JSON.stringify(result), 'EX', CACHE_TTL);

    // Also save to file as fallback
    fs.mkdirSync(path.join(__dirname, 'cache'), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ data: result, timestamp: Date.now() }));

    return result;

  } catch (err) {
    console.error('❌ Error fetching news:', err);

    // Fallback: Try Redis cache
    try {
      const cachedData = await redis.get(CACHE_KEY);
      if (cachedData) {
        console.log('⚠️ Fallback to Redis cache');
        return JSON.parse(cachedData);
      }
    } catch (redisErr) {
      console.warn('Redis fallback failed:', redisErr.message);
    }

    // Fallback: Try file cache
    if (fs.existsSync(CACHE_FILE)) {
      const { data } = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      console.log('⚠️ Fallback to stale file cache');
      return data;
    }

    throw new Error('News fetch and all fallbacks failed.');
  }
}

// Add your placeholder image URL constant near top of file:
const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/600x400?text=No+Image+Available';

// Your existing Getty Image fetch helper (make sure this is in your file)
async function fetchGettyImage(searchTerm) {
  try {
    const response = await axios.get('https://api.gettyimages.com/v3/search/images', {
      headers: {
        'Api-Key': process.env.GETTY_API_KEY,
      },
      params: {
        phrase: searchTerm,
        sort_order: 'best',
        fields: 'display_set',
        page_size: 1,
      },
    });

    if (
      response.data.images &&
      response.data.images.length > 0 &&
      response.data.images[0].display_sizes &&
      response.data.images[0].display_sizes.length > 0
    ) {
      return response.data.images[0].display_sizes[0].uri;
    }
  } catch (error) {
    console.error('Getty API error:', error.message);
  }
  return null;
}


function getGettySearchQuery(title) {
  // Simple keyword extraction example:
  // Add "football player" if title has player or coach keywords
  let query = title;

  const keywords = ['player', 'coach', 'team', 'football', 'soccer', 'match'];
  const lowerTitle = title.toLowerCase();

  if (keywords.some(k => lowerTitle.includes(k))) {
    query += ' football player';
  } else {
    query += ' football';
  }

  return query;
}



// API endpoint
app.get('/api/news', async (req, res) => {
  try {
    const news = await fetchNews();
    res.json(news);
  } catch (err) {
    console.error('Error fetching news:', err);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

app.get("/", (req, res) => {
  res.send("Server is running.");
});

// Cron job to refresh news every 10 minutes
cron.schedule('*/10 * * * *', async () => {
  console.log('[CRON] Refreshing news cache...');
  try {
    await fetchNews(true); // force refresh
    console.log('[CRON] News cache refreshed.');
  } catch (err) {
    console.error('[CRON] Failed to refresh news:', err);
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
