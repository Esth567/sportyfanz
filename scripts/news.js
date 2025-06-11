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
  //const baseURL =
  //window.location.hostname === 'localhost'
   // ? 'http://localhost:10000'
   //: 'https://sports-news-api-a7gh.onrender.com'; // replace with actual Render backend URL

  try {
    
   const response = await fetch(`https://friendly-parakeet-jwqpvgwxjqvf5464-3000.app.github.dev/api/news`);
    if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error ${response.status}: ${errorText}`);
    }
  const { trending, updates } = await response.json();

    // ✅ Save globally so showFullNews() can access them
    window.trendingNews = trending;
    window.updatesNews = updates;

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

container.innerHTML = newsList.map((item, index) => {
  return `
    <div class="news-infomat" data-index="${index}" data-section="${sectionId}">
        <h1 class="news-title">${item.title}</h1>
        ${item.image ? `<div class="news-image">
          <img src="${location.origin}/api/image-proxy?url=${encodeURIComponent(item.image)}&width=600&height=400"> 
          alt="Image for ${item.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/600x400?text=No+Image'" />
        </div>` : ''}
        <div class="news-meta">
            <p class="news-desc">${item.description.slice(0, 150)}...</p>
            <span class="news-time" data-posted="${item.pubDate}">Just now</span>
        </div>
    </div>`;
   }).join('');

  container.querySelectorAll('.news-infomat').forEach((el, i) => {
     el.addEventListener('click', () => {
        showFullNews(el);
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

    // Get data from clicked item
    const index = clickedItem.dataset.index;
    const section = clickedItem.dataset.section;
    const newsList = section === 'trending-news' ? window.trendingNews : window.updatesNews;
    const newsItem = newsList[parseInt(index)];

    // Format description into paragraphs
    const formattedDesc = newsItem.description
        .split('\n\n')
        .map(p => `<p>${p.trim()}</p>`)
        .join('');

    // Create and display the full view container
    const fullView = document.createElement('div');
    fullView.className = 'news-full-view';
    fullView.innerHTML = `
        <article class="blog-post">
            <h1 class="blog-title">${newsItem.title}</h1>

            ${newsItem.image ? `
                <div class="blog-image-wrapper">
                    <img class="blog-image" src="${newsItem.image}" alt="Image for ${newsItem.title}" />
                </div>` : ''
            }

            <div class="blog-meta">
                <span class="blog-date">${new Date(newsItem.pubDate).toLocaleDateString()}</span>
            </div>

            <div class="blog-content">
                ${formattedDesc}
            </div>
        </article>
    `;

    // Add back button
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
 

