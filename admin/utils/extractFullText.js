const Mercury = require('@postlight/mercury-parser');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args)); 
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

function stripHTML(html) {
  return html.replace(/<\/?[^>]+(>|$)/g, '').trim();
}

async function extractFullArticle(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/114.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com',
        'Cache-Control': 'no-cache',
      },
    });

    if (!res.ok) throw new Error(`Initial fetch failed: ${res.status}`);

    const html = await res.text();
    const mercuryResult = await Mercury.parse(url, { html });

    if (mercuryResult?.content && mercuryResult.content.length > 300) {
      return stripHTML(mercuryResult.content);
    } else {
      console.warn(`⚠️ Mercury content too short (${mercuryResult?.content?.length || 0}) — trying Puppeteer...`);
    }
  } catch (err) {
    console.warn(`⚠️ Mercury failed: ${err.message} — trying Puppeteer...`);
  }

  // 🧱 Fallback: Puppeteer
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    await page.waitForTimeout(3000); // wait for dynamic content

    const content = await page.content();
    const mercuryResult = await Mercury.parse(url, { html: content });

    if (mercuryResult?.content?.length > 300) {
      return stripHTML(mercuryResult.content);
    }
  } catch (err) {
    console.error(`❌ Puppeteer failed for ${url}: ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }
}



  module.exports = { extractFullArticle };
