// utils/nlpfetchnews.js
const { parse } = require('node-html-parser');
const nlp = require('compromise');
const Sentiment = require('sentiment');
const stringSimilarity = require('string-similarity');
const sentiment = new Sentiment();
const boilerplateFilters = require('../config/boilerplateFilters.json');
const keywords = require('../config/footballKeywords.json');
const topNewskeywords = require('../config/topnewsKeyword.json');
const excludKeywords = require('../config/excludedKeywords.json');


// Text extraction & cleaning
exports.extractTextFromHtml = html => {
  if (!html) return '';

  const root = parse(html);
  let text = '';

  for (const selector of articleSelectors) {
    const container = root.querySelector(selector);
    if (container) {
      text = container.text || '';
      if (text.trim().length > 300) break;
    }
  }

  if (!text || text.trim().length < 300) {
    text = root.text || '';
  }

  return cleanArticleText(text);
};


exports.cleanArticleText = text => {
  if (!text) return '';

  // Normalize invisible spaces
  text = text.replace(/\u00A0/g, ' ').replace(/\u200B/g, '');

  let stripped = text
    .replace(/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*'s\s+/g, '')
    .replace(/\bfantasy football cheat sheet\b/gi, '')
    .replace(/\bcheat sheet\b/gi, '')
    .replace(/\bfantasy football\b/gi, '')
    .replace(/^[\s\-:|]+|[\s\-:|]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/{"@context":.*?"\}\}/gs, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/BBC Homepage.*?More menu/gi, '')
    .replace(/Skip to content/gi, '')
    .replace(/Accessibility Help/gi, '')
    .replace(/Your account/gi, '')
    .replace(/Share pageCopy linkAbout sharing/gi, '')
    .replace(/Close menu/gi, '')
    .replace(/Close panel/gi, '')
    .replace(/This video can not be played/gi, '')
    .replace(/To play this video you need to enable JavaScript.*/gi, '')
    .replace(/Published\d+ minutes ago/gi, '')
    .replace(/Explore more/gi, '')
    .replace(/READ MORE:.*/gi, '')
    .replace(/LISTEN:.*/gi, '')
    .replace(/introducing[^.]+(\.|\n)/gi, '')
    .replace(/subscribe to .*? youtube channel/gi, '')
    .replace(/watch (the )?video(s)? (here|above)/gi, '')
    .replace(/click here to find out more/gi, '')
    .replace(/Got Sky\?[^.]+/gi, '')
    .replace(/Watch (FREE )?Premier League highlights/gi, '')
    .replace(/Please use .*?browser.*?video player/gi, '')
    .replace(/Super 6.*?(Play for free|Join now|Win|£\d+)/gi, '')
    .replace(/Sky Sports[^:]+:/gi, '')
    .replace(/(?:[A-Z][a-z]+\s){1,3}\(\d\)/g, '')
    .replace(/Invalid Date/gi, '')
    .replace(/just now/gi, '')
    .replace(/^(?:\s*[\(\[]?\d{1,2}:\d{2}[\)\]]?\s*)+/gm, '')
    .replace(/[\(\[]\d{1,2}:\d{2}[\)\]]/g, '')
    .replace(/(\.)([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .replace(/(Datawrapper|Sky Sports[^.]*\.)/gi, '')
    .replace(/^Image for .*/gmi, '')
    .replace(/^Photo: .*/gmi, '')
    .replace(/^Picture: .*/gmi, '')
    .replace(/\bFollow your club with BBC Sport\b.*$/gmi, '')
    .replace(/\bListen to the latest Football Daily podcast\b.*$/gmi, '')
    .replace(/\bGet football news sent straight to your phone\b.*$/gmi, '')
    .replace(/\bBBC (is|Speaking|provided)\b.*$/gmi, '')
    .trim();

  boilerplateFilters.patterns.forEach(phrase => {
    const regex = new RegExp(phrase, 'gi');
    stripped = stripped.replace(regex, '');
  });

  // 🧹 Deduplicate repeated or near-identical sentences
  stripped = stripped
    .split(/(?<=[.!?])\s+/)
    .filter((sentence, idx, arr) =>
      !arr.slice(0, idx).some(prev => stringSimilarity.compareTwoStrings(prev, sentence) > 0.9)
    )
    .join(' ');

    stripped = cleanUnicode(stripped);

  return stripped.trim();
};

function cleanUnicode(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[\u200B-\u200D\uFEFF]/g, '') 
    .normalize('NFD')                      
    .replace(/[\u0300-\u036f]/g, '');      
}



// Entity extraction & merging
function cleanEntities(arr = []) {
  if (!Array.isArray(arr)) return [];
  return [...new Set(
    arr
      .map(name => name.trim())
      .filter(name =>
        name.length > 2 &&
        !name.match(/\.(com|org)$/i) &&
        !name.match(/\d/) &&
        !name.match(/\b(Test|Match|Games?|United|Premier|Power)\b/i)
      )
  )];
}

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
    merged.push(group[0]);
  }

  return merged;
}

exports.extractEntities = text => {
  if (!text || typeof text !== 'string') return { people: [], teams: [], locations: [], all: [] };

  const doc = nlp(text);
  const people = mergeSimilarEntities(cleanEntities(doc.people().normalize().out('array')));
  const teams = cleanEntities(doc.organizations().out('array'));
  const locations = cleanEntities(doc.places().out('array'));

  return { people, teams, locations, all: [...people, ...teams, ...locations] };
};


// Sentiment analysis
exports.analyzeSentiment = text => {
  const result = sentiment.analyze(text);
  return {
    score: result.score,
    comparative: result.comparative,
    tone: result.score > 0 ? 'positive' : result.score < 0 ? 'negative' : 'neutral',
  };
};


// Chunking
exports.chunkSummary = (text, minWordsPerChunk = 40) => {
  const doc = nlp(text);
  const sentences = doc.sentences().out('array');
  const chunks = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const currentWords = currentChunk.split(/\s+/).filter(Boolean).length;
    const sentenceWords = sentence.split(/\s+/).filter(Boolean).length;
    currentChunk += (currentChunk ? ' ' : '') + sentence;

    if (currentWords + sentenceWords >= minWordsPerChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
  }

  if (currentChunk.trim().split(/\s+/).length >= minWordsPerChunk / 2) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
};


// SEO-friendly subheadings
function generateSeoSubheading(chunk, entities = [], maxWords = 6) {
  if (!chunk || !entities.length) return '';
  const mainEntity = entities[0];
  const doc = nlp(chunk);
  const nouns = doc.nouns().out('array');
  const verbs = doc.verbs().out('array');

  const phrase = [mainEntity];
  if (verbs.length) phrase.push(verbs[0]);
  if (nouns.length) phrase.push(nouns[0]);
  if (nouns.length > 1) phrase.push(nouns[1]);

  return phrase.map(w => w.trim()).slice(0, maxWords).join(' ').replace(/\s{2,}/g, ' ');
}


exports.addSeoSubheadingsToChunks = (
  chunks,
  allEntities = [],
  {
    maxEntitiesPerChunk = 2,
    minWordsForSubheading = 20,
    similarityThreshold = 0.9,
    skipFirstParagraph = true
  } = {}
) => {
  if (!Array.isArray(chunks)) return [];

  const entities = [...new Set(allEntities.map(e => e.trim()).filter(e => e.length > 2))];
  const seenSentences = [];

  return chunks.map((chunk, index) => {
    //Optionally skip first paragraph
    if (skipFirstParagraph && index === 0) return chunk;

    const wordCount = chunk.split(/\s+/).filter(Boolean).length;
    if (wordCount < minWordsForSubheading) return chunk;

    //Skip if too similar to earlier chunks
    if (seenSentences.some(prev => stringSimilarity.compareTwoStrings(prev, chunk) > similarityThreshold)) {
      return chunk;
    }
    seenSentences.push(chunk);

    const lowerChunk = chunk.toLowerCase();
    const matchedEntities = entities
      .filter(entity =>
        new RegExp(`\\b${entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(lowerChunk)
      )
      .slice(0, maxEntitiesPerChunk);

    if (!matchedEntities.length) return chunk;

    const subheading = generateSeoSubheading(chunk, matchedEntities);
    return `<strong>${subheading}</strong>\n\n${chunk}`;
  });
};



// Article filtering helpers
exports.isTopNewsArticle = article => {
  const content = `${article.title || ''} ${article.fullSummary || ''}`.toLowerCase();
  return topNewskeywords.some(keyword => content.includes(keyword));
};

exports.isFootballArticle = article => {
  const textParts = [
    article.title || '',
    article.fullSummary || '',
    article.description || '',
    article.link || '',
    Array.isArray(article.categories) ? article.categories.join(' ') : ''
  ].map(s => s.toString().toLowerCase());

  if (excludKeywords.some(keyword => textParts.some(txt => txt.includes(keyword)))) return false;
  return keywords.some(keyword => textParts.some(txt => txt.includes(keyword) || txt.includes(keyword.replace(/\s+/g, '-'))));
};

exports.isExcludedArticle = (articleUrl, title = '') => {
  const excludedPatterns = ['/watch/', '/transfer-talk', '/live-blog', '/video/', '/shows/'];
  const excludedKeywords = ['transfer talk live', 'free stream', 'watch live', 'live show'];
  const lowerUrl = articleUrl.toLowerCase();
  const lowerTitle = title.toLowerCase();

  return excludedPatterns.some(p => lowerUrl.includes(p)) || excludedKeywords.some(k => lowerTitle.includes(k));
};


// Deduplication helpers
exports.getDomainFromUrl = url => {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
};

exports.isDuplicateArticle = (newArticle, seenArticles, options = {}) => {
  const {
    titleWeight = 0.6,
    contentWeight = 0.4,
    titleThreshold = 0.85,
    contentThreshold = 0.8,
    overallThreshold = 0.82,
    ignoreTimeWindow = true // Ignore strict time window — duplicates may appear hours apart
  } = options;

  const newDomain = exports.getDomainFromUrl(newArticle.link);
  const normalize = text => 
    (text || '')
      .toLowerCase()
      .replace(/[“”"']/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const newTitle = normalize(newArticle.title);
  const newContent = normalize(
    newArticle.fullSummary || newArticle.description || newArticle.paragraphs?.join(' ') || ''
  );

  for (const [seenUrl, article] of seenArticles.entries()) {
    const existingDomain = exports.getDomainFromUrl(article.link);
    const existingTitle = normalize(article.title);
    const existingContent = normalize(
      article.fullSummary || article.description || article.paragraphs?.join(' ') || ''
    );

    // Optional time window (useful if you're processing in real-time)
    if (!ignoreTimeWindow && newArticle.date && article.date) {
      const newTime = new Date(newArticle.date).getTime();
      const existingTime = new Date(article.date).getTime();
      if (Math.abs(newTime - existingTime) > 60 * 60 * 1000) continue;
    }

    const titleSim = stringSimilarity.compareTwoStrings(newTitle, existingTitle);
    const contentSim = stringSimilarity.compareTwoStrings(newContent, existingContent);
    const combinedSim = titleSim * titleWeight + contentSim * contentWeight;

    if (
      seenUrl === newArticle.link ||
      titleSim >= titleThreshold ||
      contentSim >= contentThreshold ||
      combinedSim >= overallThreshold
    ) {
      // Prefer higher-priority source
      if ((SOURCE_PRIORITY[newDomain] || 99) < (SOURCE_PRIORITY[existingDomain] || 99)) {
        seenArticles.set(newArticle.link, newArticle);
      }
      return true; // duplicate found
    }
  }

  return false; // unique article
};

// Priority sources for deduplication
const SOURCE_PRIORITY = {
  // 🇳🇬 Nigerian football (highest priority)
  'thenff.com': 1, // Nigeria Football Federation

  // 🌍 African football
  'cafonline.com': 2,  // CAF (Africa-wide football)

  // 🌍 Global football
  'espn.com': 3,     // ESPN Soccer (global)
  'bbc.co.uk': 4,      // BBC Football (global feed)
  'theguardian.com': 5, // Guardian Football (global feed)
  'skysports.com': 6,   // Sky Sports Football (international)

  //General global sports
  'nytimes.com': 7  // NYTimes Sports
};
