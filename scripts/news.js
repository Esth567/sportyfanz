
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
  const header = newsSection?.previousElementSibling; // .news-text-cont
  const seeMoreText = header?.querySelector('.see-more p');
  const seeMoreImg = header?.querySelector('.see-more img');

  if (!newsSection || !seeMoreText) {
    console.warn(`toggleNews: missing elements for ${section}`);
    return;
  }

  const items = newsSection.querySelectorAll('.news-infomat');
  const expanded = seeMoreText.innerText.toLowerCase() === 'see less';

  items.forEach((item, index) => {
    item.style.display = expanded ? (index < MAX_VISIBLE_NEWS ? 'flex' : 'none') : 'flex';
  });

  seeMoreText.innerText = expanded ? 'See more' : 'See less';

  // Optional: swap arrow image
  if (seeMoreImg) {
    seeMoreImg.src = expanded 
      ? "/assets/icons/ankle-vector.png"     // collapsed
      : "/assets/icons/ankle-vector-up.png"; // expanded
  }
}


  
  // ========== RELATIVE TIME ========== //
function updateRelativeTime() {
    const timeElements = document.querySelectorAll('.news-time');
    const now = new Date();

    timeElements.forEach(el => {
        const postedMs = Date.parse(el.dataset.posted);
        if (isNaN(postedMs)) {
            el.textContent = 'Invalid time';
            return;
        }

        const diff = Math.floor((now.getTime() - postedMs) / 1000);
        let text;

        if (diff < 1) text = '1 second ago';
        else if (diff < 60) {
            const seconds = diff;
            text = `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
        } else if (diff < 3600) {
            const minutes = Math.floor(diff / 60);
            text = `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        } else if (diff < 86400) {
            const hours = Math.floor(diff / 3600);
            text = `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        } else {
            const days = Math.floor(diff / 86400);
            text = `${days} day${days !== 1 ? 's' : ''} ago`;
        }

        el.textContent = text;
    });
}



const MAX_VISIBLE_NEWS = 5;

// ========== LOAD NEWS ==========
async function loadNews(retry = true) {
  const loader = document.querySelector('.loading-indicator');
  if (loader) loader.style.display = 'block';

  try {
    const response = await fetch(`${API_BASE}/api/sports-summaries`);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to fetch news: ${response.status}\n${text}`);
    }

    const text = await response.text();
    if (!text || text.trim() === '') {
      throw new Error("Empty response from server");
    }

    const data = JSON.parse(text);
    window.trendingNews = data.trending;
    window.updatesNews = data.updates;

    populateNewsSection('trending-news', data.trending);
    populateNewsSection('updates-news', data.updates);
    updateRelativeTime();

  } catch (error) {
    console.error('⚠️ loadNews error:', error);

    // Retry logic
    if (retry) {
      console.log('🔁 Retrying in 2 seconds...');
      setTimeout(() => loadNews(false), 2000); // one retry
    } else {
      alert("⚠️ Could not load news. Please try again later.");
    }
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
       ? `<div class="feature-image">
        <img src="/api/image-proxy?url=${encodeURIComponent(item.image)}&width=600&height=400" 
              alt="Image for ${item.title}" 
              loading="lazy" 
              onerror="this.src='https://via.placeholder.com/600x400?text=No+Image'" />
        </div>`
       : `<div class="feature-image">
        <img src="https://via.placeholder.com/600x400?text=No+Image" 
              alt="Image not available for ${item.title}" 
              loading="lazy" />
        </div>`;


    return `
      <div class="news-infomat" data-index="${index}" data-section="${sectionId}">
        ${imageHtml}
        <div class="title-desc">  
        <h1 class="news-title">
          <a href="/news/${item.seoTitle}" class="news-link">${item.title}</a>
          </h1>
        <div class="news-meta">
          <p class="news-desc">${item.fullSummary?.slice(0, 150) || 'No description'}...</p>
          <span class="news-time" data-posted="${item.date}"></span>
        </div>
        </div>
      </div>
    `;
  }).join('');

  if (newsList.length > 0) {
     container.style.removeProperty('display');
     container.hidden = false;
     container.classList.remove('hidden');
   }


  container.querySelectorAll('.news-infomat').forEach((el) => {
    updateRelativeTime();
    el.addEventListener('click', () => {
      showFullNews(el);
    });
  });
}




// ========== SHOW FULL NEWS ========== //
function showFullNews(clickedItem) {
  try {
    const middleLayer = document.querySelector('.middle-layer');


    // detect if mobile/tablet (adjust breakpoint to match your CSS media queries)
     const isMobileOrTablet = window.innerWidth <= 1024;
    
    // Hide all children inside middle-layer
    const children = Array.from(middleLayer.children);
    children.forEach(child => {
      child.style.display = 'none';
    });

    // ✅ hide first & third layer only for mobile/tablet
    if (isMobileOrTablet) {
      document.body.classList.add("full-view-active");
    }

    // ✅ On news page only → show hidden elements
    if (document.body.classList.contains("news-page")) {
      document.querySelectorAll('.text-cont1, .news-update').forEach(el => {
        el.style.display = ''; // restore
      });
    }
    // Get news data on clicked 
    const index = clickedItem.dataset.index;
    const section = clickedItem.dataset.section;

     const newsList = section === 'trending-news' ? window.trendingNews : window.updatesNews

    const newsItem = newsList[parseInt(index)];

    if (!newsItem) {
      alert("News item not found.");
      return;
    }

    // Format description into paragraphs
    function injectAdParagraphs(paragraphs, adEvery = Math.floor(Math.random() * 3) + 4) {
      const googleAdCode = `
        <div class="ad-container" style="margin: 15px 0;">
          <ins class="adsbygoogle"
               style="display:block; text-align:center;"
               data-ad-layout="in-article"
               data-ad-format="fluid"
               data-ad-client="ca-pub-XXXXXXXXXXXXXXX"
               data-ad-slot="YYYYYYYYYYYYY"></ins>
          <script>
            try {
              (adsbygoogle = window.adsbygoogle || []).push({});
            } catch (e) {
              console.warn('AdSense error:', e.message);
            }
          </script>
        </div>
      `;

      const placeholderAdCode = `<div class="ad-container placeholder-ad">Advertisement</div>`;
      const adCode = typeof window !== "undefined" && window.adsbygoogle ? googleAdCode : placeholderAdCode;

      return paragraphs.map((p, i) => 
        `<p>${p.trim()}</p>${((i + 1) % adEvery === 0 && i !== paragraphs.length - 1) ? adCode : ''}`
      ).join('');
    }

    const formattedDesc = Array.isArray(newsItem.paragraphs)
      ? injectAdParagraphs(newsItem.paragraphs, Math.floor(Math.random() * 2) + 3)
      : injectAdParagraphs([newsItem.fullSummary || 'No content available.']);

    const articleUrl = `${window.location.origin}/news/${newsItem.seoTitle}`;
        
    const fullView = document.createElement('div');
    fullView.className = 'news-full-view';
    fullView.innerHTML = `
      <article class="blog-post">
        <!-- ✅ keep only this back button -->
        <button class="back-button">← Back to news</button>
        <h1 class="blog-title">${newsItem.title}</h1>

        <div class="blog-meta">
          <span class="blog-date">${new Date(newsItem.date).toLocaleDateString()}</span>
          <span class="news-time" data-posted="${newsItem.date}"></span>
        </div>

        ${newsItem.entity ? `
          <div class="entity-display">
            <img src="${newsItem.entity.logo}" alt="${newsItem.entity.name}" class="entity-logo" />
            <div class="entity-meta">
              <h2 class="entity-name">${newsItem.entity.name}</h2>
              <div class="entity-category">${newsItem.entity.category}</div>
            </div>
          </div>` : ''}

        ${newsItem.image ? `
          <div class="blog-image-wrapper">
            <img class="blog-image" src="${newsItem.image}" alt="Image for ${newsItem.title}" />
          </div>` : ''}

        <div class="social-icons">
          <a href="https://x.com/sporty_fanz/tweet?text=${encodeURIComponent(newsItem.title)}&url=${encodeURIComponent(articleUrl)}" target="_blank" rel="noopener noreferrer">
            <i class="fab fa-x-twitter"></i>
          </a>
          <a href="https://www.facebook.com/sportfolder/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}" target="_blank" rel="noopener noreferrer">
            <i class="fab fa-facebook-f"></i>
          </a>
          <a href="https://wa.me/?text=${encodeURIComponent(newsItem.title + ' ' + articleUrl)}" target="_blank" rel="noopener noreferrer">
            <i class="fab fa-whatsapp"></i>
          </a>
          <a href="https://www.tiktok.com/@sportyfanz" target="_blank" rel="noopener noreferrer">
            <i class="fab fa-tiktok"></i>
          </a>
          <a href="https://www.instagram.com/sportyfanz_official?igsh=djJlbWl6Z3Uwcnl0/" target="_blank" rel="noopener noreferrer">
            <i class="fab fa-instagram"></i>
          </a>
        </div>

        <div class="blog-content">${formattedDesc}</div>
      </article>
    `;

    // back button → restore state
    const backButton = fullView.querySelector('.back-button');
    backButton.onclick = () => {
      fullView.remove();
      children.forEach(child => {
        child.style.display = ''; // restores previous display
      });
       
      if (document.body.classList.contains("news-page")) {
        document.querySelectorAll('.text-cont1, .news-update').forEach(el => {
        el.style.display = 'none';
        });
      }

      updateRelativeTime();
    };

    middleLayer.insertBefore(fullView, middleLayer.firstChild);

  } catch (err) {
    console.error("Failed to render full news view", err);
    alert("Something went wrong displaying the full article.");
  }
}


// --------- Handle back/forward ---------
window.onpopstate = function (event) {
  const middleLayer = document.querySelector('.middle-layer');
  const isMobileOrTablet = window.innerWidth <= 1024;

  if (event.state && typeof event.state.index !== 'undefined') {
    const dummy = document.createElement('div');
    dummy.dataset.index = event.state.index;
    dummy.dataset.section = event.state.section;
    showFullNews(dummy);

    if (isMobileOrTablet) {
      document.body.classList.add("full-view-active");
    }
  } else {
    const fullView = document.querySelector('.news-full-view');
    if (fullView) fullView.remove();

    Array.from(middleLayer.children).forEach(child => {
      child.style.display = '';
    });

    if (isMobileOrTablet) {
      document.body.classList.remove("full-view-active");
    }
  }
};




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



// layout-fix
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);

  resizeTimer = setTimeout(() => {
    document.body.classList.add("resizing-refresh");

    // refresh ads
    if (window.adsbygoogle && Array.isArray(window.adsbygoogle)) {
      try {
        (adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.warn("Ad refresh failed", e);
      }
    }

    setTimeout(() => {
      document.body.classList.remove("resizing-refresh");
    }, 50);
  }, 200);
});
