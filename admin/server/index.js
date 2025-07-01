require("dotenv").config();
const express = require("express");
const cors = require("cors");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path = require("path");

const newsRoutes = require("../routes/newsRoutes");
const imageProxyRoutes = require("../routes/imageProxy");
const dashboardRoutes = require('../routes/dashboard');
const leagueRoutes = require('../routes/leagueRoutes');
const matchesRoutes = require('../routes/matchesRoutes');
const videoRoutes = require('../routes/videoRoutes')



const app = express();
app.use('/assets', express.static(path.join(__dirname, 'assets')));

const port = process.env.PORT || 3000;

const allowedOrigins = [
  'https://fantastic-couscous-q7xqw64rvx9vc4pqj-5501.app.github.dev'
];


app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: false
}));


app.use(compression());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));


app.set('trust proxy', 1);

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 30 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
});


app.use("/api/", limiter);
app.use("/api", newsRoutes);
app.use("/api", imageProxyRoutes);
app.use('/api',dashboardRoutes);
app.use('/api',leagueRoutes);
app.use('/api',matchesRoutes);
app.use('/api', videoRoutes);

app.get("/", (req, res) => res.send("✅ API is live."));

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
