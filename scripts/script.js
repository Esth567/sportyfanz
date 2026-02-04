const API_BASE = location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://admin.sportyfanz.com';

  
//sidebar toggle for web view
function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const container = document.querySelector('.body-container');

    sidebar.classList.toggle("collapsed");
}

document.querySelector('.icon img').addEventListener('click', toggleSidebar);



// Display matches for live-match-demo
document.addEventListener("DOMContentLoaded", function () {
    const liveMatchContainer = document.querySelector(".live-match-demo");

    const from = new Date().toISOString().split('T')[0]; // today's date
    const to = from;

    let matchesList = [];
    let currentMatchIndex = 0;
    

    // === LUXON Time Functions ===
  function getMinutesSince(dateStr, timeStr) {
  try {
    const now = DateTime.local().setZone("Europe/Berlin");
    const matchBerlin = getBerlinTime(dateStr, timeStr);
    return Math.max(0, Math.floor(now.diff(matchBerlin, "minutes").minutes));
  } catch {
    return 0;
  }
}

    function formatToUserLocalTime(dateStr, timeStr) {
        try {
            const { DateTime } = luxon;

            const berlinTime = DateTime.fromFormat(
                `${dateStr} ${timeStr}`,
                "yyyy-MM-dd H:mm",
                { zone: "Europe/Berlin" }
            );

            return berlinTime
                .setZone(Intl.DateTimeFormat().resolvedOptions().timeZone)
                .toFormat("h:mm");
        } catch (e) {
            console.error("Time conversion error:", e);
            return "TBD";
        }
    }

    function createMatchHTML(match) {
        const homeTeam = match.match_hometeam_name;
        const awayTeam = match.match_awayteam_name;
        const homeLogo = match.team_home_badge;
        const awayLogo = match.team_away_badge;
        const league = match.league_name;
        const startTime = match.match_time;
        const matchStatus = match.match_status;
        const homeScore = match.match_hometeam_score;
        const awayScore = match.match_awayteam_score;

        const isFinished = matchStatus === "Finished" || matchStatus === "FT";
        const hasStarted = matchStatus !== "" && matchStatus !== "Not Started";
        const displayScore = hasStarted ? `${homeScore} - ${awayScore}` : "VS";

        let displayTime = "";
        let ellipseImg = "";

        // Match phase determination
        if (isFinished) {
            displayTime = "FT";  // Final Time
            ellipseImg = "/assets/icons/Ellipse 1.png";
        } else if (hasStarted) {
            const minutes = getMinutesSince(match.match_date, startTime);
            if (minutes <= 90) {
                displayTime = `${minutes}'`;  // Regular time in minutes
            } else if (minutes <= 120) {
                displayTime = `${minutes - 90}' (ET)`;  // Extra time phase
            } else {
                displayTime = `${minutes - 120}' (AET)`;  // After Extra Time
            }
            ellipseImg = "/assets/icons/Ellipse2.png";
        } else {
            displayTime = formatToUserLocalTime(match.match_date, startTime);
            ellipseImg = "/assets/icons/Ellipse 1.png";
        }

        return `
        <div class="teams-time">
            <div class="team">
                <img src="${homeLogo}" alt="${homeTeam}">
                ${homeTeam}
            </div>
            <div class="live-match-event">
                <h4 class="game-leag">${league}</h4>
                <h2 class="vs-score">${displayScore}</h2>
                <div class="highlight-time">
                    <img src="${ellipseImg}" alt="Ellipse" class="Ellipse-logo">
                    ${displayTime}
                </div>
            </div>
            <div class="team">
                <img src="${awayLogo}" alt="${awayTeam}">
                ${awayTeam}
            </div>
        </div>`;
    }

    async function loadMatches() {
    try {
        matchesList = [];

        const params = new URLSearchParams({
            from,
            to,
            limit: 100
        });

        const res = await fetch(`${API_BASE}/api/matches?${params}`);
        const data = await res.json();

        if (Array.isArray(data)) {
            matchesList = data;
        } else {
            console.error('Expected array but received:', data);
        }

        matchesList.sort((a, b) => {
            const aTime = new Date(`${a.match_date}T${a.match_time}`);
            const bTime = new Date(`${b.match_date}T${b.match_time}`);
            return aTime - bTime;
        });

        if (matchesList.length > 0) {
            displayNextMatch();
        } else {
            liveMatchContainer.innerHTML = `<div class="teams-time"><div class="team">No top match today</div></div>`;
        }
    } catch (err) {
        console.error("Error loading matches:", err);
        liveMatchContainer.innerHTML = `<div class="team">Error loading matches. Please try again later.</div>`;
    }
}


    function displayNextMatch() {
        if (matchesList.length === 0) {
            liveMatchContainer.innerHTML = "<div class='team'>No matches available.</div>";
            return;
        }

        const match = matchesList[currentMatchIndex];
        const html = createMatchHTML(match);
        liveMatchContainer.innerHTML = html;

        currentMatchIndex = (currentMatchIndex + 1) % matchesList.length;

        setTimeout(() => {
            displayNextMatch();
        }, 10000);
    }

    // Start
    loadMatches();
})


// trending news display in the first layer

// ========== RELATIVE TIME ========== //
function updateRelativeTime() {
  const timeElements = document.querySelectorAll('.news-time');
  const now = new Date();

  timeElements.forEach(el => {
    const postedMs = Date.parse(el.dataset.posted);
    if (isNaN(postedMs)) {
      // Default to "just now" if invalid or missing
      el.textContent = 'just now';
      return;
    }

    const diff = Math.max(0, Math.floor((now.getTime() - postedMs) / 1000));
    let text;

    if (diff < 5) {
      // Anything under 5 seconds = "just now"
      text = 'just now';
    } else if (diff < 60) {
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



// ========== LOAD NEWS DETAILS ==========
async function loadNews(sectionId, endpoint, retries = 2) {
  const loader = document.querySelector('.loading-indicator');
  if (loader) loader.style.display = 'block';

  try {
    const response = await fetch(endpoint, { cache: "no-cache" });

    if (!response.ok) {
      const text = await response.text(); 
      throw new Error(`Failed to fetch news: ${response.status}\n${text}`);
    }

    const data = await response.json();
    if (!data || Object.keys(data).length === 0) {
    throw new Error("Empty response from server");
    }


    const newsData = sectionId === 'trending-stories' ? data.trending : data.updates;
    const newsKey = sectionId === 'trending-stories' ? 'trendingNews' : 'updatesNews';

    window[newsKey] = newsData;

    populateNewsSection(sectionId, newsData);
    updateRelativeTime();

     //Hide error banner if shown earlier
    const errorBox = document.getElementById("news-error");
    if (errorBox) errorBox.classList.add("hidden");

  } catch (error) {
    console.error('loadNews error:', error);

    const errorBox = document.getElementById("news-error");
    const errorText = document.getElementById("news-error-text");

    //Retry once
    if (retries > 0) {
      console.log(`Retrying in 2 seconds... (${retries} left)`);
      setTimeout(() => loadNews(sectionId, endpoint, retries - 1), 2000);
      return;
    }

    let message = "Unexpected error occurred while loading news.";

    if (!navigator.onLine) {
      message = "You appear to be offline. Please check your internet connection.";
    } else if (error.message.startsWith("Failed to fetch news")) {
      message = "Our servers are temporarily unavailable. Please try again later.";
    } else if (error.message.includes("Empty response")) {
      message = "No news available right now. Please check back soon.";
    }

    if (errorBox && errorText) {
      errorText.textContent = message;
      errorBox.classList.remove("hidden");
    }
  } finally {
    if (loader) loader.style.display = 'none';
  }
}



async function loadEntityDatabase() {
  try {
    const res = await fetch(`${API_BASE}/api/entity-database`);
    if (!res.ok) throw new Error("Failed to fetch entity DB");
    window.entityDatabase = await res.json();
    console.log("Entity DB loaded", Object.keys(window.entityDatabase).length);
  } catch (err) {
    console.error("Entity DB load failed:", err.message);
  }
}



// ========== POPULATE NEWS ==========
function populateNewsSection(sectionId, newsList) {
  const container = document.getElementById(sectionId) || 
   (sectionId === 'sliderNews-stories' ? document.querySelector('.header-slider') : null);
  if (!container || !Array.isArray(newsList)) return;
  console.log("Populating:", sectionId, "with", newsList.length, "items");

  // Helper: image block with proxy + fallback
  const getImageHtml = (item, size = "600x400") => {
    const isValidImage = typeof item.image === 'string' && item.image.trim().startsWith('http');
    if (isValidImage) {
      return `<img src="${API_BASE}/api/image-proxy?url=${encodeURIComponent(item.image)}&width=600&height=400"
                  alt="Image for ${item.title}" 
                  loading="lazy" 
                  onerror="this.src='https://via.placeholder.com/${size}?text=No+Image'" />`;
    }
    return `<img src="https://via.placeholder.com/${size}?text=No+Image" 
                alt="Image not available for ${item.title}" 
                loading="lazy" />`;
  };

  // ========== TRENDING ==========
  if (sectionId === 'trending-stories') {
    container.innerHTML = newsList.map((item, index) => `
      <div class="news-update" data-index="${index}" data-section="${sectionId}">
        <div class="news-container">
          <div class="news-image">${getImageHtml(item)}</div>
          <div class="news-info">
            <a href="/news/${item.seoTitle}" class="news-headline">${item.title}</a>
          </div>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.news-update').forEach((el) => {
      updateRelativeTime();
      el.addEventListener('click', (e) => {
        e.preventDefault();
        showFullNews(el);
      });
    });

  // ========== NEWS UPDATE ==========
  } else if (sectionId === 'newsUpdate-stories') {
    const limitedNews = newsList.slice(0, 2); // Only 2
    container.innerHTML = limitedNews.map((item, index) => `
      <div class="transferNews" data-index="${index}" data-section="${sectionId}">
        <div class="news-short-message">
          <div class="transferNews-image">${getImageHtml(item)}</div>
          <div class="news-info">
            <h2 class="transferNews-header">
              <a href="/news/${item.seoTitle}" class="transferNews-link">${item.title}</a>
            </h2>
            <p class="transferNews-description">${item.fullSummary?.slice(0,150) || 'No description'}...</p>
          </div>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.transferNews').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        showFullNews(el);
      });
    });


  // ========== SLIDER ==========
  } else if (sectionId === 'sliderNews-stories') {
    const container = document.querySelector('.header-slider');
    
    const trending = Array.isArray(window.trendingNews) ? window.trendingNews : [];
    const updates = Array.isArray(window.updatesNews) ? window.updatesNews : [];
    const combinedNews = [...trending, ...updates].slice(0, 20);

    // Clean old slides
    container.querySelectorAll('.sliderNews-dynamic').forEach(el => el.remove());

    combinedNews.forEach((item, index) => {
      const slide = document.createElement('div');
      slide.className = 'slider-content sliderNews-dynamic';
      slide.innerHTML = `
        <div class="sliderNews-image">
          ${getImageHtml(item)}
          <div class="sliderNews-info">
            <h2 class="sliderNews-header">
              <a href="/news/${item.seoTitle}" class="sliderNews-link">${item.title}</a>
            </h2>
          </div>
        </div>
      `;
      slide.dataset.index = index;
      slide.dataset.section = 'sliderNews-stories';

      slide.addEventListener('click', (e) => {
        e.preventDefault();
        showFullNews(slide);
      });

      container.appendChild(slide);
    });
    // Rebuild dots
   createDots();  
  }
}


// ========== SHOW FULL NEMWS ==========
function showFullNews(clickedItem) {
  try {
    const middleLayer = document.querySelector('.middle-layer');
     const isMobileOrTablet = window.innerWidth <= 1024;
    
    // Hide all children inside middle-layer
    const children = Array.from(middleLayer.children);
    children.forEach(child => {
      child.style.display = 'none';
    });

    // Close any previously open full article
    const existingFullView = middleLayer.querySelector('.news-full-view');
    if (existingFullView) {
      existingFullView.remove();
    }
    
    // Get news data on clicked 
    const index = clickedItem.dataset.index;
    const section = clickedItem.dataset.section;
    let newsList = [];

    if (section === 'trending-stories') {
      newsList = Array.isArray(window.trendingNews) ? window.trendingNews : [];
    } else if (section === 'newsUpdate-stories') {
      newsList = Array.isArray(window.updatesNews) ? window.updatesNews : [];
    } else if (section === 'sliderNews-stories') {
      const trending = Array.isArray(window.trendingNews) ? window.trendingNews : [];
      const updates = Array.isArray(window.updatesNews) ? window.updatesNews : [];
      newsList = [...trending, ...updates];
    }

    const newsItem = newsList[parseInt(index)];

    if (!newsItem) {
      alert("News item not found.");
      return;
    }

    //Format description into paragraphs
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
    
    //fallback image logic
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

    //Auto scroll into view only on mobile/tablet
    if (isMobileOrTablet) {
      setTimeout(() => {
        fullView.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
    
    // back button → restore state
    const backButton = fullView.querySelector('.back-button');
    backButton.onclick = () => {
      fullView.remove();
      children.forEach(child => {
        child.style.display = ''; // restores previous display
      });

      //restore first & third layers only if mobile/tablet
      if (isMobileOrTablet) {
        document.body.classList.remove("full-view-active");
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





document.addEventListener("DOMContentLoaded", () => {
  ["trending-stories", "newsUpdate-stories", "sliderNews-stories"].forEach(sectionId => {
    loadNews(sectionId, `${API_BASE}/api/sports-summaries`);
  });
});
                                                                                                                                                                                                                                                                                                                                                                                               

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      
// function to fetch top scorer

//Utility: Normalize player names into safe filenames
function normalizeNameForAsset(name) {
  if (!name) return "default-player";

  return name
    .normalize("NFD")                  // Decompose accents (Á -> A + ́)
    .replace(/[\u0300-\u036f]/g, "")   // Remove diacritics
    .replace(/[^a-zA-Z0-9]/g, "")      // Remove spaces & special chars
    .trim();
}


//Main function to fetch topscorers
async function fetchTopScorers() {
  try {
    const response = await fetch(`${API_BASE}/api/topscorers`);
    const topScorers = await response.json();

    //Check if backend returned an array
    if (!Array.isArray(topScorers)) {
      console.error("Invalid data from backend:", topScorers);
      return;
    }

    const playersContainer = document.querySelector(".players-container");
    const dotsContainer = document.querySelector(".slider-dots");

    if (!playersContainer || !dotsContainer) {
      console.error("Slider container elements not found.");
      return;
    }

    playersContainer.innerHTML = "";
    dotsContainer.innerHTML = "";

    let playerIndex = 0;
    let playerElements = [];

    for (const scorer of topScorers) {
      const playerName = scorer.player || "Unknown Player";
      const goals = scorer.goals || 0;
      const teamName = scorer.team || "Unknown Team";
      const apiImage = scorer.image;

      // Normalize + fallback
      const safeName = normalizeNameForAsset(playerName);
      const imgSrc = apiImage && apiImage.trim() !== ""
        ? apiImage
        : `assets/players/${safeName}.png`;

           console.log(`Player: ${playerName}, Image Path: ${imgSrc}`);

      const playerItem = document.createElement("div");
      playerItem.classList.add("player-item");
      if (playerIndex === 0) playerItem.classList.add("active");

      playerItem.innerHTML = `
        <div class="player-image">
          <img src="${imgSrc}" alt="${playerName}"
               onerror="this.onerror=null;this.src='assets/images/avatar.png';">
        </div>
        <div class="players-data">
          <div class="player-name">${playerName}</div>
          <div class="goals">${goals} Goals</div>
          <div class="team-name">${teamName}</div>
          <div class="leagues">${scorer.league}</div>
        </div>
      `;

      playersContainer.appendChild(playerItem);
      playerElements.push(playerItem);

      // Slider dots
      const dot = document.createElement("span");
      dot.classList.add("dot");
      if (playerIndex === 0) dot.classList.add("active-dot");

      dot.addEventListener("click", () => setActiveSlide(playerIndex));
      dotsContainer.appendChild(dot);

      playerIndex++;
    }

    if (playerElements.length <= 1) {
      dotsContainer.style.display = "none"; 
    } else {
     dotsContainer.style.display = "flex";
    }


    if (playerElements.length > 0) {
      startSlider(playerElements);
    }
  } catch (err) {
    console.error("Error fetching top scorers:", err);
  }
}



// Slider functionality
let currentPlayer = 0;
let players = [];
let dots = [];
let sliderInterval;

function startSlider() {
    players = document.querySelectorAll(".player-item");
    dots = document.querySelectorAll(".dot");

    if (players.length === 0) return;

    sliderInterval = setInterval(showNextPlayer, 3000);
}

function showNextPlayer() {
    players.forEach(player => player.classList.remove("active"));
    dots.forEach(dot => dot.classList.remove("active-dot"));

    players[currentPlayer].classList.add("active");
    dots[currentPlayer].classList.add("active-dot");

    currentPlayer = (currentPlayer + 1) % players.length;
}


function setActiveSlide(index) {
    clearInterval(sliderInterval); // Stop automatic sliding
    currentPlayer = index;
    showNextPlayer();
    sliderInterval = setInterval(showNextPlayer, 5000); // Restart auto-slide
}

// Fetch top scorers on page load
document.addEventListener("DOMContentLoaded", fetchTopScorers);



//league table for 5 team beased on ranking

const DEFAULT_LEAGUE_ID = 152; // Premier League
const BACKUP_LEAGUE_IDS = [168, 169]; 

// Get the active league ID based on date
async function getActiveLeagueId() {
  try {
    const leagues = await fetch(`${API_BASE}/api/leagues`).then(r => r.json());
    const now = new Date();

    //Club World Cup in existing league data
    const club = leagues.find(l => l.league_name.includes("FIFA Club World Cup"));
    if (club) {
      const start = new Date(club.season_start);
      const end = new Date(club.season_end);
      if (now >= start && now <= end) return club.league_id;
    }

    //other backup leagues
    for (let id of BACKUP_LEAGUE_IDS) {
      const backupLeague = leagues.find(l => l.league_id == id);
      if (backupLeague) {
        const start = new Date(backupLeague.season_start);
        const end = new Date(backupLeague.season_end);
        if (now >= start && now <= end) return id;
      }
    }

    //Default to Premier League
    return DEFAULT_LEAGUE_ID;

  } catch (err) {
    console.error("Error determining league ID:", err);
    return DEFAULT_LEAGUE_ID;
  }
}


// Render the top 5 standings for a league
async function fetchTopFourStandings(leagueId) {
  try {
    const response = await fetch(`${API_BASE}/api/topstandings/${leagueId}`);
    const data = await response.json();

    const leagueTableDemo = document.querySelector(".league-table-demo");

    if (!Array.isArray(data) || data.length === 0) {
      leagueTableDemo.innerHTML = `<p>No data available for this league.</p>`;
      return;
    }

    const topFive = data.slice(0, 5);

    let tableHTML = `
      <h3 class="league-title">${topFive[0]?.league_name || "League Standings"}</h3>
      <div class="table-header">
        <span class="team-head">Team</span>
        <span class="stats-header">W</span>
        <span class="stats-header">D</span>
        <span class="stats-header">L</span>
        <span class="stats-header">GA</span>
        <span class="stats-header">GD</span>
        <span class="stats-header">PTS</span>
      </div>
    `;

    topFive.forEach(team => {
      const badge = team.team_badge || "/assets/images/default-logo.png";
      const gd = (team.overall_league_GF - team.overall_league_GA) || 0;

      tableHTML += `
        <div class="team-row">
          <div class="team-info">
            <img src="${badge}" alt="${team.team_name}" class="team-logo">
            <span class="teamName-header">${team.team_name}</span>
          </div>
          <span class="team-stats">${team.overall_league_W || 0}</span>
          <span class="team-stats">${team.overall_league_D || 0}</span>
          <span class="team-stats">${team.overall_league_L || 0}</span>
          <span class="team-stats">${team.overall_league_GA || 0}</span>
          <span class="team-stats">${gd}</span>
          <span class="team-stats">${team.overall_league_PTS || 0}</span>
        </div>
      `;
    });

    leagueTableDemo.innerHTML = tableHTML;

  } catch (error) {
    console.error("Error fetching standings:", error);
    document.querySelector(".league-table-demo").innerHTML = `<p>Error loading league standings.</p>`;
  }
}

// Run it on load
(async () => {
  const activeLeagueId = await getActiveLeagueId();
  console.log("Using league ID:", activeLeagueId);
  fetchTopFourStandings(activeLeagueId);
})();



// middle hero banner header slider
let currentIndex = 0;
let autoRotate;

// Create dots dynamically
function createDots() {
  const slides = document.querySelectorAll(".header-slider .slider-content");
  const sliderBox = document.querySelector(".header-slider .slider-box");
  sliderBox.innerHTML = ""; // clear old dots

  slides.forEach((_, i) => {
    const dot = document.createElement("div");
    dot.classList.add("slider-dot");
    if (i === currentIndex) dot.classList.add("active");
    dot.addEventListener("click", () => {
      currentIndex = i;
      showSlide(currentIndex);
      resetAutoplay();
    });
    sliderBox.appendChild(dot);
  });
}

function initSlider() {
  createDots();
  showSlide(currentIndex);
  startAutoplay();

  //Bind arrows dynamically with fresh slides count
  const leftArrow = document.querySelector(".slider-arrow.left");
  const rightArrow = document.querySelector(".slider-arrow.right");

  if (leftArrow) {
    leftArrow.addEventListener("click", () => {
      const slides = document.querySelectorAll(".header-slider .slider-content");
      currentIndex = (currentIndex - 1 + slides.length) % slides.length;
      showSlide(currentIndex);
      resetAutoplay();
    });
  }

  if (rightArrow) {
    rightArrow.addEventListener("click", () => {
      const slides = document.querySelectorAll(".header-slider .slider-content");
      currentIndex = (currentIndex + 1) % slides.length;
      showSlide(currentIndex);
      resetAutoplay();
    });
  }
}

// Autoplay
function startAutoplay() {
  autoRotate = setInterval(() => {
    const slides = document.querySelectorAll(".header-slider .slider-content");
    currentIndex = (currentIndex + 1) % slides.length;
    showSlide(currentIndex);
  }, 4000);
}

function resetAutoplay() {
  clearInterval(autoRotate);
  startAutoplay();
}

// Show slide
function showSlide(index) {
  const slides = document.querySelectorAll(".header-slider .slider-content");
  const dots = document.querySelectorAll(".slider-box .slider-dot");
  if (!slides.length) return;

  slides.forEach((slide, i) => {
    if (i === index) {
      slide.classList.add("active");
      slide.classList.remove("exit-left");
    } else if (slide.classList.contains("active")) {
      slide.classList.remove("active");
      slide.classList.add("exit-left");
      setTimeout(() => slide.classList.remove("exit-left"), 800);
    } else {
      slide.classList.remove("active", "exit-left");
    }
  });

  dots.forEach((dot, i) => {
    dot.classList.toggle("active", i === index);
  });
}


document.addEventListener("DOMContentLoaded", initSlider);


//function to display matches for the middle layers in home page

let currentCategory = "live";
let currentSelectedDate = null;
let selectedDate = null;
let matchesData = { live: [], highlight: [], upcoming: [], allHighlights: [] };

// Function to get today's date
function getTodayDate(offset = 0) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return date.toISOString().split("T")[0];
}

const { DateTime } = luxon;

// Convert a match date/time string to a Luxon DateTime in Berlin time
function getBerlinTime(dateStr, timeStr) {
  return DateTime.fromFormat(
    `${dateStr} ${timeStr}`,
    "yyyy-MM-dd HH:mm",  
    { zone: "Europe/Berlin" }
  );
}


// Convert Berlin time to the user's local timezone
function convertToUserLocalTime(berlinTime) {
  return berlinTime.setZone(DateTime.local().zoneName);
}

// Format match time for display in local time
function formatToUserLocalTime(dateStr, timeStr) {
  try {
    return convertToUserLocalTime(getBerlinTime(dateStr, timeStr)).toFormat("HH:mm"); 
    // "07:00", "13:30", "16:45" etc.
  } catch {
    return "TBD";
  }
}


// Calculate minutes since match start
function getMinutesSince(dateStr, timeStr) {
  try {
    const now = DateTime.local();
    const matchLocal = convertToUserLocalTime(getBerlinTime(dateStr, timeStr));
    return Math.max(0, Math.floor(now.diff(matchLocal, "minutes").minutes));
  } catch {
    return 0;
  }
}


//function to fetch matches for middle layer
async function fetchMatchesData() {
  const spinner = document.getElementById("matches-spinner");
  try {
    spinner.style.display = "block";

    const response = await fetch(`${API_BASE}/api/all_matches`);
    const data = await response.json();

    
    matchesData = {
      live: data.live || [],
      upcoming: data.upcoming || [],
      highlight: data.highlight || [],
      allHighlights: data.highlight || []  
    };

       // Pick starting category
        if (matchesData.live.length > 0) {
            currentCategory = "live";
        } else if (matchesData.upcoming.length > 0) {
            currentCategory = "upcoming";
        } else if (matchesData.highlight.length > 0) {
            currentCategory = "highlight";
        } else {
            currentCategory = "live"; // default fallback
        }

        // ⚡ Safeguard: if no matches today for the chosen category, auto-shift to upcoming
        const today = getTodayDate();
        const { selectedMatches } = getMatchesForCategory(matchesData, currentCategory, today);

        if (selectedMatches.length === 0 && currentCategory === "live" && matchesData.upcoming.length > 0) {
            currentCategory = "upcoming";
        }

    //Render matches
    showMatches(matchesData, currentCategory);

  } catch (error) {
    console.error("Error fetching match data:", error);
    document.querySelector(".matches-container").innerHTML = `<p>Failed to load matches. Please refresh.</p>`;
  } finally {
    spinner.style.display = "none";
  }
}


// Calculate live match minute display
function formatLiveMinute(dateStr, timeStr, matchStatus = "") {
  try {
    const minutesElapsed = getMinutesSince(dateStr, timeStr);

    // Handle halftime directly
    if (matchStatus?.toLowerCase() === "halftime") return "HT";

    if (minutesElapsed <= 45) {
      return `${minutesElapsed}'`;
    } else if (minutesElapsed > 45 && minutesElapsed < 60) {
      // First-half injury time (e.g., 45+3)
      return `45+${minutesElapsed - 45}'`;
    } else if (minutesElapsed <= 90) {
      return `${minutesElapsed}'`;
    } else if (minutesElapsed > 90 && minutesElapsed <= 105) {
      // Second-half injury time (e.g., 90+4)
      return `90+${minutesElapsed - 90}'`;
    } else if (minutesElapsed > 105 && minutesElapsed <= 120) {
      // Extra time (show as ET)
      return `ET ${minutesElapsed}'`;
    } else if (minutesElapsed > 120) {
      return "PEN"; // Penalties
    } else {
      return `${minutesElapsed}'`;
    }
  } catch {
    return "";
  }
}


//funtion to render matches
function showMatches(matchesData, category) {
  currentCategory = category;
  const matchesContainer = document.querySelector(".matches-container");
  if (!matchesContainer) return;

   if (!currentSelectedDate) {
      currentSelectedDate = getTodayDate();
     }

    const { selectedMatches, dateToShow } = getMatchesForCategory(matchesData, category, currentSelectedDate);

     //update currentSelectedDate if we are NOT in highlight
     if (category !== "highlight") {
       currentSelectedDate = dateToShow;
     } 
 
  //key leagues to display first
  const preferredLeagues = [
  { name: "Premier League", country: "England" },
  { name: "La Liga", country: "Spain" },
  { name: "Bundesliga", country: "Germany" },
  { name: "UEFA Champions League", country: "eurocups" },
  { name: "UEFA Europa League", country: "eurocups" },
  { name: "UEFA Europa Conference League", country: "eurocups" },
  { name: "Serie A", country: "Italy" },
  { name: "NPFL", country: "Nigeria" },
  { name: "FIFA World Cup", country: "World" },
  { name: "UEFA Euro", country: "eurocups" },
  { name: "AFCON", country: "Africa" },
  { name: "Gold Cup", country: "North America" },
  { name: "Asian Cup", country: "Asia" }
 ];


  //Sorting helper for league priority
 const getPriority = (m) => {
  const index = preferredLeagues.findIndex(
    l => l.name === m.league_name && l.country === m.country_name
  );
  return index === -1 ? Infinity : index;
};


// Sort matches based on category
let sortedMatches = selectedMatches.sort((a, b) => {
  const priorityDiff = getPriority(a) - getPriority(b);
  if (priorityDiff !== 0) return priorityDiff;

  const dateA = getBerlinTime(a.match_date, a.match_time);
  const dateB = getBerlinTime(b.match_date, b.match_time);

  if (!dateA.isValid || !dateB.isValid) {
    // fallback to keep stable order if parsing failed
    return 0;
  }

  if (category === "live") {
    // Live: Latest → Earliest
    return dateB.toMillis() - dateA.toMillis();
  } else if (category === "highlight") {
    //Highlight: Latest finished match → Earliest
    return dateB.toMillis() - dateA.toMillis();
  } else {
    //Upcoming: Earliest → Latest
    return dateA.toMillis() - dateB.toMillis();
  }
});


  let html = "";
  const MAX_MATCHES = 5;
  let displayedMatchCount = 0;

  html += `<div class="match-category-content">`;

  // Category buttons
  html += `
    <div class="matches-header">
      <div class="match-category-btn ${category === 'live' ? 'active' : ''}" onclick="filterMatchesCategory('live')">Live</div>
      <div class="match-category-btn ${category === 'highlight' ? 'active' : ''}" onclick="filterMatchesCategory('highlight')">Highlight</div>
      <div class="match-category-btn ${category === 'upcoming' ? 'active' : ''}" onclick="filterMatchesCategory('upcoming')">Upcoming</div>
      <div class="calendar-wrapper" style="position: relative;">
        <div class="match-category-btn calendar" onclick="document.getElementById('match-date').click()">
          <div class="calendar-icon">
            <div class="calendar-header"></div>
            <div id="calendar-day" class="calendar-day"></div>
          </div>
        </div>
        <input type="text" id="match-date" style="display:none;">
      </div>
    </div>`;

     if (sortedMatches.length === 0) {
    html += `<p class="no-matches-msg">No ${category} matches found.</p>`;
    html += `</div>`;
   matchesContainer.innerHTML = html;

    const dayEl = document.getElementById("calendar-day");
          if (dayEl && currentSelectedDate) {
             const dateObj = luxon.DateTime.fromISO(currentSelectedDate);
             dayEl.textContent = dateObj.toFormat("d");
          }

        // Always update calendar-day
        setTodayInCalendar();
   initCalendarPicker(category); 

   return;
 }

  //Display matches (priority leagues first, max 5)
  for (const match of sortedMatches) {
    if (displayedMatchCount >= MAX_MATCHES) break;

    const matchBerlin = getBerlinTime(match.match_date, match.match_time);
    const matchLocal = convertToUserLocalTime(matchBerlin);

    const matchDay = matchLocal.toFormat("MMM d");
    const country = match.country_name?.trim() || "Unknown Country";
    const score1 = match.match_hometeam_score || "0";
    const score2 = match.match_awayteam_score || "0";
    const matchRound = match.league_round || "";

    let scoreDisplay = "";
    let matchStatusDisplay = "";
    let formattedTime = "";

    if (category === "live") {
      const matchMinute = formatLiveMinute(match.match_date, match.match_time, match.match_status);

      scoreDisplay = `<div class="match-score">${score1} - ${score2}</div>`;
      formattedTime = `
        <div class="live-indicator">
          <span class="red-dot"></span>
           ${matchMinute}
        </div>`;
    } else if (category === "highlight") {
      matchStatusDisplay = `<h5>FT</h5>`;
     scoreDisplay = `
   <div class="match-score">
      <span>${score1}</span>
      <span>${score2}</span>
    </div>
   `;

      formattedTime = `
        <div class="time-date-col">
          <span class="time">${formatToUserLocalTime(match.match_date, match.match_time)}</span>
        </div>`;
    } else if (category === "upcoming") {
      matchStatusDisplay = `<h5>vs</h5>`;
      formattedTime = `
        <div class="time-date-col">
          <span class="time">${formatToUserLocalTime(match.match_date, match.match_time)}</span>
        </div>`;
    }

    html += `
      <div class="match-details" data-match-id="${match.match_id}" onclick="displayLiveMatch('${match.match_id}', '${category}')">
      
        <div class="match-time">${formattedTime}</div>
        <div class="matches-dat">
          <div class="Matchteam">
            <img src="${match.team_home_badge}" alt="${match.match_hometeam_name} Logo">
            <span>${match.match_hometeam_name}</span>
          </div>
          
          <div class="Matchteam">
            <img src="${match.team_away_badge}" alt="${match.match_awayteam_name} Logo">
            <span>${match.match_awayteam_name}</span>
          </div>
          </div>

           <div class="match-status-score">
            ${scoreDisplay}
            ${matchStatusDisplay}
          </div>
         
        <div class="match-time-country">
          <div class="match-country"><img src="/assets/icons/map-pin.png"> ${country}</div>
          ${matchRound ? `<div class="match-round"><img src="/assets/icons/trophy.png"> ${matchRound}</div>` : ""}
        </div>
      
        <div class="match-btn">  
          <button class="view-details-btn" data-match-id="${match.match_id}" data-category="${category}">
            <img src="/assets/icons/arrow-up.png" alt="Round">
          </button>
        </div>
      </div>`;
    displayedMatchCount++;
  }

  html += `</div>`;
  matchesContainer.innerHTML = html;
   history.replaceState({ type: "matches", category }, "", "#matches");

    // Add "View Details" button listeners
  document.querySelectorAll('.view-details-btn').forEach(btn => {
    btn.addEventListener('click', function (event) {
      event.stopPropagation(); // Prevent parent .match-details click
      const matchId = this.getAttribute('data-match-id');
      const category = this.getAttribute('data-category');
      displayLiveMatch(matchId, category);
    });
  });

    const dayEl = document.getElementById("calendar-day");
    if (dayEl) {
    const dateObj = luxon.DateTime.fromISO(dateToShow);
    dayEl.textContent = dateObj.toFormat("d");
   }
  initCalendarPicker(category);
}

    
function getMatchesForCategory(matchesData, category, date) {
    let dateToShow = date || getTodayDate();
    let selectedMatches = matchesData[category] || [];

    selectedMatches = selectedMatches
        .filter(m => m.match_date === dateToShow)
        .sort((a, b) => a.match_time.localeCompare(b.match_time));

    // --- Special case for highlight ---
    if (category === "highlight" && selectedMatches.length === 0) {
        const pastDates = matchesData.highlight
            .map(m => m.match_date)
            .filter(d => d <= getTodayDate())
            .sort((a, b) => b.localeCompare(a)); // descending

        if (pastDates.length > 0) {
            //Only override the local dateToShow for highlight
            const highlightDate = pastDates[0];
            selectedMatches = matchesData.highlight
                .filter(m => m.match_date === highlightDate)
                .sort((a, b) => a.match_time.localeCompare(b.match_time));

            return { selectedMatches, dateToShow: highlightDate };
        }
    }

    return { selectedMatches, dateToShow };
}


  
 // Calendar Functions
function getAvailableMatchDates() {
  return [
    ...matchesData.live.map(m => m.match_date),
    ...matchesData.highlight.map(m => m.match_date),
    ...matchesData.upcoming.map(m => m.match_date)
  ];
}

// Initialize Flatpickr
function initCalendarPicker() {
    const matchDateInput = document.getElementById("match-date");
    const calendarWrapper = document.querySelector(".calendar-wrapper");
    if (!matchDateInput || !calendarWrapper) return;

    if (!matchDateInput._flatpickr) {
        flatpickr(matchDateInput, {
         dateFormat: "Y-m-d",
         defaultDate: currentSelectedDate || getTodayDate(),
         enable: getAvailableMatchDates(),
         appendTo: calendarWrapper,
         position: "below left",
         onChange: (dates, dateStr) => {
          if (!dateStr) return;

           currentSelectedDate = dateStr;

          //Update the calendar icon immediately
           const dayEl = document.getElementById("calendar-day");
          if (dayEl) {
            const dateObj = luxon.DateTime.fromISO(dateStr);
            dayEl.textContent = dateObj.toFormat("d"); // Only day number
          }


          //Filter matches for the selected date
          filterByDate(currentCategory, dateStr);
       }
     });
    } else {
        matchDateInput._flatpickr.set("enable", getAvailableMatchDates());
    }

    const calendarBtn = document.querySelector(".calendar");
    if (calendarBtn) {
        calendarBtn.addEventListener("click", () => {
            matchDateInput._flatpickr.open();
        });
    }
}


// Update filterByDate to accept selected date
function filterByDate(category, selectedDate) {
    if (!selectedDate) selectedDate = getTodayDate();

    const { dateToShow } = getMatchesForCategory(matchesData, category, selectedDate);

    //Keep global currentSelectedDate
    if (category !== "highlight") {
        currentSelectedDate = dateToShow;
    }

    setCalendarDate(currentSelectedDate);
    showMatches(matchesData, category);
}



  //calender function
  function setTodayInCalendar() {
    const today = getTodayDate();
    const dayEl = document.getElementById("calendar-day");
    const inputEl = document.getElementById("match-date");

    // Only set today if currentSelectedDate is null
    if (!currentSelectedDate) {
        currentSelectedDate = today;
        if (dayEl) dayEl.textContent = luxon.DateTime.fromISO(today).toFormat("d");
        if (inputEl) inputEl.value = today;
    }

    // Rollover for next day
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setHours(24, 0, 0, 0);

    if (window.calendarRolloverTimer) clearTimeout(window.calendarRolloverTimer);
    window.calendarRolloverTimer = setTimeout(setTodayInCalendar, tomorrow - now + 1000);
}

function setCalendarDate(dateStr) {
    if (!dateStr) return;
    const dayEl = document.getElementById("calendar-day");
    const inputEl = document.getElementById("match-date");

    if (dayEl) {
        const dateObj = luxon.DateTime.fromISO(dateStr);
        dayEl.textContent = dateObj.toFormat("d"); // Only day number
    }
    if (inputEl) inputEl.value = dateStr;

    currentSelectedDate = dateStr; // Store globally
}

function filterMatchesCategory(category) {
    currentCategory = category;
    document.querySelectorAll(".match-category-btn").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".match-category-btn").forEach(btn => {
        if (btn.textContent.toLowerCase() === category) btn.classList.add("active");
    });

    filterByDate(category, currentSelectedDate || getTodayDate());
}


// Function to fetch match video 
async function fetchMatchVideo(matchId, homeTeam, awayTeam) {
  try {
    let response = await fetch(
      `${API_BASE}/api/videos/${matchId}?homeTeam=${encodeURIComponent(homeTeam)}&awayTeam=${encodeURIComponent(awayTeam)}`
    );
    let data = await response.json();

    console.log("Video Data:", data);

    // Return embed code if available
    return data.embed || null;
  } catch (error) {
    console.error("Error fetching match video:", error);
    return null;
  }
}



// Function to display match details with video
async function displayLiveMatch(matchId, category) {
    if (!matchesData[category] || matchesData[category].length === 0) {
        console.error(`No matches found for category: ${category}`);
        return;
    }

    let match = matchesData[category].find(m => m.match_id === matchId);

    // Fallback to allHighlights for highlight category
    if (!match && category === "highlight") {
        match = matchesData.allHighlights.find(m => m.match_id === matchId);
    }

    if (!match) {
        console.error(`Match with ID ${matchId} not found in ${category}`);
        document.querySelector(".match-detail").innerHTML = `
            <div class="no-video">
                <p>Match details not found.</p>
            </div>`;
        return;
    }

   
    let videoEmbed = await fetchMatchVideo(
         matchId,
         match.match_hometeam_name,
         match.match_awayteam_name
        );

    console.log("Video Data:", videoEmbed);

    let matchesContainer = document.querySelector(".matches-container");

    const teamHTML = `
        <div class="live-match-team">
            <img src="${match.team_home_badge || `/assets/images/default-team.png`}" alt="${match.match_hometeam_name} Logo">
            <span>${match.match_hometeam_name}</span>
        </div>
        <div class="match-time-scores">
            <h3 class="league-name">${match.league_name}</h3>
            <div class="scores">${match.match_hometeam_score ?? '-'} - ${match.match_awayteam_score ?? '-'}</div>
            <div class="live-match-status">
            ${match.match_status === "LIVE" 
                ? `<div class="match-status-icon"></div>` 
                : `<div class="match-status-icon"></div>`}
              
                <div class="live-match-time">${match.match_status}</div>
            </div>
        </div>
        <div class="live-match-team">
            <img src="${match.team_away_badge || '/assets/images/default-team.png'}" alt="${match.match_awayteam_name} Logo">
            <span>${match.match_awayteam_name}</span>
        </div>`;

    const tabHTML = `
        <div class="match-tabs">
            <button class="tab-btn active" data-tab="info">Info</button>
            <button class="tab-btn" data-tab="lineups">Line-ups</button>
            <button class="tab-btn" data-tab="h2h">H2H</button>
            <button class="tab-btn" data-tab="statistics">Statistics</button>
            <button class="tab-btn" data-tab="standing">Standing</button>
        </div>`;

    const adHTML = `<div class="ad5-logo"><h5>Advertisement</h5></div>`;

    const contentHTML = `
        <div class="live-match-info">
            ${tabHTML}
            ${adHTML}
            <div class="tab-content" id="tab-content">${getTabContent("info", match)}</div>
        </div>`;

      matchesContainer.innerHTML = `
        <div class="live-match">
         ${videoEmbed ? cleanVideoEmbed(videoEmbed) : `<div class="no-video-message">No video available</div>`}
        <div class="live-match-teams">${teamHTML}</div>
        ${contentHTML}
       </div>`;


        // Hide the header slider when showing match details
        const headerSlider = document.querySelector('.header-slider');
          if (headerSlider) {
            headerSlider.style.display = 'none';
           }

            // Hide the header slider when showing match details
        const newspodcastwrapper = document.querySelector('.news-podcast-wrapper');
          if (newspodcastwrapper) {
            newspodcastwrapper.style.display = 'none';
           }

            history.pushState({ type: "match", matchId, category }, "", `#match-${matchId}`);

    // Attach tab click events
    document.querySelectorAll(".tab-btn").forEach(button => {
        button.addEventListener("click", function () {
            document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
            this.classList.add("active");
    
            const tabContentDiv = document.getElementById("tab-content");
            if (!tabContentDiv) {
                console.error("ERROR: #tab-content div not found!");
                return;
            }
    
            //Pass APIkey to getTabContent
            const tab = this.dataset.tab;
            tabContentDiv.innerHTML = getTabContent(tab, match);
    
    
            if (tab === "lineups") {
                // Only render formation after the tab is active
                fetchAndRenderLineups(match.match_id);
              }
        });
    });
    
    

      // Inject CSS spinner animation if not already present
      if (!document.getElementById("spinner-style")) {
        const spinnerStyle = document.createElement("style");
        spinnerStyle.id = "spinner-style";
        spinnerStyle.innerHTML = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }`;
        document.head.appendChild(spinnerStyle);
    }
}

  

    // Function to update tab content dynamically
    function getTabContent(tab, match) {
        const renderPlayers = (players) =>
            players?.length
                ? players.map(player => `
                    <li>
                        <span class="listed-player-number">${player.lineup_number || "-"}</span>
                        <span class="listed-player-name">${player.lineup_player || "Unknown"}</span>
                    </li>`).join("")
                : `<li><em>No data available</em></li>`;

        switch (tab) {
            case "info":
                return `
                    <div class="info-match-container">
                        <h3>Match Info</h3>
                        <div class="info-teamNames">
                            <h4>${match.match_hometeam_name}</h4><span>vs</span><h4>${match.match_awayteam_name}</h4>
                        </div>
                        <div class="infoMatch-details">
                            <div class="infoLeft-wing">
                                <p><strong><img src="/assets/icons/arrow-colorIcon.png" class="info-colorIcon"></strong> ${match.match_time}</p>
                                <p><strong><img src="/assets/icons/calender-colorIcon.png" class="info-colorIcon"></strong> ${match.match_date}</p>
                            </div>
                            <div class="infoRight-wing">
                                <p><strong><img src="/assets/icons/gprIcon.png" class="info-colorIcon" alt="Venue icon"></strong> ${match.stadium || "Not available"}</p>
                                <p><strong><img src="/assets/icons/locationIcon.png" class="info-colorIcon"></strong> ${match.country_name || "Not available"}</p>
                            </div>
                        </div>
                    </div>
                `;

            case "lineups":
                return `
                    <div class="lineUpsteams-container">
                        <div class="lineUpsteam-info">
                            <img src="${match.team_home_badge}" alt="${match.match_hometeam_name}" class="lineUpsteam-logo">
                            <div class="team-formation">
                                <h3>${match.match_hometeam_name}</h3>
                                <h4>${match.match_hometeam_system || "NA"}</h4>
                            </div>
                        </div>
                        <div class="lineUpsteam-info">
                            <div class="team-formation">
                                <h3>${match.match_awayteam_name}</h3>
                                <h4>${match.match_awayteam_system || "NA"}</h4>
                            </div>
                            <img src="${match.team_away_badge}" alt="${match.match_awayteam_name}" class="lineUpsteam-logo">
                        </div>
                    </div>

                  <div id="football-field-wrapper">
                   <div id="football-field" class="field">
                     <!-- Center line and circle -->
                     <div class="center-line"></div>
                     <div class="center-circle"></div>
                     <!-- Left Goal and Penalty Area -->
                     <div class="penalty-arc left-arc"></div>
                     <div class="penalty-arc right-arc"></div>
                     <div class="penalty-box left-box"></div>
                     <div class="penalty-box right-box"></div>
                     <div class="goal left-goal"></div>
                     <div class="goal right-goal"></div>  
                    </div>
                    </div>

                    <div class="lineup-players-names">
                        <h4>Players</h4>
                        <div class="lineUp-cont">
                            <div class="lineup-home-players">
                                <h4>${match.match_hometeam_name}</h4>
                                <ul>${renderPlayers(match.lineup?.home?.starting_lineups)}</ul>
                                <h4>Substitutes</h4>
                                <ul>${renderPlayers(match.lineup?.home?.substitutes)}</ul>
                                <h4>Coach</h4>
                                <ul>${renderPlayers(match.lineup?.home?.coach)}</ul>
                            </div>
                            <div class="lineup-away-players">
                                <h4>${match.match_awayteam_name}</h4>
                                <ul>${renderPlayers(match.lineup?.away?.starting_lineups)}</ul>
                                <h4>Substitutes</h4>
                                <ul>${renderPlayers(match.lineup?.away?.substitutes)}</ul>
                                <h4>Coach</h4>
                                <ul>${renderPlayers(match.lineup?.away?.coach)}</ul>
                            </div>
                        </div>
                    </div>
                `;

             case "h2h":
                console.log("📦 Full match object for H2H:", match);

               if (match.match_hometeam_name && match.match_awayteam_name) {
               setTimeout(() => loadH2HData(match.match_hometeam_name, match.match_awayteam_name, 10), 0);
            }

         return `
           <div class="h2h-header">
             <h3>H2H</h3>
             <h4>${match.match_hometeam_name}</h4>
             <h4>${match.match_awayteam_name}</h4>
          </div>
          <div class="h2h-header-line"></div>
          <div class="spinner" id="h2h-spinner"></div>
         <div class="h2h-matches-container" id="h2h-matches"></div>
        `;

                case "statistics":
                    // Trigger statistics loading before returning the UI container
                    loadMatchStatistics(match.match_id, match);
                    return `
                        <div class="statistics-container">
                            <h3>Match Statistics</h3>
                            <div class="h2h-header-line"></div>
                            <div class="statisticTeam-name">
                                <h4>${match.match_hometeam_name}</h4>
                                <span>vs</span>
                                <h4>${match.match_awayteam_name}</h4>
                            </div>
                            <div class="spinner" id="statistics-spinner"></div>
                            <div class="statistics-list"></div>
                        </div>
                    `;

                    case "standing":
        //Load standing and highlight teams
        setTimeout(() => loadStandings(match), 0); 
        return `
            <div class="standing-header">                         
                <div class="standings-wrapper">
                    <div class="spinner" id="standing-spinner"></div>
                    <div class="standings-table-container" id="standing-table"></div>
                </div>
            </div>
        `;

            default:
                return "<p>No data available.</p>";
        }
    }


//function to load statistic
async function loadMatchStatistics(match_id, match) {
    try {
        const response = await fetch(`${API_BASE}/api/match/statistics?matchId=${match_id}`);
        const data = await response.json();
        const stats = data.statistics || [];

        document.getElementById("statistics-spinner").style.display = "block";
        document.querySelector(".statistics-list").innerHTML = "";

        const statIcons = {
            "Shots Total": "🎯", "Shots On Goal": "🥅", "Shots Off Goal": "🚫", "Shots Blocked": "🛡️",
            "Shots Inside Box": "📦", "Shots Outside Box": "📤", "Fouls": "⚠️", "Corners": "🚩",
            "Offsides": "⛳", "Ball Possession": "🕑", "Yellow Cards": "🟨", "Saves": "🧤",
            "Passes Total": "🔁", "Passes Accurate": "✅"
        };

        const statsHTML = stats.map(stat => `
            <div class="stat-comparison-row">
                <div class="stat-home">${stat.home}</div>
                <div class="stat-label">
                    ${statIcons[stat.type] || "📊"} ${stat.type}
                </div>
                <div class="stat-away">${stat.away}</div>
            </div>
        `).join("");

        document.querySelector(".statistics-list").innerHTML = statsHTML;
        document.getElementById("statistics-spinner").style.display = "none";

    } catch (error) {
        console.error("📉 Statistics Fetch Error:", error);
        document.getElementById("statistics-spinner").style.display = "none";
    }
}


//function to get h2h

function renderMatchesByLeague(matches) {
  if (!matches.length) return "<p>No matches available.</p>";

  // group matches by league_name
  const grouped = matches.reduce((acc, match) => {
    const league = match.league_name || "Other Competitions";
    if (!acc[league]) acc[league] = [];
    acc[league].push(match);
    return acc;
  }, {});

  let html = "";

  Object.keys(grouped).forEach(league => {
    html += `<h3 class="h2h-league">${league}</h3>`;
    grouped[league].forEach(match => {
      html += `
        <div class="h2h-match">
          <div class="h2hmatch-row">
            <div class="h2hteams-column">
              <div class="h2h-match-meta">
                <p class="h2h-match-date">${match.match_date}</p>
                <p class="h2h-match-time">${
                  (!isNaN(parseInt(match.match_hometeam_score)) &&
                   !isNaN(parseInt(match.match_awayteam_score)))
                    ? "FT"
                    : match.match_time
                }</p>
              </div>
              <div class="h2hteam">
                <img src="${match.team_home_badge || '/assets/default.png'}" alt="${match.match_hometeam_name}">
                <span>${match.match_hometeam_name}</span>
              </div>
              <div class="h2hteam">
                <img src="${match.team_away_badge || '/assets/default.png'}" alt="${match.match_awayteam_name}">
                <span>${match.match_awayteam_name}</span>
              </div>
            </div>
            <div class="h2hscores-column">
              <span>${match.match_hometeam_score}</span>
              <span>${match.match_awayteam_score}</span>
            </div>
          </div>
        </div>`;
    });
  });

  return html;
}

function loadH2HData(homeTeam, awayTeam) {
  const spinner = document.querySelector("#h2h-spinner");
  const h2hMatchesContainer = document.querySelector("#h2h-matches");

  if (!spinner || !h2hMatchesContainer) {
    console.error('Missing DOM elements for H2H.');
    return;
  }

  spinner.style.display = "block";

  fetch(`${API_BASE}/api/h2h?homeTeam=${encodeURIComponent(homeTeam)}&awayTeam=${encodeURIComponent(awayTeam)}`)
    .then(res => res.json())
    .then(data => {
      spinner.style.display = "none";

      const h2hArray = data.h2h || [];
      const homeLast = data.homeLast || [];
      const awayLast = data.awayLast || [];

      let content = "";

      // Direct H2H
      if (h2hArray.length) {
        content += `<h2>Head-to-Head</h2>`;
        content += renderMatchesByLeague(h2hArray.slice(0, 5));
      } else {
        content += `<p>No direct H2H data available.</p>`;
      }

      // Home team last 5
      if (homeLast.length) {
        content += `<h2>Last 5 Matches - ${homeTeam}</h2>`;
        content += renderMatchesByLeague(homeLast.slice(0, 5));
      }

      // Away team last 5
      if (awayLast.length) {
        content += `<h2>Last 5 Matches - ${awayTeam}</h2>`;
        content += renderMatchesByLeague(awayLast.slice(0, 5));
      }

      h2hMatchesContainer.innerHTML = content;
    })
    .catch(err => {
      console.error("Error fetching H2H data:", err);
      spinner.style.display = "none";
      h2hMatchesContainer.innerHTML = "<p>Error loading H2H data.</p>";
    });
}



    //function to load standings
    async function loadStandings(match) {
        const tableContainer = document.getElementById("standing-table");
        const spinner = document.getElementById("standing-spinner");
    
        if (!tableContainer) {
            console.error("#standing-table element not found in DOM.");
            return;
        }
    
        try {
            spinner.style.display = "block";
    
            const response = await fetch(`${API_BASE}/api/standings?leagueId=${match.league_id}`);
            const { standings } = await response.json();

            if (!Array.isArray(standings)) {
               throw new Error("Standings data is missing or invalid");
             }
    
            const tableHTML = `
                <table class="standing-table">
                    <thead>
                        <tr>
                            <th>Pos</th><th>Team</th><th>Pl</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${standings.map(team => {
                            const isHome = team.team_name === match.match_hometeam_name;
                            const isAway = team.team_name === match.match_awayteam_name;
                            const highlightTeam = isHome || isAway ? 'highlight-team' : '';
    
                            // Determine class for position coloring only
                            const pos = parseInt(team.overall_league_position);
                            let posClass = '';
                            if (pos >= 1 && pos <= 4) posClass = 'ucl';
                            else if (pos >= 5 && pos <= 6) posClass = 'uel';
                            else if (pos >= data.length - 2) posClass = 'relegated';
    
                            return `
                                <tr class="${highlightTeam}">
                                    <td class="pos-cell ${posClass}">${team.overall_league_position}</td>
                                    <td>${team.team_name}</td>
                                    <td>${team.overall_league_payed}</td>
                                    <td>${team.overall_league_W}</td> 
                                    <td>${team.overall_league_D}</td>
                                    <td>${team.overall_league_L}</td>
                                    <td>${team.overall_league_GF}</td>
                                    <td>${team.overall_league_GA}</td>
                                    <td>${team.overall_league_GF - team.overall_league_GA}</td>
                                    <td>${team.overall_league_PTS}</td>
                                </tr>
                            `;
                        }).join("")}
                    </tbody>
                </table>
            `;
    
            tableContainer.innerHTML = tableHTML;
    
        } catch (err) {
            tableContainer.innerHTML = "<p>Error loading standings</p>";
            console.error("Standings fetch error:", err);
        } finally {
            spinner.style.display = "none";
        }
    }
     
  
// Fetch lineup and dynamically infer formation
function fetchAndRenderLineups(match_id) {
  const containerWrapper = document.getElementById("football-field-wrapper");
  const field = document.getElementById("football-field");

  fetch(`${API_BASE}/api/lineups?matchId=${match_id}`)
    .then(res => res.json())
    .then(({ lineup, match }) => {
      if (!field) {
        console.error("❌ Field container not found!");
        return;
      }

      // Clear old players and messages
      field.querySelectorAll(".player-dot").forEach(dot => dot.remove());
      containerWrapper.querySelectorAll(".no-lineup-message").forEach(msg => msg.remove());

      // ✅ Hide field if match hasn’t started
      if (!match || match.match_status === "Not Started" || match.match_status === "") {
        field.style.display = "none";
        displayNoLineupMessage(containerWrapper, "Lineups will be available when the match starts.");
        return;
      }

      if (!lineup) {
        field.style.display = "none";
        displayNoLineupMessage(containerWrapper, "No lineup data found.");
        return;
      }

      const homePlayers = lineup.home?.starting_lineups ?? [];
      const awayPlayers = lineup.away?.starting_lineups ?? [];

      // ✅ Hide field if no players
      if (homePlayers.length === 0 && awayPlayers.length === 0) {
        field.style.display = "none";
        displayNoLineupMessage(containerWrapper, "No lineup formation available.");
        return;
      }

      const homeFormation =
        parseFormation(match?.match_hometeam_system) ||
        inferFormation(homePlayers, match?.match_hometeam_system);

      const awayFormation =
        parseFormation(match?.match_awayteam_system) ||
        inferFormation(awayPlayers, match?.match_awayteam_system);

      // ✅ Hide field if no valid formation
      if (!homeFormation && !awayFormation) {
        field.style.display = "none";
        displayNoLineupMessage(containerWrapper, "No lineup formation available.");
        return;
      }

      //Show field only if formations exist
      field.style.display = "block";

      if (homeFormation) {
        renderPlayersOnField("home", homePlayers, homeFormation, "home");
      }
      if (awayFormation) {
        renderPlayersOnField("away", awayPlayers, awayFormation, "away");
      }
    })
    .catch(err => {
      console.error("Error fetching lineups:", err);
      if (field) field.style.display = "none";
      displayNoLineupMessage(containerWrapper, "Error loading lineups.");
    });
}


 function displayNoLineupMessage(container, message) {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("no-lineup-message");
    msgDiv.textContent = message;
    msgDiv.style.textAlign = "center";
    msgDiv.style.marginTop = "20px";
    msgDiv.style.color = "#888";
    msgDiv.style.fontSize = "1.2rem";
    container.appendChild(msgDiv);
 }


 //Parse formation from API string only
 function parseFormation(formation) {
    if (!formation || typeof formation !== "string") {
        console.warn("No formation string provided.");
        return null; 
    }

    let parts = formation
        .split("-")
        .map(p => parseInt(p.trim()))
        .filter(n => !isNaN(n));

    let sum = parts.reduce((a, b) => a + b, 0);

    //Handle "1-4-4-2" (goalkeeper included)
    if (sum === 11 && parts[0] === 1) {
        console.log("Formation includes GK, removing leading '1'");
        parts.shift();
        sum = parts.reduce((a, b) => a + b, 0);
    }

    const isValid = parts.every(n => Number.isInteger(n) && n > 0) && sum === 10;

    if (!isValid) {
        console.warn("Malformed formation:", formation, "(sum =", sum, ")");
        return null; 
    }

    console.log(" Parsed formation:", parts);
    return parts;
}


 // Inference: derive formation from lineup_position
 function inferFormation(players, fallbackFormationStr) {
    const outfield = players
     .filter(p => p.lineup_position !== "1")
     .sort((a, b) => parseInt(a.lineup_position) - parseInt(b.lineup_position));


    if (outfield.length === 0 && fallbackFormationStr) {
        return parseFormation(fallbackFormationStr);
    }

    const grouped = {
        defense: [],
        midfield: [],
        attack: [],
        extra: [],
    };

    outfield.forEach(p => {
        const pos = parseInt(p.lineup_position);
        if (pos <= 4) grouped.defense.push(p);
        else if (pos <= 7) grouped.midfield.push(p);
        else if (pos <= 10) grouped.attack.push(p);
        else grouped.extra.push(p);
    });

    const result = [];
    if (grouped.defense.length) result.push(grouped.defense.length);
    if (grouped.midfield.length) result.push(grouped.midfield.length);
    if (grouped.attack.length) result.push(grouped.attack.length);
    if (grouped.extra.length) result.push(grouped.extra.length);

    return result;
}

  //Render player dots based on formation array
  function renderPlayersOnField(team, players, formation, side = "home") {
    const container = document.getElementById("football-field");
    if (!container || !formation) return;

    // 🔑 Always normalize using parseFormation 
    let formationArray = Array.isArray(formation)
     ? formation
    : parseFormation(formation);


    const isHome = side === "home";
    const vertical = false;
  
      // Goalkeeper position
      const goalkeeper = players.find(p => p.lineup_position === "1");
      if (goalkeeper) {
      let gkX, gkY;

      if (vertical) {
      // Field rotated vertically
      gkX = 50; // middle horizontally
      gkY = isHome ? 2 : 98; // sit on top/bottom goal line
    } else {
    // Normal horizontal field
     gkY = 50; // middle vertically
     gkX = isHome ? 6 : 94; // sit on left/right goal line
    }

    const gkDiv = createPlayerDiv({ ...goalkeeper, team_type: side }, gkX, gkY);
    gkDiv.classList.add("goalkeeper"); 
    container.appendChild(gkDiv);
  }


    // Outfield players
    const outfield = players.filter(p => p.lineup_position !== "1");
    let currentIndex = 0;

    formationArray.forEach((playersInLine, lineIndex) => {
        const totalLines = formationArray.length;

        // Calculate line position (X in horizontal, Y in vertical)
      let linePos = ((lineIndex + 1) / (totalLines + 1)) * 40 + 10;

       // Home starts from left side (or top if vertical)
       if (isHome) {
        lineCoord = linePos;
       } else {
        // Away team mirrored but offset closer to opponent goal arc
      lineCoord = 100 - linePos;
     }


        for (let j = 0; j < playersInLine; j++) {
            const spread = ((j + 1) / (playersInLine + 1)) * 100;
            const player = outfield[currentIndex];

            if (player) {
                const x = vertical ? spread : lineCoord;
                const y = vertical ? lineCoord : spread;
                const div = createPlayerDiv({ ...player, team_type: side }, x, y);
                container.appendChild(div);
                currentIndex++;
            }
        }
    });

    //Safety: place leftover players if formation mismatch
    while (currentIndex < outfield.length) {
        const player = outfield[currentIndex];
        const div = createPlayerDiv({ ...player, team_type: side }, 50, 50); 
        container.appendChild(div);
        currentIndex++;
    }
}

//Create player dot element
function createPlayerDiv(player, xPercent, yPercent) {
    const div = document.createElement("div");
    div.classList.add("player-dot");
    div.style.left = `${xPercent}%`;
    div.style.top = `${yPercent}%`;

    const numberSpan = document.createElement("span");
    numberSpan.classList.add("player-number");
    numberSpan.textContent = player.lineup_number;
    div.appendChild(numberSpan);

    div.title = player.lineup_player;

    // Colors
    if (player.team_type === "home") {
        div.style.backgroundColor = "black";
        div.style.color = "white";
    } else {
        div.style.backgroundColor = "white";
        div.style.color = "black";
    }

    return div;
}

    


  window.addEventListener("DOMContentLoaded", () => {
    fetchMatchesData(); 
});



//function for predition-container in middly layer

const bigLeagues = [
  "Premier League", "LaLiga", "Serie A", "Bundesliga", 
  "UEFA Champions League", "Ligue 1", "Ligue 2", "Eredivisie",
  "Primeira Liga", "Scottish Premiership", "Belgian Pro League",
  "Turkish Super Lig", "UEFA Champions League", "UEFA Europa League",
  "UEFA Europa Conference League","FIFA World Cup","UEFA Euro",
  "Copa America", "AFCON", "Gold Cup", "Asian Cup",
];

// Normalize league names
const normalizedLeague = league =>
  league.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '');

// Validate odds
function isRealisticOdds(match) {
  const odd1 = parseFloat(match.odd_1);
  const odd2 = parseFloat(match.odd_2);
  return !isNaN(odd1) && !isNaN(odd2) && odd1 > 1 && odd2 > 1 && odd1 < 10 && odd2 < 10;
}

// User timezone
function getUserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// Convert match time
function convertMatchTimeToLocalTime(matchTime) {
  const userTimezone = getUserTimezone();
  const today = new Date().toISOString().split("T")[0];
  const matchDate = new Date(`${today}T${matchTime}`);
  return matchDate.toLocaleString("en-US", {
    timeZone: userTimezone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit"
  });
}

// Update match timers
function updateLiveTimers() {
  const now = new Date();
  document.querySelectorAll(".live-timer").forEach(span => {
    const startTime = span.dataset.start;
    const today = new Date().toISOString().split("T")[0];
    const matchDate = new Date(`${today}T${startTime}`);
    const diff = Math.floor((now - matchDate) / 60000);

    if (diff >= 0 && diff <= 120) {
      span.textContent = `${diff}'`;
    } else if (diff > 120) {
      span.textContent = "FT";
    } else {
      span.textContent = convertMatchTimeToLocalTime(startTime);
    }
  });
}

// Fetch and display predictions
async function fetchTodayPredictions(predictionContainer) {
  try {
    const response = await fetch(`${API_BASE}/api/predictions`);

    if (!response.ok) {
      predictionContainer.innerHTML = "<p>Prediction loding...</p>";
      return;
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      predictionContainer.innerHTML = "<p>No predictions available.</p>";
      return;
    }

    // Filter only big leagues with realistic odds
    const filtered = data.filter(match => {
      const leagueNorm = normalizedLeague(match.league_name);
      return isRealisticOdds(match) &&
        bigLeagues.some(big => normalizedLeague(big) === leagueNorm);
    });

    if (filtered.length === 0) {
      predictionContainer.innerHTML = "<p>No big matches with reliable odds today.</p>";
      return;
    }

    // Start the slider
    startPredictionSlider(predictionContainer, filtered);

  } catch (error) {
    console.error("Prediction fetch error:", error);
    predictionContainer.innerHTML = "<p>Error loading predictions.</p>";
  }
}

// Slide logic
let predictionIndex = 0;
function startPredictionSlider(container, matches) {
  function showSlide() {
    container.classList.remove("fade-in");

    setTimeout(() => {
      const match = matches[predictionIndex];
      const odd1 = match.odd_1.toFixed(2);
      const odd2 = match.odd_2.toFixed(2);

      container.innerHTML = `
        <div class="prediction-content">
          <h4>Who do you think will win?</h4>
          <div class="prediction-selection">
            <div class="team-nam">
              <span>${match.home}</span>
              <div class="team-logo">
                <img src="${match.homeLogo || '/assets/images/default-logo.png'}" alt="${match.home}">
              </div>
              <div class="prediction-number">${odd1}</div>
            </div>

            <div class="prediction-score-status">
              <h4 class="match-leagueName">${match.league_name}</h4>
              <h4 class="match-score">${match.score}</h4>
              <span class="live-timer" data-start="${match.time}">${match.time}</span>
            </div>

            <div class="team-nam">
              <span>${match.away}</span>
              <div class="team-logo">
                <img src="${match.awayLogo || '/assets/images/default-logo.png'}" alt="${match.away}">
              </div>
              <div class="prediction-number">${odd2}</div>
            </div>
          </div>
        </div>
      `;

      updateLiveTimers();
      container.classList.add("fade-in");
      predictionIndex = (predictionIndex + 1) % matches.length;
    }, 200);
  }

  showSlide();
  setInterval(showSlide, 10000);
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".prediction-container");
  if (container) {
    fetchTodayPredictions(container);
    setInterval(updateLiveTimers, 60000);
  }
});


/* Init bottom banner Swiper */
document.addEventListener("DOMContentLoaded", function () {
    new Swiper(".footer-banner", {
      loop: true,
      autoplay: {
        delay: 3000,
        disableOnInteraction: false,
      },
      slidesPerView: 1,
    });
  });

/* Close footer Button banner*/
function closeFixedAd() {
  document.getElementById("fixedAd").style.display = "none";
}


//page layout restructure for mobile and tablet view
 document.addEventListener("DOMContentLoaded", function () {
  function reorderElements() {
      if (window.innerWidth <= 1024) {
          const parent = document.querySelector(".content");
          

          const textCont1 = document.querySelector(".text-cont1");
          const newsUpdate = document.querySelector(".news-update");
          const textCont = document.querySelector(".text-cont");
          const liveMatchDemo = document.querySelector(".live-match-demo");
          const textCont3 = document.querySelector(".text-cont3");
          const slider = document.querySelector(".slider");
          const advertPodcast = document.querySelector(".advert");
          const textCont4 = document.querySelector(".text-cont4");
          const prediction = document.querySelector(".prediction-container");
          const leagueTabletextCont = document.querySelector(".leagueTable-text-cont");
          const leagueTableDemo = document.querySelector(".league-table-demo");
          const advert1Podcast = document.querySelector(".advert1");
          const newsPodcast = document.querySelector(".news-podcast");
           
 
          // Append in the correct order
          
          if (textCont1) parent.appendChild(textCont1);
          if (newsUpdate) parent.appendChild(newsUpdate);
          if (textCont) parent.appendChild(textCont);
          if (liveMatchDemo) parent.appendChild(liveMatchDemo);
          if (textCont3) parent.appendChild(textCont3);
          if (slider) parent.appendChild(slider);
          if (advertPodcast) parent.appendChild(advertPodcast);
          if (textCont4) parent.appendChild(textCont4);
          if (prediction) parent.appendChild(prediction);
          if (leagueTabletextCont) parent.appendChild(leagueTabletextCont);
          if (leagueTableDemo) parent.appendChild(leagueTableDemo);
          if (advert1Podcast) parent.appendChild(advert1Podcast);
          if (newsPodcast) parent.appendChild(newsPodcast);
      }
  }

  reorderElements();
  window.addEventListener("resize", reorderElements);
});


// menu toggle button for sidebar for mobile view
document.addEventListener("DOMContentLoaded", function () {
    const sidebar = document.getElementById("sidebar");
    const toggleBtn = document.querySelector(".toggle-btn");
    const menuLogo = document.querySelector(".mobileMenu-logo");
    const closeIcon = document.querySelector(".iconX");

    function isMobileOrTablet() {
        return window.innerWidth <= 1024;
    }

    function updateSidebarVisibility() {
        if (isMobileOrTablet()) {
            if (toggleBtn) toggleBtn.style.display = "block";
            sidebar.classList.remove("collapsed");
            sidebar.classList.remove("active");
            sidebar.style.display = "none";
        } else {
            if (toggleBtn) toggleBtn.style.display = "none";
            sidebar.classList.remove("active");
            sidebar.style.display = "block";
        }
    }

    function toggleSidebar() {
        if (isMobileOrTablet()) {
            sidebar.classList.remove("collapsed"); // ensure not collapsed
            sidebar.classList.toggle("active");
            sidebar.style.display = sidebar.classList.contains("active") ? "block" : "none";
        } else {
            // optional: allow collapse/expand on desktop
            sidebar.classList.toggle("collapsed");
        }
    }

    if (menuLogo) {
        menuLogo.addEventListener("click", toggleSidebar);
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

    // Move h1 under logo (mobile only)
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



// searchbar
document.addEventListener("DOMContentLoaded", function () {
  const searchContainer = document.querySelector(".search-container");
  const searchBar = document.querySelector(".search-bar");

  searchContainer.addEventListener("click", function () {
      if (window.innerWidth <= 1024) {
          searchBar.style.display = searchBar.style.display === "none" ? "block" : "none";
      }
  });
});


// Debounce resize handler
let resizeTimer;

window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);

  resizeTimer = setTimeout(() => {
    // Optional visual indicator (if you have CSS for .resizing-refresh)
    document.body.classList.add("resizing-refresh");

    // --- FIX: Reset layout without losing CSS context ---
    try {
      document.documentElement.style.display = 'block';
      document.body.style.transform = 'scale(1)'; // GPU-triggered repaint
      document.body.offsetHeight; // force reflow
      document.body.style.transform = '';
    } catch (err) {
      console.warn("Layout refresh error:", err);
    }

    // --- Refresh Ads (your existing logic) ---
    if (window.adsbygoogle && Array.isArray(window.adsbygoogle)) {
      try {
        (adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.warn("Ad refresh failed", e);
      }
    }

    // Remove the temporary refresh class after short delay
    setTimeout(() => {
      document.body.classList.remove("resizing-refresh");
    }, 150);
  }, 300);
});

// Auto reload on large viewport switch (like switching in Chrome Inspect)
let lastWidth = window.innerWidth;
window.addEventListener("resize", () => {
  if (Math.abs(window.innerWidth - lastWidth) > 400) {
    location.reload(); // reload only on major viewport changes
  }
  lastWidth = window.innerWidth;
});







  



