
const MAX_VISIBLE_NEWS = 5;

document.addEventListener("DOMContentLoaded", async function () {
  // Load both sections separately
  await loadNews('trending-news');
  showInitialNews('trending-news');

  await loadNews('updates-news');
  showInitialNews('updates-news');

  updateRelativeTime();

  const middleLayer = document.querySelector(".middle-layer");
  if (middleLayer) middleLayer.style.display = "block";

  // Refresh relative time every minute
  setInterval(updateRelativeTime, 60000);
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

  // Hide "See more" button if ≤5 items
  const header = section.previousElementSibling; 
  const seeMore = header?.querySelector('.see-more');
  if (seeMore) {
    seeMore.style.display = items.length <= MAX_VISIBLE_NEWS ? 'none' : 'flex';
  }
}



// ========== TOGGLE SEE MORE / SEE LESS ==========
function toggleNews(section) {
  const sectionId = `${section}-news`;   // e.g. "trending-news"
  const newsSection = document.getElementById(sectionId);
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

    if (diff <= 0) text = '1 second'; 
    else if (diff < 60) {
      const seconds = diff;
      text = `${seconds} second${seconds !== 1 ? 's' : ''}`;
    } else if (diff < 3600) {
      const minutes = Math.floor(diff / 60);
      text = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else if (diff < 86400) {
      const hours = Math.floor(diff / 3600);
      text = `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(diff / 86400);
      text = `${days} day${days !== 1 ? 's' : ''}`;
    }

    el.textContent = text;
  });
}


// ========== LOAD NEWS DETAILS ==========
async function loadNews(sectionId, endpoint, retries = 2) {
  // Only allow trending-news or updates-news
  if (!['trending-news', 'updates-news'].includes(sectionId)) {
    console.warn(`Ignoring unsupported section: ${sectionId}`);
    return;
  }

  const loader = document.querySelector('.loading-indicator');
  if (loader) loader.style.display = 'block';

  try {
    const response = await fetch(`${API_BASE}/api/sports-summaries`, { cache: "no-cache" });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to fetch news: ${response.status}\n${text}`);
    }

    const data = await response.json();
    if (!data || Object.keys(data).length === 0) {
      throw new Error("Empty response from server");
    }

    // ✅ Pick correct dataset
    const newsData = sectionId === 'trending-news' ? data.trending : data.updates;
    const newsKey = sectionId === 'trending-news' ? 'trendingNews' : 'updatesNews';
    window[newsKey] = newsData;

    // ✅ Render section
    populateNewsSection(sectionId, newsData);
    updateRelativeTime();

    // ✅ Hide error banner if shown earlier
    const errorBox = document.getElementById("news-error");
    if (errorBox) errorBox.classList.add("hidden");

  } catch (error) {
    console.error('⚠️ loadNews error:', error);
    
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
        <img src="${API_BASE}/api/image-proxy?url=${encodeURIComponent(item.image)}&width=600&height=400" 
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
     /*
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
      */

      //const placeholderAdCode = `<div class="ad-container placeholder-ad">Advertisement</div>`;
      //const adCode = typeof window !== "undefined" && window.adsbygoogle ? googleAdCode : placeholderAdCode;

      // Disable ads for now
       const adCode = '';

      return paragraphs.map((p, i) => 
        `<p>${p.trim()}</p>${((i + 1) % adEvery === 0 && i !== paragraphs.length - 1) ? adCode : ''}`
      ).join('');
    }

    const formattedDesc = Array.isArray(newsItem.paragraphs)
      ? injectAdParagraphs(newsItem.paragraphs, Math.floor(Math.random() * 2) + 3)
      : injectAdParagraphs([newsItem.fullSummary || 'No content available.']);

    const articleUrl = `${window.location.origin}/news/${newsItem.seoTitle}`;

    // determine image credit (improved fallback logic)
     let imageCreditText = '';
     if (newsItem.image) {
      if (newsItem.imageCredit) {
        imageCreditText = newsItem.imageCredit;
       } else if (newsItem.entity && newsItem.entity.name) {
        imageCreditText = `Photo: ${newsItem.entity.name}`;
       } else if (newsItem.title) {
        imageCreditText = `Photo: ${newsItem.title}`;
       } else {
        imageCreditText = 'Photo: Source not specified';
       }
      }

        
    const fullView = document.createElement('div');
    fullView.className = 'news-full-view';
    fullView.innerHTML = `
      <article class="blog-post">
        <button class="back-button">← Back</button>
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
          <figure class="blog-image-wrapper">
            <img class="blog-image" src="${newsItem.image}" alt="Image for ${newsItem.title}" />
            <figcaption class="image-caption">${imageCreditText}</figcaption>
          </figure>` : ''}

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

     //Insert the full article *after* the clicked item
    clickedItem.insertAdjacentElement('afterend', fullView);

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
