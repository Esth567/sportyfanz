const axios = require("axios");

async function fetchGettyImage(searchTerm) {
  try {
    const res = await axios.get("https://api.gettyimages.com/v3/search/images", {
      headers: { "Api-Key": process.env.GETTY_API_KEY },
      params: {
        phrase: searchTerm,
        sort_order: "best",
        page_size: 1
      }
    });

    return res.data?.images?.[0]?.display_sizes?.[0]?.uri || null;
  } catch (err) {
    console.error("Getty error:", err.message);
    return null;
  }
}

module.exports = { fetchGettyImage };
