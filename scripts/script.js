
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
    const leagueIDs = ["3", "152", "302", "207", "168", "175", "135", "162", "275", "61"]; //major leagues

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

function getTodayDate(offset = 0) {
    const { DateTime } = luxon;
    return DateTime.local().plus({ days: offset }).toFormat("yyyy-MM-dd");
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
                .toFormat("hh:mm");
        } catch (e) {
            console.error("Time conversion error:", e);
            return "TBD";
        }
    }

//function to fetch matches
async function fetchMatchesData() {

    try {
        const response = await fetch(`https://apiv3.apifootball.com/?action=get_events&from=${getTodayDate(-7)}&to=${getTodayDate(7)}&APIkey=${APIkey}`);
        const data = await response.json();

        // Debugging: Check the raw data
        console.log("Fetched Match Data: ", data);

        matchesData = {
            live: data.filter(match => {
                // Ensure that match_status is an integer or has valid values for live matches
                const status = match.match_status.trim().toLowerCase();
                return status === "live" || (parseInt(status) > 0 && parseInt(status) < 90); // Or another appropriate condition
            }),
            highlight: data.filter(match => match.match_status === "Finished"),
            upcoming: data.filter(match => match.match_status === "" || match.match_status === null),
        };
        

        // Debugging: Check the categorized data
        console.log("Live Matches: ", matchesData.live);
        console.log("Highlight Matches: ", matchesData.highlight);
        console.log("Upcoming Matches: ", matchesData.upcoming);

        // Reset selected league
        selectedLeagueId = null;
        selectedLeagueName = null;

        showMatches(matchesData, "live");
    } catch (error) {
        console.error("Error fetching match data:", error);
        document.querySelector(".matches-container").innerHTML = `<p>Failed to load matches. Please refresh.</p>`;
    } 
}



// Modify the updateMatches function to use correct timezone conversion
function updateTheMatches(matches) {
    matchesData = {
        live: [],
        highlight: [],
        upcoming: [],
        allHighlights: []
    };

    
    const now = luxon.DateTime.utc();  // Get the current time in UTC
    const oneWeekAgo = now.minus({ days: 7 });

    matches.forEach(match => {
        const status = (match.match_status || "").trim().toLowerCase();

        // Convert match time from UTC to local timezone (Ensure that match times are in UTC and are converted correctly)
        const matchBerlin = luxon.DateTime.fromFormat(
        `${match.match_date} ${match.match_time}`,
        "yyyy-MM-dd HH:mm",
        { zone: "Europe/Berlin" }
       );
      const matchDateTimeLocal = matchBerlin.setZone(luxon.DateTime.local().zoneName);


        const isFinished = status === "ft" || status === "finished" || status.includes("pen") || status.includes("after") || parseInt(status) >= 90;
        const isUpcoming = matchDateTimeLocal > now && (status === "ns" || status === "scheduled" || status === "" || status === "not started");
        const isLive = parseInt(status) > 0 && parseInt(status) < 90;

        if (isLive) matchesData.live.push(match);
        if (isFinished && matchDateTimeLocal >= oneWeekAgo) matchesData.highlight.push(match);
        if (isFinished) matchesData.allHighlights.push(match);
        if (isUpcoming) matchesData.upcoming.push(match);

        // Format the match time to the user's local time
        const formattedMatchTime = matchDateTimeLocal.toFormat("h:mm a");  // Format the time in a readable local format

        console.log(`Match: ${match.match_hometeam_name} vs ${match.match_awayteam_name} - Time: ${formattedMatchTime}`);
    });

    showMatches(matchesData, "live");
}


//funtion to render matches
function showMatches(matchesData, category) {
    const matchesContainer = document.querySelector(".matches-container");
    if (!matchesContainer) return;

    const selectedMatches = matchesData[category] || [];

    if (selectedMatches.length === 0) {
        matchesContainer.innerHTML = `<p>No ${category} matches found.</p>`;
        return;
    }

    const preferredLeagues = [
        { name: "Premier League", country: "England" },
        { name: "La Liga", country: "Spain" },
        { name: "Bundesliga", country: "Germany" },
        { name: "UEFA Champions League", country: "eurocups" },
        { name: "Serie A", country: "Italy" },
        { name: "NPFL", country: "Nigeria" }
    ];

    // Sort matches so preferred leagues come first
    const sortedMatches = selectedMatches.sort((a, b) => {
        const indexA = preferredLeagues.findIndex(l => l.name === a.league_name && l.country === a.country_name);
        const indexB = preferredLeagues.findIndex(l => l.name === b.league_name && l.country === b.country_name);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    let html = "";
    const MAX_MATCHES = 5;
    let displayedMatchCount = 0;


    html += `<div class="match-category-content">`;

    // Category buttons at top
    html += `
        <div class="matches-header">
            <div class="match-category-btn ${category === 'live' ? 'active' : ''}" onclick="filterMatchesCategory('live')">Live</div>
            <div class="match-category-btn ${category === 'highlight' ? 'active' : ''}" onclick="filterMatchesCategory('highlight')">Highlight</div>
            <div class="match-category-btn ${category === 'upcoming' ? 'active' : ''}" onclick="filterMatchesCategory('upcoming')">Upcoming</div>
            <div class="calendar-wrapper" style="position: relative;">
                <div class="match-category-btn calendar" onclick="toggleCalendar()">
                    <ion-icon name="calendar-outline"></ion-icon>
                </div>
                <input type="date" id="match-date" onchange="filterByDate('${category}')" style="display: none;">
            </div>
        </div>`;

       for (const match of selectedMatches.sort((a, b) => {
          const getPriority = (m) => {
          const index = preferredLeagues.findIndex(l => l.name === m.league_name && l.country === m.country_name);
          return index === -1 ? Infinity : index;
      };
       return getPriority(a) - getPriority(b);
     })) {
        if (displayedMatchCount >= MAX_MATCHES) break;

        const matchBerlin = luxon.DateTime.fromFormat(
            `${match.match_date} ${match.match_time}`,
            "yyyy-MM-dd HH:mm",
            { zone: "Europe/Berlin" }
        );
        const matchLocal = matchBerlin.setZone(luxon.DateTime.local().zoneName);

        const matchDay = matchLocal.toFormat("MMM d");
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


        html += `
        <div class="match-details" data-match-id="${match.match_id}" onclick="displayLiveMatch('${match.match_id}', '${category}')">
            <div class="match-card">
                    <div class="match-col Matchteam">
                        <img src="${match.team_home_badge}" alt="${match.match_hometeam_name} Logo">
                        <span>${match.match_hometeam_name}</span>
                    </div>
                    <div class="match-col match-status-score">
                      ${scoreDisplay}
                      ${matchStatusDisplay}
                    </div>
                    <div class="match-col Matchteam">
                        <img src="${match.team_away_badge}" alt="${match.match_awayteam_name} Logo">
                        <span>${match.match_awayteam_name}</span>
                    </div>
                    </div>
                    <div class="match-col match-time-country">
                      <div class="match-time"><img src="assets/icons/clock.png" alt="Clock">${formattedTime}</div>
                     <div class="match-country"><img src="assets/icons/map-pin.png" alt="Map">${country}</div>
                   
                      ${matchRound ? `
                    <div class="match-col match-round">
                        <img src="assets/icons/trophy.png" alt="Round">
                        ${matchRound}
                    </div>` : ""}
                    <div class="match-col match-btn">  
                <button class="view-details-btn" data-match-id="${match.match_id}" data-category="${category}">
                    <img src="assets/icons/arrow-up.png" alt="Round">
                  View
                  </button>
                </div>
                  </div>
                
             </div>`;

        displayedMatchCount++;

    }

    html += `</div>`;
    matchesContainer.innerHTML = html;
    // Add event listeners to all "View Details" buttons
document.querySelectorAll('.view-details-btn').forEach(btn => {
    btn.addEventListener('click', function (event) {
        event.stopPropagation(); // Prevent parent .match-details click
        const matchId = this.getAttribute('data-match-id');
        const category = this.getAttribute('data-category');
        displayLiveMatch(matchId, category);
    });
});

}


// Filter the matches based on category (live, highlight, upcoming)
function filterMatchesCategory(category) {
    selectedLeagueId = null; // Reset selected league
    selectedLeagueName = null; // Reset selected league name
    showMatches(matchesData, category);
}

// Event listener for category button click
document.querySelectorAll(".match-category-btn").forEach(button => {
    button.addEventListener("click", () => {
        const category = button.textContent.toLowerCase();
        filterMatchesCategory(category);
    });
});





// Function to filter matches by the selected date
function filterByDate(category) {
    const selectedDate = document.getElementById("match-date").value;
    if (!selectedDate) return;

    const from = selectedDate;
    const to = selectedDate;

    fetch(`https://apiv3.apifootball.com/?action=get_events&from=${from}&to=${to}&APIkey=${APIkey}`)
        .then(res => res.json())
        .then(data => {
            const filtered = {
                live: [],
                highlight: [],
                upcoming: []
            };

            data.forEach(match => {
                const status = match.match_status.toLowerCase();

                if (status.includes("ht") || parseInt(status) > 0) {
                    filtered.live.push(match);
                } else if (status === "ft") {
                    filtered.highlight.push(match);
                } else {
                    filtered.upcoming.push(match);
                }
            });

            // Save new filtered dataset
            matchesData = filtered;

            // Filter by current league if one is selected
            let filteredData = filtered;
            if (selectedLeagueId) {
                filteredData = Object.fromEntries(
                    Object.entries(filtered).map(([key, matches]) => [
                        key,
                        matches.filter(m => m.league_id === selectedLeagueId)
                    ])
                );
            }

            showMatches(filteredData, category);
        })
        .catch(err => {
            console.error("Date filter fetch error:", err);
        });
}


// Function to toggle calendar visibility
function toggleCalendar() {
    const dateInput = document.getElementById("match-date");
    // Toggle visibility of the calendar input field
    dateInput.style.display = (dateInput.style.display === "none" || !dateInput.style.display) ? "block" : "none";
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

    let videoUrl = await fetchMatchVideo(matchId);
    console.log("🎥 Video Data:", videoUrl);

    let matchesContainer = document.querySelector(".matches-container");

    const teamHTML = `
        <div class="live-match-team">
            <img src="${match.team_home_badge || 'assets/images/default-team.png'}" alt="${match.match_hometeam_name} Logo">
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
            <img src="${match.team_away_badge || 'assets/images/default-team.png'}" alt="${match.match_awayteam_name} Logo">
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

    const adHTML = `<img src="assets/images/Ad5.png" alt="Ad5" class="ad5-logo">`;

    const contentHTML = `
        <div class="live-match-info">
            ${tabHTML}
            ${adHTML}
            <div class="tab-content" id="tab-content">${getTabContent("info", match)}</div>
        </div>`;

    matchesContainer.innerHTML = `
        <div class="live-match">
            ${videoUrl ? `<iframe width="100%" height="313" src="${videoUrl}" frameborder="0" allowfullscreen></iframe>` 
            : `<div class="no-video-message">No video available for the match.</div>`}
            <div class="live-match-teams">${teamHTML}</div>
            ${contentHTML}
        </div>`;

        // Hide the header slider when showing match details
        const headerSlider = document.querySelector('.header-slider');
          if (headerSlider) {
            headerSlider.style.display = 'none';
           }

    // Attach tab click events
    document.querySelectorAll(".tab-btn").forEach(button => {
        button.addEventListener("click", function () {
            document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
            this.classList.add("active");
    
            const tabContentDiv = document.getElementById("tab-content");
            if (!tabContentDiv) {
                console.error("❌ ERROR: #tab-content div not found!");
                return;
            }
    
            // ✅ Pass APIkey to getTabContent
            const tab = this.dataset.tab;
            tabContentDiv.innerHTML = getTabContent(tab, match, APIkey);
    
    
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
    function getTabContent(tab, match, APIkey) {
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
                                <p><strong><img src="assets/icons/arrow-colorIcon.png" class="info-colorIcon"></strong> ${match.match_time}</p>
                                <p><strong><img src="assets/icons/calender-colorIcon.png" class="info-colorIcon"></strong> ${match.match_date}</p>
                            </div>
                            <div class="infoRight-wing">
                                <p><strong><img src="assets/icons/gprIcon.png" class="info-colorIcon" alt="Venue icon"></strong> ${match.stadium || "Not available"}</p>
                                <p><strong><img src="assets/icons/locationIcon.png" class="info-colorIcon"></strong> ${match.country_name || "Not available"}</p>
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

                    <div class="lineup-players-names">
                        <h4>Players</h4>
                        <div class="lineUp-cont">
                            <div class="lineup-home-players">
                                <h4>${match.match_hometeam_name}</h4>
                                <ul>${renderPlayers(match.lineup?.home?.starting_lineups)}</ul>
                                <h4>Substitutes</h4>
                                <ul>${renderPlayers(match.lineup?.home?.substitutes)}</ul>
                                <ul>${renderPlayers(match.lineup?.home?.coach_name)}</ul>
                            </div>
                            <div class="lineup-away-players">
                                <h4>${match.match_awayteam_name}</h4>
                                <ul>${renderPlayers(match.lineup?.away?.starting_lineups)}</ul>
                                <h4>Substitutes</h4>
                                <ul>${renderPlayers(match.lineup?.away?.substitutes)}</ul>
                                <ul>${renderPlayers(match.lineup?.away?.coach_name)}</ul>
                            </div>
                        </div>
                    </div>
                `;

                case "h2h":
            // Dynamically fetch H2H data
            console.log("📦 Full match object for H2H:", match);

            // Fetch H2H using team names, not match ID
            if (match.match_hometeam_name && match.match_awayteam_name) {
                setTimeout(() => loadH2HData(APIkey, match.match_hometeam_name, match.match_awayteam_name, 10), 0);
            }

            case "h2h":
    console.log("📦 Full match object for H2H:", match);

    if (match.match_hometeam_name && match.match_awayteam_name) {
        setTimeout(() => loadH2HData(APIkey, match.match_hometeam_name, match.match_awayteam_name, 10), 0);
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
                    loadMatchStatistics(match.match_id, APIkey, match);
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
        // 🔄 Load standing and highlight teams
        setTimeout(() => loadStandings(match, APIkey), 0); 
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
async function loadMatchStatistics(match_id, APIkey, match) {
    try {
        const response = await fetch(`https://apiv3.apifootball.com/?action=get_statistics&match_id=${match_id}&APIkey=${APIkey}`);
        const data = await response.json();
        const stats = data[match_id]?.statistics || [];
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

        document.querySelector('.statistics-list').innerHTML = statsHTML;
    } catch (error) {
        console.error("Statistics Error:", error);
    }
}

function loadH2HData(APIkey, homeTeam, awayTeam) {
    const spinner = document.querySelector("#h2h-spinner");
    const h2hMatchesContainer = document.querySelector("#h2h-matches");

    if (!spinner || !h2hMatchesContainer) {
        console.error('Missing DOM elements for H2H.');
        return;
    }

    spinner.style.display = "block";

    const url = `https://apiv3.apifootball.com/?action=get_H2H&firstTeam=${encodeURIComponent(homeTeam)}&secondTeam=${encodeURIComponent(awayTeam)}&APIkey=${APIkey}`;

    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            spinner.style.display = "none";

            const h2hArray = data.firstTeam_VS_secondTeam;

            if (!Array.isArray(h2hArray) || !h2hArray.length) {
                h2hMatchesContainer.innerHTML = "<p>No H2H data available.</p>";
                return;
            }

            const fiveYearsAgo = new Date();
            fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

            const filtered = h2hArray.filter(match => {
                const matchDate = new Date(match.match_date);
                return !isNaN(matchDate) && matchDate >= fiveYearsAgo;
            });

            if (!filtered.length) {
                h2hMatchesContainer.innerHTML = "<p>No H2H matches in the last 5 years.</p>";
                return;
            }

            const grouped = {};
            filtered.forEach(match => {
                const league = match.match_league_name || "Unknown Competition";
                if (!grouped[league]) grouped[league] = [];
                grouped[league].push(match);
            });

            const h2hContent = Object.entries(grouped).map(([leagueName, matches]) => {
                const sortedMatches = matches.sort((a, b) => new Date(b.match_date) - new Date(a.match_date));

                // Aggregate stats
                let homeWins = 0, awayWins = 0, draws = 0, homeGoals = 0, awayGoals = 0;

                sortedMatches.forEach(match => {
                    const homeScore = parseInt(match.match_hometeam_score);
                    const awayScore = parseInt(match.match_awayteam_score);

                    if (!isNaN(homeScore) && !isNaN(awayScore)) {
                        homeGoals += homeScore;
                        awayGoals += awayScore;

                        if (homeScore > awayScore) homeWins++;
                        else if (awayScore > homeScore) awayWins++;
                        else draws++;
                    }
                });

                const statsHTML = `
                    <div class="h2h-stats">
                        <p><strong>Total Matches:</strong> ${sortedMatches.length}</p>
                        <p><strong>${homeTeam} Wins:</strong> ${homeWins}</p>
                        <p><strong>${awayTeam} Wins:</strong> ${awayWins}</p>
                        <p><strong>Draws:</strong> ${draws}</p>
                        <p><strong>${homeTeam} Goals:</strong> ${homeGoals}</p>
                        <p><strong>${awayTeam} Goals:</strong> ${awayGoals}</p>
                    </div>
                `;

                const matchHTML = sortedMatches.map(match => `
                    <div class="h2h-match">
                        
                        <div class="h2h-teams-info">
                        <div class="h2h-match-meta">
                            <p class="h2h-match-date">${match.match_date}</p>
                            <p class="h2h-match-time">${
                               (!isNaN(parseInt(match.match_hometeam_score)) && !isNaN(parseInt(match.match_awayteam_score)))
                              ? "FT"
                              : match.match_time
                            }</p>

                        </div>
                            <div class="h2h-team">
                                <img src="${match.team_home_badge}" alt="${match.match_hometeam_name}" class="h2h-badge">
                                <p>${match.match_hometeam_name}</p>
                            </div>
                            <div class="h2h-score-column">
                                <p class="score">${match.match_hometeam_score}</p>
                                <p class="score">${match.match_awayteam_score}</p>
                            </div>
                            <div class="h2h-team">
                                <img src="${match.team_away_badge}" alt="${match.match_awayteam_name}" class="h2h-badge">
                                <p>${match.match_awayteam_name}</p>
                            </div>
                        </div>
                    </div>
                `).join("");

                return `
                    <div class="h2h-league-group">
                        <h3 class="h2h-league-name">${leagueName}</h3>
                        ${statsHTML}
                        ${matchHTML}
                    </div>
                `;
            }).join("");

            h2hMatchesContainer.innerHTML = h2hContent;
        })
        .catch(err => {
            console.error("Error fetching H2H data:", err);
            spinner.style.display = "none";
            h2hMatchesContainer.innerHTML = "<p>Error loading H2H data.</p>";
        });
}



    //function to load standings
    async function loadStandings(match, APIkey) {
        const tableContainer = document.getElementById("standing-table");
        const spinner = document.getElementById("standing-spinner");
    
        if (!tableContainer) {
            console.error("❌ #standing-table element not found in DOM.");
            return;
        }
    
        try {
            spinner.style.display = "block";
    
            const response = await fetch(`https://apiv3.apifootball.com/?action=get_standings&league_id=${match.league_id}&APIkey=${APIkey}`);
            const data = await response.json();
    
            const tableHTML = `
                <table class="standing-table">
                    <thead>
                        <tr>
                            <th>Pos</th><th>Team</th><th>Pl</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(team => {
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
     
  
  // ✅ Fetch lineup and dynamically infer formation
     function fetchAndRenderLineups(match_id, match) {
       fetch(`https://apiv3.apifootball.com/?action=get_lineups&match_id=${match_id}&APIkey=${APIkey}`)
        .then(res => res.json())
        .then(data => {
            const lineups = data[match_id]?.lineup;
            if (!lineups) {
                console.warn("No lineup data found for match_id:", match_id);
                return;
            }

            const homePlayers = lineups.home?.starting_lineups || [];
            const awayPlayers = lineups.away?.starting_lineups || [];

            const homeFormation = inferFormation(homePlayers);
            const awayFormation = inferFormation(awayPlayers);

            renderPlayersOnField("home", homePlayers, homeFormation, "home");
            renderPlayersOnField("away", awayPlayers, awayFormation, "away");
        })
        .catch(err => console.error("Error fetching lineups:", err));
}

// ✅ Parse inferred formation or fallback string-based one
function parseFormation(formation, players) {
    if (Array.isArray(formation)) return formation;

    const defaultFormation = "4-4-2";
    console.log("🔍 Raw formation string:", formation);

    if (!formation || typeof formation !== "string") {
        console.warn("Formation missing or invalid. Using default:", defaultFormation);
        return defaultFormation.split("-").map(Number);
    }

    const parts = formation.split("-").map(p => parseInt(p.trim())).filter(n => !isNaN(n));
    const sum = parts.reduce((a, b) => a + b, 0);
    const isValid = parts.every(n => Number.isInteger(n) && n > 0) && sum === 10;

    if (!isValid) {
        console.warn("❌ Malformed formation:", formation, "(sum =", sum, ")");
        return defaultFormation.split("-").map(Number);
    }

    console.log("✅ Parsed formation:", parts);
    return parts;
}

// ✅ Inference: derive formation from lineup_position
function inferFormation(players) {
    const outfield = players.filter(p => p.lineup_position !== "1");

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
        else grouped.extra.push(p); // Position 11+
    });

    const result = [];
    if (grouped.defense.length) result.push(grouped.defense.length);
    if (grouped.midfield.length) result.push(grouped.midfield.length);
    if (grouped.attack.length) result.push(grouped.attack.length);
    if (grouped.extra.length) result.push(grouped.extra.length); // e.g. a 3-4-1-2 shape

    console.log("🔧 Inferred formation:", result);
    return result;
}

// ✅ Render player dots based on formation array
function renderPlayersOnField(team, players, formation, side = "home") {
    const container = document.getElementById("football-field");
    if (!container || !formation) return;

    const formationArray = parseFormation(formation, players);
    const isHome = side === "home";

    // Goalkeeper
    const goalkeeper = players.find(p => p.lineup_position === "1");
    if (goalkeeper) {
        const gkX = isHome ? 10 : 90;
        const gkY = 50;
        const gkDiv = createPlayerDiv({ ...goalkeeper, team_type: side }, gkX, gkY);
        container.appendChild(gkDiv);
    }

    // Outfield players
    const outfield = players.filter(p => p.lineup_position !== "1");
    let currentIndex = 0;

    formationArray.forEach((playersInLine, lineIndex) => {
        const totalLines = formationArray.length;
        const x = isHome
            ? ((lineIndex + 1) / (totalLines + 1)) * 45 + 5
            : ((lineIndex + 1) / (totalLines + 1)) * 45 + 50;

        for (let j = 0; j < playersInLine; j++) {
            const y = ((j + 1) / (playersInLine + 1)) * 100;
            const player = outfield[currentIndex];
            if (player) {
                const div = createPlayerDiv({ ...player, team_type: side }, x, y);
                container.appendChild(div);
                currentIndex++;
            }
        }
    });
}

// ✅ Create player dot element
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
    fetchMatchesData(); // This ensures everything waits until the DOM is ready
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



// css code to restructure page layout for mobile and tablet view
 document.addEventListener("DOMContentLoaded", function () {
  function reorderElements() {
      if (window.innerWidth <= 1024) {
          const parent = document.querySelector(".content");

          const headerSlider = document.querySelector(".header-slider");
          const textCont = document.querySelector(".text-cont");
          const liveMatchDemo = document.querySelector(".live-match-demo");
          const textCont3 = document.querySelector(".text-cont3");
          const slider = document.querySelector(".slider");
          const advertPodcast = document.querySelector(".advert");
          const textCont2 = document.querySelector(".text-cont2");
          const matchLatest = document.querySelector(".match-latest");
          const textCont4 = document.querySelector(".text-cont4");
          const prediction = document.querySelector(".prediction-container");
          const leagueTabletextCont = document.querySelector(".leagueTable-text-cont");
          const leagueTableDemo = document.querySelector(".league-table-demo");
          const advert1Podcast = document.querySelector(".advert1");
          const newsPodcast = document.querySelector(".news-podcast");
          const textCont1 = document.querySelector(".text-cont1");
          const newsUpdate = document.querySelector(".news-update");

         
 
          // Append in the correct order
          if (headerSlider) parent.appendChild(headerSlider);
          if (textCont) parent.appendChild(textCont);
          if (liveMatchDemo) parent.appendChild(liveMatchDemo);
          if (textCont3) parent.appendChild(textCont3);
          if (slider) parent.appendChild(slider);
          if (advertPodcast) parent.appendChild(advertPodcast);
          if (textCont2) parent.appendChild(textCont2);
          if (matchLatest) parent.appendChild(matchLatest);
          if (textCont4) parent.appendChild(textCont4);
          if (prediction) parent.appendChild(prediction);
          if (leagueTabletextCont) parent.appendChild(leagueTabletextCont);
          if (leagueTableDemo) parent.appendChild(leagueTableDemo);
          if (advert1Podcast) parent.appendChild(advert1Podcast);
          if (newsPodcast) parent.appendChild(newsPodcast);
          if (textCont1) parent.appendChild(textCont1);
          if (newsUpdate) parent.appendChild(newsUpdate);
      }
  }

  reorderElements();
  window.addEventListener("resize", reorderElements);
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














  



