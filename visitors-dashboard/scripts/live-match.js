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


//function to fetch matches
async function fetchMatches() {
    const spinner = document.getElementById("loading-spinner");
    if (spinner) spinner.style.display = "block";

    try {
        const response = await fetch(`https://apiv3.apifootball.com/?action=get_events&from=${getTodayDate(-7)}&to=${getTodayDate(7)}&APIkey=${APIkey}`);
        const data = await response.json();
        updateMatches(data);
    } catch (error) {
        console.error("Fetch error:", error);
    } finally {
        if (spinner) spinner.style.display = "none";
    }
}


const { DateTime } = luxon;

function getMinutesSince(matchDate, matchTime) {
    const { DateTime } = luxon;

    // Parse the match time in Berlin timezone
    const matchDateTime = DateTime.fromFormat(
        `${matchDate} ${matchTime}`,
        "yyyy-MM-dd HH:mm",
        { zone: "Europe/Berlin" }
    );

    // Current time in Berlin
    const now = DateTime.now().setZone("Europe/Berlin");

    const diffInMinutes = Math.floor(now.diff(matchDateTime, "minutes").minutes);
    return diffInMinutes > 0 ? diffInMinutes : 0;
}

function formatToUserLocalTime(date, time) {
    const { DateTime } = luxon;

    // Combine date and time into a full datetime string
    const matchDateTime = DateTime.fromFormat(
        `${date} ${time}`,
        "yyyy-MM-dd HH:mm",
        { zone: "UTC" }  // Assuming API gives time in UTC
    );

    // Convert to user's local timezone
    return matchDateTime.setZone(DateTime.local().zoneName).toFormat("h:mm a"); // Adjust to 12-hour format
}



// Modify the updateMatches function to use getMinutesSince and formatToUserLocalTime for accurate time
function updateMatches(matches) {
    matchesData.live = [];
    matchesData.highlight = [];
    matchesData.upcoming = [];
    matchesData.allHighlights = [];

    const now = DateTime.utc();
    const oneWeekAgo = now.minus({ days: 7 });

    matches.forEach(match => {
        const status = (match.match_status || "").trim().toLowerCase();

        // Convert match time from UTC to local timezone
        const matchDateTimeLocal = DateTime.fromISO(`${match.match_date}T${match.match_time}:00Z`)
            .setZone('utc')  // Assuming API gives UTC time
            .setZone(DateTime.local().zoneName);  // Convert to local timezone

        const isFinished = status === "ft" || status === "finished" || status.includes("pen") || status.includes("after") || parseInt(status) >= 90;
        const isUpcoming = matchDateTimeLocal > now && (status === "ns" || status === "scheduled" || status === "" || status === "not started");
        const isLive = parseInt(status) > 0 && parseInt(status) < 90;

        if (isLive) matchesData.live.push(match);
        if (isFinished && matchDateTimeLocal >= oneWeekAgo) matchesData.highlight.push(match);
        if (isFinished) matchesData.allHighlights.push(match);
        if (isUpcoming) matchesData.upcoming.push(match);

        // Calculate minutes since the match started
        const minutesSinceMatch = getMinutesSince(match.match_date, match.match_time);

        // Format match time to user's local time for display
        const formattedMatchTime = formatToUserLocalTime(match.match_date, match.match_time);

        // Use formatted time and minutes to display or process match status
        console.log(`Match: ${match.match_hometeam_name} vs ${match.match_awayteam_name} - Time: ${formattedMatchTime} - Minutes Since Start: ${minutesSinceMatch}`);
    });

    renderMatches(matchesData, "live");
}



//funtion to render matches
function renderMatches(matchesData, category, leagues = []) {
    const matchesContainer = document.querySelector(".matches");
    if (!matchesContainer) {
        console.error("matches-container element not found.");
        return;
    }

    let selectedMatches = matchesData[category];

    const leagueLogos = {};
    leagues.forEach(league => {
        leagueLogos[league.league_id] = league.league_logo || "assets/images/default-league.png";
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

    const preferredLeagues = [
        { name: "Premier League", country: "England" },
        { name: "La Liga", country: "Spain" },
        { name: "Bundesliga", country: "Germany" },
        { name: "UEFA Champions League", country: "eurocups" }
    ];

    let leagueArray = Object.values(grouped);

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
                const matchUTC = DateTime.fromISO(`${match.match_date}T${match.match_time}:00Z`);
                const matchLocal = matchUTC.setZone(DateTime.local().zoneName);  // Correct timezone conversion

                const matchDay = matchLocal.toFormat("MMM d");

                let matchTimeDisplay = "";
                if (category === "highlight") {
                    matchTimeDisplay = "FT";
                } else if (parseInt(match.match_status) > 0 && parseInt(match.match_status) < 90) {
                    matchTimeDisplay = match.match_status + "'";
                } else {
                    matchTimeDisplay = matchLocal.toFormat("h:mm a");
                }

                html += `
                <div class="matches-item" data-match-id="${match.match_id}" onclick="displayLiveMatch('${match.match_id}', '${category}')">
                    <div class="matches-teams">
                        <div class="matches-time">
                            ${category !== "live" ? `<div class="match-date">${matchDay}</div>` : ""}
                            <div>${matchTimeDisplay}</div>
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
function filterByDate(category) {
    const inputDate = document.getElementById("match-date").value;
    if (!inputDate) return;

    const selectedDate = DateTime.fromISO(inputDate).toISODate(); // Ensures YYYY-MM-DD format

    const filteredMatches = matchesData[category].filter(match => {
        const matchDate = DateTime.fromISO(match.match_date).toISODate(); // Same format
        return matchDate === selectedDate;
    });

    const selectedLeagueMatches = filteredMatches.filter(match => match.league_id === selectedLeagueId);

    const grouped = {
        [selectedLeagueId]: {
            league: selectedLeagueName,
            country: selectedLeagueCountry || "",
            league_logo: selectedLeagueLogo || "assets/images/default-league.png",
            matches: selectedLeagueMatches
        }
    };

    renderMatches({ [category]: filteredMatches }, category, Object.values(grouped));
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

    let matchesContainer = document.querySelector(".matches");

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
    
            // ✅ Remove this, because H2H is now loaded inside getTabContent
          if (tab === "h2h") {
                loadH2HData(match.match_id, APIkey, 5);
            }
    
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
                    console.log("📦 Full match object for H2H:", match);

                    // Fetch H2H using team names, not match ID
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



//function to load h2h
async function loadH2HData(APIkey, homeTeam, awayTeam, limit = 10) {
    const spinner = document.getElementById('h2h-spinner');
    const container = document.getElementById('h2h-matches');

    if (!spinner || !container) return;

    spinner.style.display = 'block';
    container.innerHTML = '';

    if (!APIkey) {
        console.error("❌ Missing API Key");
        container.innerHTML = `<p style="color:red;">Missing API Key.</p>`;
        spinner.style.display = 'none';
        return;
    }
    
    if (!homeTeam || !awayTeam) {
        console.error("❌ Missing team names for H2H");
        container.innerHTML = `<p style="color:red;">Missing team names.</p>`;
        spinner.style.display = 'none';
        return;
    }

    const fromYear = new Date().getFullYear() - 2; // 2 years back
    const fromDate = `${fromYear}-01-01`;
    const toDate = `${new Date().getFullYear()}-12-31`;

    const url = `https://apiv3.apifootball.com/?action=get_H2H&firstTeam=${encodeURIComponent(homeTeam)}&secondTeam=${encodeURIComponent(awayTeam)}&from=${fromDate}&to=${toDate}&APIkey=${APIkey}`;
   

    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log("📥 H2H API Response:", data);

        if (data.error) {
            container.innerHTML = `<p style="color:red;">API Error: ${data.error}</p>`;
            return;
        }


        const matches = data?.h2h || [];


        if (!matches.length) {
            container.innerHTML = `<p>No H2H data available</p>`;
            return;
        }

        const filtered = matches.slice(0, limit);

        container.innerHTML = filtered.map(match => `
            <div class="h2h-match-card">
                <p><strong>${match.match_date}</strong> - ${match.match_hometeam_name} ${match.match_hometeam_score} : ${match.match_awayteam_score} ${match.match_awayteam_name}</p>
            </div>
        `).join("");

    } catch (err) {
        console.error("❌ H2H fetch error:", err);
        container.innerHTML = `<p style="color:red;">Error fetching H2H data.</p>`;
    } finally {
        spinner.style.display = 'none';
        console.log("✅ H2H load complete");
    }
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
     
  
  // Function to fetch player data
 
  async function fetchAndRenderLineups(matchId) {
    try {
      const response = await fetch(`https://apiv3.apifootball.com/?action=get_lineups&match_id=${matchId}&APIkey=${APIkey}`);
      const data = await response.json();
  
      if (!data || !data[0] || !data[0].lineup) {
        console.error('Lineup data is missing or malformed:', data);
        return;
      }
  
      const lineups = data[0].lineup;

      if (!lineups || !lineups.home_team || !lineups.away_team) {
        console.error('Lineup data is missing.');
        return;
    }
    
  
      const homeFormation = lineups.home_team.formation;
      const awayFormation = lineups.away_team.formation;
  
      const homePlayers = [
        ...lineups.home_team.starting_lineups.map(p => ({
          player_name: p.player_name || '',
          number: p.player_number || ''
        }))
      ];
  
      const awayPlayers = [
        ...lineups.away_team.starting_lineups.map(p => ({
          player_name: p.player_name || '',
          number: p.player_number || ''
        }))
      ];
  
      renderTeamsOnField('4-3-3', '4-2-3-1', [
        {number: '1'}, {number: '2'}, {number: '3'}, {number: '4'}, {number: '5'},
        {number: '6'}, {number: '7'}, {number: '8'}, {number: '9'}, {number: '10'}, {number: '11'}
      ], [
        {number: '1'}, {number: '12'}, {number: '13'}, {number: '14'}, {number: '15'},
        {number: '16'}, {number: '17'}, {number: '18'}, {number: '19'}, {number: '20'}, {number: '21'}
      ]);
      
      
    } catch (error) {
      console.error('Error fetching or rendering lineups:', error);
    }
  }


  // Function to place players on the field
  function renderTeamsOnField(homeFormation, awayFormation, homePlayers, awayPlayers) {
    const field = document.getElementById('football-field');
    field.innerHTML = ''; // Clear previous players
  
    placeTeam(field, homeFormation, homePlayers, true);  // Home (left to right)
    placeTeam(field, awayFormation, awayPlayers, false); // Away (right to left)

    if (!homeFormation || !homePlayers.length) {
        console.warn("Missing home formation or players", homeFormation, homePlayers);
      }
      if (!awayFormation || !awayPlayers.length) {
        console.warn("Missing away formation or players", awayFormation, awayPlayers);
      }
      
  }
  
  function placeTeam(field, formation, players, isHomeTeam) {
    const lines = formation.split('-').map(Number);
    const totalLines = lines.length;
    const fieldHeight = field.clientHeight;
  
    const goalkeeper = players[0];
    const outfieldPlayers = players.slice(1);
    let playerIndex = 0;
  
    // Goalkeeper
    const gk = document.createElement('div');
    gk.className = 'player';
    gk.textContent = goalkeeper.number || '1';
    gk.style.backgroundColor = isHomeTeam ? 'black' : 'white';
    gk.style.color = isHomeTeam ? 'white' : 'black';
    gk.style.top = '50%';
    gk.style.left = isHomeTeam ? '5%' : '95%';
    gk.style.transform = 'translate(-50%, -50%)';
    field.appendChild(gk);
  
    // Outfield players
   lines.forEach((numInLine, lineIdx) => {
    const verticalSpacing = fieldHeight / (numInLine + 1);
    const horizontalPercent = isHomeTeam
        ? 15 + lineIdx * (70 / (totalLines - 1))
        : 85 - lineIdx * (70 / (totalLines - 1));

    for (let i = 0; i < numInLine; i++) {
        const player = outfieldPlayers[playerIndex];
        if (!player) continue; // Skip if no player is available

        const playerDiv = document.createElement('div');
        playerDiv.className = 'player';
        playerDiv.innerHTML = `<strong>${player.number || (playerIndex + 2)}</strong>`;
        playerDiv.style.backgroundColor = isHomeTeam ? 'black' : 'white';
        playerDiv.style.color = isHomeTeam ? 'white' : 'black';
        playerDiv.style.left = `${horizontalPercent}%`;
        playerDiv.style.top = `${(i + 1) * verticalSpacing}px`;
        playerDiv.style.transform = 'translate(-50%, -50%)';

        field.appendChild(playerDiv);
        playerIndex++;
     }
    });

  }
  
 
  document.addEventListener('DOMContentLoaded', () => {
    fetchMatches();
  });

  

