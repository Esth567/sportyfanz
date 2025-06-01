function extractImageFromContent(html) {
  const match = html.match(/<img[^>]+src="([^">]+)"/);
  return match ? match[1] : null;
}

module.exports = { extractImageFromContent };
