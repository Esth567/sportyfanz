const got = require('got');
const html = await got(url).text();

import got from 'got'; // ✅ modern ESM import

export async function extractImageFromURL(url) {
  try {
    const html = await got(url).text(); // ✅ FIX: Await the text body
    // ... proceed to extract <img> or OpenGraph tag
  } catch (err) {
    console.warn(`⚠️ Failed to extract image from ${url}: ${err.message}`);
    return null;
  }
}

module.exports = { extractImageFromURL };
