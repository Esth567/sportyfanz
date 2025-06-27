// utils/rewriteWithOpenAI.js
const OpenAI = require("openai");

const openaiKey = process.env.OPENAI_API_KEY;
if (!openaiKey) console.warn("⚠️ Missing OpenAI API key — rewriteWithOpenAI will be disabled.");

const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;

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
  if (!openai || isOpenAIDisabled()) {
    console.warn("⚠️ Skipping rewrite — OpenAI disabled or unavailable.");
    return `⚠️ Summary not available for: ${title}\n\nRead more: ${link}`;
  }

  if (!content || content.trim().length < 50) {
    console.warn("⚠️ Content too short to rewrite meaningfully.");
    return `⚠️ Summary not available for: ${title}\n\nRead more: ${link}`;
  }

  const prompt = `
You're a professional sports news writer for outlets like ESPN, BBC Sport, and Sky Sports.

Based on the article content below, write **5 punchy, fact-driven bullet points** that summarize the key story developments, in the tone of breaking sports news.

Avoid generic phrasing — highlight **teams, players, scores, outcomes, injuries, or controversies** if present.

Title: ${title}
Original link: ${link}

Content:
\`\`\`
${content}
\`\`\`

Response Format:
- Bullet 1 (newsworthy)
- Bullet 2 (context or stat)
- Bullet 3 (notable name/action)
- Bullet 4 (impact or reaction)
- Bullet 5 (what’s next or wider implication)
`.trim();

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
    });

    const summary = completion.choices[0].message.content.trim();

    // Ensure it returns structured points
    if (!summary.startsWith('-')) {
      return `## Summary\n\n${summary}\n\n🔗 [Read more](${link})`;
    }

    return `## Key Takeaways\n\n${summary}\n\n🔗 [Read full story](${link})`;
  } catch (err) {
    if (err.status === 429) {
      console.warn("⚠️ OpenAI quota exceeded during summarization.");
      disableOpenAITemporarily(15);
    } else {
      console.error(`❌ OpenAI error during rewrite: ${err.message}`);
    }

    return `⚠️ Summary not available for: ${title}\n\nRead more: ${link}`;
  }
}

module.exports = { rewriteWithOpenAI };
