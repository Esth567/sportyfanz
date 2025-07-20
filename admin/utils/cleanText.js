// utils/cleanText.js
function cleanUnicode(str) {
  return str
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .normalize("NFD")                     // split accents from base letters
    .replace(/[\u0300-\u036f]/g, '');     // remove combining diacritics
}

module.exports = { cleanUnicode };
