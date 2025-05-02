const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Mapping of leagues and their IDs (you'll need to define this as per your app logic)
const leagueIds = {
    "Premier League": 152,
    "La Liga": 2,
    "Serie A": 3,
    "Bundesliga": 195,
    "NPFL": 302,
    "Ligue1": 168
    // Add more leagues as needed
};

const APIkey = '23072c515f41a7c3bb05fb5703dfec31d906b0885c87203f7783587636cd914f'; // Make sure to use the correct API key

async function fetchTopScorersAndDownloadImages(returnMap = false) {
    const playerImageMap = {};

    for (const [leagueName, leagueId] of Object.entries(leagueIds)) {
        try {
            const response = await axios.get(`https://apiv3.apifootball.com/?action=get_topscorers&league_id=${leagueId}&APIkey=${APIkey}`);
            const data = response.data;

            if (!Array.isArray(data) || data.length === 0) {
                console.warn(`No top scorers for ${leagueName}`);
                continue;
            }

            const topScorer = data[0];
            const playerName = topScorer.player_name?.trim();

            if (playerName) {
                const safeFileName = playerName.replace(/\s+/g, '').replace(/[^a-zA-Z0-9.]/g, '') + ".png";
                const imageURL = topScorer.player_image_url; // Assuming API provides player image URL

                if (!imageURL) {
                    console.warn(`No image URL available for ${playerName}`);
                    continue; // Skip to the next player if no image is available
                }

                // Download the image
                const imagePath = path.join(__dirname, 'assets', 'images', safeFileName);
                const writer = fs.createWriteStream(imagePath);

                try {
                    const imageResponse = await axios({
                        url: imageURL,
                        method: 'GET',
                        responseType: 'stream'
                    });
                
                    imageResponse.data.pipe(writer);
                
                    writer.on('finish', () => {
                        playerImageMap[playerName] = safeFileName;
                        console.log(`Downloaded image for ${playerName}`);
                    });
                
                    writer.on('error', (err) => {
                        console.error(`Error downloading image for ${playerName}:`, err);
                    });
                } catch (err) {
                    console.error(`Error fetching image for ${playerName}:`, err);
                }
            }
        } catch (error) {
            console.error(`Error fetching top scorers for ${leagueName}:`, error);
        }
    }

    if (returnMap) return playerImageMap;

    console.log("\n🎯 Paste the following into your frontend JS:\n");
    console.log("const playerImageMap = {");
    for (const [name, filename] of Object.entries(playerImageMap)) {
        console.log(`  "${name}": "${filename}",`);
    }
    console.log("};\n");
}

module.exports = fetchTopScorersAndDownloadImages;
