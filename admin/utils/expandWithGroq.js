const axios = require("axios");

async function expandWithGroq(title, content, retries = 2) {
  const prompt = `
     Rewrite and dramatically expand this football news article with detailed insights, dramatic flair, and vivid narrative. Use a British football commentator's tone and add emotional weight, historical context, or player reactions.

     Title: ${title}

     Content: ${content.slice(0, 2000)}
    `;


  const payload = {
    model: "mistralai/Mistral-7B-Instruct-v0.1", // or whichever model you're calling
    messages: [
      { role: "system", content: "You are a football journalist for a British sports magazine." },
      { role: "user", content: prompt }
    ],
    temperature: 0.85,
    max_tokens: 1024
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await axios.post(
        "http://localhost:8000/v1/chat/completions", // adjust to your backend
        payload,
        { timeout: 10000 }
      );

      const responseText = res.data.choices?.[0]?.message?.content;
      if (responseText && responseText.length > content.length) return responseText;
    } catch (err) {
      console.error(`🛑 AI call failed (Attempt ${attempt}):`, err.message);
      if (attempt === retries) return content;
      await new Promise(res => setTimeout(res, 1000 * attempt));
    }
  }
  return content;
}


module.exports = { expandWithGroq };
