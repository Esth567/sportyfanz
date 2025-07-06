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
Summarize the following article in a professional journalistic tone, similar to reporting on ESPN, BBC Sport, or Sky Sports.
Use a confident, neutral, and informative style.
Keep paragraphs short, clear, and free of jargon or overly casual language.
End the piece with 3 to 5 key bullet-point takeaways.

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
