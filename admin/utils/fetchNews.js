const Parser = require("rss-parser");
const sanitizeHtml = require("sanitize-html");
const fs = require("fs");
const path = require("path");

const { extractFullArticle } = require("./extractArticle");
const { expandWithGroq } = require("./expandWithGroq");
const { extractImageFromContent } = require("./extractImageFromContent");
//const { fetchBingImage } = require("./fetchBingImage");

const redis = require("../config/redis");

const parser = new Parser();
const rssFeeds = [
  "https://www.espn.com/espn/rss/soccer/news",
  "https://www.skysports.com/rss/12040", // Football news
  "https://www.goal.com/feeds/en/news"
];


const CACHE_KEY = "news:cache";
const CACHE_FILE = path.join(__dirname, "../cache/news.json");
const CACHE_TTL = 300;

const PLACEHOLDER_IMAGE = "https://via.placeholder.com/600x400?text=No+Image";

async function fetchNews(forceRefresh = false) {
  console.log("🔍 Fetching news...");

  if (!forceRefresh) {
    const cached = await redis.get(CACHE_KEY);
    if (cached) return JSON.parse(cached);
  }

  const allItems = [];

  for (let feed of rssFeeds) {
    console.log("📡 Reading feed:", feed);
    const res = await parser.parseURL(feed);
    console.log("✅ Items fetched:", res.items.length);

    for (const item of res.items) {
      const rawContent = item["content:encoded"] || item.content || "";
      const sanitized = sanitizeHtml(rawContent, {
        allowedTags: ["p", "b", "i", "img", "a", "ul", "li"],
        allowedAttributes: {
          "a": ["href"],
          "img": ["src"]
        }
      });

      let imageUrl = extractImageFromContent(sanitized);
      //if (!imageUrl) {
      //  const searchQuery = item.title + " football";
        //imageUrl = await fetchBingImage(searchQuery);
      //}
      if (!imageUrl) imageUrl = PLACEHOLDER_IMAGE;

      let fullDescription;
      try {
        const article = await extractFullArticle(item.link);
        fullDescription = await expandWithGroq(item.title, article || sanitized);
      } catch {
        fullDescription = sanitized + " (Original content)";
      }

      allItems.push({
        title: item.title,
        description: fullDescription,
        pubDate: item.pubDate,
        link: item.link,
        source: res.title,
        image: imageUrl
      });
    }
  }

  const sorted = allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  const result = {
    trending: sorted.slice(0, 5),
    updates: sorted.slice(5, 20)
  };

  await redis.set(CACHE_KEY, JSON.stringify(result), "EX", CACHE_TTL);
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify({ data: result, timestamp: Date.now() }));

  return result;
}

module.exports = { fetchNews };
