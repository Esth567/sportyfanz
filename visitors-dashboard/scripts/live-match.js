// List of leagues to display
const leaguesSelected = {
    "Premier League": { country: "England" },
    "La Liga": { country: "Spain" },
    "Ligue 1": { country: "France" },
    "Ligue 2": { country: "France" },
    "Serie A": { country: "Italy" },
    "NPFL": { country: "Nigeria" },
    "Bundesliga": { country: "Germany" },
    "UEFA Champions League": { country: "eurocups" },
    "Africa Cup of Nations Qualification": { country: "intl" }
};

let selectedLeagueId = null;
let selectedLeagueName = null;
let matchesData = {
    live: [],
    highlight: [],
    upcoming: [],
    allHighlights: []
};

function getTodayDate(offset = 0) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return date.toISOString().split("T")[0];
}

function displayMatchesByLeagueId(leagueId, leagueName, initialCategory = "live") {
    const categoryOrder = ["live", "highlight", "upcoming"];
    const startIndex = categoryOrder.indexOf(initialCategory);

    if (!leagueId) {
        console.warn("No league ID selected. Falling back to all matches.");
        renderMatches(matchesData, initialCategory); // make sure initialCategory is used
        return;
    }
    

    function tryNextCategory(index) {
        if (index >= categoryOrder.length) {
            document.querySelector(".matches").innerHTML = `<p>No matches available for ${leagueName}.</p>`;
            return;
        }

        const currentCategory = categoryOrder[index];
        const matches = matchesData[currentCategory] || [];

        let filtered = matches.filter(match => match.league_id === leagueId);

        if (currentCategory === "highlight" && filtered.length === 0) {
            filtered = matchesData.allHighlights.filter(m => m.league_id === leagueId);
        }

       if (filtered.length > 0 || currentCategory === initialCategory) {
    renderMatches({ [currentCategory]: filtered }, currentCategory);
} else {
    tryNextCategory(index + 1);
}

    }

    tryNextCategory(startIndex);    
}



fetch(`https://apiv3.apifootball.com/?action=get_leagues&APIkey=${APIkey}`)
    .then(res => res.json())
    .then(leagues => {
        const liveMatchesContainer = document.querySelector(".matches-live-ongoing");
        if (!liveMatchesContainer) return;

        liveMatchesContainer.innerHTML = "";
        leagues.forEach(league => {
            const leagueName = league.league_name.trim();
            const leagueCountry = league.country_name.trim().toLowerCase();

            if (leaguesSelected[leagueName] && leaguesSelected[leagueName].country.toLowerCase() === leagueCountry) {
                const leagueElement = document.createElement("div");
                leagueElement.classList.add("leagues-matches");
                leagueElement.setAttribute("data-league-id", league.league_id);
                leagueElement.setAttribute("data-league-name", league.league_name);

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
                    </div>`;

                leagueElement.addEventListener("click", function () {
                    selectedLeagueId = this.getAttribute("data-league-id");
                    selectedLeagueName = this.getAttribute("data-league-name");
                    displayMatchesByLeagueId(selectedLeagueId, selectedLeagueName, "live");
                });

                liveMatchesContainer.appendChild(leagueElement);
            }
        });

        fetchMatches();
    });

async function fetchMatches() {
    try {
        const response = await fetch(`https://apiv3.apifootball.com/?action=get_events&from=${getTodayDate(-7)}&to=${getTodayDate(7)}&APIkey=${APIkey}`);
        const data = await response.json();

        updateMatches(data);
    } catch (error) {
        console.error("Fetch error:", error);
    }
}

function updateMatches(matches) {
    matchesData.live = [];
    matchesData.highlight = [];
    matchesData.upcoming = [];
    matchesData.allHighlights = [];

    const todayStr = new Date().toDateString();
    const now = new Date();

    matches.forEach(match => {
        const status = (match.match_status || "").trim().toLowerCase();
        const matchDateTime = new Date(`${match.match_date} ${match.match_time}`);

        const isFinished = status === "ft" || status === "finished" || status.includes("pen") || status.includes("after") || parseInt(status) >= 90;
        const isUpcoming = matchDateTime > now && (status === "ns" || status === "scheduled" || status === "" || status === "not started");

        const isLive = parseInt(status) > 0 && parseInt(status) < 90;

        if (isLive) matchesData.live.push(match);
        if (isFinished && matchDateTime.toDateString() === todayStr) matchesData.highlight.push(match);
        if (isFinished) matchesData.allHighlights.push(match);
        if (isUpcoming) matchesData.upcoming.push(match);
        
    });

    renderMatches(matchesData, "live");
}

function renderMatches(matchesData, category, leagues = []) {
    const matchesContainer = document.querySelector(".matches");
    let selectedMatches = matchesData[category];

    // Get league logos mapping
    const leagueLogos = {}; 
    leagues.forEach(league => {
        leagueLogos[league.league_id] = league.league_logo || "assets/images/default-league.png"; // Default logo if not found
    });

    let grouped = (selectedMatches || []).reduce((acc, match) => {
        const key = match.league_id;
        if (!acc[key]) {
            acc[key] = {
                league: match.league_name,
                country: match.country_name,
                league_logo: match.league_logo,
                matches: []
            };
        }
        acc[key].matches.push(match);
        return acc;
    }, {});

    if (Object.keys(grouped).length === 0) {
        const defaultLogo = leagueLogos[selectedLeagueId] || "assets/images/default-league.png";
    
        grouped[selectedLeagueId] = {
            league: selectedLeagueName,
            country: "",
            league_logo: defaultLogo,
            matches: []
        };
    }

    let html = "";
    let firstLeague = true;

    // Custom league order
    const preferredLeagues = [
        { name: "Premier League", country: "England" },
        { name: "La Liga", country: "Spain" },
        { name: "Bundesliga", country: "Germany" },
        { name: "UEFA Champions League", country: "eurocups" }
    ];

    // Convert grouped object to array
    let leagueArray = Object.values(grouped);

    // Sort leagues with preferredLeagues first
    leagueArray.sort((a, b) => {
        const indexA = preferredLeagues.findIndex(l => l.name === a.league && l.country === a.country);
        const indexB = preferredLeagues.findIndex(l => l.name === b.league && l.country === b.country);

        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    leagueArray.forEach(league => {
        html += `
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
            selectedLeagueId = selectedLeagueId || league.matches[0]?.league_id || leagueId;
            selectedLeagueName = selectedLeagueName || league.league;
        
            html += `
            <div class="matches-header">
               <div class="match-category-btn ${category === 'live' ? 'active' : ''}" onclick="displayMatchesByLeagueId('${selectedLeagueId}', '${selectedLeagueName}', 'live')">Live</div>
               <div class="match-category-btn ${category === 'highlight' ? 'active' : ''}" onclick="displayMatchesByLeagueId('${selectedLeagueId}', '${selectedLeagueName}', 'highlight')">Highlight</div>
               <div class="match-category-btn ${category === 'upcoming' ? 'active' : ''}" onclick="displayMatchesByLeagueId('${selectedLeagueId}', '${selectedLeagueName}', 'upcoming')">Upcoming</div>
        
                <div class="calendar-wrapper" style="position: relative;">
                    <div class="match-category-btn calendar" onclick="toggleCalendar()">
                        <ion-icon name="calendar-outline"></ion-icon>
                    </div>
                    <input type="date" id="match-date" onchange="filterByDate('${category}')" style="display: none;">
                </div>
            </div>`;
            firstLeague = false;
        }        

        html += `<div class="match-category-content">`;
        if (league.matches.length === 0) {
            html += `
                <div class="match-row no-match-message">
                    <p style="text-align: center; color: #888; font-style: italic;">
                        ${category === "live" ? "No live matches available for this league at the moment." :
                          category === "highlight" ? "No completed matches available for this league." :
                          "No upcoming matches available for this league."}
                    </p>
                </div>
            `;
        } else {
            league.matches.forEach(match => {
                const matchDate = new Date(`${match.match_date}T${match.match_time}`);
                const matchDay = matchDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                const matchTime = category === "highlight" ? "FT" : match.match_status || match.match_time;

                html += `
                <div class="matches-item" data-match-id="${match.match_id}" onclick="displayLiveMatch('${match.match_id}', '${category}')">
                    <div class="matches-teams">
                        <div class="matches-time">
                            <div class="match-date">${matchDay}</div>
                            <div>${matchTime}</div>
                        </div>
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
        }
        html += `</div></div>`;
    });

    matchesContainer.innerHTML = html;
}

// Function to filter matches by the selected date
function filterByDate() {
    const dateInput = document.getElementById("match-date");
    const selectedDate = dateInput.value;
    
    if (!selectedDate) return; // If no date is selected, do nothing
    
    // Format selected date to match the date format of match dates (assuming 'yyyy-mm-dd')
    const formattedSelectedDate = new Date(selectedDate).toISOString().split('T')[0];
    
    // Ensure matchesData[category] is available
    if (!matchesData[category]) {
        console.error(`No matches data available for category: ${category}`);
        return;
    }

    // Filter the matches for the selected date
    const filteredMatches = matchesData[category].filter(match => {
        const matchDate = new Date(`${match.match_date}T${match.match_time}`).toISOString().split('T')[0];
        return matchDate === formattedSelectedDate;
    });

    // Re-render matches with filtered data
    renderMatches({ [category]: filteredMatches }, category);
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
                    <button class="tab-btn" data-tab="statistics">Statistics</button>
                    <button class="tab-btn" data-tab="standing">Standing</button>
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
                    <button class="tab-btn" data-tab="statistics">Statistics</button>
                    <button class="tab-btn" data-tab="standing">Standing</button>
                </div>
                <div class="ad5-logo">
                 <h5>Advertisement</h5>
                </div>
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
                loadH2HData(match, APIkey);
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
                            <ul>${renderPlayers(match.lineup?.home?.starting_lineups)}</ul>
                            <h4>Substitutes</h4>
                            <ul>${renderPlayers(match.lineup?.home?.substitutes)}</ul>
                            <ul>${renderPlayers(match.lineup?.home?.coaches)}</ul>
                        </div>
                        <div class="lineup-away-players">
                            <h4>${match.match_awayteam_name}</h4>
                            <ul>${renderPlayers(match.lineup?.away?.starting_lineups)}</ul>
                            <h4>Substitutes</h4>
                            <ul>${renderPlayers(match.lineup?.away?.substitutes)}</ul>
                            <ul>${renderPlayers(match.lineup?.away?.coaches)}</ul>
                        </div>
                    </div>
                </div>
            `;

            case "h2h":
                // 🔄 Dynamically fetch H2H data
                return `
                    <div class="h2h-header">
                        <h3>H2H</h3>
                        <h4>${match.match_hometeam_name}</h4>
                        <h4>${match.match_awayteam_name}</h4>
                         <div class="filter-buttons">
                          <button onclick="loadH2HData('${match.match_id}', '${APIkey}', 5)">Last 5 Matches</button>
                          <button onclick="loadH2HData('${match.match_id}', '${APIkey}', 'all')">All Matches</button>
                          </div>
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
                    loadStandings(match, APIkey);
                    return `
                        <div class="standing-header">
                            <h3>Standings</h3>                          
                            <div class="standings-table-container" id="standings-table">
                                 <div class="spinner" id="standing-spinner"></div>
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
                <div class="stat-icon">${statIcons[stat.type] || "📊"}</div>
                <div class="stat-away">${stat.away}</div>
                <div class="stat-label">${stat.type}</div>
            </div>
        `).join("");
        
        document.querySelector(".statistics-list").innerHTML = statsHTML;
        document.getElementById("statistics-spinner").style.display = "none";

        document.querySelector('.statistics-list').innerHTML = statsHTML;
    } catch (error) {
        console.error("Statistics Error:", error);
    }
}





//function to load h2h

async function loadH2HData(match_id, APIkey, limit) {
    document.getElementById('h2h-spinner').style.display = 'block';
    document.getElementById('h2h-matches').innerHTML = '';

    try {
        const response = await fetch(`https://apiv3.apifootball.com/?action=get_H2H&match_id=${match_id}&APIkey=${APIkey}`);
        const data = await response.json();

        let matches = data?.[0]?.h2h || [];
        if (limit !== 'all') {
            matches = matches.slice(0, limit);
        }

        const html = matches.map(match => `
            <div class="h2h-match">
                <p>${match.match_date} - ${match.match_hometeam_name} ${match.match_hometeam_score} : ${match.match_awayteam_score} ${match.match_awayteam_name}</p>
            </div>
        `).join("");

        document.getElementById('h2h-matches').innerHTML = html || "<p>No H2H data available</p>";
    } catch (error) {
        document.getElementById('h2h-matches').innerHTML = "<p>Error fetching H2H data</p>";
    } finally {
        document.getElementById('h2h-spinner').style.display = 'none';
    }
}




//function to load standings
async function loadStandings(match, APIkey) {
    try {
        const response = await fetch(`https://apiv3.apifootball.com/?action=get_standings&league_id=${match.league_id}&APIkey=${APIkey}`);
        const data = await response.json();

        const tableHTML = `
            <table class="standing-table">
                <thead>
                    <tr><th>Pos</th><th>Team</th><th>W</th><th>D</th><th>L</th><th>Pts</th></tr>
                </thead>
                <tbody>
                    ${standings.map(team => `
                        <tr class="${[hometeam, awayteam].includes(team.team_name) ? 'highlight-team' : ''}">
                            <td>${team.overall_league_position}</td>
                            <td>${team.team_name}</td>
                            <td>${team.overall_league_W}</td>
                            <td>${team.overall_league_D}</td>
                            <td>${team.overall_league_L}</td>
                            <td>${team.overall_league_PTS}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        `;


        const html = data.map(team => {
            const isHome = team.team_name === match.match_hometeam_name;
            const isAway = team.team_name === match.match_awayteam_name;
            const highlightClass = isHome || isAway ? "highlight-team" : "";

            return `
                <div class="standing-row ${highlightClass}">
                    <span>${team.overall_league_position}</span>
                    <span>${team.team_name}</span>
                    <span>Pts: ${team.overall_league_PTS}</span>
                </div>
            `;
        }).join("");


        document.getElementById("standing-table").innerHTML = tableHTML;
    } catch (err) {
        document.getElementById("standing-table").innerHTML = "<p>Error loading standings</p>";
    } finally {
        document.getElementById("standing-spinner").style.display = "none";
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





