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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load summarizer and spaCy NLP
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
nlp = spacy.load("en_core_web_sm")

# RSS feeds
rss_feeds = [
    "http://www.espn.com/espn/rss/news",
    "http://feeds.bbci.co.uk/sport/rss.xml?edition=uk",
    "https://www.skysports.com/rss/12040",
    "https://www.goal.com/en/feeds/news?fmt=rss"
]

# Cache
cache = {}

# Summarize long text in chunks (200–500 words total)
def summarize_long_text(text, chunk_size=500, max_summary_len=200):
    words = text.split()
    chunks = [' '.join(words[i:i+chunk_size]) for i in range(0, len(words), chunk_size)]
    summarized_chunks = []

    for chunk in chunks:
        try:
            summary = summarizer(chunk, max_length=max_summary_len, min_length=80, do_sample=False)[0]['summary_text']
            summarized_chunks.append(summary)
        except Exception as e:
            print(f"Summarization failed: {e}")
            summarized_chunks.append(chunk)  # Fallback to raw

    return ' '.join(summarized_chunks)

# Fetch RSS feed
def fetch_feed(url):
    response = requests.get(url)
    if response.status_code == 200:
        return response.text
    return None

# Main fetch and process function
def fetch_and_process_feeds():
    news_data = []

    for feed_url in rss_feeds:
        print(f"Fetching feed: {feed_url}")
        feed = feedparser.parse(feed_url)

        for entry in feed.entries:
            title = entry.title
            description = entry.summary
            link = entry.link

            article_hash = hashlib.md5(title.encode('utf-8')).hexdigest()
            if article_hash in cache:
                continue

            try:
                full_summary = summarize_long_text(description)
                news_item = {
                    "title": title,
                    "description": full_summary,
                    "link": link,
                    "pubDate": entry.published,
                    "image": entry.get("media_thumbnail", [{}])[0].get("url", "")
                }
                news_data.append(news_item)
                cache[article_hash] = True
            except Exception as e:
                print(f"Error processing article '{title}': {str(e)}")

    return news_data

# Generate SEO titles
def rewrite_title_for_seo(original_title):
    doc = nlp(original_title)
    players, clubs, leagues = [], [], []

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

# Pydantic model for manual summarization
class NewsItem(BaseModel):
    title: str
    description: str

# POST endpoint for individual summarization
@app.post("/summarize")
def summarize_news(news: NewsItem):
    summary = summarize_long_text(news.description)
    seo_title = rewrite_title_for_seo(news.title)
    return {
        "original_title": news.title,
        "seo_title": seo_title,
        "summary": summary
    }

# GET endpoint to fetch full news list
@app.get("/api/news")
async def get_news():
    all_articles = fetch_and_process_feeds()
    if not all_articles:
        return JSONResponse(status_code=404, content={"message": "No news found"})

    formatted_blog_posts = []
    for article in all_articles:
        formatted_blog_posts.append({
            "title": article["title"],
            "seo_title": rewrite_title_for_seo(article["title"]),
            "featured_image": article["image"],
            "published_date": article["pubDate"],
            "content": f"<p>{article['description'].replace('. ', '.</p><p>')}</p>",
            "read_more_link": article["link"]
        })

    return JSONResponse(content={"posts": formatted_blog_posts})

# Optional: background trigger endpoint
@app.get("/trigger-fetch")
async def trigger_fetch(background_tasks: BackgroundTasks):
    background_tasks.add_task(fetch_and_process_feeds)
    return {"message": "Feed processing started in background"}

# Startup event to preload articles
@app.on_event("startup")
async def startup_event():
    fetch_and_process_feeds()
