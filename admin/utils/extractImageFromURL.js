const got = require('got');
const metascraper = require('metascraper')([
  require('metascraper-image')(),
  require('metascraper-logo')(),
  require('metascraper-logo-favicon')(),
  require('metascraper-clearbit')(),
]);

async function extractImageFromURL(url) {
  try {
    const { body: html, url: finalUrl } = await got(url, { timeout: 10000 });
    const metadata = await metascraper({ html, url: finalUrl });
    return metadata.image || metadata.logo || null;
  } catch (err) {
    console.warn(`⚠️ Failed to extract image from ${url}: ${err.message}`);
    return null;
  }
}

module.exports = { extractImageFromURL };
