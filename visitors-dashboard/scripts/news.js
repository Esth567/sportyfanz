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
  
  
// Function to summarize the text using the Flask backend
async function summarizeText(text) {
    try {
        const response = await fetch('http://localhost:5000/summarize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
        });

        const data = await response.json();
        if (!response.ok || data.error) {
            console.warn("Backend error:", data.error || response.statusText);
            return text; // fallback to original if summarization failed
        }

        return data.summary;
    } catch (error) {
        console.error('Error summarizing text:', error);
        return text;
    }
}



// Function to rewrite the title for SEO
async function rewriteTitleForSEO(title) {
  const response = await fetch('http://localhost:5000/rewrite-title', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title })
  });

  const data = await response.json();
  if (data.error) {
      console.error("Error rewriting title:", data.error);
      return title; // fallback to original title
  }
  return data.seo_title;
}


async function generateBlogContent(title, description) {
    const response = await fetch('http://localhost:5000/generate-blog', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title, description })
    });

    const data = await response.json();
    if (data.error) {
        console.error("Error generating blog content:", data.error);
        return { seo_title: title, blog_summary: description };
    }

    return data; // contains seo_title and blog_summary
}



// Modify the loadNews function to use summarization and SEO title rewriting
async function loadNews() {
    try {
        const res = await fetch('http://localhost:8000/api/news');
        const data = await res.json();

        if (!Array.isArray(data)) {
            console.error('News data is not an array');
            return;
        }

        const trendingContainer = document.getElementById('trending-news');
        const updateContainer = document.getElementById('updates-news');

        if (!trendingContainer || !updateContainer) {
            console.error('News containers not found in DOM');
            return;
        }

        trendingContainer.innerHTML = '';
        updateContainer.innerHTML = '';
        window.newsData = data;

        data.forEach((news, i) => {
            const newsHTML = createShimmerHTML(news, i);

            const trendingDiv = document.createElement('div');
            trendingDiv.innerHTML = newsHTML;

            // Append to containers
            trendingContainer.appendChild(trendingDiv);
            updateContainer.appendChild(trendingDiv.cloneNode(true));

            // Enhance after a small delay
            setTimeout(() => enhanceNews(i, news), 100);
        });
    } catch (err) {
        console.error('Error loading news:', err);
    }
}


function createShimmerHTML(news, index) {
    return `
        <div class="news-infomat" id="news-${index}" onclick="showNewsDetail(${index})">
            <div class="feature-img">
                ${news.image ? `<img src="${news.image}" class="news-image" alt="News Image">` : ''}
            </div>
            <div class="news-messages">
                <h3 class="news-header shimmer shimmer-title"></h3>
                <div class="news-meta">
                    <p class="news-description shimmer shimmer-description"></p>
                    <p class="news-time">${news.pubDate || "No date available"}</p>
                </div>
            </div>
        </div>
    `;
}


async function enhanceNews(index, news) {
    const newsElement = document.getElementById(`news-${index}`);
    if (!newsElement) {
        console.warn(`News element #news-${index} not found`);
        return;
    }

    try {
        const seoTitle = await rewriteTitleForSEO(news.title);
        const summary = news.description?.trim().length
            ? await summarizeText(news.description)
            : "No description available.";

        console.log(`Enhancing news ${index}`, { seoTitle, summary });

        const titleEl = newsElement.querySelector('.news-header');
        const descEl = newsElement.querySelector('.news-description');

        if (!titleEl || !descEl) {
            console.warn(`Missing header or description elements for news-${index}`);
            return;
        }

        // Insert enhanced content
        titleEl.textContent = seoTitle;
        descEl.textContent = summary;

        // Remove shimmer effect
        titleEl.classList.remove('shimmer', 'shimmer-title');
        descEl.classList.remove('shimmer', 'shimmer-description');
    } catch (err) {
        console.error(`Error enhancing news ${index}`, err);
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


 // Function to show the detailed view of a news item
 function showNewsDetail(index) {
  const news = window.newsData?.[index];
  if (!news) return;

  document.getElementById('news-details-view').style.display = 'block';
  document.getElementById('trending-news').style.display = 'none';
  document.getElementById('updates-news').style.display = 'none';

  document.getElementById('news-detail-content').innerHTML = `
      <h2>${news.title}</h2>
      <img src="${news.image || 'assets/images/default.jpg'}" alt="Detail image" class="feature-img-ankle">
      <p class="news-description">${news.description}</p>
      <p class="news-time" data-posted="${news.pubDate || 'No date available'}"></p>
  `;
}

function showNewsList() {
  document.getElementById('news-details-view').style.display = 'none';
  document.getElementById('trending-news').style.display = 'flex';
  document.getElementById('updates-news').style.display = 'flex';
}

document.addEventListener("DOMContentLoaded", loadNews);
      
  

  
  