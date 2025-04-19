document.addEventListener("DOMContentLoaded", function () {
    showInitialNews("trending-news");
    showInitialNews("updates-news");
    updateRelativeTime();
  });
  
  // Function to display the first 5 news items on page load
  function showInitialNews(sectionId) {
    const newsSection = document.getElementById(sectionId);
    const newsItems = newsSection.querySelectorAll(".news-infomat");
    console.log(document.querySelector(".middle-layer").style.display);
  
  
    if (newsItems.length > 0) {
        newsItems.forEach((item, index) => {
            item.style.display = index < 5 ? "flex" : "none"; // Ensure flex layout remains intact
        });
        newsSection.style.display = "flex"; // Set to flex to align with CSS
        newsSection.style.flexDirection = "column"; // Keep stacking format
    }
    
  }
  
  document.querySelector(".middle-layer").style.display = "block";
  
  
  
  function toggleNews(section) {
    const newsSection = document.getElementById(section + "-news");
    const seeMoreText = document.getElementById(section + "-text");
    const icon = document.querySelector(`#${section} .see-more ion-icon`);
    const newsItems = newsSection.querySelectorAll(".news-infomat");
  
    if (seeMoreText.innerText === "See more") {
        newsItems.forEach(item => item.style.display = "block"); // Show all
        seeMoreText.innerText = "See less";
        icon.name = "caret-up-outline"; // Change to caret up icon
    } else {
        newsItems.forEach((item, index) => {
            item.style.display = index < 5 ? "block" : "none"; // Show first 5, hide rest
        });
        seeMoreText.innerText = "See more";
        icon.name = "caret-down-outline"; // Change to caret down icon
    }
  }
  
  
  
  // Function to calculate and display the relative time
  function updateRelativeTime() {
    const timeElements = document.querySelectorAll(".news-time");
    const now = new Date();
  
    timeElements.forEach((timeElement) => {
        const postedTime = new Date(timeElement.dataset.posted);
        const timeDifference = Math.floor((now - postedTime) / 1000); // Difference in seconds
  
        let timeText;
        if (timeDifference < 60) {
            timeText = `${timeDifference} seconds ago`;
        } else if (timeDifference < 3600) {
            const minutes = Math.floor(timeDifference / 60);
            timeText = `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
        } else if (timeDifference < 86400) {
            const hours = Math.floor(timeDifference / 3600);
            timeText = `${hours} hour${hours > 1 ? "s" : ""} ago`;
        } else {
            const days = Math.floor(timeDifference / 86400);
            timeText = `${days} day${days > 1 ? "s" : ""} ago`;
        }
  
        timeElement.textContent = timeText;
    });
  }
  
  // Update relative time every 30 seconds
  setInterval(updateRelativeTime, 30000);
  
  
  
  //new header and description
  async function loadNews() {
    const trendingContainer = document.getElementById('trending-news');
    const updatesContainer = document.getElementById('updates-news');
  
    trendingContainer.style.display = 'flex';
    updatesContainer.style.display = 'flex';
  
    try {
        const response = await fetch('http://localhost:5001/summarize', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              rss_url: 'https://www.espn.com/espn/rss/news' // or any other RSS feed
            }),
          });
      
      const data = await response.json();
  
      if (!Array.isArray(data)) {
        trendingContainer.innerHTML = `<p>Unable to load news.</p>`;
        updatesContainer.innerHTML = '';
        return;
      }
  
      const generateNewsHTML = (item) => `
        <div class="news-infomat">
          <div class="feature-img">
            <img src="${item.image || 'assets/images/AA1xMLFA.jpg'}" alt="News image" class="feature-img-ankle">
          </div>
          <div class="news-messages">
            <h2 class="news-header">${item.title}</h2>
            <div class="news-meta">
              <p class="news-description">${item.summary}</p>
              <p class="news-time" data-posted="${item.pubDate}"></p>
            </div>
          </div>
        </div>`;
  
      trendingContainer.innerHTML = generateNewsHTML(data[0]);
      updatesContainer.innerHTML = data.slice(1).map(generateNewsHTML).join('');
  
      updateRelativeTime(); // update times after loading
    } catch (err) {
      console.error("Failed to load news:", err.message);
      trendingContainer.innerHTML = `<p>Error loading news.</p>`;
      updatesContainer.innerHTML = '';
    }
  }


let refreshIntervalMinutes = 5; // You can change to 2, 10, etc.
let refreshTimer = null;

// Start auto-refreshing
function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => {
    loadNews();
  }, refreshIntervalMinutes * 60 * 1000);
}


//function to view news details
  function showNewsDetail(index) {
    const news = window.newsData?.[index];
    if (!news) return;
  
    document.getElementById('news-details-view').style.display = 'block';
    document.getElementById('trending-news').style.display = 'none';
    document.getElementById('updates-news').style.display = 'none';
    document.getElementById('newsAd-middle').style.display = 'none';

  
    document.getElementById('news-detail-content').innerHTML = `
      <h2>${news.title}</h2>
      <img src="${news.image || 'assets/images/AA1xMLFA.jpg'}" alt="Detail image" class="feature-img-ankle">
      <p class="news-description">${news.summary}</p>
      <p class="news-time" data-posted="${news.pubDate}"></p>
    `;
  
    updateRelativeTime();
  }
  
  function showNewsList() {
    document.getElementById('news-details-view').style.display = 'none';
    document.getElementById('trending-news').style.display = 'flex';
    document.getElementById('updates-news').style.display = 'flex';
  }
      
  

  
  