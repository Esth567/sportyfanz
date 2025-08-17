// utils/cleanText.js
function cleanUnicode(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}



module.exports = { cleanUnicode };
