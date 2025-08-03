const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');

async function extractImageFromURL(url) {
  const cacheKey = `image:${url}`;
  const cachedImage = await redisClient.get(cacheKey);
  if (cachedImage) return cachedImage;

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (NewsFetcherBot)',
        Accept: 'text/html,application/xhtml+xml',
      },
      timeout: 20000,
      responseType: 'text',
      maxRedirects: 5,
    });

    const contentType = response.headers['content-type'];
    if (!contentType || !contentType.includes('text/html')) {
      console.warn(`⚠️ Not HTML content at ${url}`);
      return null;
    }

    const html = response.data;
    const $ = cheerio.load(html);
    const toAbsolute = (src) => {
       if (!src || typeof src !== 'string' || !src.trim()) return null;
      try {
        return new URL(src, url).href;
      } catch {
        return null;
      }
    };

    // 1. Open Graph
    let image =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="og:image"]').attr('content');
    if (image) return image.startsWith('http') ? image : toAbsolute(image);

    // 2. Twitter Card
    image = $('meta[name="twitter:image"]').attr('content');
    if (image) return image.startsWith('http') ? image : toAbsolute(image);

    // 3. General image-related meta
    image = $('meta[property*="image"]').attr('content');
    if (image) return image.startsWith('http') ? image : toAbsolute(image);

    // 4. <link rel="image_src">
    image = $('link[rel="image_src"]').attr('href');
    if (image) return image.startsWith('http') ? image : toAbsolute(image);

    // 5. JSON-LD structured data
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html());
        if (json && typeof json === 'object') {
          const imageProp = json.image || json.thumbnailUrl;
          if (typeof imageProp === 'string') {
            image = imageProp;
          } else if (Array.isArray(imageProp) && imageProp.length) {
            image = imageProp[0];
          } else if (typeof imageProp === 'object' && imageProp.url) {
            image = imageProp.url;
          }
        }
      } catch (_) {
        // ignore malformed JSON-LD
      }
    });
    if (image) return image.startsWith('http') ? image : toAbsolute(image);

    // 6. AMP <amp-img>
    image = $('amp-img').first().attr('src');
    if (image) return image.startsWith('http') ? image : toAbsolute(image);

    // 7. <article> img or any <img>
    image = $('article img').first().attr('src') || $('img').first().attr('src'); // 🆕 Skip base64 or garbage images
        if (image && image.startsWith('data:')) {
         image = null;
        }
    if (image) return image.startsWith('http') ? image : toAbsolute(image);

    if (image) {
      await redisClient.setEx(cacheKey, 60 * 60 * 2, image); // cache for 2 hours
      return image;
    }

    // 8. Fallback
    console.warn(`⚠️ No usable image found at ${url}`);
    return null;

  } catch (err) {
    console.error(`❌ Failed to extract image from ${url}:`, err.message);
    return null;
  }
}


module.exports = { extractImageFromURL };