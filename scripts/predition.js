

// Format for date + time
function formatDateTime(dateStr, timeStr) {
    const date = new Date(`${dateStr}T${timeStr}`);
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    const formattedDate = date.toLocaleDateString('en-US', options);
    const formattedTime = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${formattedDate} | ${formattedTime}`;
  }
  
  // Get today's date for both from and to
  const today = new Date().toISOString().split("T")[0];
  const from = "2025-04-12";
const to = "2025-04-12";

  
  const bigLeagues = ["Premier League", "La Liga", "Serie A", "Bundesliga", "NPFL"];
  const bigTeams = ["Man U", "Manchester United", "Chelsea", "Real Madrid", "Barcelona", "Juventus", "Bayern Munich", "PSG", "Liverpool", "Arsenal"];
  
  async function fetchPredictions() {
    const response = await fetch(`https://apiv3.apifootball.com/?action=get_predictions&from=${from}&to=${to}&APIkey=${APIkey}`);
    const data = await response.json();
    
    console.log("Raw API data:", data);

  
    const filteredMatches = data.filter(match =>
      bigLeagues.includes(match.league_name) &&
      (bigTeams.includes(match.match_hometeam_name) || bigTeams.includes(match.match_awayteam_name))
    );
  
    renderPredictions(filteredMatches);
  }
  
  function renderPredictions(matches) {
    const container = document.getElementById("predictionsContainer");
    container.innerHTML = ''; // Clear previous
  
    matches.forEach(match => {
      const matchKey = match.match_id;
      const homeTeam = match.match_hometeam_name;
      const awayTeam = match.match_awayteam_name;
      const homeLogo = match.team_home_badge || '';
      const awayLogo = match.team_away_badge || '';
      const leagueLogo = match.league_logo || '';
      const matchDate = match.match_date;
      const matchTime = match.match_time;
  
      const matchDiv = document.createElement("div");
      matchDiv.classList.add("match-preditions");
  
      matchDiv.innerHTML = `
        <div class="preditions-container">
          <div class="match-league-container">
            <img src="${leagueLogo}" alt="${match.league_name}" class="predit-league-logo">
            <span>${match.league_name}</span>
          </div>
          <div class="predit-info-container">
            <div class="match-teams-container">
              <div class="team-predit">
                <img src="${homeLogo}" alt="${homeTeam}" class="team-logo">
                <span>${homeTeam}</span>
                <button class="score-button" onclick="togglePrediction('${matchKey}', '${homeTeam}')">Win</button>
              </div>
              <div class="team-predit">
                <img src="${awayLogo}" alt="${awayTeam}" class="team-logo">
                <span>${awayTeam}</span>
                <button class="score-button" onclick="togglePrediction('${matchKey}', '${awayTeam}')">Win</button>
              </div>
            </div>
          </div>
          <div class="prediction-info" id="predictionInfo-${matchKey}"></div>
          <div class="date-times" onclick="toggleArrow('${matchKey}')">
            <span>${formatDateTime(matchDate, matchTime)}</span>
            <img id="arrow-${matchKey}" src="assets/icons/button-down.png" alt="toggle-arrow">
          </div>
        </div>
      `;
  
      container.appendChild(matchDiv);
    });
  }
  
  function togglePrediction(matchKey, selectedTeam) {
    const predictionKey = `prediction_${matchKey}`;
    const info = document.getElementById(`predictionInfo-${matchKey}`);
    const arrow = document.getElementById(`arrow-${matchKey}`);
    const isVisible = info.style.display === "flex";
  
    // Show input form only if it hasn't been submitted yet
    const storedPredictions = JSON.parse(localStorage.getItem('userPredictions')) || {};
    const existingPrediction = storedPredictions[predictionKey];
  
    if (!existingPrediction || !existingPrediction.score) {
      // User has not submitted a full prediction yet — show the input form
      info.innerHTML = `
        <div class="scores-input">
          <span>Enter Score:</span>
          <input type="text" id="scoreInput-${matchKey}" placeholder="2-1" oninput="validateScoreInput(this)">
        </div>
        <div class="score-stroke"></div>
        <div class="team-win-name"><span>${selectedTeam} to Win</span> 
          <div class="predit-amount"><span>N5,000</span></div>
        </div>
        <p class="error-message" id="error-${matchKey}">Please enter a valid score (e.g., 2-1).</p>
        <button class="submit-button" onclick="confirmSubmit('${matchKey}', '${selectedTeam}')">
          <img src="assets/icons/arrow-up.png" alt="toggle-arrow"> Submit Prediction
        </button>`;
    } else {
      // Already submitted — show result
      displayPredictionResult(matchKey);
    }
  
    info.style.display = isVisible ? "none" : "flex";
    arrow.src = isVisible ? "assets/icons/button-down.png" : "assets/icons/button-up.png";
  }
  
  
  function validateScoreInput(input) {
    let value = input.value.replace(/[^0-9-]/g, '');
    if (value.length === 2 && value[1] !== '-') {
      value = value[0] + '-' + value[1];
    }
    const parts = value.split('-');
    if (parts.length > 2) {
      value = parts[0] + '-' + parts[1];
    }
    input.value = value;
  }
  
  function toggleArrow(matchKey) {
    const info = document.getElementById(`predictionInfo-${matchKey}`);
    const arrow = document.getElementById(`arrow-${matchKey}`);
    const isVisible = info.style.display === "flex";
    info.style.display = isVisible ? "none" : "flex";
    arrow.src = isVisible ? "assets/icons/button-down.png" : "assets/icons/button-up.png";
  }
  
  function displayPredictionResult(matchKey, match = null) {
    const predictionInfoDiv = document.getElementById(`predictionInfo-${matchKey}`);
    const storedPredictions = JSON.parse(localStorage.getItem('userPredictions')) || {};
    const prediction = storedPredictions[`prediction_${matchKey}`];
  
    if (!prediction) {
      predictionInfoDiv.textContent = "No prediction yet.";
      return;
    }
  
    const status = match?.match_status;
    const homeGoals = parseInt(match?.match_hometeam_score || 0);
    const awayGoals = parseInt(match?.match_awayteam_score || 0);
    const predictedScore = prediction.score;  // This holds the score user predicted
  
    let result = "";
  
    if (status === "FT") {
      const winner = homeGoals > awayGoals ? match.match_hometeam_name
        : awayGoals > homeGoals ? match.match_awayteam_name
        : "Draw";
  
      if (winner === prediction.selectedTeam) {
        result = "✅ Correct!";
      } else if (winner === "Draw") {
        result = "🟡 It was a draw.";
      } else {
        result = "❌ Wrong.";
      }
    } else {
      // Awaiting result, include the predicted score and use a smile emoji
      result = `😊 Awaiting result... Your predicted score: ${predictedScore}`;
    }
  
    predictionInfoDiv.textContent = `You predicted: ${prediction.selectedTeam} to win → ${result}`;
  }
  

  function confirmSubmit(matchKey, selectedTeam) {
    const scoreInput = document.getElementById(`scoreInput-${matchKey}`);
    const score = scoreInput.value.trim();
    const error = document.getElementById(`error-${matchKey}`);
  
    const scorePattern = /^\d{1,2}-\d{1,2}$/;
  
    if (!scorePattern.test(score)) {
      error.style.display = 'block';
      return;
    }
  
    error.style.display = 'none';
  
    const storedPredictions = JSON.parse(localStorage.getItem('userPredictions')) || {};
    storedPredictions[`prediction_${matchKey}`] = {
      selectedTeam,
      score,
      matchKey
    };
  
    localStorage.setItem('userPredictions', JSON.stringify(storedPredictions));
  
    // Display result and show popup
    displayPredictionResult(matchKey);
    showSuccessPopup(); // ✅ show popup after saving prediction
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
  
  
  fetchPredictions(); // init on page load



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
 
  