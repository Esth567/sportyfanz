// utils/entities.js

const sports = [
  { name: 'Football', logo: 'football.png' },
  { name: 'Basketball', logo: 'basketball.png' }
];

const leagues = [
  { name: 'EPL', logo: 'epl.png', sport: 'Football' },
  { name: 'La Liga', logo: 'laliga.png', sport: 'Football' },
  { name: 'NBA', logo: 'nba.png', sport: 'Basketball' }
];

const teams = [
  { name: 'Manchester United', league: 'EPL', sport: 'Football', logo: 'manu.png' },
  { name: 'Liverpool', league: 'EPL', sport: 'Football', logo: 'liverpool.png' },
  { name: 'Real Madrid', league: 'La Liga', sport: 'Football', logo: 'realmadrid.png' },
  { name: 'Los Angeles Lakers', league: 'NBA', sport: 'Basketball', logo: 'lakers.png' }
];

const players = [
  { name: 'Cristiano Ronaldo', team: 'Manchester United', league: 'EPL', sport: 'Football' },
  { name: 'Lionel Messi', team: 'Paris Saint-Germain', league: 'Ligue 1', sport: 'Football' },
  { name: 'LeBron James', team: 'Los Angeles Lakers', league: 'NBA', sport: 'Basketball' }
];

module.exports = { sports, leagues, teams, players };
