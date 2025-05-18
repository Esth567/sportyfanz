const http = require("http");
require("dotenv").config({ path: "./.env" });
const app = require("./server/server.js"); 
//const mongoose = require("mongoose");


const PORT = process.env.PORT || 5000;



  // Connect to DB
//mongoose.connect(process.env.MONGO_URI, {
 // useNewUrlParser: true,
 // useUnifiedTopology: true,
//});


const server = http.createServer(app);

// Optional: serve a default message
app.get("/", (req, res) => {
  res.send("Server is running and responding");
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

