// Redirect to login if not authenticated
document.addEventListener("DOMContentLoaded", async function () {
    const token = sessionStorage.getItem("token");
    console.log("Token:", token); // ✅ Check if token is stored

    if (!token) {
        console.log("No token found, redirecting...");
        window.location.href = "login.html"; 
        return;
    }

    try {
        const response = await fetch("http://localhost:5000/admin-dashboard", {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            console.log("Invalid token or unauthorized access. Redirecting...");
            sessionStorage.removeItem("token");
            window.location.href = "login.html"; 
            return;
        }

        const data = await response.json();
        console.log("Dashboard Response:", data); // ✅ Log the server response
        document.getElementById("dashboard-message").textContent = data.message;
    } catch (error) {
        console.error("Error fetching dashboard:", error);
        window.location.href = "login.html"; 
    }
});




// Admin Dashboard Script (admin-dashboard.js)
document.getElementById("update-form").addEventListener("submit", async function (event) {
    event.preventDefault();
    const team1 = document.getElementById("team1").value;
    const team2 = document.getElementById("team2").value;
    const league = document.getElementById("league").value;
    const image = document.getElementById("news-image").value;
    const headline = document.getElementById("news-headline").value;

    await fetch("http://localhost:5000/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team1, team2, league, image, headline })
    });
    alert("Updated Successfully");
});


// Visitors Dashboard Script (visitors-dashboard.js)
document.addEventListener("DOMContentLoaded", async function () {
    try {
        const response = await fetch("http://localhost:5000/data");
        if (!response.ok) throw new Error("Failed to fetch data");
        
        const data = await response.json();
        if (!data) return;

        const teams = document.querySelectorAll(".live-match-demo .team");
        if (teams.length === 2) {
            teams[0].textContent = data.liveMatch?.team1 || "Team 1";
            teams[1].textContent = data.liveMatch?.team2 || "Team 2";
        }
        document.querySelector(".game-leag").textContent = data.liveMatch?.league || "League Name";
        document.querySelector(".news-image img").src = data.newsUpdate?.image || "default-news.jpg";
        document.querySelector(".news-headline").textContent = data.newsUpdate?.headline || "Latest News Headline";
    } catch (error) {
        console.error("Error fetching data:", error);
    }
});
