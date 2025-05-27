
const APIkey = '467a83d04fc852bcc3d2a6f55c7ff3839944595a4106c7a4b576cbc58cd47ea9';

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
    const leagueIDs = ["3", "152", "302", "207", "168", "175"]; // Major leagues

    let matchesList = [];
    let currentMatchIndex = 0;

    // === LUXON Time Functions ===
    function getMinutesSince(matchDate, matchTime) {
        const { DateTime } = luxon;

        const matchDateTime = DateTime.fromFormat(
            `${matchDate} ${matchTime}`,
            "yyyy-MM-dd H:mm",
            { zone: "Europe/Berlin" }
        );

        const now = DateTime.now().setZone("Europe/Berlin");
        const diffInMinutes = Math.floor(now.diff(matchDateTime, "minutes").minutes);
        return diffInMinutes > 0 ? diffInMinutes : 0;
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
                .toFormat("h:mm a");
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
            ellipseImg = "assets/icons/Ellipse 1.png";
        } else if (hasStarted) {
            const minutes = getMinutesSince(match.match_date, startTime);
            if (minutes <= 90) {
                displayTime = `${minutes}'`;  // Regular time in minutes
            } else if (minutes <= 120) {
                displayTime = `${minutes - 90}' (ET)`;  // Extra time phase
            } else {
                displayTime = `${minutes - 120}' (AET)`;  // After Extra Time
            }
            ellipseImg = "assets/icons/Ellipse2.png";
        } else {
            displayTime = formatToUserLocalTime(match.match_date, startTime);
            ellipseImg = "assets/icons/Ellipse 1.png";
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
                const url = `https://apiv3.apifootball.com/?action=get_events&from=${from}&to=${to}&league_id=${id}&timezone=Europe/Berlin&APIkey=${APIkey}`;
                const res = await fetch(url);
                const data = await res.json();
                console.log(data); 

                if (Array.isArray(data)) {
                    matchesList = [...matchesList, ...data];
                } else {
                    console.error('Expected array but received:', data);
                }
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
});






// Top scorer slider
const playerImageMap = {
    "A. Alipour": "A.Alipour.png",
    "R. Lewandowski": "R.Lewandowski.png",
    "M. Retegui": "M.Retegui.png",
    "O. Dembélé": "O.Dembl.png",
    "Mohamed Salah": "MohamedSalah.png",
    "Serhou Guirassy": "S.Guirassy.png",
    "D, Selke": "D.Selke.png"
    // Add more players here...
};

// List of top leagues (IDs can be replaced with actual IDs or names)
const topLeagues = [
    "Premier League", // England
    "La Liga",
    "Bundesliga",
    "Serie A",
    "Ligue 1"
];

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

        // Fetch all leagues and their top scorers dynamically
        const response = await fetch(`https://apiv3.apifootball.com/?action=get_leagues&APIkey=${APIkey}`);
        const leaguesData = await response.json();

        if (!Array.isArray(leaguesData) || leaguesData.length === 0) {
            console.error("No leagues data found.");
            return;
        }

        for (const league of leaguesData) {
            const leagueName = league.league_name;
            if (!topLeagues.includes(leagueName)) continue; // Only process top leagues

            const leagueId = league.league_id;

            const topScorersResponse = await fetch(`https://apiv3.apifootball.com/?action=get_topscorers&league_id=${leagueId}&APIkey=${APIkey}`);
            const topScorersData = await topScorersResponse.json();

            if (!Array.isArray(topScorersData) || topScorersData.length === 0) {
                console.warn(`No top scorers data available for ${leagueName}`);
                continue;
            }

            // Sort top scorers by goals in descending order
            topScorersData.sort((a, b) => b.goals - a.goals);

            // Select only the highest goal scorer
            const topScorer = topScorersData[0]; // Get the player with the highest goals

            const goals = topScorer.goals || 0;
            if (goals < 15) continue; // Only consider players with 15 or more goals

            const playerName = topScorer.player_name || "Unknown Player";
            const apiImage = topScorer.player_image; // Image from API if available
            const localImage = getLocalPlayerImage(playerName);
            const playerImage = apiImage && apiImage !== '' ? apiImage : localImage || 'assets/images/default-player.png';
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

        // Hide the slider dots if there are more than 10 players
        if (playerElements.length > 10) {
            dotsContainer.style.display = "none"; // Hide slider dots
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



//function to display matches for the middle layers in home page

// Function to get today's date or a date offset by days (formatted as YYYY-MM-DD)
function getTodayDate(offset = 0) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return date.toISOString().split("T")[0];
}

// === LUXON Time Functions ===
function getMinutesSince(matchDate, matchTime) {
    const { DateTime } = luxon;

    const matchDateTime = DateTime.fromFormat(
        `${matchDate} ${matchTime}`,
        "yyyy-MM-dd HH:mm",
        { zone: "Europe/Berlin" }
    );

    const now = DateTime.now().setZone("Europe/Berlin");
    const diffInMinutes = Math.floor(now.diff(matchDateTime, "minutes").minutes);
    return diffInMinutes > 0 ? diffInMinutes : 0;
}

function formatToUserLocalTime(dateStr, timeStr) {
    try {
        const { DateTime } = luxon;

        const berlinTime = DateTime.fromFormat(
            `${dateStr} ${timeStr}`,
            "yyyy-MM-dd HH:mm",
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
            `https://apiv3.apifootball.com/?action=get_events&from=${getTodayDate(-1)}&to=${getTodayDate(+1)}&APIkey=${APIkey}`
        );

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        console.log(data); // Log the raw data for debugging

        const now = new Date();

        // LIVE
        matchData.live = data.filter(match => {
            const status = match.match_status?.toLowerCase();
            return status && !["ft", "fulltime", "finished", "ended"].includes(status) && /\d+'|ht|halftime/.test(status);
        });

        // Other categories
        matchData.highlight = data.filter(match => {
            const status = match.match_status?.toLowerCase();
            return ["ft", "fulltime", "finished", "ended"].includes(status);
        });

        matchData.upcoming = data.filter(match => {
            const matchDateTime = new Date(`${match.match_date} ${match.match_time}`);
            const status = match.match_status?.toLowerCase();
            return (!status || ["not started", "scheduled", "ns", "tbd", "0", ""].includes(status)) && matchDateTime > now;
        });

        // Show live matches on load
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
});

document.addEventListener("DOMContentLoaded", function () {
    const liveButton = document.querySelector('.category-btn[data-category="live"]');
    if (liveButton) {
        liveButton.addEventListener('click', function() {
            showMatches('live');
        });
    }
});


// Function to Show Matches Based on Category
function showMatches(category, event = null) {
    if (!matchData[category]) {
        console.error(`Category '${category}' does not exist.`);
        return;
    }

    // Handle button active state
    const buttons = document.querySelectorAll('.category-btn');
    buttons.forEach(button => button.classList.remove('active'));
    if (event) {
        event.target.classList.add('active');
    } else {
        const activeButton = document.querySelector(`.category-btn[data-category="${category}"]`);
        if (activeButton) activeButton.classList.add('active');
    }

    const container = document.getElementById('matches-container');
    container.innerHTML = '';

    const leaguePriority = {
        "Premier League": 0,
        "UEFA Champions League": 1,
        "La Liga": 2,
        "Serie A": 3,
        "Bundesliga": 4,
        "Ligue 1": 5
    };

    const priorityMatches = [];
    const nonPriorityMatches = [];

    matchData[category].forEach(match => {
        if (leaguePriority.hasOwnProperty(match.league_name)) {
            priorityMatches.push(match);
        } else {
            nonPriorityMatches.push(match);
        }
    });

    // Sort priority matches by league
    priorityMatches.sort((a, b) => leaguePriority[a.league_name] - leaguePriority[b.league_name]);

    let matchesToShow = [];

    if (priorityMatches.length >= 5) {
        matchesToShow = priorityMatches.slice(0, 5);
    } else {
        matchesToShow = [...priorityMatches, ...nonPriorityMatches].slice(0, 5);
    }

    // Fallback message logic for live matches
    if (category === 'live' && matchesToShow.length === 0) {
        container.innerHTML = `<p class="fallback-message">No live matches available at the moment.</p>`;
        return;
    }

    // Render match cards
    matchesToShow.forEach((match, index) => {
        createMatchCard(container, match, category, index);
    });
}




// Function to Filter Matches by Date
function filterByDate(category, selectedDate) {
    if (!matchData[category]) {
        console.error(`Category '${category}' does not exist.`);
        return;
    }

    const container = document.getElementById('matches-container');
    container.innerHTML = '';

    const leaguePriority = {
        "Premier League": 0,
        "UEFA Champions League": 1,
        "La Liga": 2,
        "Serie A": 3,
        "Bundesliga": 4,
        "Ligue 1": 5
    };

    // Filter matches by date
    const filteredMatches = matchData[category].filter(match => {
        return match.match_date === selectedDate;
    });

    const priorityMatches = [];
    const nonPriorityMatches = [];

    filteredMatches.forEach(match => {
        if (leaguePriority.hasOwnProperty(match.league_name)) {
            priorityMatches.push(match);
        } else {
            nonPriorityMatches.push(match);
        }
    });

    // Sort priority matches
    priorityMatches.sort((a, b) => leaguePriority[a.league_name] - leaguePriority[b.league_name]);

    let matchesToShow = [];

    if (priorityMatches.length >= 5) {
        matchesToShow = priorityMatches.slice(0, 5);
    } else {
        matchesToShow = [...priorityMatches, ...nonPriorityMatches].slice(0, 5);
    }

    // Fallback message logic
    if (matchesToShow.length === 0) {
        if (category !== 'live') {
            container.innerHTML = `<p class="fallback-message">No matches available for ${selectedDate}.</p>`;
        }
        return;
    } else if (priorityMatches.length === 0 && nonPriorityMatches.length > 0) {
        container.innerHTML = `<p class="fallback-message">Showing matches from other leagues on ${selectedDate}</p>`;
    }

    matchesToShow.forEach((match, index) => {
        createMatchCard(container, match, category, index);
    });
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
    const matchRound = match.league_round || "";

    let matchMinute = match.match_status || matchTime;
    let scoreDisplay = "";
    let matchStatusDisplay = "";
    let formattedTime = "";

    if (category === "live") {
        const minutesElapsed = getMinutesSince(match.match_date, match.match_time);
        matchMinute = match.match_status?.toLowerCase() === "halftime" ? "HT" : `${minutesElapsed}'`;
        scoreDisplay = `<div class="match-score">${score1} - ${score2}</div>`;
        formattedTime = `
            <div class="live-indicator">
                <span class="red-dot"></span>
                <span class="live-text">Live</span> - ${matchMinute}
            </div>
        `;
    } else if (category === "highlight") {
        matchStatusDisplay = `<h5>FT</h5>`;
        scoreDisplay = `<div class="match-score">${score1} - ${score2}</div>`;
        formattedTime = formatToUserLocalTime(match.match_date, match.match_time);
    } else if (category === "upcoming") {
        matchStatusDisplay = `<h5>vs</h5>`;
        formattedTime = formatToUserLocalTime(match.match_date, match.match_time);
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
                ${scoreDisplay}
                ${matchStatusDisplay}
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
                    ${formattedTime}
                </div>
                <div class="match-country">
                    <img src="assets/icons/map-pin.png" alt="Map">
                    ${country}
                </div>
                ${matchRound ? `
                    <div class="match-round">
                        <img src="assets/icons/trophy.png" alt="Round">
                        ${matchRound}
                    </div>` : ""}
            </div>

            <!-- Column 6: View Details Button -->
            <button class="view-details-btn" data-category="${category}" data-index="${matchIndex}">
                <img src="assets/icons/arrow-up.png" alt="Arrow-up">
                View Details
            </button>
        </div>
    `;

    container.appendChild(matchCard);

    const viewDetailsBtn = matchCard.querySelector('.view-details-btn');
    viewDetailsBtn.addEventListener('click', function () {
        displayLiveMatch(match.match_id, category);
    });
}


document.addEventListener("DOMContentLoaded", function () {
    const dateInput = document.getElementById("match-date");
    if (dateInput) {
        dateInput.value = getTodayDate(); // Default to today
        dateInput.addEventListener("change", filterByDate);
    }
});

document.querySelector('.calendar').addEventListener('click', () => {
    const dateFilter = document.querySelector('.date-filter');
    if (dateFilter) {
      dateFilter.style.display = dateFilter.style.display === 'block' ? 'none' : 'block';
    }
  });
  
 // Highlight and filter matches when a calendar date is clicked
document.querySelectorAll('.calendar-date').forEach(dateElem => {
    dateElem.addEventListener('click', function () {
        // Remove existing highlight
        document.querySelectorAll('.calendar-date').forEach(el => el.classList.remove('active'));

        // Highlight clicked date
        this.classList.add('active');

        // Update the date input value
        const selectedDate = this.getAttribute('data-date');
        document.getElementById('match-date').value = selectedDate;


        const todayStr = getTodayDate(0);
const todayElem = document.querySelector(`.calendar-date[data-date="${todayStr}"]`);
if (todayElem) todayElem.classList.add('active');

        // Trigger filtering
        filterByDate();
    });
});

function generateCalendarDates() {
    const calendarScroll = document.querySelector('.calendar-scroll');
    calendarScroll.innerHTML = ''; // Clear existing

    for (let i = -3; i <= 3; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);

        const day = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dateNum = date.getDate().toString().padStart(2, '0');
        const dateStr = date.toISOString().split('T')[0];

        const div = document.createElement('div');
        div.className = 'calendar-date';
        div.dataset.date = dateStr;
        div.innerHTML = `${day}<br><span>${dateNum}</span>`;

        if (i === 0) div.classList.add('active'); // Highlight today

        calendarScroll.appendChild(div);
    }

    // Rebind event listeners after generating
    document.querySelectorAll('.calendar-date').forEach(dateElem => {
        dateElem.addEventListener('click', function () {
            document.querySelectorAll('.calendar-date').forEach(el => el.classList.remove('active'));
            this.classList.add('active');

            const selectedDate = this.getAttribute('data-date');
            document.getElementById('match-date').value = selectedDate;
            filterByDate();
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    generateCalendarDates(); // Run on load
});



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

const bigLeagues = [
  "Premier League", "LaLiga", "Serie A", "Bundesliga", 
  "UEFA Champions League", "Ligue 1", "Ligue 2"
];

// Standardize league names (map)
const normalizedLeague = league =>
  league.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '');

// Function to get today's date in YYYY-MM-DD
function getDateString(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().split("T")[0];
}

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

function convertMatchTimeToLocalTime(matchTime) {
  const userTimezone = getUserTimezone();
  const matchDate = new Date(`${getDateString(0)}T${matchTime}`);
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
    const localTime = convertMatchTimeToLocalTime(startTime);
    const matchDate = new Date(`${getDateString(0)}T${localTime}`);
    const diff = Math.floor((now - matchDate) / 60000);
    if (diff >= 0 && diff <= 120) {
      span.textContent = `${diff}'`;
    } else if (diff > 120) {
      span.textContent = "FT";
    } else {
      span.textContent = localTime;
    }
  });
}

// Fetch and display predictions
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

    const enriched = oddsData.map(oddMatch => {
      const event = eventsData.find(ev => ev.match_id === oddMatch.match_id);
      if (!event) return null;

      return {
        match_id: oddMatch.match_id,
        home: event.match_hometeam_name,
        away: event.match_awayteam_name,
        homeLogo: event.team_home_badge,
        awayLogo: event.team_away_badge,
        time: event.match_time,
        league_name: event.league_name,
        score: `${event.match_hometeam_score} - ${event.match_awayteam_score}`,
        odd_1: parseFloat(oddMatch.odd_1),
        odd_2: parseFloat(oddMatch.odd_2)
      };
    }).filter(Boolean);

    const filtered = enriched.filter(match => {
      const leagueNorm = normalizedLeague(match.league_name);
      return isRealisticOdds(match) &&
        bigLeagues.some(big => normalizedLeague(big) === leagueNorm);
    });

    if (filtered.length === 0) {
      predictionContainer.innerHTML = "<p>No big matches with reliable odds today.</p>";
      return;
    }

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
        <div class="predition-content">
          <h4>Who do you think will win</h4>
          <div class="predit-selection">
            <div class="team-nam">
              <span>${match.home}</span>
              <div class="team-logo">
                <img src="${match.homeLogo || 'assets/images/default-logo.png'}" alt="${match.home}">
              </div>
              <div class="prediction-number">${odd1}</div>
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



// menu toggle button for sidebar for mobile view
document.addEventListener("DOMContentLoaded", function () {
    const sidebar = document.getElementById("sidebar");
    const toggleBtn = document.querySelector(".toggle-btn");
    const menuLogo = document.querySelector(".mobileMenu-logo"); // safer than ion-icon
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

    // Move h1 under logo
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














  



