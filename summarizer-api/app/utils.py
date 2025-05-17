import os
import requests
from pathlib import Path
import hashlib
from datetime import datetime
import feedparser
from newspaper import Article
from transformers import pipeline
import spacy
from app.cache import article_cache
from slugify import slugify

rss_feeds = [
    "http://www.espn.com/espn/rss/news",
    "http://feeds.bbci.co.uk/sport/rss.xml?edition=uk",
    "https://www.skysports.com/rss/12040",
    "https://www.goal.com/en/feeds/news?fmt=rss"
]

summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
nlp = spacy.load("en_core_web_sm")

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
            "title": article.title or "",
            "summary": summary,
            "source": url,
            "published": article.publish_date.isoformat() if article.publish_date else datetime.utcnow().isoformat(),
            "url": url,
            "first_sentence": first_sentence
        }
    except Exception as e:
        print(f"[ERROR] Failed to process {url}: {e}")
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
        try:
            feed = feedparser.parse(feed_url)
        except Exception as e:
            print(f"Failed to parse feed {feed_url}: {e}")
            continue
        for entry in feed.entries:
            title = entry.get("title", "")
            link = entry.get("link", "")
            if not title or not link:
                continue
            article_hash = hashlib.md5(title.encode("utf-8")).hexdigest()
            if article_hash in article_cache:
                continue
            summary = summarize_long_text(link)
            if summary:
                news_item = {
                    "title": summary.get("title") or title,
                    "description": summary.get("summary", ""),
                    "link": link,
                    "pubDate": entry.get("published", summary.get("published", datetime.utcnow().isoformat())),
                    "image": (
                        entry.get("media_thumbnail", [{}])[0].get("url") if entry.get("media_thumbnail") else ""
                    )
                }
                news_data.append(news_item)
                article_cache.add(article_hash)
    return news_data


def download_image(url: str, slug: str) -> str:
    if not url:
        return ""
    try:
        img_ext = url.split('.')[-1].split("?")[0]
        local_dir = Path("static/images")
        local_dir.mkdir(parents=True, exist_ok=True)
        local_path = local_dir / f"{slug}.{img_ext}"
        if local_path.exists():
            return str(local_path)
        r = requests.get(url, timeout=10)
        with open(local_path, "wb") as f:
            f.write(r.content)
        return str(local_path)
    except Exception as e:
        print(f"[ERROR] Could not download image {url}: {e}")
        return ""
