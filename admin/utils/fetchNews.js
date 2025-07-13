const OpenAI = require('openai');
const Parser = require('rss-parser');
const slugify = require('slugify');
const fs = require('fs-extra');
const path = require('path');
const klaw = require('klaw');
const matter = require("gray-matter");
const frontMatter = require('front-matter');
const { parse } = require('date-fns')

const ARTICLES_DIR = path.join(__dirname, "articles");

const { extractImageFromURL } = require('./extractImageFromURL');
const { isOnCooldown, recordOpenAIError } = require('../utils/openaiGuard');
const { rewriteWithOpenAI } = require('../utils/rewriteWithOpenAI');
const { extractArticle } = require('../utils/extractArticle'); 

const openaiKey = process.env.OPENAI_API_KEY;
if (!openaiKey) {
  console.warn("⚠️ Missing OpenAI API key — generation will be disabled.");
} else {
  console.log("✅ OpenAI API key detected");
}


const openai = new OpenAI({ apiKey: openaiKey });


const parser = new Parser();

const OUTPUT_DIR = path.join(__dirname, 'articles');
const CACHE_PATH = path.join(__dirname, 'cache/news.json');

let openAIDisabledUntil = null;

function isOpenAIDisabled() {
  return openAIDisabledUntil && new Date() < openAIDisabledUntil;
}

function disableOpenAITemporarily(minutes = 15) {
  const until = new Date(Date.now() + minutes * 60 * 1000);
  openAIDisabledUntil = until;
  console.warn(`🛑 OpenAI temporarily disabled until ${until.toISOString()}`);
}

async function withRetry(fn, retries = 3, delay = 1000) {
  if (isOpenAIDisabled()) throw new Error("OpenAI temporarily disabled");
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err.status === 429 && attempt >= retries - 1) disableOpenAITemporarily(15);
      if (attempt < retries - 1) {
        console.warn(`🔁 Retry ${attempt + 1}/${retries}`);
        await new Promise(res => setTimeout(res, delay));
      } else {
        throw err;
      }
    }
  }
}

function getArticleFilename(date, title) {
  const datePart = new Date(date).toISOString().split('T')[0];
  const slug = slugify(title, { lower: true, strict: true });
  const hash = require('crypto').createHash('md5').update(title + date).digest('hex').slice(0, 6);
   return `${datePart}-${slug}-${hash}.md`;

}

function safeDate(dateString) {
  const parsed = new Date(dateString);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function inferLeagueFolder(title = '') {
  const lower = title.toLowerCase();
  if (/\b(premier league|champions league|europa league|epl|mls)\b/.test(lower)) return 'football';
  if (lower.includes('nfl')) return 'american-football';
  if (lower.includes('nba')) return 'basketball';
  if (lower.includes('mlb')) return 'baseball';
  if (lower.includes('formula 1') || lower.includes('f1')) return 'f1';
  if (lower.includes('tennis')) return 'tennis';
  if (lower.includes('golf')) return 'golf';
  return 'general';
}

function sanitize(input = '') {
  return input.replace(/"/g, "'").replace(/\n/g, ' ').trim();
}


function getTitleFromContent(content = '') {
  const lines = content.split('\n').map(line => line.trim());
  for (const line of lines) {
    // Accept longer lines that look like standalone titles
    if (
      /^[A-Z]/.test(line) &&
      !line.endsWith('.') && // Avoid full sentences
      line.length >= 30 && line.length <= 120 && // Title-like range
      !line.includes('<') && !line.includes('>') // Ignore lines with HTML tags
    ) {
      return sanitize(line);
    }
  }
  return null;
}


// get description function
async function getDescription({ content, item }) {
   const descriptionMode = process.env.DESCRIPTION_MODE || 'auto';
  let fallback = 'No summary available.';

  // 🧼 Step 1: Try fallback summary from RSS fields
  if (item.contentSnippet || item.summary || item.description) {
    fallback = sanitize(item.contentSnippet || item.summary || item.description);
  } 
  // 🧼 Step 2: Fallback from article body
  else if (typeof content === 'string' && content.length > 0) {
    const paragraph = content.split('\n').find(p => p.trim().length > 100) || '';
    fallback = sanitize(paragraph.slice(0, 300) + '...');
  }

  // ✏️ Step 3: Lead paragraph mode
  if (descriptionMode === 'lead-paragraph') {
    const lead = content.split('\n').find(p => p.trim().length > 100);
    return sanitize(lead || fallback);
  }

  // 🤖 Step 4: GPT Mode
 // if (descriptionMode === 'gpt' || (descriptionMode === 'auto' && usedOpenAI)) {
   // try {
     // const summaryRes = await withRetry(() =>
      //  openai.chat.completions.create({
          //model: "gpt-4-turbo",
          //messages: [{
          //  role: 'user',
          //  content: `Summarize this sports article in 80 to 100 words, in a concise, journalistic tone. Highlight the key event, result, and standout player or moment:\n\n${content}`
         // }],
         // temperature: 0.7,
       // })
      //);
      //const aiSummary = sanitize(summaryRes?.choices?.[0]?.message?.content);

      //if (aiSummary && aiSummary.length >= 200) {
     //   return aiSummary;
      //} else {
      //  console.warn("⚠️ GPT summary too short. Using fallback.");
      //}
    // }  catch (err) {
    //  console.warn("⚠️ OpenAI failed:", err?.response?.data || err.message);
   //}

 // }

  // ⛑️ Step 5: Fallback return
  return fallback || 'No summary available.';
}

async function generateArticleFromItem(item, sourceTitle) {
  const pubDate = safeDate(item.pubDate);
  if (!pubDate) {
    console.warn("⚠️ Invalid pubDate, skipping article:", item.title);
    return;
  }

  let title = sanitize(item.title || 'Untitled');
  const slug = slugify(title.toLowerCase(), { lower: true });
  const leagueFolder = inferLeagueFolder(title);
  const folderPath = path.join(OUTPUT_DIR, leagueFolder);
  const filename = getArticleFilename(pubDate, title);
  const filePath = path.join(folderPath, filename);

  await fs.ensureDir(folderPath);
  if (await fs.pathExists(filePath)) {
    console.log(`🟡 Skipped (cached): ${filePath}`);
    return;
  }

  const link = sanitize(item.link || '');

  // Smart mode detection
  const lowerTitle = title.toLowerCase();
  const snippet = (item.contentSnippet || item.summary || item.description || '').toLowerCase();

  let mode = "summarize";
  if (
    lowerTitle.includes("final") ||
    lowerTitle.includes("championship") ||
    lowerTitle.includes("trade") ||
    lowerTitle.includes("transfer") ||
    lowerTitle.includes("signing") ||
    lowerTitle.includes("record") ||
    snippet.includes("dramatic") ||
    snippet.includes("clinched") ||
    snippet.includes("historic")
  ) {
    mode = "in_depth";
  } else if (process.env.ARTICLE_MODE) {
    mode = process.env.ARTICLE_MODE;
  }

  console.log(`🧠 ARTICLE_MODE detected: ${mode}`);

  let content = '';

  // Try to extract article first
  try {
    const extracted = await extractArticle(link);
    if (extracted && extracted.length >= 400) {
      content = extracted;
    } else {
      console.warn("⚠️ Extracted article too short. Using RSS snippet as fallback.");
      content = getMinimalContentFallback(item, title);
    }
  } catch (err) {
    console.warn("❌ Failed to extract article. Using RSS snippet as fallback.");
    content = getMinimalContentFallback(item, title);
  }

  let image = await extractImageFromURL(link);
  const fallbackImage = 'https://example.com/default-news.jpg';
  if (!image || image.trim() === '') {
    console.warn(`⚠️ No image found for "${title}", using fallback`);
    image = fallbackImage;
  }

  const description = await getDescription({ content, item });

  // Try to override title if content-derived one is better
  let cleanedTitle = getTitleFromContent(content);
  if (cleanedTitle && cleanedTitle.length >= 20 && cleanedTitle.length <= 120) {
    console.log(`✂️ Overriding title with content-derived title:\n→ "${cleanedTitle}"`);
    title = cleanedTitle;
  }

  const domain = new URL(link).hostname.replace(/^www\./, '');
  const tags = [leagueFolder];

  const markdown = `---
title: "${title}"
date: "${pubDate}"
slug: "${slug}"
source: "${sanitize(sourceTitle)}"
original_link: "${link}"
description: "${description}"
mode: "${mode}"
image: "${image}"
category: "${leagueFolder}"
tags: ["${leagueFolder}"]
domain: "${domain}"
---
${content}`;

  await fs.writeFile(filePath, markdown);
  console.log(`✅ Saved: ${filePath}`);
}

// 🔧 Helper for fallback content
function getMinimalContentFallback(item, title) {
  let fallback = sanitize(item.contentSnippet || item.summary || item.description || title);
  if (!fallback || fallback.length < 100) {
    console.warn("⚠️ Fallback content too short, using title only.");
    fallback = title;
  }
  return fallback;
}

async function readArticlesFromDisk() {
  await fs.ensureDir(OUTPUT_DIR);
  const articles = [];
  const fileReadPromises = [];

  return new Promise((resolve, reject) => {
    klaw(OUTPUT_DIR)
      .on("data", item => {
        if (!item.path.endsWith(".md")) return;

        const promise = fs.readFile(item.path, "utf-8")
          .then(raw => {
            try {
              const { attributes, body } = frontMatter(raw);
              const fallbackImage = "https://example.com/default-news.jpg";
              const category = path.relative(OUTPUT_DIR, path.dirname(item.path));

              articles.push({
                title: attributes.title || "",
                date: attributes.date || "",
                slug: attributes.slug || "",
                source: attributes.source || "",
                original_link: attributes.original_link || "",
                content: body.trim(),
                description: attributes.description || body.slice(0, 200).trim() + "...",
                image: attributes.image || fallbackImage,
                category: attributes.category || category || "general",
              });
            } catch (err) {
              console.warn(`⚠️ Skipping malformed file: ${item.path}`);
            }
          })
          .catch(err => {
            console.error(`❌ Failed to parse article at ${item.path}`, err);
          });

        fileReadPromises.push(promise);
      })

      .on("end", async () => {
        await Promise.all(fileReadPromises); // Wait for all async reads to finish
        if (articles.length === 0) {
          console.warn("⚠️ No articles found in disk");
        }

       const sorted = articles
        .filter(a => !!a.slug && !!a.date && !!a.title && !!a.content && !isNaN(new Date(a.date).getTime()))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

        resolve(sorted);
      })

      .on("error", reject);
  });
}


async function fetchNews(force = false) {
  const NEWS_WINDOW_HOURS = parseInt(process.env.NEWS_TIME_WINDOW_HOURS || '24');
  const cutoffDate = new Date();
  cutoffDate.setHours(0, 0, 0, 0); // Set to start of day

  if (!force && await fs.pathExists(CACHE_PATH)) {
    try {
      const cached = await fs.readJson(CACHE_PATH);
      const cachedDateStr = cached?.trending?.[0]?.date;
      if (cachedDateStr) {
        const cacheAge = Date.now() - new Date(cachedDateStr).getTime();
        const maxAge = 1000 * 60 * 60 * 24; // 24 hours
        if (cacheAge < maxAge) {
          console.log("✅ Using fresh cache");
          return cached;
        } else {
          console.log("🔁 Cache is stale based on age. Fetching fresh news...");
        }
      } else {
        console.warn("⚠️ Cached date missing or invalid, will refetch");
      }
    } catch (err) {
      console.warn("⚠️ Failed to read cache, will refetch");
    }
  }

  const feedUrls = [
    'https://www.espn.com/espn/rss/news',
    'https://feeds.bbci.co.uk/sport/rss.xml?edition=uk',
    'https://www.skysports.com/rss/12040',
    'https://rss.nytimes.com/services/xml/rss/nyt/Sports.xml',
    'https://www.cbssports.com/rss/headlines/',
    'https://www.theguardian.com/uk/sport/rss',
  ];

  for (const url of feedUrls) {
    await new Promise(res => setTimeout(res, 1000)); 
    try {
      const feed = await parser.parseURL(url);
      const source = feed.title;
      for (const item of feed.items) {
        const pubDate = item.pubDate.replace(/ BST$/, ''); // Remove BST timezone
        const date = new Date(pubDate);
        if (isNaN(date.getTime())) {
          console.warn(`⚠️ Invalid pubDate: ${item.pubDate}. Skipping article: ${item.title}`);
          continue;
        }
        if (date >= cutoffDate) {
          try {
            await generateArticleFromItem(item, source);
          } catch (err) {
            console.warn(`⚠️ Failed to process article "${item.title}": ${err.message}`);
          }
        } else {
          console.log(`⏭️ Skipped older article (${date.toISOString()}): ${item.title}`);
        }
      }
    } catch (err) {
      const msg = err?.stack || err?.message || String(err) || "Unknown error";
      console.error(`❌ Failed to fetch news: ${msg}`);
    }
  } 

  let articles = await readArticlesFromDisk();
  articles = articles.filter(a => new Date(a.date) >= cutoffDate);
  const seen = new Set();
  articles = articles.filter(a => {
    if (seen.has(a.slug)) return false;
    seen.add(a.slug);
    return true;
  });

  // Prioritize football news
  articles.sort((a, b) => {
    if (a.category === 'football' && b.category !== 'football') return -1;
    if (a.category !== 'football' && b.category === 'football') return 1;
    return new Date(b.date) - new Date(a.date);
  });

  if (articles.length < 6) {
    console.warn(`⚠️ Only ${articles.length} unique recent articles`);
  }

  const TRENDING_COUNT = Math.min(10, articles.length);
  const trending = articles.slice(0, TRENDING_COUNT);
  const updates = articles.slice(TRENDING_COUNT);

  const structured = {
    trending,
    updates,
  };

  if (!Array.isArray(structured.trending) || !Array.isArray(structured.updates)) {
    throw new Error("❌ Invalid structure: missing trending or updates");
  }

  await fs.ensureDir(path.dirname(CACHE_PATH));
  console.log("🧾 Final structured JSON:", JSON.stringify(structured, null, 2));

  if (trending.length > 0 && updates.length > 0) {
    await fs.writeJson(CACHE_PATH, structured, { spaces: 2 });
  } else {
    console.warn("⚠️ No articles to cache. Skipping cache write.");
  }

  return structured;
}

module.exports = { fetchNews };
