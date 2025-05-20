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
        if (isNaN(posted.getTime())) {
            el.textContent = 'Invalid time';
            return;
        }

        const diff = Math.floor((now.getTime() - posted.getTime()) / 1000);
        let text;

        if (diff < 0) text = 'Just now'; // Future-published feeds
        else if (diff < 60) text = `${diff} seconds ago`;
        else if (diff < 3600) text = `${Math.floor(diff / 60)} minute(s) ago`;
        else if (diff < 86400) text = `${Math.floor(diff / 3600)} hour(s) ago`;
        else text = `${Math.floor(diff / 86400)} day(s) ago`;

        el.textContent = text;
    });
}



const MAX_VISIBLE_NEWS = 5;

 // ========== LoAD NEWS ========== //
async function loadNews() {
    try {
        const response = await fetch('https://curly-space-computing-machine-v7qj957x6593xr4r-3000.app.github.dev/api/news', {
         credentials: 'include'
         });
        const { trending, updates } = await response.json();

        populateNewsSection('trending-news', trending);
        populateNewsSection('updates-news', updates);
    } catch (error) {
        console.error('Failed to load news:', error);
    }
}

// ========== POPULATE NEWS ========== //
function populateNewsSection(sectionId, newsList) {
    const container = document.getElementById(sectionId);
    if (!container) return;

    container.innerHTML = newsList.map((item, index) => `
        <div class="news-infomat" data-index="${index}" data-section="${sectionId}"
             data-title="${encodeURIComponent(item.title)}"
             data-description="${encodeURIComponent(item.description)}"
             data-pubDate="${item.pubDate}"
             data-image="${encodeURIComponent(item.image || '')}">
             
            ${item.image ? `<img src="${item.image}" class="news-thumb" alt="News Image" />` : ''}
            <h4 class="news-title">${item.title}</h4>
            <div class="news-meta">
                <p class="news-desc">${item.description}</p>
                <span class="news-time" data-posted="${item.pubDate}">Just now</span>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.news-infomat').forEach(item => {
        item.addEventListener('click', () => {
            showFullNews(item);
        });
    });
}


// ========== SHOW FULL NEWS ========== //
function showFullNews(clickedItem) {
    const middleLayer = document.querySelector('.middle-layer');
    const children = Array.from(middleLayer.children);
    children.forEach(child => child.style.display = 'none');

    const title = decodeURIComponent(clickedItem.dataset.title);
    const description = decodeURIComponent(clickedItem.dataset.description);
    const pubDate = clickedItem.dataset.pubDate;
    const image = decodeURIComponent(clickedItem.dataset.image || '');

    const fullView = document.createElement('div');
    fullView.className = 'news-full-view';

    fullView.innerHTML = `
        ${image ? `<img src="${image}" class="news-thumb" alt="Featured Image" />` : ''}
        <h2 class="news-title">${title}</h2>
        <p class="news-time">${new Date(pubDate).toLocaleString()}</p>
        <div class="news-desc">${description}</div>
    `;

    const backButton = document.createElement('button');
    backButton.textContent = '← Back to news';
    backButton.className = 'back-button';
    backButton.onclick = () => {
        fullView.remove();
        children.forEach(child => child.style.display = '');
        showInitialNews("trending-news");
        showInitialNews("updates-news");
        updateRelativeTime();
    };

    fullView.prepend(backButton);
    middleLayer.appendChild(fullView);
}


function enhanceSportsDescription(text) {
  const ytMatch = text.match(/https:\/\/(?:www\.)?youtube\.com\/watch\?v=([\w-]+)/);
  if (ytMatch) {
    const videoId = ytMatch[1];
    return `
      <div class="video-embed">
        <iframe width="100%" height="315" src="https://www.youtube.com/embed/${videoId}" 
                frameborder="0" allowfullscreen></iframe>
      </div>
      <p>This match or update is turning heads online. Watch the analysis and reactions from fans and pundits in this exclusive clip.</p>
    `;
  }

  // Fallback to enhanced plain description
  const plain = text.replace(/<\/?[^>]+(>|$)/g, '').replace(/[^a-zA-Z0-9 .,?!]/g, '');
  return `${plain} Expect intense matchups, bold predictions, and tactical breakdowns — your go-to hub for all football insights.`;
}




  


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
 

