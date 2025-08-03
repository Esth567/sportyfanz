// admin/scripts/generatePlayerImageMap.js
const fs = require('fs');
const path = require('path');

const playerDir = path.join(__dirname, '../public/assets/players');
const outputPath = path.join(__dirname, '../utils/playerImageMap.js');

function filenameToDisplayName(filename) {
  const nameWithoutExt = path.basename(filename, path.extname(filename)); // e.g. D.Selke
  const withSpace = nameWithoutExt.replace('.', '. '); // D. Selke
  return withSpace;
}

fs.readdir(playerDir, (err, files) => {
  if (err) return console.error("❌ Failed to read player images folder:", err);

  const playerImageMap = {};

  files.forEach(file => {
    const displayName = filenameToDisplayName(file); // e.g. "D. Selke"
    playerImageMap[displayName] = file;              // key: "D. Selke" -> value: "D.Selke.png"
  });

  const output = `const playerImageMap = ${JSON.stringify(playerImageMap, null, 2)};\n\nmodule.exports = playerImageMap;`;

  fs.writeFileSync(outputPath, output);
  console.log("✅ playerImageMap generated at:", outputPath);
});
