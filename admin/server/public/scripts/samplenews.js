async function fetchNews() {
      const container = document.getElementById('sport-news');
      console.log('Fetching news...');
      try {
        const res = await fetch('/api/sports-summaries');
        console.log('Fetch response:', res);

        if (!res.ok) {
          throw new Error(`Fetch failed with status ${res.status}`);
        }

        const data = await res.json();
        console.log('Received data:', data);

        

        container.innerHTML = ''; // Clear loading message

       if (!data.results || data.results.length === 0) {
         console.log('No results found in data:', data);
         container.innerHTML = '<p>No news found.</p>';
       return;
      }


        data.results.forEach(news => {
          const card = document.createElement('div');
          card.className = 'news-card';

          card.innerHTML = `
            <h3><a href="${news.link}" target="_blank">${news.title}</a></h3>
            <div class="meta">Source: ${new URL(news.source).hostname}</div>
            ${news.paragraphs.map(p => `<div class="paragraph">${p}</div>`).join('')}
            <div class="entities"><strong>Entities:</strong>
              ${[
                ...news.entities.people.map(p => `👤 ${p}`),
                ...news.entities.teams.map(t => `🏟️ ${t}`),
                ...news.entities.locations.map(l => `📍 ${l}`)
              ].join(', ') || 'None'}
            </div>
            <div class="sentiment"><strong>Sentiment:</strong> ${news.sentiment.tone} (Score: ${news.sentiment.score})</div>
          `;

          container.appendChild(card);
        });
      } catch (err) {
        container.innerHTML = '<p>Failed to load news. Please try again later.</p>';
        console.error(err);
      }
    }


    document.addEventListener('DOMContentLoaded', fetchNews);
