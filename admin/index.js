const http = require("http");
require("dotenv").config({ path: "./.env" });
const app = require("./server/server.js"); 
//const mongoose = require("mongoose");


const port = process.env.PORT || 5000;


  // Connect to DB
//mongoose.connect(process.env.MONGO_URI, {
 // useNewUrlParser: true,
 // useUnifiedTopology: true,
//});


const server = http.createServer(app);

server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });


