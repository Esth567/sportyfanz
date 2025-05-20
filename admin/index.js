const express = require("express");
const bodyParser = require("body-parser");
const Parser = require("rss-parser");
const cors = require("cors");
const path = require('path');
const sanitizeHtml = require ('sanitize-html');


const app = express();
const port = 3000;

const corsOptions = {
  origin: function (origin, callback) {
    console.log("CORS request from:", origin);

    // Allow undefined (for curl, etc.), and your frontend GitHub Codespace
    const allowedOriginPattern = /^https:\/\/curly-space-computing-machine.*\.app\.github\.dev$/;

    if (!origin || allowedOriginPattern.test(origin)) {
      callback(null, origin); // Return the exact origin
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
};


app.use((req, res, next) => {
  console.log('Origin:', req.headers.origin);
  next();
});


app.use(cors(corsOptions)); 

app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, 'public'))); // put your HTML here

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

async function fetchNews() {
  const allItems = [];

  for (let feed of rssFeeds) {
    try {
      const res = await parser.parseURL(feed);
      allItems.push(...res.items.map(item => {
        // Try to extract image from media:content or enclosure
        const image = item.enclosure?.url || item['media:content']?.url || '';
        
        const rawContent = item['content:encoded'] || item.content || item.contentSnippet || '';
        const cleanDescription = sanitizeHtml(rawContent, {
        allowedTags: ['p', 'b', 'i', 'strong', 'em', 'ul', 'li', 'a', 'br', 'img'],
        allowedAttributes: {
        'a': ['href', 'target'],
        'img': ['src', 'alt']
         }
         });

        return {
          title: item.title,
          description: cleanDescription,
          pubDate: item.pubDate,
          link: item.link,
          source: res.title,
          image
        };
      }));
    } catch (e) {
      console.error(`Failed to fetch ${feed}`, e.message);
    }
  }

  const sortedItems = allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  const trending = sortedItems.slice(0, 5);
  const updates = sortedItems.slice(5, 20);

  return { trending, updates };
}

// Custom enhancement function
function enhanceSportsDescription(text) {
  const plain = text
    .replace(/<\/?[^>]+(>|$)/g, '') // Strip HTML
    .replace(/[^a-zA-Z0-9 .,?!]/g, ''); // Clean characters

  return `${plain} This development could have a major impact on the standings. Stay with us for more insightful commentary and match-day analysis.`;
}


app.get('/api/news', async (req, res) => {
  const data = await fetchNews();
  res.json(data);
});

app.get("/", (req, res) => {
  res.send("Server is running.");
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
