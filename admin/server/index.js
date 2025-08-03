require("dotenv").config();
const express = require("express");
const cors = require("cors");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path = require("path");

//const newsRoutes = require("../routes/newsRoutes");
const imageProxyRoutes = require("../routes/imageProxy");
const dashboardRoutes = require('../routes/dashboard');
const leagueRoutes = require('../routes/leagueRoutes');
const videoRoutes = require('../routes/videoRoutes');
const playerImageRoutes = require('../routes/playerImageRoutes');
const fetchnlpnews = require('../routes/fetchnlpnews'); 
const entitydadabase = require('../routes/entitydatabase');



const app = express();

app.use(express.static(path.join(__dirname, '../public')));

app.use(compression());
app.use(express.json());


const port = process.env.PORT || 3000;

const allowedOrigins = [
  'https://sportyfanz.com',
  'https://www.sportyfanz.com',
  'https://reimagined-space-robot-pj6rx9wv7g462jx6-5500.app.github.dev', // ✅ Your Codespace dev URL
  'http://localhost:5500', // ✅ If you ever test from local
];



app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://sportyfanz.com',
      'https://www.sportyfanz.com',
    ];

    // In development, allow Codespace and localhost
    if (process.env.NODE_ENV !== 'production') {
      allowedOrigins.push('http://localhost:3000');
      allowedOrigins.push('http://localhost:5500');
      allowedOrigins.push('https://reimagined-space-robot-pj6rx9wv7g462jx6-5500.app.github.dev');
    }

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  }
}));



app.set('trust proxy', 1);

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 30 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
});


app.use("/api/", limiter);
//app.use("/api", newsRoutes);
app.use("/api", imageProxyRoutes);
app.use('/api',dashboardRoutes);
app.use('/api',leagueRoutes);
app.use('/api', videoRoutes);
app.use('/api', playerImageRoutes);
app.use('/api', fetchnlpnews);
app.use('/api', entitydadabase);


app.get("/", (req, res) => res.send("✅ API is live."));

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
