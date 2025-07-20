const fs = require('fs');
const path = require('path');

/**
 * Save article data to a Markdown file with YAML frontmatter.
 * @param {Object} articleData - Processed article data with NLP + SEO info.
 * @param {string} folder - Subdirectory to store Markdown files.
 */
function saveArticleAsMarkdown(articleData, folder = 'markdown_articles') {
  const frontmatter = {
    title: articleData.title || '',
    date: articleData.date || new Date().toISOString(),
    slug: articleData.seoTitle || '',
    link: articleData.link || '',
    image: articleData.image || '',
    sentiment: articleData.sentiment?.tone || 'neutral',
    sentiment_score: articleData.sentiment?.score ?? 0,
    description: articleData.description || '',
    entities: articleData.entities || {},
  };

  const yamlFrontmatter = '---\n' + Object.entries(frontmatter)
    .map(([key, value]) => {
      if (typeof value === 'object' && !Array.isArray(value)) {
        return `${key}:\n` + Object.entries(value)
          .map(([k, v]) => `  ${k}: [${(v || []).map(e => `"${e}"`).join(', ')}]`)
          .join('\n');
      }
      return `${key}: "${String(value).replace(/"/g, '\\"')}"`;
    })
    .join('\n') + '\n---';

  const content = `${yamlFrontmatter}\n\n${articleData.fullSummary || ''}`;

  const safeFileName = `${articleData.seoTitle || 'untitled'}.md`;
  const outputDir = path.join(__dirname, '..', folder);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const filePath = path.join(outputDir, safeFileName);
  fs.writeFileSync(filePath, content, 'utf8');

  console.log(`📝 Saved: ${filePath}`);
}

module.exports = { saveArticleAsMarkdown };
