const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');
const getRedisClient = require('./redisClient');

function toAbsolute(src, baseUrl) {
  if (!src || typeof src !== 'string' || !src.trim()) return null;
  try {
    return new URL(src, baseUrl).href;
  } catch {
    return null;
  }
}

function cleanImageUrl(url) {
  try {
    const u = new URL(url);
    u.search = ''; // remove query string
    return u.href;
  } catch {
    return url;
  }
}

function isValidImage(src) {
  if (!src) return false;
  return !/favicon|logo|sprite|1x1|tracker|pixel|blank|default/i.test(src);
}

async function extractImageFromURL(url) {
  const redisClient = await getRedisClient();
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
    const tryCacheAndReturn = (src) => {
      const abs = toAbsolute(src, url);
      if (abs && isValidImage(abs)) {
        const cleaned = cleanImageUrl(abs);
        redisClient.setEx(cacheKey, 60 * 60 * 2, cleaned); // 2 hour cache
        return cleaned;
      }
      return null;
    };

    // 1. Open Graph
    let image = $('meta[property="og:image"]').attr('content') || $('meta[name="og:image"]').attr('content');
    if ((image = tryCacheAndReturn(image))) return image;

    // 2. Twitter Card
    image = $('meta[name="twitter:image"]').attr('content');
    if ((image = tryCacheAndReturn(image))) return image;

    // 3. General meta[property*="image"]
    image = $('meta[property*="image"]').attr('content');
    if ((image = tryCacheAndReturn(image))) return image;

    // 4. <link rel="image_src">
    image = $('link[rel="image_src"]').attr('href');
    if ((image = tryCacheAndReturn(image))) return image;

    // 5. JSON-LD
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html());
        const imageProp = json?.image || json?.thumbnailUrl;
        let candidate = null;

        if (typeof imageProp === 'string') {
          candidate = imageProp;
        } else if (Array.isArray(imageProp)) {
          candidate = imageProp[0];
        } else if (typeof imageProp === 'object' && imageProp.url) {
          candidate = imageProp.url;
        }

        if (!image && candidate) {
          const resolved = tryCacheAndReturn(candidate);
          if (resolved) image = resolved;
        }
      } catch (_) {
        // ignore malformed JSON-LD
      }
    });
    if (image) return image;

    // 6. AMP <amp-img>
    image = $('amp-img').first().attr('src');
    if ((image = tryCacheAndReturn(image))) return image;

    // 7. <article> img or fallback <img>
    image = $('article img').first().attr('src') || $('img').first().attr('src');
    if (image && image.startsWith('data:')) image = null; // skip base64 images
    if ((image = tryCacheAndReturn(image))) return image;

    // 8. Fallback
    console.warn(`⚠️ No usable image found at ${url} (${new URL(url).hostname})`);
    return null;

  } catch (err) {
    console.error(`❌ Failed to extract image from ${url}:`, err.message);
    return null;
  }
}

module.exports = { extractImageFromURL };
