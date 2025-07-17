//utils/nlpfetchnews.js
const { parse } = require('node-html-parser');
const nlp = require('compromise');
const Sentiment = require('sentiment');
const sentiment = new Sentiment();

exports.extractTextFromHtml = html => {
  const root = parse(html);
  const text = root.text.trim().replace(/\s+/g, ' ');
  console.log('Extracted article text length:', text.length);
  return text;
};


exports.extractEntities = text => {
  const doc = nlp(text);
  return {
    people: doc.people().out('array'),
    teams: doc.organizations().out('array'),
    locations: doc.places().out('array'),
  };
};

exports.analyzeSentiment = text => {
  const result = sentiment.analyze(text);
  return {
    score: result.score,
    comparative: result.comparative,
    tone: result.score > 0 ? 'positive' : result.score < 0 ? 'negative' : 'neutral',
  };
};

exports.chunkSummary = (text, minWords = 300) => {
  const sentences = text.split(/(?<=[.?!])\s+/);
  const chunks = [];
  let current = [];

  for (const sentence of sentences) {
    current.push(sentence);

    const wordCount = current.join(' ').split(/\s+/).length;
    if (wordCount >= minWords) {
      chunks.push(current.join(' '));
      current = [];
    }
  }

  // Add leftover
  if (current.length > 0) {
    chunks.push(current.join(' '));
  }

  return chunks.slice(0, 5); // limit to 5 paragraphs max
};



