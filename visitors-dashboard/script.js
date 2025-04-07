
const APIkey = '5608a27e503ab17161c376b5bcbb93d5c562096975dd23f37bb95f3d845ee99c';

//sidebar toggle for web view
function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const container = document.querySelector('.body-container');

    sidebar.classList.toggle("collapsed");
}

document.querySelector('.icon img').addEventListener('click', toggleSidebar);


//display matches for live-match-demo
document.addEventListener("DOMContentLoaded", function () {
    const liveMatchContainer = document.querySelector(".live-match-demo");

    const from = new Date().toISOString().split('T')[0]; // today's date
    const to = from;
    const leagueIDs = ["152", "302", "207", "168", "175"]; // Premier League, La Liga, Bundesliga, Serie A, Ligue 1
    const bigTeams = ["Chelsea", "Barcelona", "Bayern Munich", "Manchester City", "Real Madrid", "Arsenal", "Liverpool", "Napoli", "PSG", "AC Milan", "Leicester City", "Newcastle United"];

    let matchesList = [...matchesList, ...matches]; // Store all matches for the day
    let currentMatchIndex = 0; // Track the current match being displayed

    function getMinutesSince(start) {
        const now = new Date();
        const startDate = new Date(start.replace(" ", "T"));
        return Math.floor((now - startDate) / 60000);
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
        const isLive = !isNaN(parseInt(matchStatus));
    
        const displayScore = hasStarted ? `${homeScore} - ${awayScore}` : "VS";
        let displayTime, ellipseImg;
    
        if (isFinished) {
            displayTime = "FT";
            ellipseImg = "assets/icons/Ellipse 1.png"; // or change to default if you prefer
        } else if (hasStarted) {
            displayTime = `${getMinutesSince(match.match_date + " " + startTime)}'`;
            ellipseImg = "assets/icons/Ellipse 1.png";
        } else {
            displayTime = startTime;
            ellipseImg = "assets/icons/Ellipse2.png";
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
        </div> 
        `;
    }

    async function loadMatches() {
        try {
            matchesList = []; // Reset matches list

            for (let id of leagueIDs) {
                const url = `https://apiv3.apifootball.com/?action=get_events&from=${from}&to=${to}&league_id=${id}&APIkey=${APIkey}`;
                const res = await fetch(url);
                const matches = await res.json();
                console.log(matches);

                const keyMatches = matches.filter(match =>
                    bigTeams.includes(match.match_hometeam_name) || bigTeams.includes(match.match_awayteam_name)
                );

                matchesList = [...matchesList, ...keyMatches];
            }

            // Sort matches by start time
            matchesList.sort((a, b) => {
                const aTime = new Date(a.match_date + " " + a.match_time);
                const bTime = new Date(b.match_date + " " + b.match_time);
                return aTime - bTime;
            });

            // Show first match
            if (matchesList.length > 0) {
                displayNextMatch();
            } else {
                liveMatchContainer.innerHTML = `<div class="teams-time"><div class="team">No top match today</div></div>`;
            }
        } catch (err) {
            console.error("Error loading matches:", err);
        }
    }

    function displayNextMatch() {
        const match = matchesList[currentMatchIndex];
        const html = createMatchHTML(match);
        liveMatchContainer.innerHTML = html;

        // Check if the current match is finished or has started
        const matchStatus = match.match_status;
        const isFinished = matchStatus === "Finished" || matchStatus === "FT";

        if (isFinished) {
            currentMatchIndex++; // Move to the next match
            if (currentMatchIndex < matchesList.length) {
                // Set a delay to switch to the next match
                setTimeout(displayNextMatch, 10000); // Wait for 10 seconds (adjust as needed)
            }
        } else {
            // If not finished, keep refreshing until the match ends
            setTimeout(displayNextMatch, 60000); // Refresh every minute
        }
    }

    // Initial load
    loadMatches();
});




// Top scorer slider
const leagueIds = {
    Bundesliga: 195,
    NPFL: 302,
    SerieA: 207,
    Ligue1: 168,
    PremierLeague: 152,
    LaLiga: 302
};


// Example of player images mapping (make sure to use the correct player names and image filenames)
const playerImageMap = {
    "R. Lewandowski": "Lewandowski.png",
    "O. Dembele": "Dembele.png",
    "A. Alipour": "Alipour.png",
    "M. Retegui": "neymar.jpg",
    "Mohammed Salah": "Salah.png",
    // Add more players here...
};

// Fallback image if the player's image is not found in the map
const fallbackImage = "assets/images/default-player.png";


async function fetchTopScorers() {
    try {
        const playersContainer = document.querySelector(".players-container");
        const dotsContainer = document.querySelector(".slider-dots");

        if (!playersContainer || !dotsContainer) {
            console.error("Slider container elements not found.");
            return;
        }

        playersContainer.innerHTML = ""; // Clear previous content
        dotsContainer.innerHTML = "";

        let playerIndex = 0;
        let playerElements = [];

        for (const [leagueName, leagueId] of Object.entries(leagueIds)) {
            const response = await fetch(`https://apiv3.apifootball.com/?action=get_topscorers&league_id=${leagueId}&APIkey=${APIkey}`);
            const data = await response.json();

            if (!Array.isArray(data) || data.length === 0) {
                console.warn(`No data available for ${leagueName}`);
                continue;
            }

            const topScorer = data[0]; // Get the top scorer

            const playerName = topScorer.player_name || "Unknown Player";
            const playerImage = getLocalPlayerImage(playerName);  // Fetch image from local mapping
            const goals = topScorer.goals || "0";
            const teamName = topScorer.team_name || "Unknown Team";

            // Create player item dynamically
            const playerItem = document.createElement("div");
            playerItem.classList.add("player-item");
            if (playerIndex === 0) playerItem.classList.add("active");

            playerItem.innerHTML = `
                <div class="player-image">
                    <img src="${playerImage}" alt="${playerName}" onerror="this.src='${fallbackImage}'">
                </div>
                <div class="players-data">
                    <div class="player-name">${playerName}</div>
                    <div class="goals">${goals} Goals</div>
                    <div class="team-name">${teamName}</div>
                    <div class="leagues">${leagueName}</div>
                </div>
            `;

            playersContainer.appendChild(playerItem);
            playerElements.push(playerItem);

            // Create slider dot
            const dot = document.createElement("span");
            dot.classList.add("dot");
            if (playerIndex === 0) dot.classList.add("active-dot");

            dot.addEventListener("click", () => setActiveSlide(playerIndex));
            dotsContainer.appendChild(dot);

            playerIndex++;
        }

        if (playerElements.length > 0) {
            startSlider(playerElements);
        } else {
            console.warn("No players were added to the UI.");
        }
    } catch (error) {
        console.error("Error fetching top scorers:", error);
    }
}

// Fetch player image from local assets using the player name
function getLocalPlayerImage(playerName) {
    // Check if the player's image exists in the map
    const playerImage = playerImageMap[playerName];

    // If the image is found, return the path, otherwise use the fallback image
    if (playerImage) {
        return `assets/images/${playerImage}`;
    } else {
        return fallbackImage; // Return fallback if player image is not found
    }
}



// Slider functionality
let currentPlayer = 0;
let players = [];
let dots = [];
let sliderInterval;

function startSlider(playerElements) {
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
    sliderInterval = setInterval(showNextPlayer, 3000); // Restart auto-slide
}

// Fetch top scorers on page load
document.addEventListener("DOMContentLoaded", fetchTopScorers);








//league table for 4 team beased on ranking
const leagueId = 152;

async function fetchTopFourStandings() {
    try {
        const response = await fetch(`https://apiv3.apifootball.com/?action=get_standings&league_id=${leagueId}&APIkey=${APIkey}`);
        const data = await response.json();

        console.log("API Response:", data); // Debugging

        const leagueTableDemo = document.querySelector(".league-table-demo");

        if (!Array.isArray(data) || data.length === 0) {
            leagueTableDemo.innerHTML = `<p>No data available for this league.</p>`;
            return;
        }

        // Extract top 4 teams
        const topFourTeams = data.slice(0, 4);

        // Generate HTML for the top 4 teams
        let tableHTML = `
            <h3 class="league-title">${topFourTeams[0].league_name}</h3>
            <div class="table-header">
                <span class="team-head">Team</span>
                <span class="stats-header">D</span>
                <span class="stats-header">L</span>
                <span class="stats-header">GA</span>
                <span class="stats-header">GD</span>
                <span class="stats-header">PTS</span>
            </div>
        `;

        topFourTeams.forEach(team => {
            console.log("Team Data:", team); // Debugging

            tableHTML += `
                <div class="team-row">
                    <div class="team-info">
                        <img src="${team.team_badge || 'assets/images/default-logo.png'}" alt="${team.team_name} Logo" class="team-logo">
                        <span class="teamName-header">${team.team_name || 'N/A'}</span>
                    </div>
                    <span class="team-stats">${team.overall_league_D || 0}</span>
                    <span class="team-stats">${team.overall_league_L || 0}</span>
                    <span class="team-stats">${team.overall_league_GA || 0}</span>
                    <span class="team-stats">${(team.overall_league_GF - team.overall_league_GA) || 0}</span>
                    <span class="team-stats">${team.overall_league_PTS || 0}</span>
                </div>
            `;
        });

        // Update the HTML
        leagueTableDemo.innerHTML = tableHTML;
    } catch (error) {
        console.error("Error fetching standings:", error);
    }
}

// Call the function to fetch and display the standings
fetchTopFourStandings();




// middle hero banner header slider
let currentIndex = 0;
const slides = document.querySelectorAll(".slider-content");
const totalSlides = slides.length;

function showSlide(index) {
  slides.forEach((slide, i) => {
    if (i === index) {
      slide.classList.add("active");
      slide.style.display = "flex"; // Show active slide
    } else {
      slide.classList.remove("active");
      slide.style.display = "none"; // Hide inactive slides
    }
  });
}

// Auto-slide functionality
function autoSlide() {
  currentIndex = (currentIndex + 1) % totalSlides; // Loop back to the first slide
  showSlide(currentIndex);
}

// Start the slider
showSlide(currentIndex);
setInterval(autoSlide, 4000); // Change slides every 3 seconds





// Function to get today's date or a date offset by days (formatted as YYYY-MM-DD)
function getTodayDate(offset = 0) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return date.toISOString().split("T")[0];
}


// Declare matchesData as a global object
const matchData = {
    live: [],
    highlight: [],
    upcoming: []
};


// Fetch Matches Data Dynamically
async function fetchMatchesData() {
    try {
        const response = await fetch(
            `https://apiv3.apifootball.com/?action=get_events&from=${getTodayDate(-7)}&to=${getTodayDate()}&APIkey=${APIkey}`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log("API Response:", data); // Debugging log
        console.log("First match object:", data[0]); // Check available properties

        if (!Array.isArray(data)) {
            console.error("Unexpected API response:", data);
            return;
        }

        const now = new Date();

        matchData.live = data.filter(match => String(match.match_live) === "1" && match.match_status !== "Finished");
        matchData.highlight = data.filter(match => match.match_status === "Finished" || match.match_status === "FT");
        matchData.upcoming = data.filter(match => {
            const matchDateTime = new Date(`${match.match_date} ${match.match_time}`);
            return (!match.match_status || match.match_status === "Not Started" || match.match_status === "Scheduled") && matchDateTime > now;
        });

        showMatches('live');
    } catch (error) {
        console.error('Error fetching match data:', error);
    }
}


// Automatically display 'Live' matches when the page loads
document.addEventListener("DOMContentLoaded", function () {
    // Ensure the matches container exists
    const matchContainer = document.getElementById('matches-container');
    if (!matchContainer) {
        console.error("Error: matches-container element not found.");
        return;
    }

    // Fetch match data and display live matches first
    fetchMatchesData();

    // Select and highlight the "Live" button after the DOM has loaded
    setTimeout(() => {
        const liveButton = document.querySelector('.category-btn[data-category="live"]');
        if (liveButton) {
            liveButton.classList.add("active");
        } else {
            console.error("Live category button not found.");
        }
    }, 300); // Delay ensures HTML is fully loaded
});


// Function to Show Matches Based on Category
function showMatches(category, event = null) {
    if (!matchData[category]) {
        console.error(`Category '${category}' does not exist.`);
        return;
    }

    const buttons = document.querySelectorAll('.category-btn');
    buttons.forEach(button => button.classList.remove('active'));

    // Highlight the active button
    if (event) {
        event.target.classList.add('active');
    }

    const container = document.getElementById('matches-container');
    container.innerHTML = '';

    const matches = matchData[category].slice(0, 5); // Limit to 5 matches

    if (matches.length > 0) {
        matches.forEach((match, index) => createMatchCard(container, match, category, index));
    } else {
        container.innerHTML = `<p>No matches available</p>`;
    }
}


// Function to Create a Match Card
function createMatchCard(container, match, category, matchIndex) {
    const team1 = match.match_hometeam_name || "Unknown Team";
    const team2 = match.match_awayteam_name || "Unknown Team";
    const logo1 = match.team_home_badge || "assets/icons/default-logo.png";
    const logo2 = match.team_away_badge || "assets/icons/default-logo.png";
    const matchTime = match.match_time || "Time TBA";
    const country = match.country_name || "Unknown Country";
    const score1 = match.match_hometeam_score || "0";
    const score2 = match.match_awayteam_score || "0";
    let matchMinute = match.match_status || matchTime;

    let matchStatusDisplay = "";
    let scoreDisplay = "";

    if (category === "highlight") {
        matchStatusDisplay = `<h5>FT</h5>`;
        scoreDisplay = `<div class="match-score">${score1} - ${score2}</div>`;
    }

    if (category === "live") {
        let matchMinuteText = match.match_status === "Halftime" ? "HT" : `${match.match_status}'`;
        scoreDisplay = `<div class="match-score">${score1} - ${score2}</div>`; // Score between the teams
    }

    if (category === "upcoming") {
        matchStatusDisplay = `<h5>vs</h5>`; // Show "vs" for upcoming matches
    }

    const matchCard = document.createElement('div');
    matchCard.classList.add('match-card');

    matchCard.innerHTML = `
        <div class="match-details">
            <div class="match-info">
                <div class="Matchteam">
                    <img src="${logo1}" alt="${team1}">
                    <span>${team1}</span>
                </div>

                <!-- Display only score for live category -->
                ${category === "live" ? scoreDisplay : ""}
                
                <!-- Display match status and score for highlight -->
                ${category === "highlight" ? `
                    <div class="match-status" style="display: flex; flex-direction: column;">
                        ${matchStatusDisplay}
                        ${scoreDisplay}
                    </div>
                ` : ""}

                 <!-- Display matchStatusDisplay (vs) for upcoming -->
                ${category === "upcoming" ? matchStatusDisplay : ""}


                <div class="Matchteam">
                    <img src="${logo2}" alt="${team2}">
                    <span>${team2}</span>                 
                </div>
            </div>

            <div class="match-time">
                <img src="assets/icons/clock.png" alt="Clock">
                ${category === "live" ? `${matchMinute}'` : matchTime}
            </div>
            <div class="match-country">
                <img src="assets/icons/map-pin.png" alt="Map">
                ${country}
            </div>
            <button class="view-details-btn" data-category="${category}" data-index="${matchIndex}">
                <img src="assets/icons/arrow-up.png" alt="Arrow-up">
                View Details
            </button>
        </div>
    `;

    // Append card to container
    container.appendChild(matchCard);

    // Select the button inside the newly created match card
    const viewDetailsBtn = matchCard.querySelector('.view-details-btn');

    // Ensure the event listener is attached
    viewDetailsBtn.addEventListener('click', function () {
        console.log(`Clicked: ${team1} vs ${team2}`);
        displayLiveMatch(category, matchIndex);
    });
}




// Function to Filter Matches by Date
function filterByDate() {
    const selectedDate = document.getElementById('match-date').value;
    const container = document.getElementById('matches-container');
    container.innerHTML = '';

    const allMatches = Object.values(matchesData).flat();
    const filteredMatches = allMatches.filter(match => match.date === selectedDate);

    if (filteredMatches.length > 0) {
        filteredMatches.slice(0, 10).forEach((match, index) => createMatchCard(container, match, "filtered", index));
    } else {
        container.innerHTML = `<p>No matches found for this date</p>`;
    }
}

// Attach event listeners to category buttons
document.querySelectorAll('.category-btn').forEach(button => {
    button.addEventListener('click', function (event) {
        const category = event.currentTarget.getAttribute('data-category');
        if (!category) {
            console.error("Category not found on button.");
            return;
        }
        showMatches(category, event);
    });
});


// menu toggle button for sidebar for mobile view
document.addEventListener("DOMContentLoaded", function () {
  function updateSidebarVisibility() {
      const sidebar = document.getElementById("sidebar");
      const toggleBtn = document.querySelector(".toggle-btn");

      if (window.innerWidth <= 1024) {
          toggleBtn.style.display = "block"; // Show toggle button for mobile & tablet
      } else {
          toggleBtn.style.display = "none"; // Hide toggle button for web view
          sidebar.classList.remove("collapsed"); // Ensure sidebar is fully visible on web
      }
  }

  // Run on page load and on window resize
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






 // css code to restructure page layout for mobile and tablet view
 document.addEventListener("DOMContentLoaded", function () {
  function reorderElements() {
      if (window.innerWidth <= 1024) {
          const parent = document.querySelector(".content");

          const headerSlider = document.querySelector(".header-slider");
          const textCont = document.querySelector(".text-cont");
          const liveMatchDemo = document.querySelector(".live-match-demo");
          const textCont2 = document.querySelector(".text-cont2");
          const slider = document.querySelector(".slider");
          const advertPodcast = document.querySelector(".advert");
          const textCont3 = document.querySelector(".text-cont3");
          const predictionContainer = document.querySelector(".predition-container");
          const leagueTabletextCont = document.querySelector(".leagueTable-text-cont");
          const leagueTableDemo = document.querySelector(".league-table-demo");
          const advert1Podcast = document.querySelector(".advert1");
          const newsPodcast = document.querySelector(".news-podcast");

         
          // Append in the correct order
          parent.appendChild(headerSlider);
          parent.appendChild(textCont);
          parent.appendChild(liveMatchDemo);
          parent.appendChild(textCont2);
          parent.appendChild(slider);
          parent.appendChild(advertPodcast);
          parent.appendChild(textCont3);
          parent.appendChild(predictionContainer);
          parent.appendChild(leagueTabletextCont);
          parent.appendChild(leagueTableDemo);
          parent.appendChild(advert1Podcast);
          parent.appendChild(newsPodcast);
      }
  }

  reorderElements();
  window.addEventListener("resize", reorderElements);
});


document.addEventListener("DOMContentLoaded", function () {
  if (window.innerWidth <= 1024) { // Apply only for mobile/tablet
      let headerTopbar = document.querySelector(".header-topbar");
      let mobileMenuLogo = document.querySelector(".mobileMenu-logo");
      let h1 = document.querySelector(".header-topbar h1");

      // Move h1 below mobileMenu-logo
      if (mobileMenuLogo && h1) {
          headerTopbar.insertBefore(h1, mobileMenuLogo.nextSibling);
      }
  }
});


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

//news-podcast animation slider
document.addEventListener("DOMContentLoaded", function () {
  let currentIndex = 0;
  const slider = document.querySelector(".news-podcast");

  function slideNewsPodcast() {
      if (window.innerWidth <= 1024) { // Mobile & Tablet Only
          currentIndex = (currentIndex + 1) % 2; // Toggle between 0 and 1
          slider.style.transform = `translateX(-${currentIndex * 100}%)`; // Slide left/right
      } else {
          // Reset position for desktop view
          slider.style.transform = `translateX(0)`;
      }
  }

  // Auto-slide every 5 seconds only on mobile & tablet
  if (window.innerWidth <= 1024) {
      setInterval(slideNewsPodcast, 5000);
  }
});










/*----------------------------news paage-----------------------------------*/

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


 // Function to show the detailed view 
document.addEventListener("DOMContentLoaded", () => {
    const newsMessages = document.querySelectorAll(".news-messages");
    const trendingNews = document.querySelector("#trending-news");
    const updatesNews = document.querySelector("#updates-news");
    const textContSections = document.querySelectorAll(".news-text-cont");
    const newsDetailsView = document.querySelector("#news-details-view");
    const newsDetailContent = document.querySelector("#news-detail-content");
    const newsAdMiddle = document.querySelector(".newsAd-middle"); // Select the newsAd-middle section

    
    // Function to show the detailed view of a specific news item
    newsMessages.forEach((message) => {
        message.addEventListener("click", () => {
            // Get the news content
            const newsHeader = message.querySelector(".news-header").textContent;
            const newsDescription = message.querySelector(".news-description").textContent;
            const newsTime = message.querySelector(".news-time").textContent;
            const newsImage = message
                .closest(".news-infomat")
                .querySelector(".feature-img img").src;

            // Populate the details view
            newsDetailContent.innerHTML = `
            <h2>${newsHeader}</h2>
                <p><small>${newsTime}</small></p>
                <img src="${newsImage}" alt="News Image" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 10px; margin-bottom: 20px;">
                <p>${newsDescription}</p>
            `;

            // Hide both news sections and text-cont sections, then show the detailed view
            trendingNews.style.display = "none";
            updatesNews.style.display = "none";
            textContSections.forEach((section) => (section.style.display = "none"));
            newsAdMiddle.style.display = "none"; // Hide newsAd-middle
            newsDetailsView.style.display = "block";
        });
    });

    // Function to return to the news list view
    window.showNewsList = () => {
        newsDetailsView.style.display = "none";
        textContSections.forEach((section) => {
          section.style.display = "flex"; // Ensure flex display is restored
          section.style.justifyContent = "space-between"; // Keep it inline
          section.style.alignItems = "center"; // Align properly
      });
        trendingNews.style.display = "block"; // Show Trending News
        updatesNews.style.display = "block"; // Show News Updates
        newsAdMiddle.style.display = "block"; // Show newsAd-middle again


        //newsAd-middle retains its original flex layout
        newsAdMiddle.style.display = "flex";
        newsAdMiddle.style.flexDirection = "row"; // Ensure it stays in a row layout
        newsAdMiddle.style.justifyContent = "space-between"; // Keep spacing
        newsAdMiddle.style.alignItems = "center"; // Align properl
    };
});






/*...........................................League table page........................................... */


// List of leagues to display 
const selectedLeagues = {
    "Premier League": { league_id: 152, country: "England" }, 
    "La Liga": { league_id: null, country: "Spain" },
    "Serie A": { league_id: null, country: "Italy" },
    "NPFL": { league_id: null, country: "Nigeria" },
    "Bundesliga": { league_id: null, country: "Germany" }
};

// Fetch the league names
document.addEventListener("DOMContentLoaded", function () {
    const leaguesContainer = document.querySelector(".leagues-country");

    // Ensure the element exists before proceeding
    if (!leaguesContainer) {
        console.error("Error: Element '.leagues-country' not found. Check your HTML structure.");
        return;
    }

    // Fetch the league names
    async function fetchLeagues() {
        try {
            const response = await fetch(`https://apiv3.apifootball.com/?action=get_leagues&APIkey=${APIkey}`);
            const leagues = await response.json();
            leaguesContainer.innerHTML = ""; // Clear existing content

            let firstLeagueId = null;

            // Loop through API response and match selected leagues by BOTH name & country
            leagues.forEach(league => {
                Object.entries(selectedLeagues).forEach(([leagueName, leagueInfo]) => {
                    if (league.league_name === leagueName && league.country_name === leagueInfo.country) {
                        selectedLeagues[leagueName].league_id = league.league_id; // Assign correct league ID

                        const leagueElement = document.createElement("div");
                        leagueElement.classList.add("leagueNames");
                        leagueElement.innerHTML = `
                            <div class="leag-count">
                                <img src="${league.league_logo || 'assets/images/default-logo.png'}" alt="${league.league_name} Logo">
                                <div class="league-info">
                                    <h3>${league.league_name}</h3>
                                    <p>${league.country_name}</p>                    
                                </div>
                            </div>
                            <div class="arrow-direct">
                                <img src="assets/icons/Arrow - Right 2.png" alt="Arrow">
                            </div>
                        `;

                        // Click event to fetch and display league table
                        leagueElement.addEventListener("click", () => {
                            updateLeagueTable(league.league_name, league.league_id);
                        });

                        leaguesContainer.appendChild(leagueElement);

                        // Set Premier League (England) as the default league to load
                        if (league.league_name === "Premier League" && league.country_name === "England") {
                            firstLeagueId = league.league_id;
                        }
                    }
                });
            });

            // Load the Premier League table by default on page load
            if (firstLeagueId) {
                updateLeagueTable("Premier League", firstLeagueId);
            }

        } catch (error) {
            console.error("Error fetching leagues:", error);
        }
    }

    fetchLeagues(); // Fetch leagues only after confirming the element exists
});



 // Get the elements
 function updateLeagueTable(leagueName, leagueId) {
    fetch(`https://apiv3.apifootball.com/?action=get_standings&league_id=${leagueId}&APIkey=${APIkey}`)
        .then(response => response.json())
        .then(leagueData => {
            const middleLayer = document.querySelector(".middle-layer");

            if (!Array.isArray(leagueData) || leagueData.length === 0) {
                middleLayer.innerHTML = `<p>No data available for ${leagueName}</p>`;
                return;
            }

            // Display only the first 10 initially
            const initialData = leagueData.slice(0, 10);

            // Generate table HTML
            let tableHTML = generateTableHTML(initialData);

            // Display league standings
            middleLayer.innerHTML = `
                <div class="league-table">
                    <div class="league-headers">           
                        <img src="${leagueData[0].league_logo || 'assets/images/default-logo.png'}" alt="${leagueName} Logo" class="league-logo">
                        <div class="league-details">
                            <h3 class="league-name">${leagueName}</h3>
                            <p class="league-country">${leagueData[0].country_name}</p>
                        </div>
                        <div class="more-league-table">
                            <ion-icon name="arrow-forward-outline"></ion-icon>
                            <span class="see-more-text">See More</span>
                        </div>
                    </div>
                    <div class="league-tables-details">
                        ${tableHTML}
                    </div>
                </div>
            `;

            // Event listener for See More / See Less
            const seeMoreButton = document.querySelector(".more-league-table");
            let expanded = false;

            seeMoreButton.addEventListener("click", (event) => {
                event.stopPropagation(); // Prevent sidebar from closing
                expanded = !expanded;
                const leagueTablesDetails = document.querySelector(".league-tables-details");

                if (expanded) {
                    leagueTablesDetails.innerHTML = generateTableHTML(leagueData);
                    seeMoreButton.querySelector(".see-more-text").textContent = "See Less";
                    seeMoreButton.querySelector("ion-icon").setAttribute("name", "arrow-back-outline");
                } else {
                    leagueTablesDetails.innerHTML = generateTableHTML(initialData);
                    seeMoreButton.querySelector(".see-more-text").textContent = "See More";
                    seeMoreButton.querySelector("ion-icon").setAttribute("name", "arrow-forward-outline");
                }
            });
        })
        .catch(error => console.error("Error fetching league table:", error));
}

// Prevent sidebar from collapsing when clicking .leag-count or .more-league-table
document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".leag-count, .more-league-table").forEach(element => {
        element.addEventListener("click", (event) => {
            event.stopPropagation(); // Stop the click from affecting the sidebar
        });
    });
});


 
 // Helper function to generate league table
 function generateTableHTML(teams) {
     teams.sort((a, b) => b.overall_league_PTS - a.overall_league_PTS);
 
     let tableHTML = `
         <div class="table-headers">
             <span class="position-header">Pos</span>
             <span class="team-name-header">Team</span>
             <span class="stat-header">P</span>
             <span class="stat-header">W</span>
             <span class="stat-header">D</span>
             <span class="stat-header">L</span>
             <span class="stat-header">PTS</span>
         </div>
     `;
 
     teams.forEach((team, index) => {
         tableHTML += `
             <div class="team-rows">
                 <span class="team-position">${index + 1}</span>
                 <div class="team-infos">
                     <img src="${team.team_badge || 'assets/images/default-team-logo.png'}" alt="${team.team_name} Logo" class="team-logo">
                     <span class="teamLeague-name">${team.team_name}</span>
                 </div>
                 <span class="team-stat">${team.overall_league_payed}</span>
                 <span class="team-stat">${team.overall_league_W}</span>
                 <span class="team-stat">${team.overall_league_D}</span>
                 <span class="team-stat">${team.overall_league_L}</span>
                 <span class="team-stat">${team.overall_league_PTS}</span>
             </div>
         `;
     });
 
     return tableHTML;
 }
 

  




/*............................live match page........................*/

    
// List of leagues to display
const leaguesSelected = {
    "Premier League": { league_id: 152, country: "England" },
    "La Liga": { league_id: null, country: "Spain" },
    "Ligue 1": { league_id: null, country: "France" },
    "Ligue 2": { league_id: null, country: "France" },
    "Serie A": { league_id: null, country: "Italy" },
    "NPFL": { league_id: null, country: "Nigeria" },
    "Bundesliga": { league_id: null, country: "Germany" },
    "UEFA Champions League": { league_id: null, country: "eurocups" },
    "Africa Cup of Nations Qualification": { league_id: null, country: "intl" }
};

function displayMatches(leagueName, category) {
    const leagueData = leaguesSelected[leagueName];
    if (!leagueData) {
        console.error(`League data for ${leagueName} not found.`);
        return;
    }

    // Get the matches for the specific league from matchesData
    let selectedMatches = matchesData[category] || [];
    console.log(`Matches data for category '${category}':`, selectedMatches);

    // Filter matches based on league_id
    let filteredMatches = selectedMatches.filter(match => match.league_id === leagueData.league_id);
    console.log(`Filtered Matches for League: ${leagueName}, Category: ${category}:`, filteredMatches);

    // Render the matches if available
    if (filteredMatches.length > 0) {
        fetchMatches(filteredMatches, category, leagueName);
    } else {
        console.log(`No matches found for League: ${leagueName}, Category: ${category}`);
    }
}


// Fetch leagues and update the DOM
fetch(`https://apiv3.apifootball.com/?action=get_leagues&APIkey=${APIkey}`)
  .then(response => response.json())
  .then(leagues => {
    const liveMatchesContainer = document.querySelector(".matches-live-ongoing");

    if (!liveMatchesContainer) {
        console.error("Error: .matches-live-ongoing container not found.");
        return;
    }

    liveMatchesContainer.innerHTML = ""; // Clear existing content

    leagues.forEach(league => {
      const leagueName = league.league_name.trim();
      const leagueCountry = league.country_name.trim().toLowerCase();

      // Check if the league is in the selected list and country matches
      if (leaguesSelected[leagueName] && leaguesSelected[leagueName].country.toLowerCase() === leagueCountry) {
        // Assign correct league ID dynamically
        leaguesSelected[leagueName].league_id = league.league_id;

        const leagueElement = document.createElement("div");
        leagueElement.classList.add("leagues-matches");

        leagueElement.innerHTML = `
          <div class="leag-country">
              <img src="${league.league_logo || 'assets/images/default-league.png'}" alt="${league.league_name} Logo">
              <div class="league-info">
                  <h3>${league.league_name}</h3>
                  <p>${league.country_name}</p>
              </div>
          </div>
          <div class="arrow-direct">
              <img src="assets/icons/Arrow - Right 2.png" alt="Arrow">
          </div>
        `;

        // Add event listener for displaying matches
        leagueElement.addEventListener("click", function () {
          console.log(`League clicked: ${leagueName}`);
          displayMatches(leagueName, "live");
        });

        liveMatchesContainer.appendChild(leagueElement);
      }
    });
  })
  .catch(error => console.error("Error fetching leagues:", error));



// Function to fetch matches
async function fetchMatches(dateString) {
    if (typeof APIkey === "undefined" || !APIkey) {
        console.error("❌ ERROR: APIkey is not defined! Fetch request failed.");
        return;
    }

    try {
        const response = await fetch(`https://apiv3.apifootball.com/?action=get_events&from=${getTodayDate(0)}&to=${getTodayDate(0)}&APIkey=${APIkey}`);
        const data = await response.json();

        if (!Array.isArray(data)) {
            console.error("❌ Invalid match data format received from API.");
            return;
        }

        console.log(`📅 Matches for ${dateString}:`, data);
        updateMatches(data);
    } catch (error) {
        console.error("❌ Fetch error:", error);
    }
}

// Call fetchMatches on page load
fetchMatches();


let matchesData = {};


// Process and Display Matches
function updateMatches(matches) {
    console.log("⚽ Raw Matches Data:", matches);  // ✅ Log all matches received

    if (!matchesData.live) matchesData.live = []; // ✅ Ensure live matches exist

    matches.forEach(newMatch => {  // ✅ Fix undefined variable
        let matchIndex = matchesData.live.findIndex(m => m.match_id === newMatch.match_id);

        if (matchIndex !== -1) {
            // ✅ Update the existing match score
            matchesData.live[matchIndex].match_hometeam_score = newMatch.match_hometeam_score;
            matchesData.live[matchIndex].match_awayteam_score = newMatch.match_awayteam_score;
            matchesData.live[matchIndex].match_status = newMatch.match_status;
        } else {
            // ✅ Add new match if not in the list
            matchesData.live.push(newMatch);
        }
    });

    console.log("Updated matchesData.live:", matchesData.live); // Check the live matches data

    // Filter Highlight Matches (Ended)
    let highlightMatches = matches.filter(match => {
        let status = match.match_status?.trim().toLowerCase() || "";
        let now = new Date(); // Get the current date to compare with match date
        let matchDateTime = match.match_date && match.match_time ? new Date(`${match.match_date} ${match.match_time}`) : null;

        // Ensure we're checking finished matches and they are from today
        let isFinished = status === "ft" || status === "finished" || status.includes("after") || status.includes("pen") || 
                         (parseInt(status) >= 90); // Also consider numeric values for full-time (90+ minutes)
                         
        // If the match is finished and the date is today, include it in highlights
        return isFinished && matchDateTime && matchDateTime.toDateString() === now.toDateString();
    });

    // Filter Upcoming Matches (Matches not live and starting in the future)
    let upcomingMatches = matches.filter(match => {
        let status = match.match_status?.trim().toLowerCase() || "";
        let now = new Date(); // Current time
        let matchDateTime = match.match_date && match.match_time ? new Date(`${match.match_date} ${match.match_time}`) : null;

        // A match should be considered "upcoming" if:
        // 1. The match is in the future (its date/time is after the current time)
        // 2. The match is not live (status does not indicate the match is ongoing)
        return matchDateTime && matchDateTime > now && 
               (status === "not started" || status === "scheduled" || status === "ns" || status === "" || status === "0");
    });

    console.log("✅ Highlight Matches Found:", highlightMatches);
    console.log("✅ Upcoming Matches Found:", upcomingMatches);

    matchesData = {
        live: matches.filter(match => {
            let statusNum = parseInt(match.match_status) || 0; 
            return statusNum > 0 && statusNum < 90;
        }),
        highlight: highlightMatches,
        upcoming: upcomingMatches
    };

    console.log("Final matchesData:", matchesData); // Verify final matchesData object
    renderMatches(matchesData, "live"); // Render the upcoming matches
}


function filterByDate() {
    const dateInput = document.getElementById("match-date");
    const selectedDate = dateInput.value; // Format: YYYY-MM-DD

    if (!selectedDate) return;

    updateMatches(selectedDate);
}

function toggleCalendar() {
    const dateInput = document.getElementById("match-date");

    if (dateInput.style.display === "none" || dateInput.style.display === "") {
        dateInput.style.display = "block";
        dateInput.focus();
        dateInput.click(); // Optional: triggers native date picker popup
    } else {
        dateInput.style.display = "none";
    }
}



// Display Matches
function renderMatches(matchesData, category) {
    let matchesContainer = document.querySelector(".matches");
    let selectedMatches = matchesData[category];

    if (!selectedMatches || selectedMatches.length === 0) {
        matchesContainer.innerHTML = "<p>No matches available.</p>";
        return;
    }

    let groupedMatches = selectedMatches.reduce((acc, match) => {
        let leagueKey = match.league_id || "Unknown League";
        if (!acc[leagueKey]) {
            acc[leagueKey] = {
                league: match.league_name,
                country: match.country_name,
                league_logo: match.league_logo,
                matches: [],
            };
        }
        acc[leagueKey].matches.push(match);
        return acc;
    }, {});

    let matchesHTML = "";
    let firstLeague = true;

    Object.values(groupedMatches).forEach(league => {
        matchesHTML += `
        <div class="league-header">
            <img src="${league.league_logo || 'assets/images/default-league.png'}" alt="${league.league} Logo" class="league-logo">
            <div class="league-titleCountry">
                <h4 class="league-title">${league.league}</h4>
                <span class="league-country">${league.country}</span>
            </div>
             <div class="more-league" onclick="toggleLeagueMatches('${league.league}')">
                    <ion-icon name="arrow-forward-outline"></ion-icon>
                    <a href="#" id="toggle-${league.league}">See All</a>
                </div>
        </div>
        <div class="league-container ${firstLeague ? "first-league" : "other-league"}">`;

        if (firstLeague) {
            matchesHTML += `
            <div class="matches-header">
                <div class="match-category-btn ${category === 'live' ? 'active' : ''}" onclick="renderMatches(matchesData, 'live')">Live</div>
                <div class="match-category-btn ${category === 'highlight' ? 'active' : ''}" onclick="renderMatches(matchesData, 'highlight')">Highlight</div>
                <div class="match-category-btn ${category === 'upcoming' ? 'active' : ''}" onclick="renderMatches(matchesData, 'upcoming')">Upcoming</div>
               
               <!-- Calendar icon and popup container -->
                <div class="calendar-wrapper" style="position: relative;">
                   <div class="match-category-btn calendar" onclick="toggleCalendar()">
                   <ion-icon name="calendar-outline"></ion-icon>
                   </div>
                  <input type="date" id="match-date" onchange="filterByDate()" style="display: none;">
                </div>


            </div>`;
            firstLeague = false;
        }

        matchesHTML += `<div class="match-category-content">`;

        league.matches.forEach(match => {
            let matchTimeDisplay = category === "highlight" ? "FT" : match.match_status || match.match_time;

            matchesHTML += `
            <div class="matches-item" data-match-id="${match.match_id}" onclick="displayLiveMatch('${match.match_id}', '${category}')">
                <div class="matches-teams">
                    <div class="matches-time">${matchTimeDisplay}</div>
                    <div class="matches-datas">
                        <div class="matches-team">
                            <img src="${match.team_home_badge}" alt="${match.match_hometeam_name} Logo">
                            <span>${match.match_hometeam_name}</span>
                        </div>
                        <div class="matches-team">
                            <img src="${match.team_away_badge}" alt="${match.match_awayteam_name} Logo">
                            <span>${match.match_awayteam_name}</span>
                        </div>
                    </div>
                    <div class="matches-scores">
                        <div class="score">${match.match_hometeam_score ?? "-"}</div>
                        <div class="score">${match.match_awayteam_score ?? "-"}</div>
                    </div>
                </div>
            </div>`;
        });

        matchesHTML += `</div></div>`;
    });

    matchesContainer.innerHTML = matchesHTML;
}

// Function to fetch match video (unchanged)
async function fetchMatchVideo(matchId) {
    try {
        let response = await fetch(`https://apiv3.apifootball.com/?action=get_videos&match_id=${matchId}&APIkey=${APIkey}`);
        let data = await response.json();

        console.log("🎥 Video Data:", data);

        if (Array.isArray(data) && data.length > 0) {
            return data[0].video_url; // Assuming the first video is the main highlight
        } else {
            return null;
        }
    } catch (error) {
        console.error("❌ Error fetching match video:", error);
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

    if (!match) {
        console.error(`Match with ID ${matchId} not found in ${category}`);
        return;
    }

    let videoUrl = await fetchMatchVideo(matchId); // Fetch video URL

    let matchesContainer = document.querySelector(".matches");
     if (videoUrl) {
        matchesContainer.innerHTML = `
        <div class="live-match">
            <iframe width="100%" height="300px" src="${videoUrl}" frameborder="0" allowfullscreen></iframe>
            <div class="live-match-teams">
                <div class="live-match-team">
                    <img src="${match.team_home_badge || 'assets/images/default-team.png'}" alt="${match.match_hometeam_name} Logo">
                    <span>${match.match_hometeam_name}</span>
                </div>
                <div class="match-time-scores">
                    <h3 class="league-name">${match.league_name}</h3>
                    <div class="scores">${match.match_hometeam_score ?? '-'} - ${match.match_awayteam_score ?? '-'}</div>
                     <div class="live-match-status">
                       <img src="${ellipseImg}" alt="Match Status Icon" class="match-status-icon">
                        <div class="live-match-time">${match.match_status}</div> 
                    </div>
                </div>
                <div class="live-match-team">
                    <img src="${match.team_away_badge || 'assets/images/default-team.png'}" alt="${match.match_awayteam_name} Logo">
                    <span>${match.match_awayteam_name}</span>
                </div>
            </div>
            <div class="live-match-info">
                <div class="match-tabs">
                    <button class="tab-btn active" data-tab="info">Info</button>
                    <button class="tab-btn" data-tab="lineups">Line-ups</button>
                    <button class="tab-btn" data-tab="h2h">H2H</button>
                </div>
                <img src="assets/images/Ad5.png" alt="Ad5" class="ad5-logo">
                <div class="tab-content" id="tab-content">
                    ${getTabContent("info", match)}
                </div>
            </div>
        </div>`;
    } else {
        matchesContainer.innerHTML = `
        <div class="live-match">
            <div class="no-video-message">
                No video available for the match.
            </div>
            <div class="live-match-teams">
                <div class="live-match-team">
                    <img src="${match.team_home_badge || 'assets/images/default-team.png'}" alt="${match.match_hometeam_name} Logo">
                    <span>${match.match_hometeam_name}</span>
                </div>
                <div class="match-time-scores">
                    <h3 class="league-name">${match.league_name}</h3>
                    <div class="scores">${match.match_hometeam_score ?? '-'} - ${match.match_awayteam_score ?? '-'}</div>
                    <div class="live-match-time">${match.match_status}</div>
                </div>
                <div class="live-match-team">
                    <img src="${match.team_away_badge || 'assets/images/default-team.png'}" alt="${match.match_awayteam_name} Logo">
                    <span>${match.match_awayteam_name}</span>
                </div>
            </div>
            <div class="live-match-info">
                <div class="match-tabs">
                    <button class="tab-btn active" data-tab="info">Info</button>
                    <button class="tab-btn" data-tab="lineups">Line-ups</button>
                    <button class="tab-btn" data-tab="h2h">H2H</button>
                </div>
                <img src="assets/images/Ad5.png" alt="Ad5" class="ad5-logo">
                <div class="tab-content" id="tab-content">
                    ${getTabContent("info", match)}
                </div>
            </div>
        </div>`;
    }

     // Add event listeners to the tabs
     document.querySelectorAll(".tab-btn").forEach(button => {
        button.addEventListener("click", function () {
            document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
            this.classList.add("active");
    
            const tabContentDiv = document.getElementById("tab-content");
            if (!tabContentDiv) {
                console.error("❌ ERROR: #tab-content div not found!");
                return;
            }
    
            tabContentDiv.innerHTML = getTabContent(this.dataset.tab, match);
    
            if (this.dataset.tab === "h2h") {
                // Fetch and render H2H data
                renderH2HMatches(match, APIkey);
            }
    
            if (this.dataset.tab === "lineups") {
                generatePositions(match.match_hometeam_name, "left");
                generatePositions(match.match_awayteam_name, "right");
                renderLineup(match); // Make sure this is called for rendering the players
            }
        });
    });    
}

  

// Function to update tab content dynamically
function getTabContent(tab, match) {
 
    switch (tab) {
        case "info":
            return `
                <div class="info-match-container">
                    <h3>Match Info</h3>
                    <div class="info-teamNames">
                        <h4>${match.match_hometeam_name}</h4> vs <h4>${match.match_awayteam_name}</h4>
                    </div>
                    <div class="infoMatch-details">
                        <div class="infoLeft-wing">
                            <p><strong><img src="assets/icons/arrow-colorIcon.png" class="info-colorIcon"></strong> ${match.match_time}</p>
                            <p><strong><img src="assets/icons/calender-colorIcon.png" class="info-colorIcon"></strong> ${match.match_date}</p>
                        </div>
                        <div class="infoRight-wing">
                            <p><strong><img src="assets/icons/gprIcon.png" class="info-colorIcon"></strong> ${match.venue_name || "Not available"}</p>
                            <p><strong><img src="assets/icons/locationIcon.png" class="info-colorIcon"></strong> ${match.country_name || "Not available"}</p>
                        </div>
                    </div>
                </div>

                <div class="lineup-players-names">
                    <h4>Players</h4>
                    <div class="lineUp-cont">
                        <div class="lineup-home-players">
                            <h4>${match.match_hometeam_name}</h4>
                            <ul>
                                ${
                                    match.lineup?.home?.starting_lineups?.length 
                                    ? match.lineup.home.starting_lineups.map(player => `
                                        <li>
                                            <span class="listed-player-number">${player.lineup_number || "-"}</span>
                                            <span class="listed-player-name">${player.lineup_player || "Unknown"}</span>
                                        </li>
                                    `).join("")
                                    : "<p>No lineup available</p>"
                                }
                            </ul>
                            <h4>Substitutes</h4>
                            <ul>
                                ${
                                    match.lineup?.home?.substitutes?.length 
                                    ? match.lineup.home.substitutes.map(player => `
                                        <li>
                                            <span class="listed-player-number">${player.lineup_number || "-"}</span>
                                            <span class="listed-player-name">${player.lineup_player || "Unknown"}</span>
                                        </li>
                                    `).join("")
                                    : "<p>No substitutes available</p>"
                                }
                            </ul>
                        </div>
                        <div class="lineup-away-players">
                            <h4>${match.match_awayteam_name}</h4>
                            <ul>
                                ${
                                    match.lineup?.away?.starting_lineups?.length 
                                    ? match.lineup.away.starting_lineups.map(player => `
                                        <li>
                                            <span class="listed-player-number">${player.lineup_number || "-"}</span>
                                            <span class="listed-player-name">${player.lineup_player || "Unknown"}</span>
                                        </li>
                                    `).join("")
                                    : "<p>No lineup available</p>"
                                }
                            </ul>
                            <h4>Substitutes</h4>
                            <ul>
                                ${
                                    match.lineup?.away?.substitutes?.length 
                                    ? match.lineup.away.substitutes.map(player => `
                                        <li>
                                            <span class="listed-player-number">${player.lineup_number || "-"}</span>
                                            <span class="listed-player-name">${player.lineup_player || "Unknown"}</span>
                                        </li>
                                    `).join("")
                                    : "<p>No substitutes available</p>"
                                }
                            </ul>
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
                            <h4>${match.match_hometeam_system || "Unknown Formation"}</h4>
                        </div>
                    </div>
                    <div class="lineUpsteam-info">
                        <div class="team-formation">
                            <h3>${match.match_awayteam_name}</h3>
                            <h4>${match.match_awayteam_system || "Unknown Formation"}</h4>
                        </div>
                        <img src="${match.team_away_badge}" alt="${match.match_awayteam_name}" class="lineUpsteam-logo">
                    </div>
                </div>

                 <div id="football-field" class="field">
                   <div class="goalpost home-goalpost"></div>
                   <div class="penalty-box home-box"></div>
                   <div class="penalty-arc home-arc"></div>
  
                   <div id="home-formation" class="formation-area"></div>

                   <div class="center-circle"></div>
                    <div class="center-line"></div>

                   <div id="away-formation" class="formation-area"></div>

                    <div class="goalpost away-goalpost"></div>
                   <div class="penalty-box away-box"></div>
                  <div class="penalty-arc away-arc"></div>
                 </div>

            
                <div class="lineup-players-names">
                    <h4>Players</h4>
                    <div class="lineUp-cont">
                        <div class="lineup-home-players">
                            <h4>${match.match_hometeam_name}</h4>
                            <ul>
                                ${match.lineup?.home?.starting_lineups?.length 
                                    ? match.lineup.home.starting_lineups.map(player => `
                                        <li>
                                            <span class="listed-player-number">${player.lineup_number || "-"}</span>
                                            <span class="listed-player-name">${player.lineup_player || "Unknown"}</span>
                                        </li>
                                    `).join("")
                                    : "<p>No lineup available</p>"
                                }
                            </ul>
                            <h4>Substitutes</h4>
                            <ul>
                                ${match.lineup?.home?.substitutes?.length 
                                    ? match.lineup.home.substitutes.map(player => `
                                        <li>
                                            <span class="listed-player-number">${player.lineup_number || "-"}</span>
                                            <span class="listed-player-name">${player.lineup_player || "Unknown"}</span>
                                        </li>
                                    `).join("")
                                    : "<p>No substitutes available</p>"
                                }
                            </ul>
                        </div>

            
                        <div class="lineup-away-players">
                            <h4>${match.match_awayteam_name}</h4>
                            <ul>
                                ${match.lineup?.away?.starting_lineups?.length 
                                    ? match.lineup.away.starting_lineups.map(player => `
                                        <li>
                                            <span class="listed-player-number">${player.lineup_number || "-"}</span>
                                            <span class="listed-player-name">${player.lineup_player || "Unknown"}</span>
                                        </li>
                                    `).join("")
                                    : "<p>No lineup available</p>"
                                }
                            </ul>
                            <h4>Substitutes</h4>
                            <ul>
                                ${match.lineup?.away?.substitutes?.length 
                                    ? match.lineup.away.substitutes.map(player => `
                                        <li>
                                            <span class="listed-player-number">${player.lineup_number || "-"}</span>
                                            <span class="listed-player-name">${player.lineup_player || "Unknown"}</span>
                                        </li>
                                    `).join("")
                                    : "<p>No substitutes available</p>"
                                }
                            </ul>
                        </div>
                    </div>
                </div>
                `;
            
        
                case "h2h":
                return `
                  <div class="h2h-header">
                  <h3>H2H</h3>
                  <h4>${match.match_hometeam_name}</h4>
                  <h4>${match.match_awayteam_name}</h4>
                </div>
                 <div class="h2h-header-line"></div>
                 <div class="h2h-matches-container" id="h2h-matches">Loading head-to-head matches...</div>
               `;

        default:
            return "<p>No data available.</p>";
    }
}


async function renderH2HMatches(match, APIkey) {
    const firstTeamId = match.match_hometeam_id;
    const secondTeamId = match.match_awayteam_id;

    const h2hData = await fetchH2HData(firstTeamId, secondTeamId, APIkey);
    const h2hContainer = document.getElementById("h2h-matches");

    if (!Array.isArray(h2hData) || h2hData.length === 0) {
        h2hContainer.innerHTML = "<p>No head-to-head data available.</p>";
        return;
    }

    h2hContainer.innerHTML = h2hData.map(game => `
        <div class="h2h-match">
            <div class="h2h-time">
                <span class="match-time">${game.match_date}</span>
                <span class="match-ft">${game.match_status === "Finished" ? "FT" : game.match_status}</span>
            </div>
            <div class="h2h-right">
                <div class="h2h-team-data">
                    <div class="h2h-team">
                        <img src="${game.team_home_badge}" alt="${game.match_hometeam_name}" class="h2h-logo">
                        <span class="h2h-team-name">${game.match_hometeam_name}</span>
                    </div>
                    <div class="h2h-team">
                        <img src="${game.team_away_badge}" alt="${game.match_awayteam_name}" class="h2h-logo">
                        <span class="h2h-team-name">${game.match_awayteam_name}</span>
                    </div>
                </div>
                <div class="h2h-matches-scores">
                    <div class="score">${game.match_hometeam_score}</div>
                    <div class="score">${game.match_awayteam_score}</div>
                </div>
            </div>
        </div>
    `).join("");
}



async function fetchH2HData(firstTeamId, secondTeamId, APIkey) {
    try {
        const response = await fetch(`https://apiv3.apifootball.com/?action=get_H2H&firstTeamId=${firstTeamId}&secondTeamId=${secondTeamId}&APIkey=${APIkey}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching H2H data:", error);
        return [];
    }
}

  
  
  // Function to switch tabs
  window.showTab = function (tab, league, matchIndex, category) {
      const match = matchesData[league]?.[category]?.[matchIndex];
      if (!match) return;
  
      const tabContent = document.getElementById("tab-content");
      tabContent.innerHTML = generateTabContent(tab, match);
  };
  
  
  
  
  //This fetches the home and away players
  async function renderLineup(match) {
    const homePlayers = match.lineup?.home?.starting_lineups || [];
    const awayPlayers = match.lineup?.away?.starting_lineups || [];

    console.log("Rendering lineup...");
    console.log("Home Players:", homePlayers);
    console.log("Away Players:", awayPlayers);

    const homeFormation = match.match_hometeam_system?.split("-") || ["4", "4", "2"];
    const awayFormation = match.match_awayteam_system?.split("-") || ["4", "4", "2"];

    const homeFormationDiv = document.getElementById("home-formation");
    const awayFormationDiv = document.getElementById("away-formation");

    homeFormationDiv.innerHTML = "";
    awayFormationDiv.innerHTML = "";

    const homePositions = generatePositions(homeFormation, "home");
    const awayPositions = generatePositions(awayFormation, "away");


    homePlayers.forEach((player, index) => {
        const position = homePositions[index];
        if (position) {
            const playerEl = createPlayerElement(player, position);
            homeFormationDiv.appendChild(playerEl);
        }
    });

    awayPlayers.forEach((player, index) => {
        const position = awayPositions[index];
        if (position) {
            const playerEl = createPlayerElement(player, position);
            awayFormationDiv.appendChild(playerEl);
        }
    });
}



//This function takes the formation
function generatePositions(formation, side) {
    const positions = [];
    const rows = formation.map(num => parseInt(num, 10));
    const rowHeight = 60;
    const colSpacing = 80;
    const topOffset = side === "home" ? 50 : 400;

    rows.forEach((playersInRow, rowIndex) => {
        const y = topOffset + rowIndex * rowHeight;
        const spacing = 100 / (playersInRow + 1);
        for (let i = 0; i < playersInRow; i++) {
            const x = spacing * (i + 1);
            positions.push({ top: y, left: x + "%" });
        }
    });

    return positions;
}


  //function to create players
  function createPlayerElement(player, position) {
    const playerDiv = document.createElement("div");
    playerDiv.classList.add("player");

    playerDiv.style.position = "absolute";
    playerDiv.style.top = `${position.top}px`;
    playerDiv.style.left = `${position.left}px`;

    playerDiv.innerHTML = `
        <img src="${player.lineup_player_image || ''}" alt="${player.lineup_player}" />
        <p>${player.lineup_player}</p>
    `;

    return playerDiv;
}














/*...........................predition page................................*/

function formatDateTime(dateStr, timeStr) {
  const date = new Date(`${dateStr}T${timeStr}`);
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  const formattedDate = date.toLocaleDateString('en-US', options);
  const formattedTime = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${formattedDate} | ${formattedTime}`;
}


const matches = [
  { date: "2024-12-04", time: "14:00", league: "Premier League", leagueLogo: "assets/images/premier-leagueLogo.png", teams: [
      { name: "Man U", logo: "assets/images/manuLogo.png" },
      { name: "Chelsea", logo: "assets/images/chelsea-logo.png" }
  ] },
  { date: "2024-12-04", time: "16:30", league: "La Liga", leagueLogo: "assets/images/laliga-logo.png", teams: [
      { name: "Real Madrid", logo: "assets/images/real-madrid.png" },
      { name: "Barcelona", logo: "assets/images/barcelona-logo.png" }
  ] },
  {  date: "2024-12-04", time: "18:45", league: "Serie A", leagueLogo: "assets/images/series-alogo.png", teams: [
      { name: "Juventus", logo: "assets/images/juventus-logo.png" },
      { name: "Manchester United", logo: "assets/images/manuLogo.png" }
  ] },
  {  date: "2024-12-04", time: "20:00", league: "Bundesliga", leagueLogo: "assets/images/bundeskiga-logo.png", teams: [
      { name: "Bayern Munich", logo: "assets/images/bayern-logo.png" },
      { name: "Juventus", logo: "assets/images/juventus-logo.png" }
  ] },
  {  date: "2024-12-04", time: "22:15", league: "NPFL", leagueLogo: "assets/images/npfl-logo.png", teams: [
      { name: "PSG", logo: "assets/images/psg-logo.png" },
      { name: "Bayern Munich", logo: "assets/images/bayern-logo.png" }
  ] }
];

const container = document.getElementById("predictionsContainer");

        
        matches.forEach(match => {
            const matchDiv = document.createElement("div");
            matchDiv.classList.add("match-preditions");
            
            matchDiv.innerHTML = `
            <div class="preditions-container">
                <div class="match-league-container">
                    <img src="${match.leagueLogo}" alt="${match.league}" class="predit-league-logo">
                    <span>${match.league}</span>
                </div>
                <div class="predit-info-container">
                    <div class="match-teams-container">
                        ${match.teams.map(team => `
                              <div class="team-predit">
                                  <img src="${team.logo}" alt="${team.name}" class="team-logo">
                                  <span>${team.name}</span>
                                  <button class="score-button" onclick="togglePrediction('${match.time.replace(':', '')}', '${team.name}')">Win</button>
                              </div>
                          `).join('')}
                    </div>
                </div>
                  <div class="prediction-info" id="predictionInfo-${match.time.replace(':', '')}"></div>
                <div class="date-times" onclick="toggleArrow('${match.time.replace(':', '')}')">
                    <span>${formatDateTime(match.date, match.time)}</span>
                    <img id="arrow-${match.time.replace(':', '')}" src="assets/icons/button-down.png" alt="toggle-arrow">        
                    </div> 
                 </div>
            `;
            
            container.appendChild(matchDiv);
        });

        let selectedTeam = {}; // Store the selected team for each

        function togglePrediction(matchTime, teamName) {
          const info = document.getElementById(`predictionInfo-${matchTime}`);
          const arrow = document.getElementById(`arrow-${matchTime}`);
          const isVisible = info.style.display === "flex";
          
          if (!isVisible && teamName) {
            selectedTeam[matchTime] = teamName; // Store selected team
            info.innerHTML = `
            <div class="scores-input">
                <span>Enter Score:</span>
                <input type="text" id="scoreInput-${matchTime}" placeholder="2-1" 
                    oninput="validateScoreInput(this)">
            </div>
            <!-- Horizontal Line -->
            <div class="score-stroke"></div>
            <div class="team-win-name"><span>${teamName} to Win</span> 
            <div class="predit-amount">
            <span>$100</span>
            </div>
            </div>
            <p class="error-message" id="error-${matchTime}">Please enter a valid score (e.g., 2-1).</p>
            <button class="submit-button" onclick="confirmSubmit('${matchTime}')">
                <img src="assets/icons/arrow-up.png" alt="toggle-arrow"> Submit Prediction
            </button>`;
        }
          
          info.style.display = isVisible ? "none" : "flex";
          arrow.src = isVisible ? "assets/icons/button-down.png" : "assets/icons/button-up.png";
      }

      // Validate score input
      function validateScoreInput(input) {
        let value = input.value.replace(/[^0-9-]/g, ''); // Allow only numbers and '-'
    
        // Automatically insert '-' after the first digit
        if (value.length === 2 && value[1] !== '-') {
            value = value[0] + '-' + value[1];
        }
    
        // Ensure only one '-'
        const parts = value.split('-');
        if (parts.length > 2) {
            value = parts[0] + '-' + parts[1]; // Keep only first valid split
        }
    
        input.value = value; 
    }
    

// Confirmation popup
      function confirmSubmit(matchTime) {
        console.log("Match Time:", matchTime);
    
        const scoreInputElement = document.getElementById(`scoreInput-${matchTime}`);
        if (!scoreInputElement) {
            console.error(`Element #scoreInput-${matchTime} not found!`);
            return;
        }
    
        const scoreInput = scoreInputElement.value.trim();
        if (!/^\d+-\d+$/.test(scoreInput)) {
            document.getElementById(`error-${matchTime}`).style.display = "block";
            return;
        }
    
        const match = matches.find(m => m.time.replace(':', '') === matchTime);
        if (!match) {
            console.error("Match not found for time:", matchTime);
            return;
        }
    
    
        console.log("Match Found:", match);
    
        let confirmationPopup = document.getElementById("confirmationPopup");
        if (!confirmationPopup) {
            console.error("Confirmation popup element not found! Creating one...");
            confirmationPopup = document.createElement("div");
            confirmationPopup.id = "confirmationPopup";
            confirmationPopup.className = "confirmation-popup";
            document.body.appendChild(confirmationPopup);
        }
    
        // Split score into individual values
        const [score1, score2] = scoreInput.split("-").map(Number);
          const winningTeam = selectedTeam[matchTime];
          let team1Score, team2Score;

        // Assign scores correctly based on the selected winning team
    if (winningTeam === match.teams[0].name) {
      team1Score = Math.max(score1, score2);
      team2Score = Math.min(score1, score2);
  } else {
      team1Score = Math.min(score1, score2);
      team2Score = Math.max(score1, score2);
  }
    
        confirmationPopup.innerHTML = `
            <div class="confirmation-content">
                <div class="confirmation-header">
                Confirm Prediction
                 <button class="cancel-btn" onclick="closePopup()">
                  <ion-icon name="close-outline" class="cross-icon"></ion-icon>
                 </button>
                </div>
                
                <div class="predit-match-details">
                    <div class="predit-teams-container">
                        <div class="team-prediting">
                            <span class="team-prediting-name">${match.teams[0].name}</span>
                            <img src="${match.teams[0].logo}" class="team-prediting-logo">
                        </div>
                        <div class="vs-time">
                          <p class="predit-league-info">${match.league}</p>
                    
                          <div class="vs"><span>VS</span></div>
                            <span>${match.time}</span>
                            
                        </div>
                        <div class="team-prediting-name">
                            <span class="team-prediting-name">${match.teams[1].name}</span>
                            <img src="${match.teams[1].logo}" class="team-prediting-logo">
                        </div>
                    </div>
                     <div class="score-container">
                       <span class="score-selected">${team1Score}</span>
                       <span class="score-selected">${team2Score}</span>
                    </div>
                </div>
                <div class="confirmation-buttons">
                <span>$100</span>
                <button class="submit-btn" onclick="submitFinal('${matchTime}', ${team1Score}, ${team2Score})">
                <img src="assets/icons/arrow-up.png" alt="arrow-up" width="16">
                Submit Now</button>
            </div>
            </div>
        `;
    
        
        confirmationPopup.style.display = "block";
        document.body.classList.add("blurred"); // Apply blur effect to the background
    }
    
    

    function toggleArrow(matchTime) {
      if (selectedMatch === matchTime) {
          const info = document.getElementById(`predictionInfo-${matchTime}`);
          const arrow = document.getElementById(`arrow-${matchTime}`);
          const isVisible = info.style.display === "flex";
          info.style.display = isVisible ? "none" : "flex";
          arrow.src = isVisible ? "assets/icons/arrow-down.png" : "assets/icons/arrow-up.png";
      }
  }

// Submitting final prediction
function submitFinal(matchTime, team1Score, team2Score) {
  console.log(`Submitting Prediction: ${matchTime}, ${team1Score}-${team2Score}`);

  // Send data to server or database
  const predictionData = {
      matchTime: matchTime,
      team1: matches.find(m => m.time.replace(':', '') === matchTime).teams[0].name,
      team2: matches.find(m => m.time.replace(':', '') === matchTime).teams[1].name,
      team1Score: team1Score,
      team2Score: team2Score,
      amount: 100
  };

  console.log("Prediction Data:", predictionData);

      // Ensure confirmation popup is completely removed
      const confirmationPopup = document.getElementById("confirmationPopup");
      if (confirmationPopup) {
          confirmationPopup.style.display = "none"; // Hide it
      }
  

  // Here, you would send the data to your backend using fetch or an API call.
  // Example:
  // fetch('/submit-prediction', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify(predictionData)
  // }).then(response => response.json())
  //   .then(data => console.log("Server Response:", data))
  //   .catch(error => console.error("Error submitting prediction:", error));

  // Show success message
  showSuccessPopup();
}


// Function to show success message
function showSuccessPopup() {
  // First, remove any existing success popups to prevent duplicates
  const existingPopup = document.getElementById("successPopup");
  if (existingPopup) {
      existingPopup.remove();
  }

  const successPopup = document.createElement("div");
  successPopup.id = "successPopup";
  successPopup.className = "success-popup";
  successPopup.innerHTML = `
      <div class="success-content">
          <img src="assets/icons/mark.png" alt="Success" class="success-icon">
          <h3>Prediction Submitted Successfully!</h3>
          <button onclick="closeSuccessPopup()">OK</button>
      </div>
  `;

  document.body.appendChild(successPopup);
  document.body.classList.add("blurred"); // Apply blur effect to the background
}


// Function to close the success popup and remove blur
function closeSuccessPopup() {
  const successPopup = document.getElementById("successPopup");
  if (successPopup) {
      successPopup.remove();
  }
  document.body.classList.remove("blurred"); // Remove blur effect
}

// Close popup
function closePopup() {
  document.getElementById("confirmationPopup").style.display = "none";
}