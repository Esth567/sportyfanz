from flask import Flask, request, jsonify
from transformers import pipeline
from flask_cors import CORS
import feedparser

app = Flask(__name__)
CORS(app)

# Load a local HuggingFace summarization model (PyTorch-based)
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")

@app.route('/summarize', methods=['POST'])
def summarize():
    data = request.get_json()

    rss_url = data.get('rss_url')
    if not rss_url:
        return jsonify({'error': 'RSS URL is required'}), 400

    feed = feedparser.parse(rss_url)
    results = []

    for entry in feed.entries[:10]:  # limit to 10 entries
        content = entry.get('description', '')[:500]  # Trim to max model input size

        try:
            summary = summarizer(content, max_length=60, min_length=15, do_sample=False)[0]['summary_text']
        except Exception as e:
            summary = content  # fallback to original if error occurs

        results.append({
            'title': entry.get('title', ''),
            'summary': summary,
            'image': entry.get("media_thumbnail", [{"url": ""}])[0]["url"] if "media_thumbnail" in entry else "",
            'pubDate': entry.get('published', ''),
            'category': entry.get("tags", [{}])[0].get("term", "") if "tags" in entry else "",
            'link': entry.get('link', '')
        })

    return jsonify(results)


if __name__ == '__main__':
    app.run(port=5001)
