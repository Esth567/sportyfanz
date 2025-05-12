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
from newspaper import Article
import re
from slugify import slugify
import torch


# Initialize FastAPI app
app = FastAPI()

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Change to specific domains in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load summarizer and spaCy NLP
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
nlp = spacy.load("en_core_web_sm")

# In-memory cache to prevent duplicate articles
article_cache = set()

class RSSRequest(BaseModel):
    feed_url: str


def generate_slug(title: str):
    return re.sub(r'[^a-zA-Z0-9]+', '-', title.lower()).strip('-')



# Summarize long text in chunks (200–500 words total)
def summarize_long_text(url):
    try:
        article = Article(url)
        article.download()
        article.parse()
        text = article.text

        # Skip short or empty articles
        if len(text.strip()) < 100:
            return None

        # Summarize
        summary = summarizer(text, max_length=512, min_length=80, do_sample=False)[0]["summary_text"]

        # NLP metadata
        doc = nlp(article.text)
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


# Utility: fetch and parse RSS entries
def fetch_feed_entries(feed_url):
    feed = feedparser.parse(feed_url)
    return feed.entries

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
                full_text = get_full_article_text(link)
                if len(full_text.split()) < 100:
                    full_text = description  # fallback to short if full text too short

                full_summary = summarize_long_text(full_text)

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


# FastAPI endpoint
@app.get("/rss-news/")
def get_rss_news(background_tasks: BackgroundTasks):
    feed_url = [
    "http://www.espn.com/espn/rss/news",
    "http://feeds.bbci.co.uk/sport/rss.xml?edition=uk",
    "https://www.skysports.com/rss/12040",
    "https://www.goal.com/en/feeds/news?fmt=rss"
    ]# Customize or make dynamic

    try:
        entries = fetch_feed_entries(feed_url)
        results = []

        for entry in entries:
            article_url = entry.link
            article_hash = hashlib.sha256(article_url.encode()).hexdigest()

            if article_hash in article_cache:
                continue

            article_data = extract_and_summarize(article_url)
            if article_data:
                article_cache.add(article_hash)
                results.append(article_data)

        return JSONResponse(content={"status": "success", "articles": results})

    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

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
            "slug": generate_slug(article["title"]),
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
