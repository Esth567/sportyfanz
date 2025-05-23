const axios = require('axios');
const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');

async function extractFullArticle(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (NewsBot)'
      }
    });
    const html = await response.text();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    return article && article.content ? article.content : null;
  } catch (err) {
    console.warn('⚠️ Failed to extract article from:', url);
    return null;
  }
}

module.exports = { extractFullArticle };

