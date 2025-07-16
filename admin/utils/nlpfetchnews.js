//utils/nlpfetchnews.js
const { parse } = require('node-html-parser');
const nlp = require('compromise');
const Sentiment = require('sentiment');
const sentiment = new Sentiment();

exports.extractTextFromHtml = html => {
  const root = parse(html);
  return root.text.trim().replace(/\s+/g, ' ');
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

exports.chunkSummary = (text, paragraphCount = 4) => {
  const sentences = text.split('. ');
  const chunkSize = Math.ceil(sentences.length / paragraphCount);
  const paragraphs = [];
  for (let i = 0; i < paragraphCount; i++) {
    const chunk = sentences.slice(i * chunkSize, (i + 1) * chunkSize).join('. ') + '.';
    paragraphs.push(chunk.trim());
  }
  return paragraphs;
};
