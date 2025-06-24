  const Mercury = require('@postlight/mercury-parser');
  const puppeteer = require('puppeteer-extra');
  const StealthPlugin = require('puppeteer-extra-plugin-stealth');
  puppeteer.use(StealthPlugin());

  function stripHTML(html) {
    return html.replace(/<\/?[^>]+(>|$)/g, '').trim();
  }

  async function extractFullArticle(url) {
    // 🌐 Try Mercury first
    try {
      const mercuryResult = await Mercury.parse(url);
      if (mercuryResult?.content && mercuryResult.content.length > 300) {
        return stripHTML(mercuryResult.content);
      } else {
        console.warn(`⚠️ Mercury content too short (${mercuryResult?.content?.length || 0}) — trying Puppeteer...`);
      }
    } catch (err) {
      console.warn(`⚠️ Mercury failed: ${err.message}`);
    }

    // 🧱 Fallback: Puppeteer
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)...');
      await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForTimeout(3000);

      const html = await page.content();
      const renderedResult = await Mercury.parse(url, { html });

      if (renderedResult?.content && renderedResult.content.length > 300) {
        return stripHTML(renderedResult.content);
      } else {
        console.warn(`⚠️ Puppeteer+Mercury content too short (${renderedResult?.content?.length || 0})`);
        return null;
      }
    } catch (err) {
      console.error(`❌ Puppeteer failed for ${url}: ${err.message}`);
      return null;
    } finally {
      if (browser) await browser.close();
    }
  }

  module.exports = { extractFullArticle };
