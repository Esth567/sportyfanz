// utils/cleanText.js
function cleanText(str) {
  if (typeof str !== 'string') return '';

  return str
    // --- Step 1: Remove site-specific junk (ads, scripts, configs) ---
    .replace(/\s{2,}/g, ' ')                       // collapse extra spaces
    .replace(/document\.currentScript[\s\S]*?};/g, '') // strip inline JS blobs
    .replace(/window\.sdc[\s\S]*?};/g, '')         // strip Sky config objects
    .replace(/©\s*\d{4}\s*Sky UK.*/g, '')          // strip Sky UK footer
    // --- Step 2: Unicode cleanup ---
    .replace(/[\u200B-\u200D\uFEFF]/g, '')         // remove zero-width spaces
    .normalize('NFD')                              // decompose accents
    .replace(/[\u0300-\u036f]/g, '')               // strip diacritics
    .trim();
}

module.exports = { cleanText };
