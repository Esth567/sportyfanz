// extractImageFromURL.js (CommonJS)
const got = require('got');

async function extractImageFromURL(url) {
  try {
    const html = await got(url).text();
    // TODO: parse and extract image here
    return null;
  } catch (err) {
    console.warn(`⚠️ Failed to extract image from ${url}: ${err.message}`);
    return null;
  }
}

module.exports = { extractImageFromURL };
