document.addEventListener("DOMContentLoaded", async function () {
    await loadNews(); // Make sure news loads first
    showInitialNews("trending-news");
    showInitialNews("updates-news");
    updateRelativeTime();

    // Ensure .middle-layer is available before modifying
    const middleLayer = document.querySelector(".middle-layer");
    if (middleLayer) middleLayer.style.display = "block";
});


  
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


async function fetchNews() {
  const [trendingRes, updatesRes] = await Promise.all([
    fetch('/api/news/trending?rewrite=true'),
    fetch('/api/news/updates?rewrite=true')
  ]);

  const trending = await trendingRes.json();
  const updates = await updatesRes.json();

  console.log("Trending:", trending);
  console.log("Updates:", updates);

  renderNews(trending, 'trending-news');
  renderNews(updates, 'updates-news');
  document.getElementById('trending-news').style.display = 'block';
  document.getElementById('updates-news').style.display = 'block';
}


function renderNews(newsList, containerId) {
  const container = document.getElementById(containerId);
  if (!container || !Array.isArray(newsList)) return;

  container.innerHTML = '';

  newsList.forEach(news => {
    const card = document.createElement('div');
    card.className = 'news-card news-infomat';
    card.onclick = () => showNewsDetail(news);

    card.innerHTML = `
      <img src="${news.image || 'fallback.jpg'}" alt="${news.title}" />
      <h3>${news.title}</h3>
      <p>${news.description}</p>
      <span class="news-time" data-posted="${news.pubDate}"></span>
    `;

    container.appendChild(card);
  });
}



function showNewsDetail(news) {
  const detailView = document.getElementById('news-details-view');
  const content = document.getElementById('news-detail-content');
  content.innerHTML = `
    <img src="${news.image}" alt="${news.title}" />
    <h2>${news.title}</h2>
    <p>${news.description}</p>
    <article>
      ${generateBlogPost(news)}
    </article>
  `;
  detailView.style.display = 'block';
  document.getElementById('trending-news').style.display = 'none';
  document.getElementById('updates-news').style.display = 'none';
}

function showNewsList() {
  document.getElementById('news-details-view').style.display = 'none';
  document.getElementById('trending-news').style.display = 'block';
  document.getElementById('updates-news').style.display = 'block';
}

function generateBlogPost(news) {
  return `
    <h4>In-depth Coverage</h4>
    <p>${news.description} This performance has created waves in the sports world, marking a defining moment of the season.</p>
    <p>Stay tuned for more details and analysis on this breaking story.</p>
  `;
}

document.addEventListener('DOMContentLoaded', fetchNews);

      
  


// toggle sidebar for mobile view
document.addEventListener("DOMContentLoaded", function () {
    let sidebar = document.getElementById("sidebar");
    let menuIcon = document.querySelector(".mobileMenu-logo ion-icon");
    let closeIcon = document.querySelector(".iconX");

    function toggleMobileSidebar() {
        if (window.innerWidth <= 1024) { // Mobile & Tablet Only
            sidebar.classList.toggle("active");
            sidebar.style.display = sidebar.classList.contains("active") ? "block" : "none";
        }
    }

    // Open sidebar on menu icon click
    if (menuIcon) { 
        menuIcon.addEventListener("click", toggleMobileSidebar);
    }

    // Close sidebar on close icon click
    closeIcon.addEventListener("click", () => {
        sidebar.classList.remove("active");
        sidebar.style.display = "none";
    });
});
 

