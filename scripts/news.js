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
  const loader = document.querySelector('.loading-indicator');
  if (loader) loader.style.display = 'block';

  try {
    const response = await fetch('http://localhost:3000/api/news');
    const { trending, updates } = await response.json();
    populateNewsSection('trending-news', trending);
    populateNewsSection('updates-news', updates);
  } catch (error) {
    console.error('Failed to load news:', error);
    alert("Failed to load the latest news.");
  } finally {
    if (loader) loader.style.display = 'none';
  }
}


// ========== POPULATE NEWS ========== //
function populateNewsSection(sectionId, newsList) {
    const container = document.getElementById(sectionId);
    if (!container) return;

    container.innerHTML = newsList.map((item, index) => `
        <div class="news-infomat" data-index="${index}" data-section="${sectionId}">
            <h1 class="news-title">${item.title}</h1>
            ${item.image ? `<div class="news-image">
          <img src="/api/image-proxy?url=${encodeURIComponent(item.image)}&width=600&height=400" 
          alt="Image for ${item.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/600x400?text=No+Image'" />
          </div>` : ''}
            <div class="news-meta">
                <p class="news-desc">${enhanceSportsDescription(item.description)}</p>
                <span class="news-time" data-posted="${item.pubDate}">Just now</span>
            </div>
        </div>
    `).join('');

    // Add event listeners to each item
    container.querySelectorAll('.news-infomat').forEach(item => {
        item.addEventListener('click', () => {
            showFullNews(item);
        });
    });
}



// ========== SHOW FULL NEWS ========== //
function showFullNews(clickedItem) {
    const middleLayer = document.querySelector('.middle-layer');

    // Hide all children inside middle-layer
    const children = Array.from(middleLayer.children);
    children.forEach(child => {
        child.style.display = 'none';
    });

    // Create and display the full view container
    const fullView = document.createElement('div');
    fullView.className = 'news-full-view';
    // Clone clicked item HTML
    fullView.innerHTML = clickedItem.innerHTML;

    // Enlarge image inside fullView if exists
    const img = fullView.querySelector('img');
     if (img) {
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.borderRadius = '12px';
      img.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
      img.style.cursor = 'zoom-in';

       img.onclick = () => {
      if (img.style.maxWidth === '100%') {
       img.style.maxWidth = 'none';
       img.style.cursor = 'zoom-out';
      } else {
       img.style.maxWidth = '100%';
       img.style.cursor = 'zoom-in';
      }
    };
   }


    // Add back button
    const backButton = document.createElement('button');
    backButton.textContent = '← Back to news';
    backButton.className = 'back-button';
    backButton.onclick = () => {
        fullView.remove();

        // Restore all children inside middle-layer
        children.forEach(child => {
            child.style.display = '';
        });

        showInitialNews("trending-news");
        showInitialNews("updates-news");
        updateRelativeTime();
    };

    fullView.prepend(backButton);

    // Append fullView inside the middle-layer
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
 

