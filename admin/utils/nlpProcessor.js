const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const Sentiment = require('sentiment');
const nlp = require('compromise');
//const OpenAI = require('openai');

const sentiment = new Sentiment();

//const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Extracts structured NLP data from raw HTML content
 * @param {string} html - Raw article HTML
 * @param {string} url - Source URL
 * @returns {Promise<object>}
 */
async function processArticleHTML(html, url) {
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article || !article.textContent) {
    throw new Error('Failed to extract article content.');
  }

  const rawText = article.textContent.trim();
  const basicSentiment = sentiment.analyze(rawText);

  // Extract named entities using Compromise
  const doc = nlp(rawText);
  const people = doc.people().out('array');
  const organizations = doc.organizations().out('array');
  const places = doc.places().out('array');

  // Chunk article into 500-word sections for summarization
  const chunks = chunkText(rawText, 500);

  // Summarize each chunk using OpenAI
  const summarizedChunks = [];
  for (const chunk of chunks) {
    const summary = await summarizeText(chunk);
    summarizedChunks.push(summary);
  }

  return {
    title: article.title,
    content: rawText,
    sentiment: basicSentiment,
    namedEntities: {
      people,
      organizations,
      places
    },
    summarizedChunks
  };
}

function chunkText(text, wordLimit = 500) {
  const words = text.split(/\s+/);
  const chunks = [];

  for (let i = 0; i < words.length; i += wordLimit) {
    const chunk = words.slice(i, i + wordLimit).join(' ');
    chunks.push(chunk);
  }

  return chunks;
}

async function summarizeText(text) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "user",
          content: `Summarize the following content in 100-150 words:\n\n${text}`
        }
      ],
      temperature: 0.5
    });

    return response.choices?.[0]?.message?.content || '';
  } catch (err) {
    console.error("⚠️ Failed to summarize text:", err.message);
    return '';
  }
}

module.exports = { processArticleHTML };
