const axios = require("axios");

async function expandWithGroq(title, content, retries = 2) {
  const prompt = `You're a British football pundit. Rewrite and expand this sports news article in dramatic, engaging style.\n\nTitle: ${title}\n\nContent: ${content.slice(0, 1500)}`;

  const payload = {
    model: "google/flan-t5-small",
    messages: [
      { role: "system", content: "You are a football journalist." },
      { role: "user", content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 2000
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await axios.post(
        "http://localhost:8000/v1/chat/completions",
        payload,
        { timeout: 8000 }
      );

      const responseText = res.data.choices?.[0]?.message?.content;
      if (responseText) return responseText;

    } catch (err) {
      console.error(`🛑 AI call failed (Attempt ${attempt}):`, err.message);
      if (attempt === retries) {
        console.warn("❗ Falling back to original content.");
        return content;
      }
      await new Promise(res => setTimeout(res, 1000 * attempt)); // backoff
    }
  }

  return content;
}

module.exports = { expandWithGroq };
