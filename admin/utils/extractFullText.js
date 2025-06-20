const Mercury = require('@postlight/mercury-parser');
const puppeteer = require('puppeteer');
const got = require('got'); // optional: used to improve fetch control

async function extractFullArticle(url) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new', // newer Puppeteer headless mode
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Spoof headers to look like a real browser
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
    });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for main article container
    await page.waitForSelector('article, [class*="story"], [data-testid*="article"]', { timeout: 10000 });

    const content = await page.evaluate(() => {
      const container = document.querySelector('article') ||
                        document.querySelector('[class*="story"]') ||
                        document.querySelector('[data-testid*="article"]');

      return container ? container.innerText : '';
    });

    if (!content || content.length < 300) {
      console.warn(`⚠️ Puppeteer extracted content too short (${content?.length || 0} chars)`);
      return null;
    }

    return content;
  } catch (err) {
    console.error(`❌ Puppeteer failed for ${url}:`, err.message);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { extractFullArticle };
