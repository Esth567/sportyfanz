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

// ========== LOAD NEWS ==========
async function loadNews() {
  const loader = document.querySelector('.loading-indicator');
  if (loader) loader.style.display = 'block';

  try {
    const response = await fetch('/api/news');

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to fetch news: ${response.status}\n${text}`);
    }

    const text = await response.text();
    if (!text || text.trim() === '') {
      throw new Error("Empty response from server");
    }

    let data;
    try {
      data = JSON.parse(text);
      console.log("Received news:", data);
      console.log("Trending:", data.trending.length, data.trending[0]);
      console.log("Updates:", data.updates.length, data.updates[0]);

    } catch {
      throw new Error("Invalid JSON received from server");
    }

    if (!Array.isArray(data.trending) || !Array.isArray(data.updates)) {
      throw new Error("Invalid or incomplete news structure from API");
    }

    window.trendingNews = data.trending;
    window.updatesNews = data.updates;

    populateNewsSection('trending-news', data.trending);
    populateNewsSection('updates-news', data.updates);

  } catch (error) {
    console.error('Failed to load news:', error);
    alert("⚠️ Could not load news: " + error.message);
  } finally {
    if (loader) loader.style.display = 'none';
  }
}



// ========== POPULATE NEWS ==========
function populateNewsSection(sectionId, newsList) {
  const container = document.getElementById(sectionId);
  if (!container || !Array.isArray(newsList)) return;
  console.log("Populating:", sectionId, "with", newsList.length, "items");


  container.innerHTML = newsList.map((item, index) => {
    const isValidImage = typeof item.image === 'string' && item.image.trim().startsWith('http');
    const imageHtml = isValidImage
       ? `<div class="news-image">
        <img src="${location.origin}/api/image-proxy?url=${encodeURIComponent(item.image)}&width=600&height=400" 
              alt="Image for ${item.title}" 
              loading="lazy" 
              onerror="this.src='https://via.placeholder.com/600x400?text=No+Image'" />
        </div>`
       : `<div class="news-image">
        <img src="https://via.placeholder.com/600x400?text=No+Image" 
              alt="Image not available for ${item.title}" 
              loading="lazy" />
        </div>`;


    return `
      <div class="news-infomat" data-index="${index}" data-section="${sectionId}">
        <h1 class="news-title">${item.title}</h1>
        ${imageHtml}
        <div class="news-meta">
          <p class="news-desc">${item.description?.slice(0, 150) || 'No description'}...</p>
          <span class="news-time" data-posted="${item.date}">Just now</span>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.news-infomat').forEach((el) => {
    el.addEventListener('click', () => {
      showFullNews(el);
    });
  });
}




// ========== SHOW FULL NEWS ========== //
function showFullNews(clickedItem) {
  try {
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
    const formattedDesc = typeof newsItem.description === 'string'
      ? newsItem.description
          .split('\n\n')
          .map(p => `<p>${p.trim()}</p>`)
          .join('')
      : '<p>No content available.</p>';

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
          <span class="blog-date">${new Date(newsItem.date).toLocaleDateString()}</span>
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
      updateRelativeTime();
    };

    fullView.prepend(backButton);
    middleLayer.insertBefore(fullView, middleLayer.firstChild);

  } catch (err) {
    console.error("Failed to render full news view", err);
    alert("Something went wrong displaying the full article.");
  }
}




// menu toggle button for sidebar for mobile view
document.addEventListener("DOMContentLoaded", function () {
    const sidebar = document.getElementById("sidebar");
    const toggleBtn = document.querySelector(".toggle-btn");
    const menuLogo = document.querySelector(".mobileMenu-logo");
    const mobileToggleIcon = document.querySelector(".mobile-toggle-btn");
    const closeIcon = document.querySelector(".iconX");

    function isMobileOrTablet() {
        return window.innerWidth <= 1024;
    }

    function updateSidebarVisibility() {
        if (isMobileOrTablet()) {
            if (toggleBtn) toggleBtn.style.display = "block";
            sidebar.classList.remove("active");
            sidebar.style.display = "none";
        } else {
            if (toggleBtn) toggleBtn.style.display = "none";
            sidebar.classList.remove("collapsed");
            sidebar.classList.remove("active");
            sidebar.style.display = "block";
        }
    }

    function toggleSidebar() {
        if (isMobileOrTablet()) {
            sidebar.classList.toggle("active");
            sidebar.style.display = sidebar.classList.contains("active") ? "block" : "none";
        }
    }


    // Attach toggle function to both buttons/icons
    if (menuLogo) {
        menuLogo.addEventListener("click", toggleSidebar);
    }

    if (mobileToggleIcon) {
        mobileToggleIcon.addEventListener("click", toggleSidebar);
    }

    if (toggleBtn) {
        toggleBtn.addEventListener("click", toggleSidebar);
    }

    if (closeIcon) {
        closeIcon.addEventListener("click", () => {
            sidebar.classList.remove("active");
            sidebar.style.display = "none";
        });
    }

    // Move h1 under logo on mobile
    if (isMobileOrTablet()) {
        const headerTopbar = document.querySelector(".header-topbar");
        const h1 = headerTopbar?.querySelector("h1");
        if (menuLogo && h1) {
            headerTopbar.insertBefore(h1, menuLogo.nextSibling);
        }
    }

    updateSidebarVisibility();
    window.addEventListener("resize", updateSidebarVisibility);
});



