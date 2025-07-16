//utils/nlpsummarize.js
require('dotenv').config();
const axios = require('axios');

const HF_API_URL = 'https://api-inference.huggingface.co/models/facebook/bart-large-cnn';

exports.summarizeText = async text => {
  const res = await axios.post(
    HF_API_URL,
    { inputs: text },
    {
      headers: {
        Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );
  return res.data[0]?.summary_text || 'No summary returned';
};
