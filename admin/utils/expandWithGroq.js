const axios = require("axios");

async function expandWithGroq(title, content) {
  const prompt = `You're a British football pundit. Rewrite and expand this sports news article in dramatic, engaging style.\n\nTitle: ${title}\n\nContent: ${content.slice(0, 1500)}`;

  try {
    const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
      model: "llama-guard-4-12b",
      messages: [
        { role: "system", content: "You are a football journalist." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    }, {
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    return res.data.choices?.[0]?.message?.content || content;
  } catch (err) {
    console.error("Groq error:", err.message);
    return content;
  }
}

module.exports = { expandWithGroq };
