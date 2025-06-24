const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const got = require('got');
const cheerio = require('cheerio');

async function extractImageFromURL(url) {
  try {
    const html = await got(url).text();
    return extractImageFromHTML(html);
  } catch (err) {
    console.warn(`⚠️ Got failed for ${url}: ${err.message} — trying puppeteer...`);
    return await extractImageWithPuppeteer(url);
  }
}

function extractImageFromHTML(html) {
  const $ = cheerio.load(html);
  const ogImage = $('meta[property="og:image"]').attr('content');
  const twitterImage = $('meta[name="twitter:image"]').attr('content');
  return ogImage || twitterImage || null;
}

async function extractImageWithPuppeteer(url) {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    const html = await page.content();
    return extractImageFromHTML(html);
  } catch (err) {
    console.error(`❌ Puppeteer failed for image extraction: ${err.message}`);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { extractImageFromURL };
