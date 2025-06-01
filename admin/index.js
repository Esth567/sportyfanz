const express = require("express");
const cors = require("cors");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config();

const newsRoutes = require("./routes/news.js");
const imageProxyRoutes = require("./routes/imageProxy.js");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20
});
app.use("/api/", limiter);

app.use("/api/news", newsRoutes);
app.use("/api", imageProxyRoutes);

app.get("/", (req, res) => {
  res.send("Server running.");
});

app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});
