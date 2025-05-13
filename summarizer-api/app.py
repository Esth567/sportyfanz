from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import feedparser
import hashlib
from datetime import datetime
from transformers import pipeline
import spacy
from newspaper import Article
import re
from slugify import slugify
import torch

# Initialize FastAPI app
app = FastAPI()

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["gamesonline.com"],  # Replace with your domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load NLP models
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
nlp = spacy.load("en_core_web_sm")

# In-memory cache to avoid duplicates
article_cache = set()

# RSS feeds
rss_feeds = [
    "http://www.espn.com/espn/rss/news",
    "http://feeds.bbci.co.uk/sport/rss.xml?edition=uk",
    "https://www.skysports.com/rss/12040",
    "https://www.goal.com/en/feeds/news?fmt=rss"
]


# ========== UTILITY FUNCTIONS ==========

def generate_slug(title: str):
    return slugify(title)


def summarize_long_text(url):
    try:
        article = Article(url)
        article.download()
        article.parse()

        text = article.text.strip()
        if len(text) < 100:
            return None

        max_len = 512 if len(text.split()) > 1000 else 300
        summary = summarizer(text, max_length=max_len, min_length=80, do_sample=False)[0]["summary_text"]

        doc = nlp(text)
        first_sentence = next(doc.sents).text if doc.sents else ""

        return {
            "title": article.title,
            "summary": summary,
            "source": article.source_url or url,
            "published": article.publish_date.isoformat() if article.publish_date else datetime.utcnow().isoformat(),
            "url": url,
            "first_sentence": first_sentence
        }

    except Exception as e:
        print(f"Failed to process {url}: {e}")
        return None


def rewrite_title_for_seo(original_title: str) -> str:
    doc = nlp(original_title)
    players, clubs, leagues = [], [], []

    for ent in doc.ents:
        if ent.label_ == "PERSON":
            players.append(ent.text)
        elif ent.label_ in ["ORG", "GPE"]:
            text = ent.text.lower()
            if any(kw in text for kw in ["fc", "united", "city", "club"]):
                clubs.append(ent.text)
            elif any(kw in text for kw in ["league", "cup", "serie"]):
                leagues.append(ent.text)

    player = players[0] if players else None
    club = clubs[0] if clubs else None
    league = leagues[0] if leagues else None

    if player and league:
        return f"{player} Stars in {league} Clash | Full Breakdown"
    elif player and club:
        return f"{player}'s Impact at {club} – Full Update"
    elif club and league:
        return f"{club} in {league} Action | What You Missed"
    elif player:
        return f"{player}'s Latest Performance – Must-Read Update"
    elif club:
        return f"{club} Match Recap, Transfers & More"
    elif league:
        return f"{league} Highlights & Talking Points"

    return original_title[:80] + "..." if len(original_title) > 80 else original_title


def fetch_and_process_feeds():
    news_data = []

    for feed_url in rss_feeds:
        print(f"Fetching: {feed_url}")
        feed = feedparser.parse(feed_url)

        for entry in feed.entries:
            title = entry.title
            link = entry.link
            article_hash = hashlib.md5(title.encode('utf-8')).hexdigest()

            if article_hash in article_cache:
                continue

            summary = summarize_long_text(link)
            if summary:
                news_item = {
                    "title": summary["title"] or title,
                    "description": summary["summary"],
                    "link": link,
                    "pubDate": entry.get("published", datetime.utcnow().isoformat()),
                    "image": entry.get("media_thumbnail", [{}])[0].get("url", "")
                }
                news_data.append(news_item)
                article_cache.add(article_hash)

    return news_data


# ========== API MODELS ==========

class RSSRequest(BaseModel):
    feed_url: str

class NewsItem(BaseModel):
    title: str
    description: str


# ========== API ROUTES ==========

@app.get("/api/news")
async def get_news():
    all_articles = fetch_and_process_feeds()
    if not all_articles:
        return JSONResponse(status_code=404, content={"message": "No news found"})

    formatted_posts = []
    for article in all_articles:
        formatted_posts.append({
            "title": article["title"],
            "seo_title": rewrite_title_for_seo(article["title"]),
            "slug": generate_slug(article["title"]),
            "featured_image": article["image"],
            "published_date": article["pubDate"],
            "content": f"<p>{article['description'].replace('. ', '.</p><p>')}</p>",
            "read_more_link": article["link"]
        })

    return JSONResponse(content={"posts": formatted_posts})


@app.get("/trigger-fetch")
async def trigger_fetch(background_tasks: BackgroundTasks):
    background_tasks.add_task(fetch_and_process_feeds)
    return {"message": "Feed processing started in background"}


@app.on_event("startup")
async def startup_event():
    fetch_and_process_feeds()
