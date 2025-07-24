// utils/entityDetect.js
function buildEntityDatabase({ players = [], teams = [], countries = [] }) {
  const db = {};

  players.forEach(player => {
    const name = player.player_name?.toLowerCase();
    if (name) {
      db[name] = {
        name: player.player_name,
        logo: player.player_image,
        category: 'Player'
      };
    }
  });

  teams.forEach(team => {
    const name = team.team_name?.toLowerCase();
    if (name) {
      db[name] = {
        name: team.team_name,
        logo: team.team_badge,
        category: 'Team'
      };
    }
  });

  countries.forEach(country => {
    const name = country.country_name?.toLowerCase();
    if (name) {
      db[name] = {
        name: country.country_name,
        logo: country.country_logo,
        category: 'Country'
      };
    }
  });

  return db;
}

function detectEntityFromText(text, entityDb) {
  if (!entityDb || !text) return null;

  const lowerText = text.toLowerCase();
  const keys = Object.keys(entityDb).sort((a, b) => b.length - a.length); // longest match first

  for (const key of keys) {
    if (lowerText.includes(key)) {
      return entityDb[key]; // { name, logo, category }
    }
  }

  return null;
}

module.exports = {
  buildEntityDatabase,
  detectEntityFromText
};