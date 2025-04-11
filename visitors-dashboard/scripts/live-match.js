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
    if (!leagueData || !leagueData.league_id) {
        console.warn(`❗ League ID missing for: ${leagueName}`);
        return;
    }

    let selectedMatches = matchesData[category] || [];
    let filteredMatches = selectedMatches.filter(match => match.league_id === leagueData.league_id);

    if (filteredMatches.length > 0) {
        fetchMatches(filteredMatches, category, leagueName);
    } else {
        console.log(`No matches found for League: ${leagueName}, Category: ${category}`);
        document.querySelector(".matches").innerHTML = `<p>No matches available for ${leagueName}.</p>`;
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

    // ✅ Now fetch matches AFTER all league_id values are set
    fetchMatches();

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
                 <div class="h2h-matches-container" id="h2h-matches">Fetching data...</div>
               `;

        default:
            return "<p>No data available.</p>";
    }
}


async function renderH2HMatches(match, APIkey) {
    const firstTeamId = match.match_hometeam_id;
    const secondTeamId = match.match_awayteam_id;

    const h2hContainer = document.getElementById("h2h-matches");
    
    // Set initial message before fetching
    h2hContainer.innerHTML = "Fetching data...";

    // Fetch data from API
    const h2hData = await fetchH2HData(firstTeamId, secondTeamId, APIkey);

    // If no data or API returns empty array, show 'No data available'
    if (!Array.isArray(h2hData) || h2hData.length === 0) {
        h2hContainer.innerHTML = "<p>No head-to-head data available.</p>";
        return;
    }

    // Otherwise, render the fetched H2H data
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





