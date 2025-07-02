const OpenAI = require('openai');
const Parser = require('rss-parser');
const slugify = require('slugify');
const fs = require('fs-extra');
const path = require('path');
const klaw = require('klaw');
const matter = require("gray-matter");

const ARTICLES_DIR = path.join(__dirname, "articles");

const { extractImageFromURL } = require('./extractImageFromURL');
const { isOnCooldown, recordOpenAIError } = require('../utils/openaiGuard');
const { rewriteWithOpenAI } = require('../utils/rewriteWithOpenAI');

const openaiKey = process.env.OPENAI_API_KEY;
if (!openaiKey) {
  console.warn("⚠️ Missing OpenAI API key — generation will be disabled.");
} else {
  console.log("✅ OpenAI API key detected");
}


const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;

const descriptionMode = process.env.DESCRIPTION_MODE || 'auto';

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
  return `${datePart}-${slug}.md`;
}

function safeDate(dateString) {
  const parsed = new Date(dateString);
  return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function inferLeagueFolder(title = '') {
  const lower = title.toLowerCase();
  if (lower.includes('premier league')) return 'premier-league';
  if (lower.includes('nba')) return 'nba';
  if (lower.includes('nfl')) return 'nfl';
  if (lower.includes('mlb')) return 'mlb';
  if (lower.includes('formula 1') || lower.includes('f1')) return 'f1';
  if (lower.includes('tennis')) return 'tennis';
  if (lower.includes('golf')) return 'golf';
  return 'general';
}

function sanitize(input = '') {
  return input.replace(/"/g, "'").replace(/\n/g, ' ').trim();
}

async function getDescription({ content, item, usedOpenAI }) {
  const fallback = sanitize(item.contentSnippet || item.summary || item.description || content.split('\n')[0].slice(0, 200) + '...');

  if (descriptionMode === 'lead-paragraph') {
    return sanitize(content.split('\n').find(p => p.trim().length > 50) || fallback);
  }

  if (descriptionMode === 'gpt' || (descriptionMode === 'auto' && usedOpenAI)) {
    try {
      const summaryRes = await withRetry(() =>
        openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: `Summarize the following article in 3-4 sentences, journalistic tone:\n\n${content}`}],
          temperature: 0.5,
        })
      );
      const aiSummary = sanitize(summaryRes?.choices?.[0]?.message?.content);
      if (aiSummary && aiSummary.length > 20) return aiSummary;
    } catch (err) {
      console.warn("⚠️ Failed to generate summary description via OpenAI");
    }
  }

  return fallback;
}

async function generateArticleFromItem(item, sourceTitle) {
  const pubDate = safeDate(item.pubDate);
  const title = sanitize(item.title || 'Untitled');
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
  const mode = process.env.ARTICLE_MODE || "summarize";

  let content = '';
  let usedOpenAI = false;

  if (openai && process.env.USE_OPENAI === "true") {
    try {
      const prompt = mode === "summarize"
        ? `Summarize the article in exactly 5 clear and informative bullet points. Each point should be a complete sentence. The total length should be at least 100 words:\n\nTitle: ${title}\nDate: ${pubDate}\nSource: ${sourceTitle}\nLink: ${link}`
        : `You are a professional sports journalist. Write a well-structured news article in 5 concise paragraphs. Use a neutral tone. The article should be at least 300 words. Avoid repetition and include relevant context from the source:\n\nTitle: ${title}\nDate: ${pubDate}\nSource: ${sourceTitle}\nLink: ${link}`;

        console.log("📝 OpenAI Prompt:\n", prompt);
        console.log("🔁 Waiting for OpenAI response...");

      const response = await withRetry(() =>
        openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        })
      );

      const draft = response?.choices?.[0]?.message?.content?.trim();
      console.log("📤 OpenAI Response:\n", draft);

      if (draft && draft.length >= 300 && draft.split(/\s+/).length >= 60) {
        content = draft;
        usedOpenAI = true;
      } else {
        console.warn("⚠️ GPT output too short or malformed. Will attempt fallback.");
      }
    } catch (err) {
      console.warn("⚠️ OpenAI failed, falling back to raw extraction.");
    }
  }

  if (!content) {
    try {
      const extracted = await extractArticle(link);
      if (extracted && extracted.length >= 300) {
        content = extracted;
      } else {
        console.warn("⚠️ Extracted article too short. Skipping.");
        return;
      }
    } catch (err) {
      console.warn("❌ Failed to extract article as fallback.");
      return;
    }
  }

   // ✅ Rewrite with OpenAI if enabled
  if (usedOpenAI && content && process.env.ENABLE_REWRITE === "true") {
    try {
      content = await rewriteWithOpenAI(title, content, link);
    } catch (err) {
      console.warn("⚠️ Failed to rewrite content with OpenAI");
    }
  }

  let image = await extractImageFromURL(link);
  const fallbackImage = 'https://example.com/default-news.jpg';
  if (!image || image.trim() === '') {
    console.warn(`⚠️ No image found for ${title}, using fallback`);
    image = fallbackImage;
  }

  const description = await getDescription({ content, item, usedOpenAI });

  const markdown = `---\ntitle: "${title}"\ndate: "${pubDate}"\nslug: "${slug}"\nsource: "${sanitize(sourceTitle)}"\noriginal_link: "${link}"\ndescription: "${description}"\nmode: "${mode}"\nused_openai: "${usedOpenAI}"\nimage: "${image}"\n---\n\n${content}`;

  await fs.writeFile(filePath, markdown);
  console.log(`✅ Saved: ${filePath}`);
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
            const match = raw.match(/^---\n([\s\S]+?)\n---\n\n([\s\S]*)$/);
            if (!match) {
              console.warn(`⚠️ Skipping malformed file: ${item.path}`);
              return;
            }

            const frontMatter = Object.fromEntries(
              match[1].split("\n").map(line => {
                const [key, ...rest] = line.split(":");
                return [key.trim(), rest.join(":").trim().replace(/^"|"$/g, "")];
              })
            );

            const body = match[2].trim();
            const fallbackImage = "https://example.com/default-news.jpg";
            const category = path.relative(OUTPUT_DIR, path.dirname(item.path));

            articles.push({
              title: frontMatter.title || "",
              date: frontMatter.date || "",
              slug: frontMatter.slug || "",
              source: frontMatter.source || "",
              original_link: frontMatter.original_link || "",
              content: body,
              description: frontMatter.description || body.slice(0, 200) + "...",
              image: frontMatter.image || fallbackImage,
              category: frontMatter.category || category || "general",
            });
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
          .filter(a => !!a.slug && !!a.date && !!a.title && !!a.content)
          .sort((a, b) => new Date(b.date) - new Date(a.date));

        resolve(sorted);
      })

      .on("error", reject);
  });
}


async function fetchNews(force = false) {
  if (!force && await fs.pathExists(CACHE_PATH)) {
    try {
      const cached = await fs.readJson(CACHE_PATH);
      const cachedDateStr = cached?.trending?.[0]?.date;
      if (cachedDateStr) {
        const cacheAge = Date.now() - new Date(cachedDateStr).getTime();
        const maxAge = 1000 * 60 * 60 * (parseInt(process.env.NEWS_TIME_WINDOW_HOURS || '12'));
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

  const now = new Date();
  const hoursAgoCutoff = parseInt(process.env.NEWS_TIME_WINDOW_HOURS || '12');
  const cutoffTime = new Date(now.getTime() - hoursAgoCutoff * 60 * 60 * 1000);

  for (const url of feedUrls) {
    try {
      const feed = await withRetry(() => parser.parseURL(url));
      const source = feed.title;
      for (const item of feed.items) {
        const pubDate = new Date(item.pubDate);
        if (pubDate > cutoffTime) {
          try {
            await generateArticleFromItem(item, source);
          } catch (err) {
            console.warn(`⚠️ Failed to process article \"${item.title}\": ${err.message}`);
          }
        } else {
          console.log(`⏭️ Skipped older article (${pubDate.toISOString()}): ${item.title}`);
        }
      }
    } catch (err) {
      console.error(`❌ Failed to fetch from ${url}: ${err.message}`);
    }
  }

  let articles = await readArticlesFromDisk();
  articles = articles.filter(a => new Date(a.date) > cutoffTime);
  const seen = new Set();
  articles = articles.filter(a => {
    if (seen.has(a.slug)) return false;
    seen.add(a.slug);
    return true;
  });

  if (articles.length < 6) {
    console.warn(`⚠️ Only ${articles.length} unique recent articles`);
  }

  const structured = {
    trending: Array.isArray(articles) ? articles.slice(0, 3) : [],
    updates: Array.isArray(articles) ? articles.slice(3, 6) : [],
  };

  if (!Array.isArray(structured.trending) || !Array.isArray(structured.updates)) {
    throw new Error("❌ Invalid structure: missing trending or updates");
  }

  
  await fs.ensureDir(path.dirname(CACHE_PATH));
  console.log("🧾 Final structured JSON:", JSON.stringify(structured, null, 2));

  await fs.writeJson(CACHE_PATH, structured, { spaces: 2 });
  return structured;
}

module.exports = { fetchNews };
