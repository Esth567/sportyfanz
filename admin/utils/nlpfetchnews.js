//utils/nlpfetchnews.js
const { parse } = require('node-html-parser');
const nlp = require('compromise');
const Sentiment = require('sentiment');
const compromise = require('compromise');
const sentiment = new Sentiment();


exports.extractTextFromHtml = html => {
  const root = parse(html);
  const article = root.querySelector('article') || root;

  return article.text
    .replace(/(\.)([A-Z])/g, '$1 $2') 
    .replace(/\s+/g, ' ')
    .replace(/(Datawrapper|Sky Sports[^.]*\.)/gi, '') 
    .trim();
};

   function cleanEntities(arr) {
      return [...new Set(
      arr
      .map(name => name.trim())
      .filter(name =>
        name.length > 2 &&
        !name.match(/\.(com|org|United|Premier|Power)$/i) && // Exclude domains, teams inside names
        !name.match(/\d/) &&                                 // Exclude numerical noise
        !name.match(/\b(Test|Match|Games?)\b/i)              // 🚫 Filter generic sports terms
      )
    )];
   }

   const stringSimilarity = require('string-similarity');

   function mergeSimilarEntities(entities, threshold = 0.85) {
       const merged = [];
       const used = new Set();

     for (let i = 0; i < entities.length; i++) {
       if (used.has(i)) continue;
          const group = [entities[i]];
          for (let j = i + 1; j < entities.length; j++) {
       if (used.has(j)) continue;
        const similarity = stringSimilarity.compareTwoStrings(entities[i], entities[j]);
       if (similarity >= threshold) {
          group.push(entities[j]);
          used.add(j);
        }
      }
       used.add(i);
       merged.push(group[0]); // pick the first as canonical
     }

     return merged;
   }



exports.extractEntities = text => {
  const doc = nlp(text);
  const rawPeople = doc.people().normalize().out('array');


  return {
    people: mergeSimilarEntities(cleanEntities(rawPeople)),
    teams: cleanEntities(doc.organizations().out('array')),
    locations: cleanEntities(doc.places().out('array')),
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


  exports.chunkSummary = (text, minWordsPerChunk = 40) => {
  const doc = compromise(text);
  const sentences = doc.sentences().out('array');

  const chunks = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const currentWords = currentChunk.split(/\s+/).filter(Boolean).length;
    const sentenceWords = sentence.split(/\s+/).filter(Boolean).length;

    // Add sentence to chunk
    currentChunk += (currentChunk ? ' ' : '') + sentence;

    if (currentWords + sentenceWords >= minWordsPerChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
  }

  // Add any remaining text
  if (currentChunk.trim().split(/\s+/).length >= minWordsPerChunk / 2) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
};



