// List of leagues to display 
const selectedLeagues = {
    "Premier League": { league_id: 152, country: "England" }, 
    "La Liga": { league_id: null, country: "Spain" },
    "Serie A": { league_id: null, country: "Italy" },
    "NPFL": { league_id: null, country: "Nigeria" },
    "Bundesliga": { league_id: null, country: "Germany" },
    "UEFA Champions League": { league_id: null, country: "eurocups" }
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
            const response = await fetch(`/api/leagues`);
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
                                <img src="${league.league_logo || '/assets/images/default-logo.png'}" alt="${league.league_name} Logo">
                                <div class="league-info">
                                    <h3>${league.league_name}</h3>
                                    <p>${league.country_name}</p>                    
                                </div>
                            </div>
                            <div class="arrow-direct">
                                <img src="/assets/icons/Arrow - Right 2.png" alt="Arrow">
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


const leagueLogos = {
    "Premier League": "/assets/images/premierleagueLogo.png",
    "La Liga": "/assets/images/laliga-logo.png",
    "Serie A": "/assets/images/series-aLogo.png",
    "Bundesliga": "/assets/images/bundesliga-logo.png",
    "UEFA Champions League": "/assets/images/UEFAchampionsleagueLogo.png",
    "NPFL": "/assets/images/npflLogo.png",
    // Add other leagues here...
};

async function updateLeagueTable(leagueName, leagueId) {
    try {
        const [standingsResponse, formMap] = await Promise.all([
            fetch(`/api/standings/${leagueId}`).then(res => res.json()),
            getRecentForms(leagueId)
        ]);

        const leagueData = standingsResponse;
        const middleLayer = document.querySelector(".middle-layer");

        if (!Array.isArray(leagueData) || leagueData.length === 0) {
            middleLayer.innerHTML = `<p>No data available for ${leagueName}</p>`;
            return;
        }

        const initialData = leagueData.slice(0, 10);
        let tableHTML = generateTableHTML(initialData, formMap, leagueName, leagueData);

        // Use the league logo mapping (local images)
        const leagueLogo = leagueLogos[leagueName] || '/assets/images/default-logo.png'; // Fallback to default logo
        console.log("League Logo:", leagueLogo); // Log the logo URL to check

        middleLayer.innerHTML = `
            <div class="league-table">
                <div class="league-headers">
                    <img src="${leagueLogo}" alt="${leagueName} Logo" class="league-logo">
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

        const seeMoreButton = document.querySelector(".more-league-table");
        let expanded = false;

        seeMoreButton.addEventListener("click", (event) => {
            event.stopPropagation();
            expanded = !expanded;
            const leagueTablesDetails = document.querySelector(".league-tables-details");

            if (expanded) {
                leagueTablesDetails.innerHTML = generateTableHTML(leagueData, formMap, leagueName, leagueData);
                seeMoreButton.querySelector(".see-more-text").textContent = "See Less";
                seeMoreButton.querySelector("ion-icon").setAttribute("name", "arrow-back-outline");
            } else {
                leagueTablesDetails.innerHTML = generateTableHTML(leagueData, formMap, leagueName, leagueData);
                seeMoreButton.querySelector(".see-more-text").textContent = "See More";
                seeMoreButton.querySelector("ion-icon").setAttribute("name", "arrow-forward-outline");
            }
        });

    } catch (err) {
        console.error("Error fetching league table or form data:", err);
    }
}




// Prevent sidebar from collapsing when clicking .leag-count or .more-league-table
document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".leag-count, .more-league-table").forEach(element => {
        element.addEventListener("click", (event) => {
            event.stopPropagation(); // Stop the click from affecting the sidebar
        });
    });
});


function getLeagueRules(leagueName) {
    const rulesByLeague = {
        "Premier League": { championsLeagueSpots: 4, europaLeagueSpots: 2, relegationSpots: 3 },
        "La Liga": { championsLeagueSpots: 4, europaLeagueSpots: 2, relegationSpots: 3 },
        "Serie A": { championsLeagueSpots: 4, europaLeagueSpots: 2, relegationSpots: 3 },
        "Bundesliga": { championsLeagueSpots: 4, europaLeagueSpots: 2, relegationSpots: 2 },
        "Ligue 1": { championsLeagueSpots: 3, europaLeagueSpots: 2, relegationSpots: 2 },
        "Eredivisie": { championsLeagueSpots: 2, europaLeagueSpots: 2, relegationSpots: 2 },
        "Primeira Liga": { championsLeagueSpots: 2, europaLeagueSpots: 2, relegationSpots: 3 },
        "Scottish Premiership": { championsLeagueSpots: 1, europaLeagueSpots: 2, relegationSpots: 1 },
        "NPFL": { cafChampionsLeagueSpots: 2, cafConfederationCupSpots: 2, relegationSpots: 3 },
        // Add more leagues as needed
    };

    return rulesByLeague[leagueName] || {
        championsLeagueSpots: 2,
        europaLeagueSpots: 2,
        relegationSpots: 2
    };
}



// Generate HTML for the league table
function generateTableHTML(teams, formMap = {}, leagueName = "Default League", allTeams = teams) {
    const { championsLeagueSpots, europaLeagueSpots, relegationSpots, cafChampionsLeagueSpots, cafConfederationCupSpots } = getLeagueRules(leagueName);
    teams.sort((a, b) => b.overall_league_PTS - a.overall_league_PTS);
    const totalTeams = allTeams.length;


    let tableHTML = `
        <div class="table-headers">
            <span class="position-header">Pos</span>
            <span class="team-name-header">Team</span>
            <span class="stat-headerF hide-on-mobile">Form</span>
            <span class="stat-header">P</span>
            <span class="stat-header">W</span>
            <span class="stat-header">D</span>
            <span class="stat-header">L</span>
            <span class="stat-header">G</span>
            <span class="stat-header">GD</span>
            <span class="stat-header">PTS</span>
        </div>
    `;

    teams.forEach((team, index) => {
        const form = formMap[team.team_name] || "";
        const position = index + 1;
        let rowClass = "";
        let tooltipText = "";

        if (leagueName === "NPFL") {
            if (position <= cafChampionsLeagueSpots) {
                rowClass = "caf-champions-league";
                tooltipText = "CAF Champions League";
            } else if (position <= cafChampionsLeagueSpots + cafConfederationCupSpots) {
                rowClass = "caf-confederation-cup";
                tooltipText = "CAF Confederation Cup";
            } else if (position > totalTeams - relegationSpots) {
                rowClass = "relegation";
                tooltipText = "Relegation";
            }
        } else {
            if (position <= championsLeagueSpots) {
                rowClass = "champions-league";
                tooltipText = "Champions League";
            } else if (position <= championsLeagueSpots + europaLeagueSpots) {
                rowClass = "europa-league";
                tooltipText = "Europa League";
            } else if (position > totalTeams - relegationSpots) {
                rowClass = "relegation";
                tooltipText = "Relegation";
            }
        }

        tableHTML += `
            <div class="team-rows ${rowClass}">
                <span class="team-position ${rowClass}" title="${tooltipText}">${position}</span>
                <div class="team-infos" data-team-key="${team.team_key}">
                    <img src="${team.team_badge}" alt="${team.team_name} Logo" class="team-logo">
                    <span class="teamLeague-name">${team.team_name}</span>
                </div>
                <div class="form-stat hide-on-mobile">${generateFormHTML(form, 5)}</div>
                <span class="team-stat">${team.overall_league_payed}</span>
                <span class="team-stat">${team.overall_league_W}</span>
                <span class="team-stat">${team.overall_league_D}</span>
                <span class="team-stat">${team.overall_league_L}</span>
                <span class="team-stat">${team.overall_league_GF}</span>
                <span class="team-stat">${team.overall_league_GF - team.overall_league_GA}</span>
                <span class="team-stat">${team.overall_league_PTS}</span>
            </div>
        `;
    });

     const toggleButton = `
       <div class="form-button-container show-on-mobile">
       <button class="toggle-form-button" onclick="toggleFormColumn()">Form</button>
       </div>
      `;

     return toggleButton + tableHTML;
  }


// Fetch recent match results and build form per team
async function getRecentForms(leagueId) {
    const response = await fetch(`/api/recent_form/${leagueId}`);
    const data = await response.json();
    return data;
}



function updateTeamForm(teamId) {
    fetch(`/api/team-form/${teamId}`)
        .then(response => response.json())
        .then(data => {
            if (data && Array.isArray(data) && data.length > 0) {
                const form = data.map(match => {
                    if (match.match_status === "Finished") {
                        const homeScore = parseInt(match.match_hometeam_score);
                        const awayScore = parseInt(match.match_awayteam_score);
                        const isHome = parseInt(match.match_hometeam_id) === parseInt(teamId);

                        const teamScore = isHome ? homeScore : awayScore;
                        const opponentScore = isHome ? awayScore : homeScore;

                        if (teamScore > opponentScore) return "W";
                        else if (teamScore < opponentScore) return "L";
                        else return "D";
                    }
                    return "";
                }).filter(result => result !== "");

                const formStatElement = document.querySelector(`#team-${teamId} .form-stat`);
                if (formStatElement) {
                    formStatElement.innerHTML = generateFormHTML(form.join(""), 5);
                }
            }
        })
        .catch(error => console.error("Error fetching team events:", error));
}


// Helper function to generate form HTML
function generateFormHTML(formString = "", maxLength = 5) {
  const results = formString.split("").slice(0, maxLength);
  const padded = Array.from({ length: maxLength }, (_, i) => results[i] || "");

  return padded.map(result => {
    let colorClass = "";
    if (result === "W") colorClass = "form-win";
    else if (result === "D") colorClass = "form-draw";
    else if (result === "L") colorClass = "form-loss";
    else colorClass = "form-empty";

    return `<span class="form-box ${colorClass}">${result || ""}</span>`;
  }).join("");
}


// Function to display detailed team info
async function displayTeamDetails(teamKey) {
    const teamDetails = await getTeamDetailsByKey(teamKey);
    if (!teamDetails) {
        document.querySelector(".team-details-container").innerHTML = "<p>Failed to load team details.</p>";
        return;
    }

    const teamDetailsHTML = `
        <div class="team-details">
            <h2>${teamDetails.team_name}</h2>
            <img src="${teamDetails.team_badge}" alt="${teamDetails.team_name} Logo">
            <p><strong>Country:</strong> ${teamDetails.team_country}</p>
            <p><strong>Founded:</strong> ${teamDetails.team_founded}</p>
            <p><strong>Venue:</strong> ${teamDetails.venue_name || "N/A"}, ${teamDetails.venue_address || ""}, ${teamDetails.venue_city || ""}</p>
        </div>
    `;

    document.querySelector(".team-details-container").innerHTML = teamDetailsHTML;
}


// Add event listeners to the team-infos elements
function attachTeamClickListeners() {
    const teamInfosElements = document.querySelectorAll(".team-infos");

    teamInfosElements.forEach(team => {
        team.style.cursor = "pointer"; // make it look clickable
        team.addEventListener("click", function () {
            const teamKey = this.getAttribute("data-team-key");
            displayTeamDetails(teamKey);
        });
    });
}


// Placeholder function to fetch team details by team key
async function getTeamDetailsByKey(teamKey) {
  try {
    const res = await fetch(`/api/team/${teamKey}`);
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error fetching team details:", error);
    return null;
  }
}



 

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

  


//..............mobile and tablet view.....//
function moveLeaguesCountryForMobile() {
    const leaguesCountry = document.querySelector('.leagues-country');
    const leagueTable = document.querySelector('.league-table');

    if (!leaguesCountry || !leagueTable) return;

    const isMobileOrTablet = window.innerWidth <= 1024;

    if (isMobileOrTablet) {
        // Avoid duplication or re-adding
        if (!leagueTable.contains(leaguesCountry)) {
            leaguesCountry.classList.add("moved");
            leagueTable.insertAdjacentElement("afterbegin", leaguesCountry);
        }
    } else {
        // Move it back to original layer if on desktop
        const originalLayer = document.querySelector('.layer');
        const textCont = originalLayer.querySelector('.text-cont');
        if (!originalLayer.contains(leaguesCountry)) {
            leaguesCountry.classList.remove("moved");
            originalLayer.insertBefore(leaguesCountry, textCont.nextSibling); // or wherever originally located
        }
    }
}

// Run on load
document.addEventListener('DOMContentLoaded', moveLeaguesCountryForMobile);
// Run on resize
window.addEventListener('resize', moveLeaguesCountryForMobile);


//dispay form button on mobile
function toggleFormColumn() {
    const formStats = document.querySelectorAll('.form-stat');
    const formHeader = document.querySelector('.stat-headerF');
    const statHeaders = document.querySelectorAll('.stat-header:not(.stat-headerF)');
    const teamStats = document.querySelectorAll('.team-stat');
    const button = document.querySelector('.toggle-form-button');

    // Toggle visibility classes
    formStats.forEach(stat => stat.classList.toggle('mobile-visible'));
    if (formHeader) formHeader.classList.toggle('mobile-visible');

    statHeaders.forEach(header => header.classList.toggle('hidden-on-mobile'));
    teamStats.forEach(stat => stat.classList.toggle('hidden-on-mobile'));

    // Toggle button text (optional — you can change to "Show Stats" etc.)
    if (button) {
        const showingForm = formHeader?.classList.contains('mobile-visible');
        button.textContent = showingForm ? "Form" : "Form";
    }
}
 