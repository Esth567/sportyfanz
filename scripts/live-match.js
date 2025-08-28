
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


function displayMatchesByLeagueId(leagueId, leagueName, category) {
    selectedLeagueId = leagueId;
    selectedLeagueName = leagueName;

    // Refetch if necessary, or filter from existing global matchesData
    const leagueMatches = Object.fromEntries(
        Object.entries(matchesData).map(([key, matches]) => [
            key,
            matches.filter(match => match.league_id === leagueId)
        ])
    );

    renderMatches(leagueMatches, category);
}



fetch(`${API_BASE}/api/leagues`)
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
                    <div class="leags-country">
                        <img src="${league.league_logo || '/assets/images/default-league.png'}" alt="${league.league_name} Logo">
                        <div class="leagues-info">
                            <h3>${league.league_name}</h3>
                            <p>${league.country_name}</p>
                        </div>
                    </div>
                    <div class="arrow-direct">
                        <img src="/assets/icons/Arrow - Right 2.png" alt="Arrow">
                    </div>`;

                leagueElement.addEventListener("click", function () {
                    selectedLeagueId = this.getAttribute("data-league-id");
                    selectedLeagueName = this.getAttribute("data-league-name");
                    displayMatchesByLeagueId(selectedLeagueId, selectedLeagueName, "live");
                });

                liveMatchesContainer.appendChild(leagueElement);
            }
        });

        fetchAndRenderMatches();
    });



   // === LUXON Time Functions ===

// === Utility Functions ===
function getTodayDate(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().split("T")[0];
}


function getBerlinTime(dateStr, timeStr) {
  return DateTime.fromFormat(`${dateStr} ${timeStr}`, "yyyy-MM-dd HH:mm", { zone: "Europe/Berlin" });
}

function convertToUserLocalTime(berlinTime) {
  return berlinTime.setZone(DateTime.local().zoneName);
}

function formatToUserLocalTime(dateStr, timeStr) {
  try {
    return convertToUserLocalTime(getBerlinTime(dateStr, timeStr)).toFormat("h:mm");
  } catch {
    return "TBD";
  }
}

function getMinutesSince(dateStr, timeStr) {
  try {
    const now = DateTime.local();
    const matchLocal = convertToUserLocalTime(getBerlinTime(dateStr, timeStr));
    return Math.max(0, Math.floor(now.diff(matchLocal, "minutes").minutes));
  } catch {
    return 0;
  }
}


//function to fetch matches
async function fetchAndRenderMatches() {
  try {
    const response = await fetch(`${API_BASE}/api/all_matches`);
    const data = await response.json();

    matchesData = data;
    matchesData = data;
      if (data.live?.length > 0) currentCategory = "live";
      else if (data.upcoming?.length > 0) currentCategory = "upcoming";
      else if (data.highlight?.length > 0) currentCategory = "highlight";

    // ✅ Render matches (this also applies "active" to the correct tab)
    renderMatches(matchesData, currentCategory);

  } catch (error) {
    console.error("Error fetching match data:", error);
    document.querySelector(".matches-container").innerHTML = `<p>Failed to load matches. Please refresh.</p>`;
  }
}


//funtion to render matches
/* ===============================
   RENDER MATCHES
================================= */

// Function to render matches
function renderMatches(matchesData, category) {
  const matchesContainer = document.querySelector(".matches");
  if (!matchesContainer) return;

  let selectedMatches = matchesData[category] || [];

  // ✅ If live is empty, fallback to upcoming
  if (category === "live" && selectedMatches.length === 0) {
    category = "upcoming";
    selectedMatches = matchesData.upcoming || [];
  }

  // Group matches by league_id
  const grouped = selectedMatches.reduce((acc, match) => {
    const leagueId = match.league_id;
    if (!acc[leagueId]) {
      acc[leagueId] = {
        league: match.league_name,
        country: match.country_name,
        league_logo: match.league_logo,
        matches: []
      };
    }
    acc[leagueId].matches.push(match);
    return acc;
  }, {});

  // Preferred leagues
  const preferredLeagues = [
    { name: "Premier League", country: "England" },
    { name: "La Liga", country: "Spain" },
    { name: "Bundesliga", country: "Germany" },
    { name: "UEFA Champions League", country: "eurocups" },
    { name: "UEFA Europa League", country: "eurocups" },
    { name: "UEFA Europa Conference League", country: "eurocups" },
    { name: "Serie A", country: "Italy" },
    { name: "NPFL", country: "Nigeria" },
    { name: "FIFA World Cup", country: "World" },
    { name: "UEFA Euro", country: "eurocups" },
    { name: "AFCON", country: "Africa" },
    { name: "Gold Cup", country: "North America" },
    { name: "Asian Cup", country: "Asia" }
  ];

  const leagueArray = Object.values(grouped).sort((a, b) => {
    const indexA = preferredLeagues.findIndex(
      (l) => l.name === a.league && l.country === a.country
    );
    const indexB = preferredLeagues.findIndex(
      (l) => l.name === b.league && l.country === b.country
    );
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  let html = "";

  if (selectedMatches.length === 0) {
    html += `<p>No ${category} matches found.</p>`;
    matchesContainer.innerHTML = html;
    return;
  }

  // Render leagues and matches
// Render leagues and matches
leagueArray.forEach((league, index) => {
  if (league.matches.length === 0) return;

  // ✅ League header
  html += `
    <div class="league-header">
      <img src="${league.league_logo || '/assets/images/default-league.png'}" alt="${league.league} Logo" class="league-logo">
      <div class="league-titleCountry">
        <h4 class="league-title">${league.league}</h4>
        <span class="league-country">${league.country}</span>
      </div>
      <div class="more-league" onclick="toggleLeagueMatches('${league.league}')">
        <ion-icon name="arrow-forward-outline"></ion-icon>
        <a href="#" id="toggle-${league.league}">See All</a>
      </div>
    </div>`;

  // ✅ League container opens here
  html += `<div class="league-container">`;

  // ✅ If it’s the first league, drop matches-header at the TOP of its container
  if (index === 0) {
    html += getMatchesHeader(category);
  }

  // Matches list
  html += `<div class="match-category-content">`;

  league.matches.forEach((match) => {
    const matchBerlin = luxon.DateTime.fromFormat(
      `${match.match_date} ${match.match_time}`,
      "yyyy-MM-dd HH:mm",
      { zone: "Europe/Berlin" }
    );
    const matchLocal = matchBerlin.setZone(luxon.DateTime.local().zoneName);
    const matchDay = matchLocal.toFormat("MMM d");

    let matchMinute;
    if (category === "highlight") {
      matchMinute = "FT";
    } else if (category === "live") {
      matchMinute =
        parseInt(match.match_status) > 0 &&
        parseInt(match.match_status) < 90
          ? `${match.match_status}'`
          : matchLocal.toFormat("h:mm");
    } else if (category === "upcoming") {
      matchMinute = matchLocal.toFormat("h:mm a");
    }

    html += `
      <div class="matches-item" data-match-id="${match.match_id}" onclick="displayLiveMatch('${match.match_id}', '${category}')">
        <div class="matches-teams">
          <div class="matches-time">
            ${category !== "live" ? `<div class="match-date">${matchDay}</div>` : ""}
            <div>${matchMinute}</div>
          </div>
          <div class="matches-datas">
            <div class="Matchteam">
              <img src="${match.team_home_badge}" alt="${match.match_hometeam_name} Logo">
              <span>${match.match_hometeam_name}</span>
            </div>
            <div class="Matchteam">
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

  // ✅ Close content + container
  html += `</div></div>`;
});

  matchesContainer.innerHTML = html;

  setTodayInCalendar();
  initCalendarPicker(); // no arg; binds to the freshly rendered header
}

/* ===============================
   MATCHES-HEADER (filters + calendar)
================================= */

function getMatchesHeader(category) {
  return `
    <div class="matches-header">
      <div class="match-category-btn ${category === 'live' ? 'active' : ''}" onclick="handleMatchCategory('live')">Live</div>
      <div class="match-category-btn ${category === 'highlight' ? 'active' : ''}" onclick="handleMatchCategory('highlight')">Highlight</div>
      <div class="match-category-btn ${category === 'upcoming' ? 'active' : ''}" onclick="handleMatchCategory('upcoming')">Upcoming</div>
      <div class="calendar-wrapper" style="position: relative;">
        <div class="match-category-btn calendar" onclick="document.getElementById('match-date').click()">
          <div class="calendar-icon">
            <div class="calendar-header"></div>
            <div id="calendar-day" class="calendar-day"></div>
          </div>
        </div>
        <input type="text" id="match-date" style="display:none;">
      </div>
    </div>`;
}

/* ===============================
   CATEGORY HANDLERS (fix click issue)
================================= */

// Single source of truth used by header buttons
function handleMatchCategory(category) {
  // Optional: track current category
  window.currentCategory = category;

  // Re-render with chosen category (this also regenerates the header in right spot)
  renderMatches(matchesData, category);
}

// Backward/forward compatibility aliases (so either name works)
function filterMatchesCategory(category) { handleMatchCategory(category); }
function filterMatchesByCategory(category) { handleMatchCategory(category); }

// Also keep showMatches used by your date filter
function showMatches(data, category) { renderMatches(data, category); }

/* ===============================
   CALENDAR FUNCTIONS
================================= */

function getAvailableMatchDates() {
  return [
    ...matchesData.live.map(m => m.match_date),
    ...matchesData.highlight.map(m => m.match_date),
    ...matchesData.upcoming.map(m => m.match_date)
  ];
}

// Initialize Flatpickr
function initCalendarPicker() {
  const calendarWrapper = document.querySelector(".calendar-wrapper");
  const matchDateInput = document.getElementById("match-date");
  if (!matchDateInput || !calendarWrapper) return;

  // ✅ Prevent re-initialization on the same input
  if (matchDateInput._flatpickr) {
    matchDateInput._flatpickr.set("enable", getAvailableMatchDates());
  } else {
    flatpickr(matchDateInput, {
      dateFormat: "Y-m-d",
      defaultDate: new Date(),
      enable: getAvailableMatchDates(),
      appendTo: calendarWrapper,
      position: "below left",
      onChange: (dates, dateStr) => {
        // Use upcoming for date selection (your original behavior)
        filterByDate("upcoming", dateStr);
      }
    });
  }

  // ✅ Bind calendar open button
  const calendarBtn = document.querySelector(".calendar");
  if (calendarBtn) {
    calendarBtn.addEventListener("click", () => {
      if (matchDateInput && matchDateInput._flatpickr) {
        matchDateInput._flatpickr.open();
      }
    });
  }
}

// Update filterByDate to accept selected date
function filterByDate(category, selectedDate) {
  const filteredData = {
    live: matchesData.live.filter(m => m.match_date === selectedDate),
    highlight: matchesData.highlight.filter(m => m.match_date === selectedDate),
    upcoming: matchesData.upcoming.filter(m => m.match_date === selectedDate),
  };
  showMatches(filteredData, category);
}

// Calendar day fill + rollover
function setTodayInCalendar() {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");

  const dayEl = document.getElementById("calendar-day");
  const inputEl = document.getElementById("match-date");

  if (dayEl) dayEl.textContent = dd;
  if (inputEl) inputEl.value = today.toISOString().split("T")[0];

  // Auto-rollover at midnight
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setHours(24, 0, 0, 0);
  if (window.calendarRolloverTimer) clearTimeout(window.calendarRolloverTimer);
  window.calendarRolloverTimer = setTimeout(setTodayInCalendar, tomorrow - now + 1000);
}

/* ===============================
   OPTIONAL: INITIALIZATION HOOKS
   (Assumes you have fetchAndRenderMatches that sets `matchesData`
    and calls renderMatches(matchesData, defaultCategory))
================================= */

document.addEventListener("DOMContentLoaded", () => {
  // Your existing loader should set `matchesData` globally.
  // Make sure it eventually calls: renderMatches(matchesData, 'live' /* or your default */);
  fetchAndRenderMatches();
});



// Function to fetch match video (unchanged)
async function fetchMatchVideo(matchId) {
    try {
        const response = await fetch(`${API_BASE}/api/video/${matchId}`);
        const data = await response.json();

        console.log("🎥 Video Data:", data);

        return data.videoUrl || null;
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
            <img src="${match.team_home_badge || '/assets/images/default-team.png'}" alt="${match.match_hometeam_name} Logo">
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
            <img src="${match.team_away_badge || '/assets/images/default-team.png'}" alt="${match.match_awayteam_name} Logo">
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

    const adHTML = `<img src="/assets/images/Ad5.png" alt="Ad5" class="ad5-logo">`;

    const contentHTML = `
        <div class="live-match-info">
            ${tabHTML}
            ${adHTML}
            <div class="tab-content" id="tab-content">${getTabContent("info", match)}</div>
        </div>`;

    matchesContainer.innerHTML = `
        <div class="live-match">
            ${videoUrl ? `<iframe width="100%" height="455px" src="${videoUrl}" frameborder="0" allowfullscreen></iframe>` 
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
            tabContentDiv.innerHTML = getTabContent(tab, match);
    
    
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
    function getTabContent(tab, match) {
        const renderPlayers = (players) =>
            players?.length
                ? players.map(player => `
                    <li>
                        <span class="listed-player-number">${player.lineup_number || "-"}</span>
                        <span class="listed-player-name">${player.lineup_player || "Unknown"}</span>
                    </li>`).join("")
                : `<li><em>Not available</em></li>`;

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
                                <p><strong><img src="/assets/icons/arrow-colorIcon.png" class="info-colorIcon"></strong> ${match.match_time}</p>
                                <p><strong><img src="/assets/icons/calender-colorIcon.png" class="info-colorIcon"></strong> ${match.match_date}</p>
                            </div>
                            <div class="infoRight-wing">
                                <p><strong><img src="/assets/icons/gprIcon.png" class="info-colorIcon" alt="Venue icon"></strong> ${match.stadium || "Not available"}</p>
                                <p><strong><img src="/assets/icons/locationIcon.png" class="info-colorIcon"></strong> ${match.country_name || "Not available"}</p>
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
                                <h4>${match.match_hometeam_system || "No Formation"}</h4>
                            </div>
                        </div>
                        
                        <div class="lineUpsteam-info">
                            <div class="team-formation">
                                <h3>${match.match_awayteam_name}</h3>
                                <h4>${match.match_awayteam_system || "No Formation"}</h4>
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
                console.log("📦 Full match object for H2H:", match);

                if (match.match_hometeam_name && match.match_awayteam_name) {
                  setTimeout(() => loadH2HData(match.match_hometeam_name, match.match_awayteam_name, 10), 0);
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
                    loadMatchStatistics(match.match_id, match);
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
                setTimeout(() => loadStandings(match), 0); 
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
async function loadMatchStatistics(match_id, match) {
    try {
        const response = await fetch(`${API_BASE}/api/match/statistics?matchId=${match_id}`);
        const data = await response.json();
        const stats = data.statistics || [];

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

    } catch (error) {
        console.error("Statistics Error:", error);
        document.querySelector('.statistics-list').innerHTML = statsHTML;
    }
}

//function to get h2h

function renderMatchesByLeague(matches) {
  if (!matches.length) return "<p>No matches available.</p>";

  // group matches by league_name
  const grouped = matches.reduce((acc, match) => {
    const league = match.league_name || "Other Competitions";
    if (!acc[league]) acc[league] = [];
    acc[league].push(match);
    return acc;
  }, {});

  let html = "";

  Object.keys(grouped).forEach(league => {
    html += `<h3 class="h2h-league">${league}</h3>`;
    grouped[league].forEach(match => {
      html += `
        <div class="h2h-match">
          <div class="h2hmatch-row">
            <div class="h2hteams-column">
              <div class="h2h-match-meta">
                <p class="h2h-match-date">${match.match_date}</p>
                <p class="h2h-match-time">${
                  (!isNaN(parseInt(match.match_hometeam_score)) &&
                   !isNaN(parseInt(match.match_awayteam_score)))
                    ? "FT"
                    : match.match_time
                }</p>
              </div>
              <div class="h2hteam">
                <img src="${match.team_home_badge || '/assets/default.png'}" alt="${match.match_hometeam_name}">
                <span>${match.match_hometeam_name}</span>
              </div>
              <div class="h2hteam">
                <img src="${match.team_away_badge || '/assets/default.png'}" alt="${match.match_awayteam_name}">
                <span>${match.match_awayteam_name}</span>
              </div>
            </div>
            <div class="h2hscores-column">
              <span>${match.match_hometeam_score}</span>
              <span>${match.match_awayteam_score}</span>
            </div>
          </div>
        </div>`;
    });
  });

  return html;
}

function loadH2HData(homeTeam, awayTeam) {
  const spinner = document.querySelector("#h2h-spinner");
  const h2hMatchesContainer = document.querySelector("#h2h-matches");

  if (!spinner || !h2hMatchesContainer) {
    console.error('Missing DOM elements for H2H.');
    return;
  }

  spinner.style.display = "block";

  fetch(`${API_BASE}/api/h2h?homeTeam=${encodeURIComponent(homeTeam)}&awayTeam=${encodeURIComponent(awayTeam)}`)
    .then(res => res.json())
    .then(data => {
      spinner.style.display = "none";

      const h2hArray = data.h2h || [];
      const homeLast = data.homeLast || [];
      const awayLast = data.awayLast || [];

      let content = "";

      // Direct H2H
      if (h2hArray.length) {
        content += `<h2>Head-to-Head</h2>`;
        content += renderMatchesByLeague(h2hArray.slice(0, 5));
      } else {
        content += `<p>No direct H2H data available.</p>`;
      }

      // Home team last 5
      if (homeLast.length) {
        content += `<h2>Last 5 Matches - ${homeTeam}</h2>`;
        content += renderMatchesByLeague(homeLast.slice(0, 5));
      }

      // Away team last 5
      if (awayLast.length) {
        content += `<h2>Last 5 Matches - ${awayTeam}</h2>`;
        content += renderMatchesByLeague(awayLast.slice(0, 5));
      }

      h2hMatchesContainer.innerHTML = content;
    })
    .catch(err => {
      console.error("Error fetching H2H data:", err);
      spinner.style.display = "none";
      h2hMatchesContainer.innerHTML = "<p>Error loading H2H data.</p>";
    });
}





    //function to load standings
    async function loadStandings(match) {
    const tableContainer = document.getElementById("standing-table");
    const spinner = document.getElementById("standing-spinner");

    if (!tableContainer) {
        console.error("❌ #standing-table element not found in DOM.");
        return;
    }

    try {
        spinner.style.display = "block";

        const response = await fetch(`${API_BASE}/api/standings?leagueId=${match.league_id}`);
        const { standings } = await response.json();

        if (!Array.isArray(standings) || standings.length === 0) {
            tableContainer.innerHTML = "<p>No standings available for this league.</p>";
            return;
        }

        const tableHTML = `
            <table class="standing-table">
                <thead>
                    <tr>
                        <th>Pos</th><th>Team</th><th>Pl</th><th>W</th><th>D</th><th>L</th>
                        <th>GF</th><th>GA</th><th>GD</th><th>Pts</th>
                    </tr>
                </thead>
                <tbody>
                    ${standings.map(team => {
                        const isHome = team.team_name === match.match_hometeam_name;
                        const isAway = team.team_name === match.match_awayteam_name;
                        const highlightTeam = isHome || isAway ? 'highlight-team' : '';

                        // Determine class for position coloring only
                        const pos = parseInt(team.overall_league_position);
                        let posClass = '';
                        if (pos >= 1 && pos <= 4) posClass = 'ucl';
                        else if (pos >= 5 && pos <= 6) posClass = 'uel';
                        else if (pos >= standings.length - 2) posClass = 'relegated';

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
  const containerWrapper = document.getElementById("football-field-wrapper");

  fetch(`${API_BASE}/api/lineups?matchId=${match_id}`)
    .then(res => res.json())
    .then(({ lineup }) => {
      containerWrapper.innerHTML = ""; // Clear previous content

      if (!lineup) {
        displayNoLineupMessage(containerWrapper, "No lineup data found.");
        return;
      }

      const homePlayers = lineup.home?.starting_lineups || lineup.home?.starting_lineup || [];
      const awayPlayers = lineup.away?.starting_lineups || lineup.away?.starting_lineup || [];


      if (homePlayers.length === 0 && awayPlayers.length === 0) {
        displayNoLineupMessage(containerWrapper, "No lineup formation available.");
        return;
      }

      // If we got here, lineup exists. Now render the field and players.
      containerWrapper.innerHTML = `
        <div id="football-field" class="field">
          <div class="center-line"></div>
          <div class="center-circle"></div>
          <div class="penalty-arc left-arc"></div>
          <div class="penalty-arc right-arc"></div>
          <div class="penalty-box left-box"></div>
          <div class="penalty-box right-box"></div>
          <div class="goal left-goal"></div>
          <div class="goal right-goal"></div>  
        </div>
      `;

      const container = document.getElementById("football-field");
      const homeFormation = match?.match_hometeam_system ?? inferFormation(homePlayers);
      const awayFormation = match?.match_awayteam_system ?? inferFormation(awayPlayers);



      renderPlayersOnField("home", homePlayers, homeFormation, "home");
      renderPlayersOnField("away", awayPlayers, awayFormation, "away");
    })
    .catch(err => {
      console.error("Error fetching lineups:", err);
      containerWrapper.innerHTML = "";
      displayNoLineupMessage(containerWrapper, "Error loading lineups.");
    });
}


function displayNoLineupMessage(container, message) {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("no-lineup-message");
    msgDiv.textContent = message;
    msgDiv.style.textAlign = "center";
    msgDiv.style.marginTop = "20px";
    msgDiv.style.color = "#888";
    msgDiv.style.fontSize = "1.2em";
    container.appendChild(msgDiv);
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
function inferFormation(players, fallbackFormationStr) {
    const outfield = players
     .filter(p => p.lineup_position !== "1")
     .sort((a, b) => parseInt(a.lineup_position) - parseInt(b.lineup_position));


    if (outfield.length === 0 && fallbackFormationStr) {
        return parseFormation(fallbackFormationStr);
    }

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
        else grouped.extra.push(p);
    });

    const result = [];
    if (grouped.defense.length) result.push(grouped.defense.length);
    if (grouped.midfield.length) result.push(grouped.midfield.length);
    if (grouped.attack.length) result.push(grouped.attack.length);
    if (grouped.extra.length) result.push(grouped.extra.length);

    return result;
}

// ✅ Render player dots based on formation array
function renderPlayersOnField(team, players, formation, side = "home") {
    const container = document.getElementById("football-field");
    if (!container || !formation) return;

    const formationArray = parseFormation(formation);
    const isHome = side === "home";
    const vertical = isVerticalMode();

    // Goalkeeper position
    const goalkeeper = players.find(p => p.lineup_position === "1");
    if (goalkeeper) {
        const gkX = vertical ? 50 : (isHome ? 10 : 90);
        const gkY = vertical ? (isHome ? 10 : 90) : 50;
        const gkDiv = createPlayerDiv({ ...goalkeeper, team_type: side }, gkX, gkY);
        container.appendChild(gkDiv);
    }

    // Outfield players
    const outfield = players.filter(p => p.lineup_position !== "1");
    let currentIndex = 0;
    formationArray.forEach((playersInLine, lineIndex) => {
        const totalLines = formationArray.length;

        // Calculate line position (X in horizontal, Y in vertical)
        const linePos = ((lineIndex + 1) / (totalLines + 1)) * 45 + 5;
        const lineCoord = isHome ? linePos : linePos + 50;

        for (let j = 0; j < playersInLine; j++) {
            const spread = ((j + 1) / (playersInLine + 1)) * 100;
            const player = outfield[currentIndex];
            if (player) {
                const x = vertical ? spread : lineCoord;
                const y = vertical ? lineCoord : spread;
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
    fetchAndRenderMatches(); // This ensures everything waits until the DOM is ready
});



// menu toggle button for sidebar for mobile view
document.addEventListener("DOMContentLoaded", function () {
    const sidebar = document.getElementById("sidebar");
    const toggleBtn = document.querySelector(".toggle-btn");
    const menuLogo = document.querySelector(".mobileMenu-logo");
    const mobileToggleIcon = document.querySelector(".mobile-toggle-btn");
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


    // Attach toggle function to both buttons/icons
    if (menuLogo) {
        menuLogo.addEventListener("click", toggleSidebar);
    }

    if (mobileToggleIcon) {
        mobileToggleIcon.addEventListener("click", toggleSidebar);
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

    // Move h1 under logo on mobile
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



// layout-fix

window.addEventListener('resize', () => {
    // Optionally clear and re-render field
    const container = document.getElementById("football-field");
    if (container) container.innerHTML = '';
    fetchAndRenderLineups(match_id, match); // re-render
});

function isVerticalMode() {
    return window.innerWidth <= 768; // match CSS media query
}


window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);

  resizeTimer = setTimeout(() => {
    document.body.classList.add("resizing-refresh");

    // refresh ads
    if (window.adsbygoogle && Array.isArray(window.adsbygoogle)) {
      try {
        (adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.warn("Ad refresh failed", e);
      }
    }

    setTimeout(() => {
      document.body.classList.remove("resizing-refresh");
    }, 50);
  }, 200);
});


