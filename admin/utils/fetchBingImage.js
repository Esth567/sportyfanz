const axios = require('axios');

async function fetchBingImage(searchTerm) {
  try {
    const response = await axios.get('https://api.bing.microsoft.com/v7.0/images/search', {
      headers: { 'Ocp-Apim-Subscription-Key': process.env.BING_API_KEY },
      params: { q: searchTerm, count: 1, safeSearch: 'Moderate' }
    });

    const images = response.data.value;
    return images.length ? images[0].thumbnailUrl : null;
  } catch (error) {
    console.error('Bing Image Search API error:', error.message);
    return null;
  }
}

module.exports = fetchBingImage;
