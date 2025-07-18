const OpenAI = require("openai");
const TextStatistics = require("text-statistics");

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

function getReadabilityScore(text) {
  try {
    const stats = new TextStatistics(text);
    return {
      fleschKincaid: stats.fleschKincaidReadingEase(),
      gradeLevel: stats.fleschKincaidGradeLevel()
    };
  } catch {
    return null;
  }
}

function isTooSummaryLike(text) {
  const bulletPoints = (text.match(/^- /gm) || []).length;
  const paragraphCount = (text.match(/\n{2,}/g) || []).length;
  return bulletPoints >= 5 && paragraphCount < 2;
}

async function rewriteWithOpenAI(title, content, link) {
  if (process.env.USE_OPENAI !== "true" || isOpenAIDisabled()) {
    console.warn("⚠️ OpenAI is disabled or blocked. Skipping summarization.");
    return content;
  }

  const originalReadability = getReadabilityScore(content);

  const prompt = `
Rewrite the following sports news article to match the style of popular sports news outlets. Focus on recent football matches (90% of content) and include other sports news (10% of content). Structure the piece into sections with headings. Ensure the article is engaging, informative, and includes relevant quotes from experts or players. Aim for a length of 500-1000 words.

---
Title: ${title}
Source Link: ${link}
Article:
${content}
  `.trim();

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const rewritten = completion.choices[0].message.content.trim();

    const rewrittenReadability = getReadabilityScore(rewritten);
    const summaryStyle = isTooSummaryLike(rewritten);

    console.log("📊 Readability (before):", originalReadability);
    console.log("📊 Readability (after):", rewrittenReadability);
    if (summaryStyle) {
      console.warn("⚠️ Rewritten article looks overly summary-like.");
    }

    return rewritten;

  } catch (err) {
    if (err.status === 429) {
      console.warn("⚠️ OpenAI quota exceeded during rewrite.");
      disableOpenAITemporarily(15);
    } else {
      console.error("❌ Error during OpenAI rewrite:", err.message);
    }
    throw err;
  }
}

module.exports = { rewriteWithOpenAI };
