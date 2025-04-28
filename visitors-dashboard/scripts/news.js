document.addEventListener("DOMContentLoaded", async function () {
    await loadNews(); // Make sure news loads first
    showInitialNews("trending-news");
    showInitialNews("updates-news");
    updateRelativeTime();

    // Ensure .middle-layer is available before modifying
    const middleLayer = document.querySelector(".middle-layer");
    if (middleLayer) middleLayer.style.display = "block";
});
  
  // Function to display the first 5 news items on page load
  async function showInitialNews(sectionId) {
    const newsSection = document.getElementById(sectionId);
    if (!newsSection) return; // Prevent errors if section not found
 
    const newsItems = newsSection.querySelectorAll(".news-infomat");
 
    if (newsItems.length > 0) {
        // Wait for news data to be enhanced before displaying
        for (let i = 0; i < newsItems.length; i++) {
            await enhanceNews(i, window.newsData[i]);
        }
 
        newsItems.forEach((item, index) => {
            item.style.display = index < 5 ? "flex" : "none";
        });
 
        newsSection.style.display = "flex"; 
        newsSection.style.flexDirection = "column";
    }
  } 
  
  
  // Toggle news visibility when "See more" is clicked
function toggleNews(section) {
    const newsSection = document.getElementById(section + "-news");
    const seeMoreText = document.getElementById(section + "-text");
    const icon = document.querySelector(`#${section} .see-more ion-icon`);

    if (!newsSection || !seeMoreText || !icon) {
        console.warn(`toggleNews: Missing elements for section ${section}`);
        return;
    }

    const newsItems = newsSection.querySelectorAll(".news-infomat");

    if (seeMoreText.innerText === "See more") {
        newsItems.forEach(item => item.style.display = "block");
        seeMoreText.innerText = "See less";
        icon.name = "caret-up-outline"; 
    } else {
        newsItems.forEach((item, index) => {
            item.style.display = index < 5 ? "block" : "none";
        });
        seeMoreText.innerText = "See more";
        icon.name = "caret-down-outline"; 
    }
}
  
  
  
  // Function to calculate and display the relative time
  function updateRelativeTime() {
    const timeElements = document.querySelectorAll(".news-time");
    const now = new Date();

    timeElements.forEach((timeElement) => {
        const postedData = timeElement.dataset.posted;

        if (!postedData) {
            timeElement.textContent = "Unknown time";
            return;
        }

        let postedTime = new Date(postedData);

        if (isNaN(postedTime)) {
            console.warn("Invalid date format:", postedData);
            postedTime = Date.parse(postedData);  // Try parsing manually
        }

        if (isNaN(postedTime)) {
            timeElement.textContent = "Invalid time"; // Couldn’t parse it
            return;
        }

        const timeDifference = Math.floor((now - postedTime) / 1000); // in seconds
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
  
  
// Function to summarize the text to 150-200 words using the Flask backend
async function summarizeText(text) {
    try {
        const response = await fetch('http://localhost:5000/summarize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text })
        });

        const data = await response.json();
        if (!response.ok || data.error) {
            console.warn("Backend error:", data.error || response.statusText);
            return text; // fallback to original if summarization failed
        }

        // Ensure the summary length is between 150-200 words
        const summary = data.summary;
        const wordCount = summary.split(' ').length;
        if (wordCount < 150) {
            return summary + " (Extended Summary...)"  // Add filler text if the summary is too short
        }
        return summary;
    } catch (error) {
        console.error('Error summarizing text:', error);
        return text;
    }
}

// Function to rewrite the title for SEO
async function rewriteTitleForSEO(title) {
    try {
        const response = await fetch('http://localhost:5000/rewrite-title', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title })
        });

        const data = await response.json();
        console.log("Response from backend:", data); // Log the full response

        if (data.error) {
            console.error("Error rewriting title:", data.error);
            return title; // fallback to original title
        }

        console.log("Fetched SEO Title:", data.seo_title); // Log the fetched title
        return data.seo_title;
    } catch (error) {
        console.error('Error rewriting title:', error);
        return title;
    }
}


// Function to generate blog content and fetch SEO title and summary in parallel
async function generateBlogContent(title, description) {
    try {
        // Run both title rewrite and summary generation in parallel
        const [seoTitle, summary] = await Promise.all([
            rewriteTitleForSEO(title),
            summarizeText(description)
        ]);

        return { seo_title: seoTitle, blog_summary: summary };
    } catch (error) {
        console.error("Error generating blog content:", error);
        return { seo_title: title, blog_summary: description };
    }
}

async function enhanceNews(index, news) {
    const newsElement = document.getElementById(`news-${index}`);
    if (!newsElement) {
        console.warn(`News element #news-${index} not found`);
        return;
    }

    if (!news) {
        console.warn(`News data missing for index ${index}`);
        newsElement.style.display = "none"; // Hide broken item
        return;
    }

    const titleEl = newsElement.querySelector('.news-header');
    const descEl = newsElement.querySelector('.news-description');
    const timeEl = newsElement.querySelector('.news-time');

    if (!titleEl || !descEl || !timeEl) {
        console.warn(`Missing elements in news-${index}`);
        newsElement.style.display = "none"; // Hide broken item
        return;
    }

    let title = news.title || "Untitled News";
    let description = news.description || "No description available.";
    let pubDate = news.pubDate || new Date().toISOString();

    // Generate blog content
    const { seo_title, blog_summary } = await generateBlogContent(title, description);

    titleEl.textContent = seo_title || title;
    descEl.textContent = blog_summary || description;
    timeEl.dataset.posted = pubDate;
}


//function to load news
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
        window.seoTitles = [];
        window.summaries = [];

        data.forEach((news, i) => {
            // Check if pubDate exists, otherwise set it to the current time
            console.log("Raw pubDate:", news.pubDate); // Check format in console
            if (!news.pubDate) {
                console.warn("Missing pubDate, setting to current date");
                news.pubDate = new Date().toISOString();  // Fallback to current date if missing
            } else {
                const parsedDate = new Date(news.pubDate);
                if (!isNaN(parsedDate)) {
                    news.pubDate = parsedDate.toISOString(); // Ensure ISO format
                }
            }

            const newsHTML = createShimmerHTML(news, i);

            const trendingDiv = document.createElement('div');
            trendingDiv.innerHTML = newsHTML;

            // Append the news element to the container
            if (trendingContainer) trendingContainer.appendChild(trendingDiv);
            if (updateContainer) updateContainer.appendChild(trendingDiv.cloneNode(true));

            // Call enhanceNews after a short delay to ensure data is populated
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
                <h3 class="news-header shimmer" data-original-title="${encodeURIComponent(news.title || '')}">
                    ${news.title || "Loading title..."}
                </h3>
                <div class="news-meta">
                    <p class="news-description shimmer">${news.description || "Loading description..."}</p>
                    <p class="news-time" data-posted="${news.pubDate || ''}"></p>
                </div>
            </div>
        </div>
    `;
}




// Start auto-refreshing
function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => {
    loadNews();
  }, refreshIntervalMinutes * 60 * 1000);
}


 // Show detailed news view
function showNewsDetail(index) {
    const news = window.newsData?.[index];
    const seoTitle = window.seoTitles?.[index] || news?.title;
    const summary = window.summaries?.[index] || news?.description;

    if (!news) return;

    const detailView = document.getElementById('news-details-view');
    const detailContent = document.getElementById('news-detail-content');

    if (!detailView || !detailContent) {
        console.warn("News detail elements not found");
        return;
    }

    detailView.style.display = 'block';
    document.getElementById('trending-news').style.display = 'none';
    document.getElementById('updates-news').style.display = 'none';

    detailContent.innerHTML = `
        <h2>${seoTitle}</h2>
        <img src="${news.image || 'assets/images/default.jpg'}" alt="Detail image" class="feature-img-ankle">
        <p class="news-description">${summary}</p>
        <p class="news-time" data-posted="${news.pubDate || 'No date available'}"></p>
    `;
}
  

// Go back to news list view
function showNewsList() {
    document.getElementById('news-details-view').style.display = 'none';
    document.getElementById('trending-news').style.display = 'flex';
    document.getElementById('updates-news').style.display = 'flex';
}

// Auto-refresh news every 5 minutes
let refreshIntervalMinutes = 5;
let refreshTimer = setInterval(loadNews, refreshIntervalMinutes * 60 * 1000);


      
  

  
  