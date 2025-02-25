const http = require("http");
const mongoose = require("mongoose");
require("dotenv").config({ path: "./.env" });

const app = require("./server/server.js"); 

console.log("MongoDB URL:", process.env.MONGO_URL); // Debugging if URL is loaded

const port = process.env.PORT || 5000;
const MONGO_URL = process.env.MONGO_URL;

const server = http.createServer(app);

// Database Connection
mongoose.connect(MONGO_URL)
    .then(() => {
        console.log("✅ Database Connected Successfully");

        // Start Server After Database Connects
        server.listen(port, () => {
            console.log(`🚀 Server running on http://localhost:${port}`);
        });
    })
    .catch(err => console.error("❌ Database Connection Error:", err));



