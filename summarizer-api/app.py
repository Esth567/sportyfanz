from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import feedparser
import hashlib
import requests
from datetime import datetime
from transformers import pipeline

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can specify allowed origins here if needed
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

# Initialize Hugging Face summarizer
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")

# List of sports news RSS feeds
rss_feeds = [
    "http://www.espn.com/espn/rss/news",
    "http://feeds.bbci.co.uk/sport/rss.xml?edition=uk",
    "https://www.skysports.com/rss/12040",
    "https://www.goal.com/en/feeds/news?fmt=rss"
]

# Simple in-memory cache (for demo, replace with Redis for production)
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
                # Directly summarize using Hugging Face summarizer pipeline
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

@app.on_event("startup")
async def startup_event():
    # Run task on startup
    fetch_and_process_feeds()

# Endpoint to fetch the news
@app.get("/api/news")
async def get_news():
    all_articles = fetch_and_process_feeds()  # Directly get the processed news
    if not all_articles:
        return JSONResponse(status_code=404, content={"message": "No news found"})
    return JSONResponse(content={"news": all_articles})

# Endpoint to manually trigger feed processing
@app.get("/trigger-fetch")
async def trigger_fetch(background_tasks: BackgroundTasks):
    background_tasks.add_task(fetch_and_process_feeds)
    return {"message": "Feed processing started in background"}
