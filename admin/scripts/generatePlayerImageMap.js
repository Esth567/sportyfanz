// scripts/generatePlayerImageMap.js

const fs = require('fs');
const path = require('path');

const playerDir = path.join(__dirname, '../../server/public/assets/players');
const outputPath = path.join(__dirname, '../utils/playerImageMap.js');

fs.readdir(playerDir, (err, files) => {
  if (err) return console.error("Failed to read player images folder:", err);

  const playerImageMap = {};

  files.forEach(file => {
    const name = path.basename(file, path.extname(file)); // e.g., "MohamedSalah"
    const prettyName = name.replace(/\./g, '. ').replace(/_/g, ' ').trim(); // optional: format name
    playerImageMap[prettyName] = file;
  });

  const output = `const playerImageMap = ${JSON.stringify(playerImageMap, null, 2)};\n\nmodule.exports = playerImageMap;`;

  fs.writeFileSync(outputPath, output);
  console.log("✅ playerImageMap generated at:", outputPath);
});
