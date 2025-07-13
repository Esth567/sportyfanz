const OpenAI = require('openai');
const Parser = require('rss-parser');
const slugify = require('slugify');
const fs = require('fs-extra');
const path = require('path');
const klaw = require('klaw');
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
  const fallback = getFallbackDescription({ content, item });

  // ✏️ Mode: Lead paragraph
  if (descriptionMode === 'lead-paragraph') {
    const lead = extractLeadParagraph(content);
    return sanitize(lead || fallback);
  }

  // 🤖 Mode: GPT (currently disabled — see below)
  /*
  if (descriptionMode === 'gpt' || (descriptionMode === 'auto' && usedOpenAI)) {
    try {
      const summaryRes = await withRetry(() =>
        openai.chat.completions.create({
          model: "gpt-4-turbo",
          messages: [{
            role: 'user',
            content: `Summarize this sports article in 80 to 100 words, in a concise, journalistic tone. Highlight the key event, result, and standout player or moment:\n\n${content}`
          }],
          temperature: 0.7,
        })
      );

      const aiSummary = sanitize(summaryRes?.choices?.[0]?.message?.content || '');
      if (aiSummary.length >= 200) {
        return aiSummary;
      } else {
        console.warn("⚠️ GPT summary too short. Using fallback.");
      }
    } catch (err) {
      console.warn("⚠️ GPT summarization failed:", err?.response?.data || err.message);
    }
  }
  */

  // ⛑️ Final fallback
  return fallback || 'No summary available.';
}


function getFallbackDescription({ content, item }) {
  if (item.contentSnippet || item.summary || item.description) {
    return sanitize(item.contentSnippet || item.summary || item.description);
  }

  if (typeof content === 'string' && content.trim()) {
    const paragraph = extractLeadParagraph(content);
    return sanitize((paragraph || '').slice(0, 300).trim() + '...');
  }

  return 'No summary available.';
}


function extractLeadParagraph(content) {
  if (!content || typeof content !== 'string') return '';
  const lines = content.split('\n');
  return lines.find(p => p.trim().length > 100) || '';
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
  const safeLeagueFolder = slugify(leagueFolder, { lower: true, strict: true });
  const folderPath = path.join(OUTPUT_DIR, safeLeagueFolder);
  const filename = getArticleFilename(pubDate, title);
  const filePath = path.join(folderPath, filename);

  await fs.ensureDir(folderPath);
  if (await fs.pathExists(filePath)) {
    console.log(`🟡 Skipped (already exists): ${filePath}`);
    return;
  }

  const link = sanitize(item.link || '');
  const snippet = (item.contentSnippet || item.summary || item.description || '').toLowerCase();
  const lowerTitle = title.toLowerCase();

  // 🧠 Intelligent mode detection
  let mode = detectArticleMode(lowerTitle, snippet);

  console.log(`🧠 ARTICLE_MODE detected: ${mode}`);

  // 📄 Extract article content
  let content = await extractContentWithFallback(link, item, title);

  // 🖼️ Image handling
  let image = await extractImageFromURL(link);
  if (!image?.trim()) {
    console.warn(`⚠️ No image found for "${title}", using fallback`);
    image = 'https://example.com/default-news.jpg';
  }

  // ✏️ Description
  const description = await getDescription({ content, item });

  // 🧹 Try to override title from content
  const cleanedTitle = getTitleFromContent(content);
  if (cleanedTitle && cleanedTitle.length >= 20 && cleanedTitle.length <= 120) {
    console.log(`✂️ Overriding title with content-derived title:\n→ "${cleanedTitle}"`);
    title = cleanedTitle;
  }

    let domain = "unknown";
       try {
         domain = new URL(link).hostname.replace(/^www\./, '');
       } catch (e) {
       console.warn(`⚠️ Could not parse domain from link: ${link}`);
      }

     const tags = [leagueFolder];


  // 📝 Markdown frontmatter
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


function detectArticleMode(title, snippet) {
  const keywords = [
    "final", "championship", "trade", "transfer", "signing", "record",
    "dramatic", "clinched", "historic"
  ];

  for (const keyword of keywords) {
    if (title.includes(keyword) || snippet.includes(keyword)) {
      return "in_depth";
    }
  }

  return process.env.ARTICLE_MODE || "summarize";
}

async function extractContentWithFallback(link, item, title) {
  try {
    const extracted = await extractArticle(link);
    if (extracted && extracted.length >= 400) {
      return extracted;
    }

    console.warn("⚠️ Extracted article too short. Using RSS snippet as fallback.");
  } catch (err) {
    console.warn("❌ Failed to extract article:", err.message);
  }

  return getMinimalContentFallback(item, title);
}


async function readArticlesFromDisk() {
  await fs.ensureDir(OUTPUT_DIR);
  const articles = [];

  const filePromises = [];

  return new Promise((resolve, reject) => {
    klaw(OUTPUT_DIR)
      .on("data", (item) => {
        if (!item.path.endsWith(".md")) return;

        const promise = fs.readFile(item.path, "utf-8")
          .then((raw) => {
            try {
              const { attributes, body } = frontMatter(raw);
              const category = path.relative(OUTPUT_DIR, path.dirname(item.path));
              const fallbackImage = "https://example.com/default-news.jpg";

              // Minimal required validation
              const valid = attributes.title && attributes.date && attributes.slug && body?.trim();
              if (!valid || isNaN(new Date(attributes.date).getTime())) {
                console.warn(`⚠️ Skipping invalid or incomplete article: ${item.path}`);
                return;
              }

              articles.push({
                title: attributes.title,
                date: attributes.date,
                slug: attributes.slug,
                source: attributes.source || "",
                original_link: attributes.original_link || "",
                description: attributes.description || body.slice(0, 200).trim() + "...",
                image: attributes.image || fallbackImage,
                category: attributes.category || category || "general",
                content: body.trim(),
              });
            } catch (err) {
              console.warn(`⚠️ Skipping malformed file: ${item.path}`);
            }
          })
          .catch((err) => {
            console.error(`❌ Failed to read article at ${item.path}:`, err.message);
          });

        filePromises.push(promise);
      })

      .on("end", async () => {
        await Promise.all(filePromises);
        if (articles.length === 0) {
          console.warn("⚠️ No valid articles found on disk");
        }

        const sorted = articles.sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        );

        resolve(sorted);
      })

      .on("error", reject);
  });
}


async function fetchNews(force = false) {
  const NEWS_WINDOW_HOURS = parseInt(process.env.NEWS_TIME_WINDOW_HOURS || "12", 10);
  const cutoffDate = new Date();
  cutoffDate.setTime(Date.now() - NEWS_WINDOW_HOURS * 60 * 60 * 1000);


  if (!force && await useValidCacheIfFresh()) {
    return await fs.readJson(CACHE_PATH);
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
    await wait(1000); // Avoid rate limiting
    try {
      const feed = await parser.parseURL(url);
      const source = feed.title;

      for (const item of feed.items) {
        const pubDate = item.pubDate?.replace(/ BST$/, '');
        const date = new Date(pubDate);

        if (!isValidDate(date)) {
          console.warn(`⚠️ Invalid pubDate: ${item.pubDate} | Skipping "${item.title}"`);
          continue;
        }

        if (date >= cutoffDate) {
          try {
            await generateArticleFromItem(item, source);
          } catch (err) {
            console.warn(`⚠️ Failed to process: "${item.title}" → ${err.message}`);
          }
        } else {
          console.log(`⏭️ Skipped older article (${date.toISOString()}): ${item.title}`);
        }
      }

    } catch (err) {
      console.error(`❌ Failed to fetch from ${url}:`, err?.message || err);
    }
  }

  const allArticles = await readArticlesFromDisk();
  const recent = filterRecentArticles(allArticles, cutoffDate);
  const { trending, updates } = splitTrendingAndUpdates(recent);

  if (!trending.length || !updates.length) {
    console.warn("⚠️ Not enough data to cache. Skipping cache write.");
    return { trending, updates };
  }

  const structured = { trending, updates };

  await fs.ensureDir(path.dirname(CACHE_PATH));
  await fs.writeJson(CACHE_PATH, structured, { spaces: 2 });
  console.log("🧾 Cached structured news:", JSON.stringify(structured, null, 2));


  return structured;
}

(async () => {
  try {
    await fetchNews(true); // 🔁 Force refresh instead of using stale cache
  } catch (err) {
    console.error("❌ Failed to fetch news:", err.message);
  }
})();


function isValidDate(date) {
  return date instanceof Date && !isNaN(date.getTime());
}

function wait(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function useValidCacheIfFresh() {
  if (!await fs.pathExists(CACHE_PATH)) return false;

  try {
    const cached = await fs.readJson(CACHE_PATH);
    const cachedDate = new Date(cached?.trending?.[0]?.date);

    const isFresh = isValidDate(cachedDate) &&
      (Date.now() - cachedDate.getTime() < 24 * 60 * 60 * 1000);

    if (isFresh) {
      console.log("✅ Using fresh cache");
      return true;
    }

    console.log("🔁 Cache is stale. Refetching...");
  } catch (err) {
    console.warn("⚠️ Error reading cache:", err.message);
  }

  return false;
}

function filterRecentArticles(articles, cutoff) {
  return articles
    .filter(a => isValidDate(new Date(a.date)) && new Date(a.date) >= cutoff)
    .filter((a, i, self) => self.findIndex(b => b.slug === a.slug) === i) // Deduplicate
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function splitTrendingAndUpdates(articles) {
  const TOTAL = Math.min(10, articles.length);
  const FOOTBALL_COUNT = Math.round(TOTAL * 0.9);
  const OTHER_COUNT = TOTAL - FOOTBALL_COUNT;

  const football = articles.filter(a => a.category === 'football');
  const other = articles.filter(a => a.category !== 'football');

  if (football.length < FOOTBALL_COUNT)
    console.warn(`⚠️ Not enough football articles: wanted ${FOOTBALL_COUNT}, found ${football.length}`);

  if (other.length < OTHER_COUNT)
    console.warn(`⚠️ Not enough other sport articles: wanted ${OTHER_COUNT}, found ${other.length}`);

   const trending = [
    ...football.slice(0, FOOTBALL_COUNT),
    ...other.slice(0, OTHER_COUNT),
  ];

  while (trending.length < TOTAL) {
  const next = articles.find(a => !trending.find(t => t.slug === a.slug));
  if (!next) break;
  trending.push(next);
  }

  const trendingSlugs = new Set(trending.map(a => a.slug));
  const updates = articles.filter(a => !trendingSlugs.has(a.slug));

  return { trending, updates };
}



module.exports = { fetchNews };
