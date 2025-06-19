// extractFullText.js
const { extract } = require('@extractus/article-extractor');

async function extractFullArticle(url) {
  try {
    const article = await extract(url);
    return article?.content?.trim() || '';
  } catch (err) {
    console.warn(`⚠️ Failed to extract full article from ${url}: ${err.message}`);
    return '';
  }
}

module.exports = { extractFullArticle };

