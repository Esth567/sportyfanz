// utils/entityDetect.js
const { sports, leagues, teams, players } = require('./entities');

function buildEntityDatabase() {
  const db = {};

  players.forEach(p => {
    db[p.name.toLowerCase()] = { ...p, category: 'Player' };
  });
  teams.forEach(t => {
    db[t.name.toLowerCase()] = { ...t, category: 'Team' };
  });
  leagues.forEach(l => {
    db[l.name.toLowerCase()] = { ...l, category: 'League' };
  });
  sports.forEach(s => {
    db[s.name.toLowerCase()] = { ...s, category: 'Sport' };
  });

  return db;
}

function detectEntityFromText(text, entityDb) {
  if (!text || !entityDb) return null;
  const lowerText = text.toLowerCase();
  const keys = Object.keys(entityDb).sort((a, b) => b.length - a.length);

  for (const key of keys) {
    if (lowerText.includes(key)) return entityDb[key];
  }

  return null;
}

module.exports = { buildEntityDatabase, detectEntityFromText };
