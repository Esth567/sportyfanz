const OpenAI = require('openai');
const Parser = require('rss-parser');
const slugify = require('slugify');
const fs = require('fs-extra');
const path = require('path');
const klaw = require('klaw');

const { extractImageFromURL } = require('./extractImageFromURL');
const { isOnCooldown, recordOpenAIError } = require('../utils/openaiGuard');

const openaiKey = process.env.OPENAI_API_KEY;
if (!openaiKey) console.warn("⚠️ Missing OpenAI API key — generation will be disabled.");

const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;
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

function safeDate(dateString) {
  const parsed = new Date(dateString);
  return isNaN(parsed.getTime()) ? new Date().toISOString().split('T')[0] : parsed.toISOString().split('T')[0];
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

async function generateArticleFromItem(item, sourceTitle) {
  const pubDate = safeDate(item.pubDate);
  const title = sanitize(item.title || 'Untitled');
  const slug = slugify(title.toLowerCase(), { lower: true });
  const leagueFolder = inferLeagueFolder(title);
  const folderPath = path.join(OUTPUT_DIR, leagueFolder);
  const filePath = path.join(folderPath, `${pubDate}-${slug}.md`);

  await fs.ensureDir(folderPath);
  if (await fs.pathExists(filePath)) {
    console.log(`🟡 Skipped (cached): ${filePath}`);
    return;
  }

  if (!openai || process.env.USE_OPENAI !== "true" || isOpenAIDisabled()) {
    console.warn(`⚠️ Skipping OpenAI for ${title}`);
    return;
  }

  const link = sanitize(item.link || '');
  const mode = process.env.ARTICLE_MODE || "summarize";

  const prompt = mode === "summarize"
    ? `Summarize this in 5 bullet points:\n\nTitle: ${title}\nDate: ${pubDate}\nSource: ${sourceTitle}\nLink: ${link}`
    : `You're a journalist. Write a 3-paragraph article:\n\nTitle: ${title}\nSource: ${sourceTitle}`;

  const response = await withRetry(() =>
    openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    })
  );

  const content = response.choices[0].message.content;
  const image = await extractImageFromURL(link);

  const markdown = `---\ntitle: "${title}"\ndate: "${pubDate}"\nslug: "${slug}"\nsource: "${sanitize(sourceTitle)}"\noriginal_link: "${link}"\nmode: "${mode}"\nimage: "${image || ''}"\n---\n\n${content}`;

  await fs.writeFile(filePath, markdown);
  console.log(`✅ Saved: ${filePath}`);
}

async function readArticlesFromDisk() {
  await fs.ensureDir(OUTPUT_DIR);
  const articles = [];

  return new Promise((resolve, reject) => {
    klaw(OUTPUT_DIR)
      .on('data', async item => {
        if (!item.path.endsWith('.md')) return;

        const raw = await fs.readFile(item.path, 'utf-8');
        const match = raw.match(/^---\n([\s\S]+?)\n---\n\n([\s\S]*)$/);
        if (!match) return;

        const frontMatter = Object.fromEntries(
          match[1].split('\n').map(line => {
            const [key, ...rest] = line.split(':');
            return [key.trim(), rest.join(':').trim().replace(/^"|"$/g, '')];
          })
        );

        const category = path.relative(OUTPUT_DIR, path.dirname(item.path));

        articles.push({
          title: frontMatter.title,
          date: frontMatter.date,
          slug: frontMatter.slug,
          source: frontMatter.source,
          original_link: frontMatter.original_link,
          content: match[2],
          image: frontMatter.image,
          category
        });
      })
      .on('end', () => {
        if (articles.length === 0) console.warn("⚠️ No articles found in disk");
        resolve(
          articles
            .filter(a => !!a.slug)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
        );
      })
      .on('error', reject);
  });
}

async function fetchNews(force = false) {
 if (!force && await fs.pathExists(CACHE_PATH)) {
  try {
    const cached = await fs.readJson(CACHE_PATH);
    const cachedDate = cached?.trending?.[0]?.date;

    const today = new Date().toISOString().split('T')[0];
    if (cachedDate === today) {
      return cached;
    } else {
      console.log("🔁 Cache is stale. Fetching fresh news...");
    }
  } catch {
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

  const todayISO = new Date().toISOString().split('T')[0];

  for (const url of feedUrls) {
    try {
      const feed = await withRetry(() => parser.parseURL(url));
      const source = feed.title;

      for (const item of feed.items) {
        const pubDate = new Date(item.pubDate);
        const pubDateISO = pubDate.toISOString().split('T')[0];

        // ✅ Only generate articles for today's news
        if (pubDateISO === todayISO) {
          await generateArticleFromItem(item, source);
        } else {
          console.log(`⏭️ Skipped old article (${pubDateISO}): ${item.title}`);
        }
      }
    } catch (err) {
      console.error(`❌ Failed to fetch from ${url}: ${err.message}`);
    }
  }

  let articles = await readArticlesFromDisk();

  // ✅ Filter only today's articles
  articles = articles.filter(a => a.date === todayISO);

  // ✅ Deduplicate by slug
  const seen = new Set();
  articles = articles.filter(a => {
    if (seen.has(a.slug)) return false;
    seen.add(a.slug);
    return true;
  });

  if (articles.length < 6) {
    console.warn(`⚠️ Only ${articles.length} unique articles from today`);
  }

  const structured = {
    trending: articles.slice(0, 3),
    updates: articles.slice(3, 6),
  };

  if (!Array.isArray(structured.trending) || !Array.isArray(structured.updates)) {
    throw new Error("❌ Invalid structure: missing trending or updates");
  }

  await fs.ensureDir(path.dirname(CACHE_PATH));
  await fs.writeJson(CACHE_PATH, structured, { spaces: 2 });

  return structured;
}

module.exports = { fetchNews };
