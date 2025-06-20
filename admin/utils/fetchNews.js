const OpenAI = require('openai');
const Parser = require('rss-parser');
const slugify = require('slugify');
const fs = require('fs-extra');
const path = require('path');
const klaw = require('klaw');

const { extractImageFromURL } = require('./extractImageFromURL');
const { isOnCooldown, recordOpenAIError } = require('../utils/openaiGuard');
const { extractFullArticle } = require('./extractFullText');

const OUTPUT_DIR = path.join(__dirname, 'articles');
const CACHE_PATH = path.join(__dirname, 'cache/news.json');

const FEED_URLS = [
  'https://www.espn.com/espn/rss/news',
  'https://feeds.bbci.co.uk/sport/rss.xml?edition=uk',
  'https://www.skysports.com/rss/12040',
  'https://rss.nytimes.com/services/xml/rss/nyt/Sports.xml',
  'https://www.cbssports.com/rss/headlines/',
  'https://www.theguardian.com/uk/sport/rss',
];

const openaiKey = process.env.OPENAI_API_KEY;
if (!openaiKey) console.warn("⚠️ Missing OpenAI API key — generation will be disabled.");

const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;
const parser = new Parser();

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


function inferTags(text) {
  const tags = [];

  if (/transfer|signed|deal/i.test(text)) tags.push('transfer');
  if (/score|win|match|defeat|draw/i.test(text)) tags.push('match');
  if (/injur(y|ies)|out for|rupture/i.test(text)) tags.push('injury');
  if (/preview|predicted/i.test(text)) tags.push('preview');

  return tags;
}


//function for weak content
function isWeakContent(text) {
  return text.length < 300 ||
         !/[a-zA-Z]/.test(text) ||
         text.includes("As an AI") ||
         text.includes("Sorry, I can't") ||
         !text.includes('\n\n');
}

//function to validate article
function validateArticleContent(content) {
  return content.length >= 400 &&
         /\b(match|score|win|defeat|player|team|coach)\b/i.test(content) &&
         content.split(/\s+/).length >= 300;
}

function generateDescription(content, title) {
  const lines = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !/^[-•*]/.test(line));

  let desc = lines[0] || '';
  if (!desc || desc.length < 30) {
    // fallback if description is too short
    desc = content.slice(0, 200);
  }

  // last resort fallback
  if (!desc || desc.length < 10) {
    desc = `Latest update on: ${title}`;
  }

  return desc.replace(/"/g, "'");
}


//function to generate article
async function generateArticleFromItem(item, sourceTitle) {
  const pubDate = safeDate(item.pubDate);
  const title = item.title || 'Untitled';
  const seoTitle = title.replace(/[^\w\s]/g, '').trim();
  const slug = slugify(seoTitle.toLowerCase(), { lower: true });
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

  let fullContent = await extractFullArticle(link);

  if (!fullContent || fullContent.length < 300) {
   console.warn(`⚠️ Primary extract failed. Falling back to RSS content for "${title}"`);

  fullContent = item.contentSnippet || item.summary || '';
  if (fullContent.length < 100) {
    console.warn(`⚠️ Skipping "${title}" — fallback content also too short.`);
    return;
  }
}


  // 💬 Enhanced prompt for better structure
 const prompt = `
You're a professional sports journalist writing for platforms like BBC Sport or ESPN.

Write a **complete, engaging** sports article of **400–800 words** based on the source content below.

Structure:
- 🔥 **Lede**: 1–2 line punchy intro
- 🧠 **Context**: explain what's happening, relevant teams/players/events
- 🎤 **Quotes**: rephrase any athlete/coach statements if found
- 📊 **Stats/Details**: include key numbers or analysis
- ✅ **Conclusion**: sum up significance or what's next

**DO NOT copy exact text**. Rephrase with professional journalistic tone. Keep paragraphs tight and readable.

Article content:
\`\`\`
${fullContent}
\`\`\`
`;

  let content;
  try {
    const response = await withRetry(() =>
      openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      })
    );

    content = response.choices[0].message.content.trim();

    // Normalize if bullet-only
    if (
      !content.includes('\n\n') &&
      content.split('\n').every(line => /^[-•*]\s+/.test(line))
    ) {
      content = `Summary:\n\n${content}`;
    }

    // content generation
    if (content.split(/\s+/).length < 400) {
     console.warn(`⚠️ Article too short (${content.length} chars). Skipping.`);
     return;
    }


     // 🔍 Check for weak content
     if (isWeakContent(content) || !validateArticleContent(content)) {
      console.warn("⚠️ OpenAI response weak or failed validation. Using summarization fallback.");
      content = `## Summary\n\n${await rewriteWithOpenAI(title, fullContent, link)}`;
     }
    

  } catch (err) {
    recordOpenAIError(err);
    console.error(`❌ OpenAI error for "${title}": ${err.message}`);
    return;
  }


  // ✂️ Extract the first non-bullet line as the description
  const description = generateDescription(content, title);


  //Basic tag inference
  const tags = inferTags(fullContent + ' ' + content);

  //Image scraping
  const image = await extractImageFromURL(link).catch(() => null);

  //Final markdown
  const markdown = `---\n` +
    `title: "${title}"\n` +
    `date: "${pubDate}"\n` +
    `slug: "${slug}"\n` +
    `source: "${sourceTitle}"\n` +
    `original_link: "${link}"\n` +
    `mode: "${mode}"\n` +
    `image: "${image || ''}"\n` +
    `description: "${description}"\n` +
    `tags: [${tags.map(t => `"${t}"`).join(', ')}]\n` +
    `---\n\n` +
    `${content}`;

  await fs.writeFile(filePath, markdown);
  console.log(`Saved: ${filePath}`);
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
  const todayISO = new Date().toISOString().split('T')[0];

  if (!force && await fs.pathExists(CACHE_PATH)) {
    try {
      const cached = await fs.readJson(CACHE_PATH);
      const cachedDate = cached?.trending?.[0]?.date;
      if (cachedDate === todayISO) return cached;
      else console.log("🔁 Cache is stale. Fetching fresh news...");
    } catch {
      console.warn("⚠️ Failed to read cache, will refetch");
    }
  }

  let success = false;

  for (const url of FEED_URLS) {
    try {
      const feed = await withRetry(() => parser.parseURL(url));
      const source = feed.title;

      for (const item of feed.items) {
        const pubDateSafe = safeDate(item.pubDate);
        if (pubDateSafe === todayISO) {
          await generateArticleFromItem(item, source);
        } else {
          console.log(`⏭️ Skipped old article (${pubDateSafe}): ${item.title}`);
        }
      }

      success = true;
    } catch (err) {
      console.error(`❌ Failed to fetch from ${url}: ${err.message}`);
    }
  }

  let articles = await readArticlesFromDisk();
  articles = articles.filter(a => a.date === todayISO);

  console.log(`📰 Found ${articles.length} valid articles for today.`);

  const seen = new Set();
  articles = articles.filter(a => {
    if (seen.has(a.slug)) return false;
    seen.add(a.slug);
    return true;
  });

  if (!success && articles.length === 0) {
    console.warn("⚠️ All RSS feeds failed. Using stale cache...");
    try {
      const fallback = await fs.readJson(CACHE_PATH);
      if (
        !Array.isArray(fallback?.trending) ||
        !Array.isArray(fallback?.updates) ||
        fallback.trending.length === 0
      ) {
        throw new Error("Fallback cache also has invalid structure");
      }
      return fallback;
    } catch {
      throw new Error("❌ No fresh articles and no valid cache.");
    }
  }

  const structured = {
    trending: articles.slice(0, 3),
    updates: articles.slice(3, 6),
  };

  // 🚨 Validate structure before caching
  if (
    !Array.isArray(structured.trending) ||
    !Array.isArray(structured.updates) ||
    structured.trending.length === 0
  ) {
    throw new Error("❌ Invalid or empty news data");
  }

  await fs.ensureDir(path.dirname(CACHE_PATH));
  await fs.writeJson(CACHE_PATH, structured, { spaces: 2 });

  return structured;
}

module.exports = { fetchNews };
