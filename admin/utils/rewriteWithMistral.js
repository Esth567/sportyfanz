const axios = require("axios");
require("dotenv").config();

async function rewriteWithMistral(title, content) {
  const maxLength = parseInt(process.env.MAX_NEWS_LENGTH || "2000", 10);
  const truncated = content.length > maxLength ? content.slice(0, maxLength) : content;

  const prompt = `
You're a dramatic British football pundit. Rewrite and **expand** the following news into a 3-5 paragraph article filled with narrative flair, insight, and footballing passion.

Use both the main news and any related context provided to enrich the story. Mention rivalries, significance, performance history, and expert speculation.

--- START ---

Title: ${title}

Content:
${truncated}

--- END ---
`;

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

    let rewritten = res.data.choices?.[0]?.message?.content?.trim();

    // Check for bad output
    const suspiciousPatterns = [
      "Expand this into a 3-5 paragraph", 
      "--- START ---", 
      "--- END ---"
    ];

    if (!rewritten || rewritten.length < 150 || suspiciousPatterns.some(p => rewritten.includes(p))) {
      console.warn("⚠️ AI returned suspicious or low-quality output. Falling back to original content.");
      return content + " (Original content)";
    }

    // Optional debug preview
    console.log("🧠 Rewritten preview:", rewritten.slice(0, 300));

    return rewritten;
  } catch (err) {
    console.error("🛑 Mistral rewrite failed:", err.message);
    return content + " (Original content)";
  }
}

module.exports = { rewriteWithMistral };
