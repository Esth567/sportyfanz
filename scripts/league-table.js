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


const leagueLogos = {
    "Premier League": "assets/images/premierleagueLogo.png",
    "La Liga": "assets/images/laliga-logo.png",
    "Serie A": "assets/images/series-aLogo.png",
    "Bundesliga": "assets/images/bundesliga-logo.png",
    "UEFA Champions League": "assets/images/UEFAchampionsleagueLogo.png",
    "NPFL": "assets/images/npflLogo.png",
    // Add other leagues here...
};

async function updateLeagueTable(leagueName, leagueId) {
    try {
        const [standingsResponse, formMap] = await Promise.all([
            fetch(`https://apiv3.apifootball.com/?action=get_standings&league_id=${leagueId}&APIkey=${APIkey}`).then(res => res.json()),
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
        const leagueLogo = leagueLogos[leagueName] || 'assets/images/default-logo.png'; // Fallback to default logo
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
            <span class="stat-headerF">Form</span>
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
                <div class="form-stat">${generateFormHTML(form, 5)}</div>
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

    return tableHTML;
}



 // Helper to get date in yyyy-mm-dd format
function getTodayDate(offset = 0) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return date.toISOString().split("T")[0];
}


// Fetch recent match results and build form per team
async function getRecentForms(leagueId) {
    const response = await fetch(`https://apiv3.apifootball.com/?action=get_events&from=${getTodayDate(-30)}&to=${getTodayDate()}&league_id=${leagueId}&APIkey=${APIkey}`);
    const data = await response.json();

    const formMap = {};

    data.forEach(match => {
        const homeTeam = match.match_hometeam_name;
        const awayTeam = match.match_awayteam_name;
        const homeScore = parseInt(match.match_hometeam_score);
        const awayScore = parseInt(match.match_awayteam_score);

        if (!formMap[homeTeam]) formMap[homeTeam] = [];
        if (!formMap[awayTeam]) formMap[awayTeam] = [];

        if (!isNaN(homeScore) && !isNaN(awayScore)) {
            formMap[homeTeam].push(homeScore > awayScore ? "W" : homeScore === awayScore ? "D" : "L");
            formMap[awayTeam].push(awayScore > homeScore ? "W" : awayScore === homeScore ? "D" : "L");
        }
    });

    // Keep only last 5 results per team
    Object.keys(formMap).forEach(team => {
        formMap[team] = formMap[team].slice(-5).reverse().join("");
    });

    return formMap;
}

// Fetch recent matches for a team from January 2025 and generate the form
function updateTeamForm(teamId) {
    // Define start date as January 1, 2025
    const startDate = "2025-01-01";

    // Fetch team matches from API
    fetch(`https://apiv3.apifootball.com/?action=get_events&team_id=${teamId}&from=${startDate}&APIkey=${APIkey}`)
        .then(response => response.json())
        .then(data => {
            if (data && Array.isArray(data) && data.length > 0) {
                // Extract match results (Win, Loss, Draw)
                const form = data.map(match => {
                    if (match.status === "Finished") {
                        if (match.home_team_score > match.away_team_score) {
                            return "W"; // Win
                        } else if (match.home_team_score < match.away_team_score) {
                            return "L"; // Loss
                        } else {
                            return "D"; // Draw
                        }
                    }
                    return ""; // For ongoing or future matches
                }).filter(result => result !== ""); // Remove non-completed matches

                // Update the form HTML with the generated form
                const formStatElement = document.querySelector(`#team-${teamId} .form-stat`);
                formStatElement.innerHTML = generateFormHTML(form.join(""), 5);
            }
        })
        .catch(error => console.error("Error fetching team events:", error));
}

// Helper function to generate form HTML
function generateFormHTML(formString, maxLength = 5) {
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

// Example of using updateTeamForm for a team with ID 141 (Arsenal)
updateTeamForm(141);


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
    const url = `https://apiv3.apifootball.com/?action=get_teams&team_id=${teamKey}&APIkey=${APIkey}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data[0]; // the API returns an array
    } catch (error) {
        console.error("Error fetching team details:", error);
        return null;
    }
}


 
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
