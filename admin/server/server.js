const dotenv = require("dotenv");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const nodemailer = require('nodemailer');
const webpush = require("web-push");
const cron = require("node-cron");
const { OpenAI } = require('openai');
const Parser = require('rss-parser');


const app = express();
const path = require('path');
const parser = new Parser();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
dotenv.config();




const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const users = [
    { username: "admin", password: "$2b$10$GjGWA1HRyM3nEd1blk/DD.sdCmes8IUQj1H9eIIAyD4lvesQ/4yTq", role: "super-admin" }, // Password: Admin@123
    { username: "editor", password: "$2b$10$iphbCHYYvUQ7fl239Hf6Ge2K6yO2NdBYRcGwN.LPjUbVtOsigNYLa", role: "editor" }  // Password: Editor@123
];




// 🔐 Secure Login Endpoint
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const user = users.find((u) => u.username === username);

    if (!user) return res.status(401).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ token });
});

// 🛡️ Middleware to Protect Routes
const verifyToken = (req, res, next) => {
    const token = req.headers["authorization"];
    if (!token) return res.status(403).json({ message: "Access denied" });

    jwt.verify(token.split(" ")[1], process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ message: "Invalid token" });
        req.user = decoded;
        next();
    });
};

// 📌 Protected Admin Dashboard Route
app.get("/admin-dashboard", verifyToken, (req, res) => {
    console.log("User Data from Token:", req.user);
    if (req.user.role !== "super-admin") {
        return res.status(403).json({ message: "Access denied. Admins only." });
    }
    res.json({ message: "Welcome to Admin Dashboard" });
});



// 📌 openai
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const rss_feeds = [
  "http://www.espn.com/espn/rss/news",
  "http://feeds.bbci.co.uk/sport/rss.xml?edition=uk",
  "https://www.skysports.com/rss/12040",
  "https://www.goal.com/en/feeds/news?fmt=rss"
];

// Rewriting the description (mock version)
function rewriteDescription(desc) {
  return `Latest: ${desc.replace(/<\/?[^>]+(>|$)/g, "")}`;
}

// Extract image from content
function extractImage(entry) {
  const mediaContent = entry.enclosure?.url || '';
  const match = entry.content?.match(/<img.*?src="(.*?)"/);
  return mediaContent || (match ? match[1] : '');
}

const summaryCache = new Map();

async function rewriteDescriptionGPT(text, id = null) {
  const key = id || text.slice(0, 100);

  if (summaryCache.has(key)) return summaryCache.get(key);

  try {
    const prompt = `Rewrite this sports news in a short, engaging blog-style summary:\n\n"${text}"\n\nSummary:`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4', // or 'gpt-3.5-turbo' for lower cost
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.7,
    });

    const summary = response.choices[0].message.content.trim();
    summaryCache.set(key, summary);
    return summary;
  } catch (err) {
    console.error('OpenAI Error:', err.message);
    return text; // fallback
  }
}


async function fetchNews(useGPT = false) {
  const allNews = [];

  for (const feed of rss_feeds) {
    try {
      const result = await parser.parseURL(feed);

      for (const item of result.items) {
        const original = item.contentSnippet || item.summary || '';
        const description = useGPT
          ? await rewriteDescriptionGPT(original, item.guid || item.link)
          : `Latest: ${original.replace(/<\/?[^>]+(>|$)/g, "")}`;

        allNews.push({
          title: item.title,
          description,
          originalDescription: original,
          link: item.link,
          image: extractImage(item),
          pubDate: new Date(item.pubDate),
          source: result.title,
        });
      }
    } catch (err) {
      console.error(`Error fetching ${feed}:`, err.message);
    }
  }

  return allNews.sort((a, b) => b.pubDate - a.pubDate);
}


app.get('/api/news/updates', async (req, res) => {
  const useGPT = req.query.rewrite === 'true';
  const news = await fetchNews(useGPT);
  res.json(news.slice(0, 15));
});

app.get('/api/news/trending', async (req, res) => {
  console.log("🟢 /api/news/trending hit");
  const useGPT = req.query.rewrite === 'true';
  const news = await fetchNews(useGPT);
  res.json(news);
});






// 📌 API Routes
app.get("/data", async (req, res) => {
    try {
        const data = await Data.findOne();
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});

 

//auto-reply to the sender
app.post('/send', async (req, res) => {
    const { name, brand, email, message } = req.body;
  
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  
    try {
      // Send message to your inbox
      await transporter.sendMail({
        from: `"${name}" <${email}>`,
        to: process.env.EMAIL_USER,
        subject: `New Sponsorship Inquiry from ${brand}`,
        html: `
          <h3>New Sponsorship Inquiry</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Brand:</strong> ${brand}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong><br>${message}</p>
        `
      });
  
      // Send auto-reply to the sender
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: `Thanks for reaching out, ${name}!`,
        html: `
          <p>Hi ${name},</p>
          <p>Thanks for contacting us about a potential partnership with <strong>Your Website</strong>. We’ve received your message and will be in touch shortly.</p>
          <p>Best regards,<br>Your Team</p>
        `
      });
  
      res.status(200).send({ message: 'Emails sent successfully.' });
    } catch (error) {
      console.error('Error sending emails:', error);
      res.status(500).send({ error: 'Email sending failed.' });
    }
  });


  const VAPID_KEYS = {
   publicKey: 'BAR21cur5ApKmazRv7EV8iQJEwaSreGzkPuCtBTtVeC0UkpdAAkE9gB1YlTGtpfSxo5FZRYZT6MB9tcJsccr6ZA',
   privateKey: 'x_wswmsvakQqCXUN2OnExeSh92ebVWY1-pNcAPXepjE',
};

webpush.setVapidDetails(
  "mailto:youremail@example.com",
  VAPID_KEYS.publicKey,
  VAPID_KEYS.privateKey
);


let subscriptions = [];

// Save subscription to DB (avoids duplicates)
app.post("/subscribe", async (req, res) => {
  const sub = req.body;

  const exists = await Subscription.findOne({ endpoint: sub.endpoint });
  if (!exists) await Subscription.create(sub);

  res.status(201).json({ message: "Subscribed" });
});

// Notify all
app.post("/notify", async (req, res) => {
  const { title, body } = req.body;
  const payload = JSON.stringify({ title, body });

  const subs = await Subscription.find();
  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub, payload);
    } catch (err) {
      console.error("Notification error:", err);
    }
  }

  res.status(200).json({ message: "Notifications sent" });
});


// Every day at 9am, send top scorer
cron.schedule("0 9 * * *", async () => {
  const title = "🏆 Top Scorer Today";
  const body = "See who's leading the Golden Boot race!";
  const payload = JSON.stringify({ title, body });

  const subs = await Subscription.find();
  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub, payload);
    } catch (err) {
      console.error("Scheduled notification error:", err);
    }
  }

  console.log("9AM Daily notification sent");
});




// ✅ Export Express App
module.exports = app;
