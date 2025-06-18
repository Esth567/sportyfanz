require('dotenv').config();
const OpenAI = require('openai');
const Parser = require('rss-parser');
const slugify = require('slugify');
const fs = require('fs-extra');
const path = require('path');
const klaw = require('klaw'); // ✅ Needed for walk()

const { extractImageFromURL } = require('./extractImageFromURL');
const { isOnCooldown, recordOpenAIError } = require('../utils/openaiGuard');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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
  if (isOpenAIDisabled()) {
    throw new Error("OpenAI temporarily disabled due to repeated 429s.");
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err.status === 429) {
        console.warn("⚠️ OpenAI quota exceeded.");
        if (attempt >= retries - 1) disableOpenAITemporarily(15);
      }

      if (attempt < retries - 1) {
        console.warn(`Retrying (${attempt + 1}/${retries})...`);
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

function detectCategory(title) {
  const mappings = {
    "premier-league": ["premier league", "man united", "arsenal", "liverpool"],
    "nba": ["nba", "basketball", "lakers", "celtics"],
    "tennis": ["tennis", "wimbledon", "djokovic", "nadal"],
    "formula-1": ["formula 1", "f1", "verstappen", "hamilton"],
    "nfl": ["nfl", "super bowl", "patriots", "chiefs"],
  };

  const lower = title.toLowerCase();
  for (const [category, keywords] of Object.entries(mappings)) {
    if (keywords.some(keyword => lower.includes(keyword))) {
      return category;
    }
  }

  return "general";
}

function inferLeagueFolder(title = '') {
  const lower = title.toLowerCase();
  if (lower.includes('premier league')) return 'premier-league';
  if (lower.includes('nba')) return 'nba';
  if (lower.includes('nfl')) return 'nfl';
  if (lower.includes('mlb')) return 'mlb';
  if (lower.includes('formula 1')) return 'f1';
  if (lower.includes('tennis')) return 'tennis';
  if (lower.includes('golf')) return 'golf';
  return 'general';
}

async function generateArticleFromItem(item, sourceTitle) {
  const pubDate = safeDate(item.pubDate);
  const title = item.title || 'Untitled';
  const slug = slugify(title.toLowerCase(), { lower: true });
  const leagueFolder = inferLeagueFolder(title);
  const folderPath = path.join(OUTPUT_DIR, leagueFolder);
  const filename = `${pubDate}-${slug}.md`;
  const filePath = path.join(folderPath, filename);

  await fs.ensureDir(folderPath);
  if (await fs.pathExists(filePath)) {
    console.log(`🟡 Skipped (cached): ${filePath}`);
    return;
  }

  if (process.env.USE_OPENAI !== "true" || isOpenAIDisabled()) {
    console.warn(`⚠️ Skipping OpenAI for ${title}`);
    return;
  }

  const link = item.link;
  const mode = process.env.ARTICLE_MODE || "summarize";

  const prompt = mode === "summarize"
    ? `Summarize the following news item in 5 bullet points:\n\nFacts:\n- Title: ${title}\n- Date: ${pubDate}\n- Source: ${sourceTitle}\n- Link: ${link}`
    : `You're a journalist. Write a 3-paragraph article on:\n\nTitle: ${title}\nSource: ${sourceTitle}`;

  const response = await withRetry(() =>
    openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    })
  );

  const content = response.choices[0].message.content;
  const image = await extractImageFromURL(link);

  const markdown = `---\ntitle: "${title}"\ndate: "${pubDate}"\nslug: "${slug}"\nsource: "${sourceTitle}"\noriginal_link: "${link}"\nmode: "${mode}"\nimage: "${image || ''}"\n---\n\n${content}`;

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
          source_icon: frontMatter.source_icon,
          original_link: frontMatter.original_link,
          content: match[2],
          image: frontMatter.image,
          category
        });
      })
      .on('end', () => resolve(articles.sort((a, b) => new Date(b.date) - new Date(a.date))))
      .on('error', reject);
  });
}

async function fetchNews(force = false) {
  if (!force && await fs.pathExists(CACHE_PATH)) {
    try {
      const cached = await fs.readJson(CACHE_PATH);
      return cached;
    } catch (err) {
      console.warn("⚠️ Failed to read cache, will refetch.");
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
    try {
      const feed = await withRetry(() => parser.parseURL(url));
      const source = feed.title;

      for (const item of feed.items.slice(0, 3)) {
        await generateArticleFromItem(item, source);
      }
    } catch (err) {
      console.error(`❌ Failed to fetch from ${url}: ${err.message}`);
    }
  }

  const articles = await readArticlesFromDisk();
  const structured = {
    trending: articles.slice(0, 3),
    updates: articles.slice(3, 6),
  };

  await fs.ensureDir(path.dirname(CACHE_PATH));
  await fs.writeJson(CACHE_PATH, structured, { spaces: 2 });

  return structured;
}

module.exports = { fetchNews };
