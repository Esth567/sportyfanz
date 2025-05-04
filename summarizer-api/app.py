from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import feedparser
import hashlib
import requests
from datetime import datetime
from transformers import pipeline
from pydantic import BaseModel
import spacy

# Initialize FastAPI app
app = FastAPI()

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (modify as needed)
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods
    allow_headers=["*"],  # Allows all headers
)

# Initialize Hugging Face Summarizer and spaCy for NER
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
nlp = spacy.load("en_core_web_sm")

# List of RSS feeds
rss_feeds = [
    "http://www.espn.com/espn/rss/news",
    "http://feeds.bbci.co.uk/sport/rss.xml?edition=uk",
    "https://www.skysports.com/rss/12040",
    "https://www.goal.com/en/feeds/news?fmt=rss"
]

# Simple in-memory cache (for demo purposes, replace with Redis in production)
cache = {}

# Function to fetch RSS feeds
def fetch_feed(url):
    response = requests.get(url)
    if response.status_code == 200:
        return response.text
    return None

# Function to process and summarize the feed
def fetch_and_process_feeds():
    news_data = []
    for feed_url in rss_feeds:
        print(f"Fetching feed: {feed_url}")
        feed = feedparser.parse(feed_url)
        
        for entry in feed.entries:
            title = entry.title
            description = entry.summary
            link = entry.link

            print(f"Processing article: {title}")

            # Check cache to avoid processing the same article again
            article_hash = hashlib.md5(title.encode('utf-8')).hexdigest()
            if article_hash in cache:
                print(f"Article '{title}' already processed.")
                continue

            # Summarize and generate blog
            try:
                # Summarize using Hugging Face summarizer pipeline
                summary = summarizer(description, max_length=min(200, len(description.split())), min_length=10, do_sample=False)
                summary_text = summary[0].get('summary_text', description)  # Fallback to original description if no summary

                # Create an object for each news item
                news_item = {
                    "title": title,
                    "description": summary_text,
                    "link": link,
                    "pubDate": entry.published,
                    "image": entry.get("media_thumbnail", [{}])[0].get("url", "")
                }
                news_data.append(news_item)
                cache[article_hash] = True  # Mark as processed

            except Exception as e:
                print(f"Error processing article '{title}': {str(e)}")

    return news_data

# Function to generate SEO-friendly titles based on named entity recognition
def rewrite_title_for_seo(original_title):
    doc = nlp(original_title)

    players = []
    clubs = []
    leagues = []

    for ent in doc.ents:
        if ent.label_ == "PERSON":
            players.append(ent.text)
        elif ent.label_ in ["ORG", "GPE"]:
            text = ent.text.lower()
            if "fc" in text or "united" in text or "city" in text or "club" in text:
                clubs.append(ent.text)
            elif "league" in text or "cup" in text or "serie" in text:
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

# Pydantic model for incoming news data
class NewsItem(BaseModel):
    title: str
    description: str

# Endpoint to summarize news and generate SEO title
@app.post("/summarize")
def summarize_news(news: NewsItem):
    summary = summarizer(news.description, max_length=200, min_length=10, do_sample=False)[0]['summary_text']
    seo_title = rewrite_title_for_seo(news.title)
    return {
        "original_title": news.title,
        "seo_title": seo_title,
        "summary": summary
    }

# FastAPI startup event to fetch and process RSS feeds
@app.on_event("startup")
async def startup_event():
    # Run the task of fetching and processing feeds on app startup
    fetch_and_process_feeds()

# Endpoint to fetch and return all processed news
@app.get("/api/news")
async def get_news():
    all_articles = fetch_and_process_feeds()  # Directly get the processed news
    if not all_articles:
        return JSONResponse(status_code=404, content={"message": "No news found"})
    return JSONResponse(content={"news": all_articles})

# Endpoint to manually trigger the fetch task
@app.get("/trigger-fetch")
async def trigger_fetch(background_tasks: BackgroundTasks):
    background_tasks.add_task(fetch_and_process_feeds)
    return {"message": "Feed processing started in background"}
