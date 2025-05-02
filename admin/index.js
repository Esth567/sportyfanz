const http = require("http");
require("dotenv").config({ path: "./.env" });
const app = require("./server/server.js"); 


const fetchTopScorersAndDownloadImages = require('./server/downloadImages.js');
fetchTopScorersAndDownloadImages();

const port = process.env.PORT || 5000;


const server = http.createServer(app);

server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });


