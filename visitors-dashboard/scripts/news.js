document.addEventListener("DOMContentLoaded", async function () {
    await loadNews(); // Make sure news loads first
    showInitialNews("trending-news");
    showInitialNews("updates-news");
    updateRelativeTime();

    // Ensure .middle-layer is available before modifying
    const middleLayer = document.querySelector(".middle-layer");
    if (middleLayer) middleLayer.style.display = "block";
});


// ========== CONFIG ========== //
const API_BASE = 'http://localhost:8000';
const MAX_VISIBLE_NEWS = 5;


// ========== INITIAL LOAD ========== //
document.addEventListener('DOMContentLoaded', loadNews);
setInterval(updateRelativeTime, 30000);


  
  // ========== DISPLAY INITIAL 5 ========== //
function showInitialNews(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    const items = section.querySelectorAll('.news-infomat');
    items.forEach((item, index) => {
        item.style.display = index < MAX_VISIBLE_NEWS ? 'flex' : 'none';
    });

    section.style.display = 'flex';
    section.style.flexDirection = 'column';
}


  
  // ========== TOGGLE SEE MORE ========== //
function toggleNews(section) {
    const newsSection = document.getElementById(`${section}-news`);
    const seeMoreText = document.getElementById(`${section}-text`);
    const icon = document.querySelector(`#${section} .see-more ion-icon`);

    if (!newsSection || !seeMoreText || !icon) return;

    const items = newsSection.querySelectorAll('.news-infomat');
    const expanded = seeMoreText.innerText === 'See less';

    items.forEach((item, index) => {
        item.style.display = expanded ? (index < MAX_VISIBLE_NEWS ? 'flex' : 'none') : 'flex';
    });

    seeMoreText.innerText = expanded ? 'See more' : 'See less';
    icon.name = expanded ? 'caret-down-outline' : 'caret-up-outline';
}
  
  
  // ========== RELATIVE TIME ========== //
function updateRelativeTime() {
    const timeElements = document.querySelectorAll('.news-time');
    const now = new Date();

    timeElements.forEach(el => {
        const posted = new Date(el.dataset.posted);
        if (isNaN(posted)) {
            el.textContent = 'Invalid time';
            return;
        }

        const diff = Math.floor((now - posted) / 1000);
        let text;

        if (diff < 60) text = `${diff} seconds ago`;
        else if (diff < 3600) text = `${Math.floor(diff / 60)} minute(s) ago`;
        else if (diff < 86400) text = `${Math.floor(diff / 3600)} hour(s) ago`;
        else text = `${Math.floor(diff / 86400)} day(s) ago`;

        el.textContent = text;
    });
}

// ========== UTIL: PARSE DATE ========== //
function parseDate(dateStr) {
    const date = new Date(dateStr);
    return isNaN(date) ? null : date;
}
  
  
// ========== SUMMARIZE TEXT ========== //
async function summarizeText(title, description) {
    try {
        const response = await fetch(`${API_BASE}/summarize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description })
        });

        const data = await response.json();
        if (!response.ok || data.error) throw new Error(data.error || response.statusText);

        const summary = data.summary || description;
        const wordCount = summary.split(' ').length;

        return {
            summary: wordCount < 150 ? `${summary} (Extended Summary...)` : summary
        };
    } catch (err) {
        console.error('Summarization failed:', err);
        return { summary: description };
    }
}


// ========== SEO TITLE REWRITE ========== //
function rewriteTitleForSEO(originalTitle, matchResult = '') {
    const leagues = ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Champions League', 'Europa League', 'CAF Champions League', 'CAF Confederation Cup'];
    const players = ['Erling Haaland', 'Kylian Mbappe', 'Cristiano Ronaldo', 'Lionel Messi', 'Victor Osimhen', 'Harry Kane'];
    const clubs = ['Manchester City', 'Real Madrid', 'Barcelona', 'Bayern Munich', 'Arsenal', 'Napoli', 'PSG', 'Al Nassr'];

    const lowerTitle = originalTitle.toLowerCase();
    const foundLeague = leagues.find(l => lowerTitle.includes(l.toLowerCase()));
    const foundPlayer = players.find(p => lowerTitle.includes(p.toLowerCase()));
    const foundClub = clubs.find(c => lowerTitle.includes(c.toLowerCase()));

    let baseTitle = originalTitle.trim();
    if (matchResult) baseTitle += ` | Match Result: ${matchResult}`;

    if (foundPlayer && foundLeague) return `${foundPlayer} Makes Headlines in ${foundLeague} | Latest Update`;
    if (foundPlayer && foundClub) return `${foundPlayer} Shines for ${foundClub} – Breaking Football News`;
    if (foundClub && foundLeague) return `${foundClub} in ${foundLeague} Action: Match Highlights & Analysis`;
    if (foundPlayer) return `${foundPlayer}'s Latest Performance – Must-Read Football Insight`;
    if (foundClub) return `${foundClub} Update: Match News, Transfers & More`;
    if (foundLeague) return `${foundLeague} Roundup – Key Matches, Players & Talking Points`;

    return baseTitle.length > 80 ? baseTitle.slice(0, 77) + '...' : baseTitle;
}


// ========== GENERATE BLOG CONTENT ========== //
async function generateBlogContent(title, description) {
    try {
        const [seoTitle, summaryObj] = await Promise.all([
            rewriteTitleForSEO(title),
            summarizeText(title, description)
        ]);

        return {
            seo_title: seoTitle,
            blog_summary: summaryObj.summary
        };
    } catch (err) {
        console.error('Error generating blog content:', err);
        return { seo_title: title, blog_summary: description };
    }
}


// ========== ENHANCE EACH NEWS ITEM ========== //
async function enhanceNews(index, news) {
    const newsEl = document.getElementById(`news-${index}`);
    if (!newsEl) return;

    const titleEl = newsEl.querySelector('.news-header');
    const descEl = newsEl.querySelector('.news-description');
    const timeEl = newsEl.querySelector('.news-time');

    const { seo_title, blog_summary } = await generateBlogContent(news.title, news.description);
    titleEl.textContent = seo_title || news.title;
    descEl.textContent = blog_summary || news.description;
    timeEl.dataset.posted = news.pubDate;
}




// ========== LOAD NEWS ========== //
async function loadNews() {
    try {
        const res = await fetch(`${API_BASE}/api/news`);
        const data = await res.json();

        if (!Array.isArray(data)) throw new Error('News data is not an array');

        window.newsData = data;
        const trendingContainer = document.getElementById('trending-news');
        const updatesContainer = document.getElementById('updates-news');

        if (!trendingContainer || !updatesContainer) throw new Error('News containers not found in DOM');

        trendingContainer.innerHTML = '';
        updatesContainer.innerHTML = '';

        data.forEach((news, i) => {
            news.pubDate = parseDate(news.pubDate) || new Date().toISOString();

            const html = createNewsHTML(news, i);
            const trendingItem = document.createElement('div');
            const updatesItem = document.createElement('div');

            trendingItem.innerHTML = html;
            updatesItem.innerHTML = html;

            trendingContainer.appendChild(trendingItem);
            updatesContainer.appendChild(updatesItem);

            enhanceNews(i, news); // No delay needed; each runs independently
        });

        showInitialNews('trending-news');
        showInitialNews('updates-news');
    } catch (err) {
        console.error('Error loading news:', err);
    }
}



// ========== CREATE NEWS ITEM HTML ========== //
function createNewsHTML(news, index) {
    return `
        <div class="news-infomat" id="news-${index}" onclick="showNewsDetail(${index})">
            <div class="feature-img">
                ${news.image ? `<img src="${news.image}" class="news-image" alt="News Image">` : ''}
            </div>
            <div class="news-messages">
                <h3 class="news-header">${news.title}</h3>
                <div class="news-meta">
                    <p class="news-description">${news.description}</p>
                    <span class="news-time" data-posted="${news.pubDate}">Loading...</span>
                </div>
            </div>
        </div>
    `;
}


// Automatically call loadNews when the page is reloaded
document.addEventListener('DOMContentLoaded', function() {
    loadNews(); // This will run once the page is fully loaded
});


// ========== Display full news details ========== //
async function showNewsDetail(newsItem) {
  const newsDetailContainer = document.getElementById("news-detail");
  const summaryBox = newsDetailContainer.querySelector(".news-summary");
  const headline = newsDetailContainer.querySelector(".news-headline");
  const image = newsDetailContainer.querySelector(".news-image");
  const meta = newsDetailContainer.querySelector(".news-meta");

  // Fill in basic info
  headline.textContent = newsItem.title || "Untitled";
  meta.textContent = new Date(newsItem.pubDate).toLocaleString();
  image.src = newsItem.image || "fallback.jpg";
  image.alt = newsItem.title;

  // Show loading while fetching summary
  summaryBox.innerHTML = `<div class="spinner">Summarizing...</div>`;

  try {
    const response = await fetch("http://localhost:8000/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newsItem.description })
    });

    const data = await response.json();
    summaryBox.innerHTML = `
      <p class="seo-title">${data.seo_title || "News Summary"}</p>
      <p>${data.summary || "No summary available."}</p>
    `;
  } catch (err) {
    console.error("Summary error:", err);
    summaryBox.innerHTML = "<p>Failed to summarize content.</p>";
  }

  // Show the detail container
  newsDetailContainer.style.display = "block";
}




// Go back to news list view
function showNewsList() {
    document.getElementById('news-details-view').style.display = 'none';
    document.getElementById('trending-news').style.display = 'flex';
    document.getElementById('updates-news').style.display = 'flex';
}

// Auto-refresh news every 5 minutes
let refreshIntervalMinutes = 5;
let refreshTimer = setInterval(loadNews, refreshIntervalMinutes * 60 * 1000);


      
  

  
  