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
    return `Summary not available for: ${title}\n\nRead more: ${link}`;
  }

  if (!content || content.trim().length < 50) {
    console.warn("⚠️ Content too short to rewrite meaningfully.");
    return `Summary not available for: ${title}\n\nRead more: ${link}`;
  }

  const prompt = `
The following content is all that could be extracted from an article. Please summarize it in 5 factual bullet points. If the content is too short, you may expand slightly based on the title.

Title: ${title}
Link: ${link}
Content:
${content}
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


