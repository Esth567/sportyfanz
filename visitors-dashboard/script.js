
const APIkey = '5608a27e503ab17161c376b5bcbb93d5c562096975dd23f37bb95f3d845ee99c';

//sidebar toggle for web view
function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const container = document.querySelector('.body-container');

    sidebar.classList.toggle("collapsed");
}

document.querySelector('.icon img').addEventListener('click', toggleSidebar);



// Top scorer slider 

const leagueIds = {
    Bundesliga: 195,
    NPFL: 302,
    SerieA: 207,
    Ligue1: 168,
    PremierLeague: 152,
    LaLiga: 302
};

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
            const playerImage = topScorer.player_image || "assets/images/default-player.png";
            const goals = topScorer.goals || "0";
            const teamName = topScorer.team_name || "Unknown Team";

            // Create player item dynamically
            const playerItem = document.createElement("div");
            playerItem.classList.add("player-item");
            if (playerIndex === 0) playerItem.classList.add("active");

            playerItem.innerHTML = `
                <div class="player-image">
                    <img src="${playerImage}" alt="${playerName}" onerror="this.src='assets/images/default-player.png'">
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




// Sample Data for Matches (Including Match Dates)
const matchesData = {
    live: [
        { team1: 'Chelsea', team2: 'Arsenal', time: '5:45pm', country: 'England', date: '2025-01-21', logo1: 'assets/images/chelsea-logo.png', logo2: 'assets/images/arsenalLogo.png' },
        { team1: 'Man U', team2: 'Liverpool', time: '6:30pm', country: 'England', date: '2025-01-22', logo1: 'assets/images/manuLogo.png', logo2: 'assets/images/liverpoolLogo.png' }
    ],
    highlight: [
        { team1: 'Bayern Munich', team2: 'Barcelona', time: '4:00pm', country: 'Germany', date: '2025-01-20', logo1: 'assets/images/bayern-logo.png', logo2: 'assets/images/barcelona-logo.png' },
        { team1: 'PSG', team2: 'Juventus', time: '6:00pm', country: 'France', date: '2025-01-23', logo1: 'assets/images/psg-logo.png', logo2: 'assets/images/juventus.png' }
    ],
    upcoming: [
        { team1: 'Real Madrid', team2: 'Sevilla', time: '8:00pm', country: 'Spain', date: '2025-01-24', logo1: 'assets/images/real-madrid.png', logo2: 'assets/images/sevilla.png' },
        { team1: 'AC Milan', team2: 'Napoli', time: '9:00pm', country: 'Italy', date: '2025-01-25', logo1: 'assets/images/ac-milan.png', logo2: 'assets/images/napoli.png' }
    ]
};

// Function to Show Matches Based on Category
function showMatches(category, event) {
    const buttons = document.querySelectorAll('.category-btn');
    buttons.forEach(button => button.classList.remove('active'));

    // Highlight the active button
    if (event) {
        event.target.classList.add('active');
    }

    const container = document.getElementById('matches-container');
    container.innerHTML = '';

    const matches = matchesData[category];

    if (matches && matches.length > 0) {
        matches.forEach(match => createMatchCard(container, match));
    } else {
        container.innerHTML = `<p>No matches available</p>`;
    }
}

// Function to Create a Match Card
function createMatchCard(container, match, league, matchIndex, category) {
  const matchCard = document.createElement('div');
  matchCard.classList.add('match-card');

  matchCard.innerHTML = `
      <div class="match-details">
          <div class="match-info">
              <div class="Matchteam">
                  <img src="${match.logo1}" alt="${match.team1}">
                  <span>${match.team1}</span>
              </div>
                  
              <h5>vs</h5>

              <div class="Matchteam">
                  <img src="${match.logo2}" alt="${match.team2}">
                  <span>${match.team2}</span>                   
              </div>
          </div>
          <div class="match-time">
              <img src="assets/icons/clock.png" alt="Clock">
              ${match.time}
          </div>
          <div class="match-country">
              <img src="assets/icons/map-pin.png" alt="Map">
              ${match.country}
          </div>
          <button class="view-details-btn" data-league="${league}" data-index="${matchIndex}" data-category="${category}">
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
      console.log(`Clicked: ${match.team1} vs ${match.team2}`); // Debugging log
      displayLiveMatch(league, matchIndex, category);
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
        filteredMatches.forEach(match => createMatchCard(container, match));
    } else {
        container.innerHTML = `<p>No matches found for this date</p>`;
    }
}

// Automatically display 'Live' matches when the page loads
window.onload = function () {
    showMatches('live');

    // Ensure the "Live" button is highlighted as active
    const liveButton = document.querySelector('.category-btn');
    if (liveButton) {
        liveButton.classList.add('active');
    } else {
        console.error("Live category button not found.");
    }
};


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

// Fetch leagues from API
fetch(`https://apiv3.apifootball.com/?action=get_leagues&APIkey=${APIkey}`)
  .then(response => response.json())
  .then(leagues => {
    const matchesContainer = document.querySelector(".matches-live-ongoing");
    matchesContainer.innerHTML = ""; // Clear existing content

    leagues.forEach(league => {
      // Check if the league is in the selected list
      if (leaguesSelected[league.league_name] && leaguesSelected[league.league_name].country === league.country_name) {
        // Assign correct league ID dynamically
        leaguesSelected[league.league_name].league_id = league.league_id; 

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
          displayMatches(league.league_name, "live");
        });

        matchesContainer.appendChild(leagueElement);
      }
    });
  })
  .catch(error => console.error("Error fetching leagues:", error));



  //function to fetch
  document.addEventListener("DOMContentLoaded", function () {
    const matchesContainer = document.querySelector(".matches");

    if (!matchesContainer) {
        console.error("Error: .matches container not found.");
        return;
    }

    async function fetchMatches() {
        try {
            const response = await fetch(
                `https://apiv3.apifootball.com/?action=get_events&from=${getTodayDate(-7)}&to=${getTodayDate()}&APIkey=${APIkey}`
            );
            const data = await response.json();

            if (!Array.isArray(data)) {
                console.error("Unexpected API response:", data);
                return [];
            }
            return data;
        } catch (error) {
            console.error("Error fetching matches:", error);
            return [];
        }
    }

    function getTodayDate(offset = 0) {
        const date = new Date();
        date.setDate(date.getDate() + offset);
        return date.toISOString().split("T")[0];
    }

    function categorizeMatches(matches) {
        const now = new Date();

        return {
            live: matches.filter(match => match.match_live === "1" && match.match_status !== "Finished"),
            highlight: matches.filter(match => match.match_status === "Finished" || match.match_status === "FT"),
            upcoming: matches.filter(match => {
                const matchDateTime = new Date(`${match.match_date} ${match.match_time}`);
                return (!match.match_status || match.match_status === "Not Started" || match.match_status === "Scheduled") && matchDateTime > now;
            }),
        };
    }

    async function displayMatches(category = "live") {

        const matches = await fetchMatches();
        if (matches.length === 0) return;

        const categorizedMatches = categorizeMatches(matches);
        const selectedMatches = categorizedMatches[category];

        if (!selectedMatches || selectedMatches.length === 0) {
            matchesContainer.innerHTML = "<p>No matches available.</p>";
            return;
        }

        const groupedMatches = selectedMatches.reduce((acc, match) => {
            const leagueKey = match.league_id || "Unknown League";
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
            <div class="league-container ${firstLeague ? "first-league" : "other-league"}">
                `;

            if (firstLeague) {
                matchesHTML += `
                <div class="matches-header">
                    <div class="match-category-btn ${category === 'live' ? 'active' : ''}" onclick="showMatch('live', event)">Live</div>
                    <div class="match-category-btn ${category === 'highlight' ? 'active' : ''}" onclick="showMatch('highlight', event)">Highlight</div>
                    <div class="match-category-btn ${category === 'upcoming' ? 'active' : ''}" onclick="showMatch('upcoming', event)">Upcoming</div>
                    <div class="match-category-btn calendar" onclick="toggleCalendar()">
                        <ion-icon name="calendar-outline"></ion-icon>
                        <input type="date" id="match-date" onchange="filterByDate()" style="display: none;">
                    </div>
                </div>`;
                firstLeague = false;
            }

            matchesHTML += `<div class="match-category-content" id="matches-${league.league}" data-limited="true">`;

            league.matches.forEach((match, index) => {
                let matchTimeDisplay = match.match_time;
                if (category === "highlight") {
                    matchTimeDisplay = `FT`;
                } else if (category === "live") {
                    matchTimeDisplay = match.match_status === "Half Time" ? "HT" : `${match.match_status}'`;
                }

                matchesHTML += `
                <div class="matches-item" style="display: ${index < 10 ? "flex" : "none"};">
                    <div class="matches-teams">
                        <div class="matches-time">${matchTimeDisplay}</div>
                        <div class="matches-datas">
                            <div class="matches-team">
                                <img src="${match.team_home_badge || 'assets/images/default-team.png'}" alt="${match.match_hometeam_name} Logo">
                                <span>${match.match_hometeam_name}</span>
                            </div>
                            <div class="matches-team">
                                <img src="${match.team_away_badge || 'assets/images/default-team.png'}" alt="${match.match_awayteam_name} Logo">
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

        matchesContainer.innerHTML = matchesHTML || "<p>No matches available.</p>";
    }
    

    window.showMatch = async function (category, event = null) {
        const buttons = document.querySelectorAll(".match-category-btn");
        buttons.forEach(btn => btn.classList.remove("active"));
    
        if (event && event.target) {
            event.target.classList.add("active");
            event.target.classList.add("loading"); // Add spinning effect
        }
    
        await displayMatches(category);
    
        if (event && event.target) {
            event.target.classList.remove("loading"); // Remove spinning effect after loading
        }
    };
    

    window.toggleLeagueMatches = function (league) {
        const matchesContainer = document.getElementById(`matches-${league}`);
        const toggleButton = document.getElementById(`toggle-${league}`);
        const isLimited = matchesContainer.getAttribute("data-limited") === "true";

        matchesContainer.querySelectorAll(".matches-item").forEach((match, index) => {
            match.style.display = isLimited && index >= 10 ? "flex" : "none";
        });

        toggleButton.textContent = isLimited ? "See Less" : "See All";
        matchesContainer.setAttribute("data-limited", isLimited ? "false" : "true");
    };

    window.toggleCalendar = function () {
        const calendarInput = document.getElementById("match-date");
        calendarInput.style.display = calendarInput.style.display === "none" ? "block" : "none";
    };

    window.filterByDate = function () {
        const selectedDate = document.getElementById("match-date").value;
        if (selectedDate) {
            displayMatches("live");
        }
    };

    displayMatches();
});

      
   // Function to display live match details with tabs
   window.displayLiveMatch = function (league, matchIndex, category) {
    const match = matchesData[league]?.[category]?.[matchIndex];
  
    if (!match || !match.video) return;
  
    matchesContainer.innerHTML = `
        <div class="live-match">
            <iframe width="100%" height="250px" style="border-radius: 10px;" src="${match.video}" frameborder="0" allowfullscreen></iframe>
  
            <div class="live-match-teams">
                <div class="live-match-datas">
                    <div class="live-match-team">
                        <img src="${match.team1.logo}" alt="${match.team1.name} Logo">
                        <span>${match.team1.name}</span>
                    </div>
                    <div class="match-time-scores">
                        <h3 class="league-name">${league}</h3>  
                        <div class="scores">${match.team1.score} - ${match.team2.score}</div>  
                        <div class="live-match-time">
                            <img src="assets/icons/Ellipse 1.png" alt="Ellipse" class="Ellipse-logo">
                            <span>${match.time}</span>
                        </div>
                    </div>
                    <div class="live-match-team">
                        <img src="${match.team2.logo}" alt="${match.team2.name} Logo">
                        <span>${match.team2.name}</span>
                    </div>
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
        </div>
    `;
  
    // Ensure sidebar is displayed when a live match is shown
    document.querySelector(".sidebar").style.display = "block"; 
  
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
  
            if (this.dataset.tab === "lineups") {
                generateFormation(match.team1, "left");
                generateFormation(match.team2, "right");
            }
        });
    });
  };
  
  
  // Function to generate content for each tab
  function getTabContent(tab, match) {
    if (!match) {
        console.error("Match data is missing");
        return "<p>Match data unavailable.</p>";
    }
  
    console.log(`Generating content for tab: ${tab}`, match); // Debugging log
  
    switch (tab) {
        case "info":
            return `
            <div class="info-match-container">
               <h3>Match Info</h3>
               <div class="info-match-details">
               <!-- Left Section: Teams, Time, and Date -->
                
                 <div class="info-teamNames">
                 <h4>${match.team1.name}</h4> vs <h4>${match.team2.name}</h4>
                 </div>
  
                <!-- Right Section: GBR, Stadium, and Country -->
              <div class="infoMatch-details">
                <div class="infoLeft-wing">
                    <p><strong><img src="assets/icons/arrow-colorIcon.png" class="info-colorIcon"></strong> ${match.time}</p>
                    <p><strong><img src="assets/icons/calender-colorIcon.png" class="info-colorIcon"></strong> ${match.date}</p>
                 </div>
                 <div class="infoRight-wing">
                    <p><strong><img src="assets/icons/gprIcon.png" class="info-colorIcon"></strong> ${match.gbr || "Not available"}</p>
                   <p><strong><img src="assets/icons/locationIcon.png" class="info-colorIcon"></strong></strong> ${match.venue || "Not available"}, <strong></strong> ${match.country || "Not available"}</p>
                 </div>
             </div>
          </div>
         </div>
  
  
              <div class="lineup-players-names">
              <h4>Players</h4>
              <div class="lineUp-cont">
              <div class="lineup-home-players">
                  <h4>${match.team1.name}</h4>
                  <ul>
                      ${match.team1.lineup.map(player => `
                          <li>
                              <span class="listed-player-number">${player.number}</span>
                              <span class="listed-player-name">${player.name}</span>
                          </li>
                      `).join("")}
                  </ul>
              </div>
              <div class="lineup-away-players">
                  <h4>${match.team2.name}</h4>
                  <ul>
                      ${match.team2.lineup.map(player => `
                          <li>
                              <span class="listed-player-number">${player.number}</span>
                              <span class="listed-player-name">${player.name}</span>
                          </li>
                      `).join("")}
                  </ul>
              </div>
          </div>
            `;
  
  
            case "lineups":
      return `
          <div class="lineUpsteams-container">
              <div class="lineUpsteam-info">
                  <img src="${match.team1.logo}" alt="${match.team1.name}" class="lineUpsteam-logo">
                  <div class="team-formation">
                  <h3>${match.team1.name}</h3>
                  <h4>${match.team1.formation}</h4>
                  </div>
              </div>
              <div class="lineUpsteam-info">
                  <div class="team-formation">
                  <h3>${match.team2.name}</h3>
                  <h4>${match.team2.formation}</h4>
                  </div>
                  <img src="${match.team2.logo}" alt="${match.team2.name}" class="lineUpsteam-logo">
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
                  <h4>${match.team1.name}</h4>
                  <ul>
                      ${match.team1.lineup.map(player => `
                          <li>
                              <span class="listed-player-number">${player.number}</span>
                              <span class="listed-player-name">${player.name}</span>
                          </li>
                      `).join("")}
                  </ul>
              </div>
              <div class="lineup-away-players">
                  <h4>${match.team2.name}</h4>
                  <ul>
                      ${match.team2.lineup.map(player => `
                          <li>
                              <span class="listed-player-number">${player.number}</span>
                              <span class="listed-player-name">${player.name}</span>
                          </li>
                      `).join("")}
                  </ul>
              </div>
          </div>
      `;
  
          
          
        case "h2h":
            return `
             <div class="h2h-header">
                <h3>H2H</h3>
                <h4>${match.team1.name}</h4>
                 <h4>${match.team2.name}</h4>
               </div>
                <!-- Horizontal Line -->
               <div class="h2h-header-line"></div>
  
               <!-- h2h matches -->
                  <div class="h2h-matches-container">
                   ${
                   Object.keys(matchesData).map(league => `
                <div class="h2h-league">
                  <h4 class="league-title">${league} <span class="league-country">${matchesData[league].country}</span></h4>
  
                  ${matchesData[league].live.map(game => `
                      <div class="h2h-match">
                          <div class="h2h-time">
                              <span class="match-time">${game.time}</span>
                              <span class="match-ft">FT</span>
                          </div>
                          <div class="h2h-right">
                          <div class="h2h-team-data">
                              <div class="h2h-team">
                                  <img src="${game.team1.logo}" alt="${game.team1.name}" class="h2h-logo">
                                  <span class="h2h-team-name">${game.team1.name}</span>
                              </div>
                              
                              <div class="h2h-team">
                                 <img src="${game.team2.logo}" alt="${game.team2.name}" class="h2h-logo">
                                  <span class="h2h-team-name">${game.team2.name}</span>                                
                              </div>
                              </div>
                               <div class="h2h-matches-scores">
                                <div class="score">${match.team1.score}</div>
                                <div class="score">${match.team2.score}</div>
                               </div>
  
                          </div>
                      </div>
                  `).join("")}
              </div>
          `).join("")
      }
                  </div>
                
            `;
  
        default:
            return "<p>No data available</p>";
    }
  }
  
  
  
  // Function to switch tabs
  window.showTab = function (tab, league, matchIndex, category) {
      const match = matchesData[league]?.[category]?.[matchIndex];
      if (!match) return;
  
      const tabContent = document.getElementById("tab-content");
      tabContent.innerHTML = generateTabContent(tab, match);
  };
  
  
  
  
  
  function generateFormation(team, side) {
    const containerId = side === "left" ? "home-formation" : "away-formation";
    let container = document.getElementById(containerId);
  
    if (!container) {
        console.error(`❌ ERROR: Element with ID "${containerId}" not found.`);
        return;
    }
  
    container.innerHTML = ""; // Clear previous content
  
    let formation = team.formation.split("-").map(Number);
    let fieldWidth = container.clientWidth || 900;
    let fieldHeight = container.clientHeight || 500;
    let centerX = fieldWidth / 2;
    let centerCircleRadius = 50; // Adjust if needed
    let rowSpacing = fieldHeight / (formation.length + 1); // Reduce gap
    let colSpacing = fieldWidth / (formation.length + 1);
  
    let jerseyNumber = 1;
    let playerClass = side === "left" ? "home-player" : "away-player";
    
  
    // ✅ Goalkeeper positioned correctly on goal line
    let goalkeeper = document.createElement("div");
    goalkeeper.classList.add("player", "goalkeeper", playerClass);
    goalkeeper.textContent = jerseyNumber++;
  
    goalkeeper.style.top = "50%";
    goalkeeper.style.left = side === "left" ? "35px" : "calc(100% - 35px)";
    goalkeeper.style.transform = "translate(-50%, -50%)";
    container.appendChild(goalkeeper);
  
    let topOffset = 80; // Less vertical gap
  
    // ✅ Positioning Defenders to Attackers
    for (let rowIndex = 0; rowIndex < formation.length; rowIndex++) {
        let numPlayers = formation[rowIndex];
        let rowTop = topOffset + rowIndex * rowSpacing;
        let colLeft = side === "left"
            ? 90 + rowIndex * colSpacing
            : fieldWidth - (90 + rowIndex * colSpacing);
  
        for (let i = 0; i < numPlayers; i++) {
            let player = document.createElement("div");
            player.classList.add("player", playerClass);
            player.textContent = jerseyNumber++;
  
            if (rowIndex === formation.length - 1) {
                // ✅ Forwards placed **on the center circle line, within their half**
                let safeCenterX = side === "left"
                    ? centerX - centerCircleRadius - 10
                    : centerX + centerCircleRadius + 10;
  
                player.style.left = `${safeCenterX}px`;
                player.style.top = "50%"; // Exactly on the center circle line
            } else {
                player.style.left = `${colLeft}px`;
                player.style.top = `${(i + 1) * (100 / (numPlayers + 1))}%`;
            }
  
            container.appendChild(player);
        }
    }
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