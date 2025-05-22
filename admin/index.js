const express = require("express");
const bodyParser = require("body-parser");
const Parser = require("rss-parser");
require('dotenv').config();
const cors = require("cors");
const path = require('path');
const sanitizeHtml = require ('sanitize-html');
const axios = require('axios');
const compression = require('compression');


const corsOptions = {
  origin: '*', // or restrict to frontend domain
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use(compression());
const app = express();
const port = 3000; 
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public'))); // put your HTML here
app.use((req, res, next) => {
  console.log('Origin:', req.headers.origin);
  next();
});



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

function rewriteToSportsStyle(description) {
  return description
    .replace(/<\/?[^>]+(>|$)/g, '') // remove HTML
    .replace(/[^a-zA-Z0-9 .,?!]/g, '') // remove unusual characters
    .replace(/\b(match|game)\b/gi, 'fixture')
    .replace(/\bteam\b/gi, 'side')
    .replace(/\bplayer\b/gi, 'athlete')
    + ' Stay tuned for more updates on this story.';
}

async function expandWithGroq(title, shortDesc) {
  const prompt = `You're a seasoned British football pundit with a flair for dramatic, Premier League-style commentary. Rewrite and expand this breaking sports news into a vivid, engaging 1500-word article. Include tactical analysis, dramatic language, and reactions from players, coaches, and fans.\n\nTitle: ${title}\nDescription: ${shortDesc}`;

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'mixtral-8x7b-32768',
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
        max_tokens: 3000
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Groq API error:', error.message);
    return shortDesc + ' (Original content, expansion failed.)';
  }
}

// ========= Main News Fetcher ========= //
const fs = require('fs');
const CACHE_FILE = path.join(__dirname, 'cache/news.json');
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchNews() {
  try {
    // Check cache
    if (fs.existsSync(CACHE_FILE)) {
      const { data, timestamp } = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      if (Date.now() - timestamp < CACHE_TTL) {
        console.log('Serving news from cache...');
        return data;
      }
    }

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

        const imageMatch = sanitized.match(/<img[^>]+src="([^">]+)"/);
        const imageUrl = imageMatch ? imageMatch[1] : null;

        let longFormDescription;
        try {
          longFormDescription = await expandWithGroq(item.title, sanitized);
        } catch (err) {
          console.warn('Groq expansion failed. Using original content.');
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

    // Save cache
    fs.mkdirSync(path.join(__dirname, 'cache'), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ data: result, timestamp: Date.now() }));

    return result;
  } catch (err) {
    console.error('Error fetching news, falling back to cache:', err);

    // Try cached fallback
    if (fs.existsSync(CACHE_FILE)) {
      const { data } = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      return data;
    }

    throw new Error('News fetch and fallback both failed.');
  }
}


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

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
