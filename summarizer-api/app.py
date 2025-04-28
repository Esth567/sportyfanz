import re
from flask import Flask, request, jsonify
from transformers import pipeline
from flask_cors import CORS
import hashlib

# Initialize Flask app
app = Flask(__name__)

# Enable CORS for all domains
CORS(app)

# Load Hugging Face summarization pipeline (You can change to other models like T5 or BERT)
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")

# A simple in-memory cache (for demo purposes, use Redis in production)
cache = {}

# Define a route for text summarization
@app.route('/summarize', methods=['POST'])
def summarize():
    data = request.get_json()
    text = data.get("text", "")
    
    if not text or len(text.strip()) < 30:
        return jsonify({"error": "Text too short to summarize"}), 400

    # Create a hash of the text to check cache
    text_hash = hashlib.md5(text.encode('utf-8')).hexdigest()

    # Check if summary is cached
    if text_hash in cache:
        return jsonify({"summary": cache[text_hash]})

    try:
        # Summarization with max_length and min_length constraints for words count
        max_length = 200  # Aim for maximum 200 words in summary
        min_length = 150  # Aim for at least 150 words in summary

        summary = summarizer(text, max_length=max_length, min_length=min_length, do_sample=False)[0]['summary_text']
        
        # Store in cache
        cache[text_hash] = summary
        return jsonify({"summary": summary})  # Return the summary string directly
    except Exception as e:
        print("Summarization error:", str(e))
        return jsonify({"error": str(e)}), 500


@app.route('/rewrite-title', methods=['POST'])
def rewrite_title():
    data = request.json
    title = data.get("title", "")
    
    if not title:
        return jsonify({"error": "No title provided"}), 400

    # Simple SEO title rewrite: Replace 'Breaking' with 'Latest Update on'
    seo_title = title.replace("Breaking", "Latest Update on")

    # Cache the result using the hash of the title
    title_hash = hashlib.md5(title.encode('utf-8')).hexdigest()
    cache[title_hash] = seo_title

    return jsonify({"seo_title": seo_title})


@app.route('/generate-blog', methods=['POST'])
def generate_blog():
    data = request.get_json()
    title = data.get("title", "")
    description = data.get("description", "")
    
    if not title or not description:
        return jsonify({"error": "Title and description are required"}), 400

    try:
        # --- Step 1: Improve Title for SEO ---
        seo_keywords = ["Match Preview", "Transfer News", "Live Updates", "Fixtures", "Team News"]
        seo_title = title
        for keyword in seo_keywords:
            if keyword.lower() not in seo_title.lower():
                seo_title += f" | {keyword}"
                break

        # --- Step 2: Extract hashtags ---
        tag_keywords = ["Premier League", "La Liga", "Serie A", "Bundesliga", "UEFA Champions League", "Transfer", "Injury", "Lineups"]
        tags = [f"#{word.replace(' ', '')}" for word in tag_keywords if re.search(rf"\b{word}\b", description, re.IGNORECASE)]
        tag_string = " ".join(tags)

        # --- Step 3: Generate blog-style body ---
        blog_prompt = f"""
        Write a detailed, professional and engaging 500-word blog article for a sports website.
        Use short paragraphs, subheadings (like <h2>), and include the key information in the following text:

        "{description}"
        """

        summary_output = summarizer(blog_prompt, max_length=512, min_length=300, do_sample=False)[0]['summary_text']

        # Wrap content like a WordPress blog post
        blog_body = f"""
        <h1>{seo_title}</h1>
        <p><em>{tag_string}</em></p>
        <div class="blog-content">
            <p>{summary_output.replace('. ', '.</p><p>')}</p>
        </div>
        """

        return jsonify({
            "seo_title": seo_title,
            "tags": tag_string,
            "blog_body": blog_body.strip()
        })

    except Exception as e:
        print("Error in generate-blog:", str(e))
        return jsonify({"error": str(e)}), 500


# Run app
if __name__ == '__main__':
    app.run(debug=True)
