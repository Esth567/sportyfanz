// scripts/generatePlayerImageMap.js

const fs = require('fs');
const path = require('path');

const playerDir = path.join(__dirname, '../public/assets/players');
const outputPath = path.join(__dirname, '../utils/playerImageMap.js');

function normalizeName(name) {
  return name
    .replace(/\.(?=\s|[A-Z])/g, '')        // Remove dots before space/caps (e.g., "R. Lewandowski" → "R Lewandowski")
    .replace(/[^\w\s]/gi, '')              // Remove accents and symbols
    .replace(/\s+/g, ' ')                  // Collapse whitespace
    .trim();
}


fs.readdir(playerDir, (err, files) => {
  if (err) return console.error("Failed to read player images folder:", err);

  const playerImageMap = {};

  files.forEach(file => {
    const baseName = path.basename(file, path.extname(file)); // e.g., "MohamedSalah"
    const prettyName = normalizeName(baseName); // Use normalization
    playerImageMap[prettyName] = file;
  });


  const output = `const playerImageMap = ${JSON.stringify(playerImageMap, null, 2)};\n\nmodule.exports = playerImageMap;`;

  fs.writeFileSync(outputPath, output);
  console.log("✅ playerImageMap generated at:", outputPath);
});


