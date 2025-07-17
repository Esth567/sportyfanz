//utils/nlpsummarize.js
require('dotenv').config();
const axios = require('axios');

const HF_API_URL = 'https://api-inference.huggingface.co/models/sshleifer/distilbart-cnn-12-6';


exports.summarizeText = async text => {
  const safeInput = text.slice(0, 1200);
  try {
    const res = await axios.post(
      HF_API_URL,
      { inputs: safeInput },
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );

    if (res.data.error) {
      console.warn('HF API error:', res.data.error);
      return 'Summary not available';
    }

    return res.data[0]?.summary_text || 'No summary returned';

  } catch (err) {
    console.error('HuggingFace API request failed:', err.message);
    return 'Summary fetch error';
  }
};
