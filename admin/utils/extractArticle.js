const fetch = require('node-fetch');
const { processArticleHTML } = require('./nlpProcessor');

async function extractArticle(url) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (NewsBot)' }
    });
    const html = await response.text();

    const nlpData = await processArticleHTML(html, url);
    return nlpData;  // Includes title, text, sentiment, entities, summaries

  } catch (err) {
    console.warn('⚠️ Failed to process article:', err.message);
    return null;
  }
}

module.exports = { extractArticle };


