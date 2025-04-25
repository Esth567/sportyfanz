
const APIkey = '23072c515f41a7c3bb05fb5703dfec31d906b0885c87203f7783587636cd914f';

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
    const leagueIDs = ["3", "152", "302", "207", "168", "175"]; // Premier League, La Liga, Bundesliga, Serie A, Ligue 1

    let matchesList = [];
    let currentMatchIndex = 0;

    function getMinutesSince(matchDate, matchTime) {
        const [hours, minutes] = matchTime.split(':').map(Number);
        const matchUTC = new Date(matchDate);
        matchUTC.setUTCHours(hours);
        matchUTC.setUTCMinutes(minutes);
        matchUTC.setUTCSeconds(0);
        const matchLocal = new Date(matchUTC.getTime() + (matchUTC.getTimezoneOffset() * -60000));
        const now = new Date();
        const diff = Math.floor((now - matchLocal) / 60000);
        return diff > 0 ? diff : 0;
    }

    function formatTo12Hour(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const utcDate = new Date();
        utcDate.setUTCHours(hours);
        utcDate.setUTCMinutes(minutes);
        utcDate.setUTCSeconds(0);
        const localDate = new Date(utcDate.getTime() + (utcDate.getTimezoneOffset() * -60000));
        let hour = localDate.getHours();
        const ampm = hour >= 12 ? "PM" : "AM";
        hour = hour % 12 || 12;
        const paddedMinutes = String(localDate.getMinutes()).padStart(2, '0');
        return `${hour}:${paddedMinutes} ${ampm}`;
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

        let displayTime = "";
        let ellipseImg = "";

        if (isFinished) {
            displayTime = "FT";
            ellipseImg = "assets/icons/Ellipse 1.png";
        } else if (hasStarted) {
            displayTime = `${getMinutesSince(match.match_date, startTime)}'`;
            ellipseImg = "assets/icons/Ellipse2.png";
        } else {
            displayTime = formatTo12Hour(startTime);
            
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
            for (let id of leagueIDs) {
                const url = `https://apiv3.apifootball.com/?action=get_events&from=${from}&to=${to}&league_id=${id}&APIkey=${APIkey}`;
                const res = await fetch(url);
                const data = await res.json();

                if (Array.isArray(data)) {
                    matchesList = [...matchesList, ...data];
                } else {
                    console.error('Expected array but received:', data);
                }
            }

            matchesList.sort((a, b) => {
                const aTime = new Date(a.match_date + " " + a.match_time);
                const bTime = new Date(b.match_date + " " + b.match_time);
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
    "O. Dembele": "Untitled.png",
    "A. Alipour": "alipour.png",
    "M. Retegui": "M.Retegui.png",
    "Mohammed Salah": "Mohammed.png",
    // Add more players here...
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
            const playerImage = getLocalPlayerImage(playerName);  // Fetch image from local mapping
            const goals = topScorer.goals || "0";
            const teamName = topScorer.team_name || "Unknown Team";

            // Create player item dynamically
            const playerItem = document.createElement("div");
            playerItem.classList.add("player-item");
            if (playerIndex === 0) playerItem.classList.add("active");

            playerItem.innerHTML = `
                <div class="player-image">
                    <img src="${playerImage}" alt="${playerName}">
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
    return playerImageMap[playerName] ? `assets/images/${playerImageMap[playerName]}` : null;
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




//league table for 5 team beased on ranking
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
        const topFourTeams = data.slice(0, 5);

        // Generate HTML for the top 5 teams
        let tableHTML = `
            <h3 class="league-title">${topFourTeams[0].league_name}</h3>
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

        topFourTeams.forEach(team => {
            console.log("Team Data:", team); // Debugging

            tableHTML += `
                <div class="team-row">
                    <div class="team-info">
                        <img src="${team.team_badge || 'assets/images/default-logo.png'}" alt="${team.team_name} Logo" class="team-logo">
                        <span class="teamName-header">${team.team_name || 'N/A'}</span>
                    </div>
                    <span class="team-stats">${team.overall_league_W || 0}</span>
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
        <!-- Column 1: Team 1 -->
        <div class="Matchteam">
            <img src="${logo1}" alt="${team1}">
            <span>${team1}</span>
        </div>

        <!-- Column 2: Match Status & Score -->
        <div class="match-status-score">
            ${category === "live" ? scoreDisplay : ""}
            ${category === "highlight" ? `
                <div class="match-status">
                    ${matchStatusDisplay}
                    ${scoreDisplay}
                </div>
            ` : ""}
            ${category === "upcoming" ? matchStatusDisplay : ""}
        </div>

        <!-- Column 3: Team 2 -->
        <div class="Matchteam">
            <img src="${logo2}" alt="${team2}">
            <span>${team2}</span>
        </div>

        <!-- Column 4 & 5 wrapped together -->
        <div class="match-meta">
            <div class="match-time">
                <img src="assets/icons/clock.png" alt="Clock">
                ${category === "live" ? `${matchMinute}'` : matchTime}
            </div>
            <div class="match-country">
                <img src="assets/icons/map-pin.png" alt="Map">
                ${country}
            </div>
        </div>

        <!-- Column 6: View Details Button -->
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
        displayLiveMatch(match.match_id, category);
    });
}




// Function to Filter Matches by Date
function filterByDate() {
    const selectedDate = document.getElementById('match-date').value;
    const container = document.getElementById('matches-container');
    container.innerHTML = '';

    const allMatches = Object.values(matchData).flat();
    const filteredMatches = allMatches.filter(match => match.date === selectedDate);

    if (filteredMatches.length > 0) {
        filteredMatches.slice(0, 10).forEach((match, index) => createMatchCard(container, match, "filtered", index));
    } else {
        container.innerHTML = `<p>No matches found for this date</p>`;
    }
}


// Function to display match details with video
async function displayLiveMatch(matchId, category) {
    
     // Hide other UI sections
     document.querySelector(".header-slider")?.classList.add("hidden");
     document.querySelector(".news-podcast-wrapper")?.classList.add("hidden");

     
    if (!matchData[category] || matchData[category].length === 0) {
        console.error(`No matches found for category: ${category}`);
        return;
    }

    let match = matchData[category].find(m => m.match_id === matchId);

    if (!match) {
        console.error(`Match with ID ${matchId} not found in ${category}`);
        return;
    }

    let videoUrl = await fetchMatchVideo(matchId); // Fetch video URL

    let matchesContainer = document.querySelector(".match-latest");
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



//function for predition-container in middly layer

  // List of big leagues
const bigLeagues = [
    "Premier League", "La Liga", "Serie A", "Bundesliga", "UEFA Champions League", "Ligue 1", "Ligue 2"
  ];
  
  // Function to get the current date as a string (format: YYYY-MM-DD)
function getDateString(offsetDays = 0) {
    const today = new Date();
    today.setDate(today.getDate() + offsetDays);
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Ensure 2 digits for month
    const day = String(today.getDate()).padStart(2, '0'); // Ensure 2 digits for day
    return `${year}-${month}-${day}`;
  }

  
  // Function to check if odds are realistic
  function isRealisticOdds(match) {
    const odd1 = parseFloat(match.odd_1);
    const odd2 = parseFloat(match.odd_2);
    return !isNaN(odd1) && !isNaN(odd2) && odd1 > 1 && odd2 > 1 && odd1 < 10 && odd2 < 10;
  }
  
  // Listen for DOMContentLoaded to fetch predictions
  document.addEventListener("DOMContentLoaded", () => {
    const predictionContainer = document.querySelector('.prediction-container');
    if (predictionContainer) {
      fetchTodayPredictions(predictionContainer);
      setInterval(updateLiveTimers, 60000);
    }
  });
  
  // Get the user's local timezone
  function getUserTimezone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  
  // Convert match time to user's local time zone
  function convertMatchTimeToLocalTime(matchTime) {
    const userTimezone = getUserTimezone();
    const matchDate = new Date(`${getDateString(0)} ${matchTime}`);
  
    // Convert the match date to the user's local timezone
    return matchDate.toLocaleString('en-US', { timeZone: userTimezone, hour12: false });
  }
  
  // Update live timers with timezone-aware match time
  function updateLiveTimers() {
    const now = new Date();
    document.querySelectorAll('.live-timer').forEach(span => {
      const startTime = span.dataset.start;
      const matchTime = convertMatchTimeToLocalTime(startTime);
      const matchDate = new Date(matchTime);
      const diff = Math.floor((now - matchDate) / 60000); // Time difference in minutes
  
      if (diff >= 0 && diff <= 120) {
        span.textContent = `${diff}'`;
      } else if (diff > 120) {
        span.textContent = "FT";
      } else {
        span.textContent = matchTime; // Show the local time for upcoming matches
      }
    });
  }
  
  // Fetch and display predictions as before
  async function fetchTodayPredictions(predictionContainer) {
    const today = getDateString(0);
  
    try {
      const [oddsRes, eventsRes] = await Promise.all([
        fetch(`https://apiv3.apifootball.com/?action=get_odds&from=${today}&to=${today}&APIkey=${APIkey}`),
        fetch(`https://apiv3.apifootball.com/?action=get_events&from=${today}&to=${today}&APIkey=${APIkey}`)
      ]);
  
      const oddsData = await oddsRes.json();
      const eventsData = await eventsRes.json();
  
      if (!Array.isArray(oddsData) || !Array.isArray(eventsData)) {
        predictionContainer.innerHTML = "<p>Unable to load prediction data.</p>";
        return;
      }
  
      const enrichedMatches = oddsData.map(oddMatch => {
        const eventDetails = eventsData.find(ev => ev.match_id === oddMatch.match_id);
        if (!eventDetails) return null;
  
        return {
          ...oddMatch,
          home: eventDetails.match_hometeam_name,
          away: eventDetails.match_awayteam_name,
          homeLogo: eventDetails.team_home_badge,
          awayLogo: eventDetails.team_away_badge,
          time: eventDetails.match_time,
          league_name: eventDetails.league_name === "Premier League" ? "England" : eventDetails.league_name, // Update to show "England"
          score: `${eventDetails.match_hometeam_score} - ${eventDetails.match_awayteam_score}`,
          odd_1: parseFloat(oddMatch.odd_1),
          odd_2: parseFloat(oddMatch.odd_2)
        };
      }).filter(Boolean);
  
      const competitiveMatches = enrichedMatches.filter(match =>
        isRealisticOdds(match) &&
        bigLeagues.map(l => l.toLowerCase()).includes(match.league_name.trim().toLowerCase())
      );
  
      if (competitiveMatches.length === 0) {
        predictionContainer.innerHTML = "<p>No big matches with reliable odds today.</p>";
        return;
      }
  
      startPredictionSlider(predictionContainer, competitiveMatches);
    } catch (err) {
      console.error("Prediction fetch error:", err);
      predictionContainer.innerHTML = "<p>Error loading predictions.</p>";
    }
  }
  
  let predictionIndex = 0;
  
  function startPredictionSlider(predictionContainer, matches) {
    function showSlide() {
      // Fade out
      predictionContainer.classList.remove('fade-in');
  
      setTimeout(() => {
        const match = matches[predictionIndex];
        const odd1 = parseFloat(match.odd_1);
        const odd2 = parseFloat(match.odd_2);
  
        predictionContainer.innerHTML = `
          <div class="predition-content">
            <h4>Who do you think will win</h4>
            <div class="predit-selection">
              <div class="team-nam">
                <span>${match.home}</span>
                <div class="team-logo">
                  <img src="${match.homeLogo || 'assets/images/default-logo.png'}" alt="${match.home}">
                </div>
                <div class="prediction-number">${match.odd_1}</div>
              </div>
  
              <div class="preditScore-status">
                <h4 class="match-leagueName">${match.league_name}</h4>
                <h4 class="match-score">${match.score}</h4>
                <span class="live-timer" data-start="${match.time}">${match.time}</span>
              </div>
  
              <div class="team-nam">
                <span>${match.away}</span>
                <div class="team-logo">
                  <img src="${match.awayLogo || 'assets/images/default-logo.png'}" alt="${match.away}">
                </div>
                <div class="prediction-number">${match.odd_2}</div>
              </div>
            </div>
          </div>
        `;
  
        updateLiveTimers();
        predictionContainer.classList.add('fade-in'); // Fade in
        predictionIndex = (predictionIndex + 1) % matches.length;
      }, 200); // Give time for fade-out to finish
    }
  
    showSlide(); // Show first slide immediately
    setInterval(showSlide, 10000); // Change every 10 seconds
  }
  
  

  


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














  



