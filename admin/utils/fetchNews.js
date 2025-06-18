const Parser = require('rss-parser');
const parser = new Parser(); 
const sanitizeHtml = require('sanitize-html');
const redis = require('./redisClient'); // your Redis client
const fs = require('fs');
const path = require('path');
const { extractFullArticle } = require('./extractArticle');
const { rewriteWithMistral } = require('./rewriteWithMistral');
const { extractImageFromContent } = require('./extractImageFromContent');

const rssFeeds = [
  "http://www.espn.com/espn/rss/news",
  "http://feeds.bbci.co.uk/sport/rss.xml?edition=uk",
  "https://www.skysports.com/rss/12040",
  "https://www.goal.com/en/feeds/news?fmt=rss"
];
const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/600x400?text=No+Image';
const CACHE_KEY = 'news_cache';
const CACHE_FILE = path.join(__dirname, 'cache/news.json');
const CACHE_TTL = 60 * 15; // 15 minutes in seconds

// Wrap parser.parseURL with retry logic
async function safeParseURL(url, retries = 2) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const feed = await parser.parseURL(url);
      return feed;
    } catch (err) {
      console.warn(`⚠️ Failed to parse feed (Attempt ${attempt}): ${url}`, err.message);
      if (attempt === retries) throw err;
      await new Promise(res => setTimeout(res, 1000 * attempt)); // backoff
    }
  }
}

//function to build richer input
function buildRichInput(article, sanitized, resItems, currentTitle) {
  if (article && article.length > 300) return article;

  const mainKeyword = currentTitle.split(" ")[0]; // crude keyword
  const related = resItems
    .filter(i => i.title !== currentTitle && i.title.includes(mainKeyword))
    .map(i => i["content:encoded"] || i.content || i.contentSnippet || "")
    .slice(0, 2)
    .join("\n\n");

  return `${sanitized}\n\nRelated Context:\n${related}\n\nExpand this into a 3-5 paragraph article.`;
}


async function fetchNews(forceRefresh = false) {
  console.log("🔍 Fetching news...");

  if (!forceRefresh) {
    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      console.log("📥 Returning cached news");
      return JSON.parse(cached);
    }
  }

  const allItems = [];

  for (let feed of rssFeeds) {
    console.log("📡 Reading feed:", feed);

    try {
      const res = await safeParseURL(feed);
      console.log("✅ Items fetched:", res.items.length);

      for (const item of res.items) {
        // Use contentSnippet or content or empty string for safety
        const rawContent = item["content:encoded"] || item.content || item.contentSnippet || "";
        
        // Sanitize HTML content
        const sanitized = sanitizeHtml(rawContent, {
          allowedTags: ["p", "b", "i", "img", "a", "ul", "li"],
          allowedAttributes: {
            "a": ["href"],
            "img": ["src"]
          }
        });


        console.log(`Processing item: ${item.title}`);
        const imageUrl = extractImageFromContent(sanitized) || PLACEHOLDER_IMAGE;
        console.log(`Image URL: ${imageUrl}`);

       let fullDescription;
       try {
        const article = await extractFullArticle(item.link);
        const inputContent = buildRichInput(article, sanitized, res.items, item.title);

        fullDescription = await rewriteWithMistral(item.title, inputContent);

  // Clean accidental prompt echo from Mistral
   const promptCheck = "Expand this into a 3-5 paragraph article";
   if (fullDescription && fullDescription.includes(promptCheck)) {
   fullDescription = fullDescription.split(promptCheck)[0].trim();
   }

   // Fallback if the output is suspicious or empty
   if (!fullDescription || fullDescription.trim().length < 150) {
     console.warn(`⚠️ Fallback triggered for: ${item.title}`);
     fullDescription = sanitized + " (Original content)";
    }

     } catch (err) {
     console.warn(`⚠️ Expansion failed for ${item.link}:`, err.message);
     fullDescription = sanitized + " (Original content)";
    }


        console.log(`Description length: ${fullDescription.length}`);
        // Check pubDate validity
        const pubDate = new Date(item.pubDate);
        if (isNaN(pubDate)) {
          console.warn(`⚠️ Invalid pubDate for item: ${item.title}, pubDate: ${item.pubDate}`);
          // Skip item with invalid date
          continue;
        }

        allItems.push({
          title: item.title || "No title",
          description: fullDescription,
          pubDate: pubDate.toISOString(),
          link: item.link,
          source: res.title || "Unknown source",
          image: imageUrl
        });
        console.log("➕ Added item:", item.title);
      }

    } catch (err) {
      console.error(`❌ Skipped feed due to repeated failures: ${feed}`, err.message);
      continue; // move to next feed
    }
  }

  console.log("📝 Total items before sorting:", allItems.length);

  // Sort by publication date descending
  const sorted = allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  
  // Prepare result slices
  const result = {
    trending: sorted.slice(0, 5),
    updates: sorted.slice(5, 20)
  };

  console.log("✅ News fetch complete, saving cache");

  // Cache in Redis
  await redis.set(CACHE_KEY, JSON.stringify(result), "EX", CACHE_TTL);

  // Cache to disk as backup
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify({ data: result, timestamp: Date.now() }));

  return result;
}

module.exports = { fetchNews };
