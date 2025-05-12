document.getElementById("login-form").addEventListener("submit", async function (event) {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
        const response = await fetch("http://localhost:5000/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        console.log("Login Response:", data); // ✅ Log the response

        if (response.ok && data.token) {
            sessionStorage.setItem("token", data.token);
            console.log("Token Stored:", sessionStorage.getItem("token")); // ✅ Check token storage
            window.location.href = "dashboard.html";
        } else {
            document.getElementById("login-error").textContent = data.message;
        }
    } catch (error) {
        console.error("Login Error:", error);
    }
});
