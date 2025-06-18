// utils/rewriteWithOpenAI.js
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let openAIDisabledUntil = null;

function isOpenAIDisabled() {
  return openAIDisabledUntil && new Date() < openAIDisabledUntil;
}

function disableOpenAITemporarily(minutes = 10) {
  const until = new Date(Date.now() + minutes * 60 * 1000);
  openAIDisabledUntil = until;
  console.warn(`🛑 OpenAI temporarily disabled until ${until.toISOString()}`);
}

async function rewriteWithOpenAI(title, content, link) {
  if (process.env.USE_OPENAI !== "true" || isOpenAIDisabled()) {
    console.warn("⚠️ OpenAI is disabled or blocked. Skipping summarization.");
    return content;
  }

  const prompt = `
Summarize the article below in 5 key bullet points using clear, non-jargon language.
Avoid copying text. Use short, factual points.

Facts:
- Title: ${title}
- Source Link: ${link}
- Content: ${content}
  `.trim();

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
    });

    return completion.choices[0].message.content.trim();
  } catch (err) {
    if (err.status === 429) {
      console.warn("⚠️ OpenAI quota exceeded during summarization.");
      disableOpenAITemporarily(15);
    }
    throw err;
  }
}

module.exports = { rewriteWithOpenAI };

