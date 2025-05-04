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
    if (!newsSection || !Array.isArray(window.newsData)) return;

    const newsItems = newsSection.querySelectorAll(".news-infomat");

    if (newsItems.length > 0) {
        for (let i = 0; i < newsItems.length; i++) {
            const newsItem = window.newsData[i];
            if (!newsItem) continue; // Skip undefined

            await enhanceNews(i, newsItem);
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
async function summarizeText(title, description) {
    try {
        const response = await fetch('http://localhost:8000/summarize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: title,
                description: description
            })
        });

        const data = await response.json();
        if (!response.ok || data.error) {
            console.warn("Backend error:", data.error || response.statusText);
            return {
                title: title,         // fallback to original title
                summary: description  // fallback to original description
            };
        }

        const summary = data.summary;
        const seoTitle = data.seo_title;
        const wordCount = summary.split(' ').length;


        for (const newsItem of newsList) {
            const originalTitle = newsItem.title;
            const originalDescription = newsItem.description;
        
            const { title: seoTitle, summary } = await summarizeText(originalTitle, originalDescription);
        
            renderNewsCard({
                title: seoTitle,
                summary: summary,
                date: newsItem.date,
                image: newsItem.image,   // if available
                link: newsItem.link      // if available
            });
        }
        
        return {
            title: seoTitle || title,
            summary: wordCount < 150 ? summary + " (Extended Summary...)" : summary
        };
    } catch (error) {
        console.error('Error summarizing text:', error);
        return {
            title: title,
            summary: description
        };
    }
}


// Function to rewrite the title for SEO
function rewriteTitleForSEO(originalTitle, matchResult = '') {
    const leagues = ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Champions League', 'Europa League', 'CAF Champions League', 'CAF Confederation Cup'];
    const players = ['Erling Haaland', 'Kylian Mbappe', 'Cristiano Ronaldo', 'Lionel Messi', 'Victor Osimhen', 'Harry Kane'];
    const clubs = ['Manchester City', 'Real Madrid', 'Barcelona', 'Bayern Munich', 'Arsenal', 'Napoli', 'PSG', 'Al Nassr'];

    const foundLeague = leagues.find(league => originalTitle.toLowerCase().includes(league.toLowerCase()));
    const foundPlayer = players.find(player => originalTitle.toLowerCase().includes(player.toLowerCase()));
    const foundClub = clubs.find(club => originalTitle.toLowerCase().includes(club.toLowerCase()));

    // Adding match result to SEO title if available
    let baseTitle = originalTitle.trim();

    if (matchResult) {
        baseTitle += ` | Match Result: ${matchResult}`;
    }

    if (foundPlayer && foundLeague) {
        return `${foundPlayer} Makes Headlines in ${foundLeague} | Latest Update`;
    } else if (foundPlayer && foundClub) {
        return `${foundPlayer} Shines for ${foundClub} – Breaking Football News`;
    } else if (foundClub && foundLeague) {
        return `${foundClub} in ${foundLeague} Action: Match Highlights & Analysis`;
    } else if (foundPlayer) {
        return `${foundPlayer}'s Latest Performance – Must-Read Football Insight`;
    } else if (foundClub) {
        return `${foundClub} Update: Match News, Transfers & More`;
    } else if (foundLeague) {
        return `${foundLeague} Roundup – Key Matches, Players & Talking Points`;
    }

    // Fallback
    return baseTitle.length > 80 ? baseTitle.slice(0, 77) + '...' : baseTitle;
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
    if (!newsElement) return;

    const titleEl = newsElement.querySelector('.news-header');
    const descEl = newsElement.querySelector('.news-description');
    const timeEl = newsElement.querySelector('.news-time');

    let title = news.title || "Untitled News";
    let description = news.description || "No description available.";
    let pubDate = news.pubDate || new Date().toISOString();

    // ✅ Inject SEO-enhanced content
    const { seo_title, blog_summary } = await generateBlogContent(title, description);
    title = seo_title;
    description = blog_summary;

    // Display
    titleEl.textContent = title;
    descEl.textContent = description;
    timeEl.dataset.posted = pubDate;
}



// Function to load news
async function loadNews() {
    try {
        const res = await fetch('http://localhost:8000/api/news');  // Change this URL to your FastAPI URL
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
            // Ensure pubDate exists and parse it
            console.log("Raw pubDate:", news.pubDate);
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
                <h3 class="news-header">${news.title}</h3>
                <div class="news-meta">
                    <p class="news-description">${news.description}</p>
                    <p class="news-time" data-posted="${news.pubDate || ''}"></p>
                </div>
            </div>
        </div>
    `;
}


// Automatically call loadNews when the page is reloaded
document.addEventListener('DOMContentLoaded', function() {
    loadNews(); // This will run once the page is fully loaded
});



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


      
  

  
  