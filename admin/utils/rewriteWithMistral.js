const axios = require("axios");
require("dotenv").config();

async function rewriteWithMistral(title, content) {
  const maxLength = parseInt(process.env.MAX_NEWS_LENGTH || "2000", 10);
  const truncated = content.length > maxLength ? content.slice(0, maxLength) : content;

  const prompt = `You're a dramatic British football pundit. Rewrite and expand this sports news article in an engaging, entertaining tone. Don't just summarize — enrich it with flair.\n\nTitle: ${title}\n\nContent: ${truncated}`;

  try {
    const res = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "mistral-7b-instruct",
        messages: [
          { role: "system", content: "You are a passionate football journalist." },
          { role: "user", content: prompt }
        ],
        temperature: 0.85,
        max_tokens: 1024
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 10000
      }
    );

    const rewritten = res.data.choices?.[0]?.message?.content;
    return rewritten || content;
  } catch (err) {
    console.error("🛑 Mistral rewrite failed:", err.message);
    return content;
  }
}

module.exports = { rewriteWithMistral };
