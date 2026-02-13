// Only real RSS feeds here
 const feedUrls = [
  // Global news
  'https://feeds.bbci.co.uk/sport/rss.xml',    // BBC Football (global)
  'https://www.espn.com/espn/rss/soccer/news',           // ESPN Soccer (global)
  'https://www.skysports.com/rss/12040',                 // Sky Sports Football (international)
  'https://www.theguardian.com/football/rss',            // Guardian Football (global)

  // African / Nigerian football
  'https://www.cafonline.com/feed/',                     // CAF (Africa football – VERY IMPORTANT)
  'https://www.thenff.com/feed/',                        // Nigeria Football Federation

  // General global sports (football included)
  'https://rss.nytimes.com/services/xml/rss/nyt/Sports.xml'
];

module.exports = { feedUrls };
