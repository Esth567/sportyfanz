const { JSDOM } = require('jsdom');
const fetch = require('node-fetch');
const Readability = require('@mozilla/readability').Readability;

async function extractFullArticle(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (NewsBot)',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    const html = await res.text();

    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent || article.textContent.length < 300) {
      throw new Error("Extracted content too short");
    }

    return article.textContent;
  } catch (err) {
    console.warn(`⚠️ Failed to extract full article: ${url}`);
    return '';
  }
}

module.exports = { extractFullArticle };
