import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { localControlPlugin } from './server/localControl.js';

function webSearchPlugin() {
  return {
    name: 'web-search-plugin',
    configureServer(server) {
      server.middlewares.use('/api/websearch', async (req, res) => {
        const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
        const query = parsedUrl.searchParams.get('q');
        if (!query) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Query parameter q is required', results: [] }));
          return;
        }

        try {
          // Attempt DuckDuckGo Lite search
          const ddgRes = await fetch('https://lite.duckduckgo.com/lite/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            },
            body: `q=${encodeURIComponent(query)}`,
          });
          const html = await ddgRes.text();
          const results = [];
          const linkRegex = /<a[^>]*href="([^"]+)"[^>]*class=['"]result-link['"][^>]*>([\s\S]*?)<\/a>/gi;
          const snippetRegex = /<td[^>]*class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/gi;

          const links = [...html.matchAll(linkRegex)];
          const snippets = [...html.matchAll(snippetRegex)];

          for (let i = 0; i < Math.min(5, links.length); i++) {
            results.push({
              title: links[i][2].replace(/<[^>]+>/g, '').trim(),
              url: links[i][1],
              snippet: snippets[i] ? snippets[i][1].replace(/<[^>]+>/g, '').trim() : '',
            });
          }

          if (results.length > 0) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ query, results, source: 'duckduckgo' }));
            return;
          }
        } catch (e) {
          console.warn('[WebSearch] DDG failed, falling back to Wikipedia:', e.message);
        }

        // Fallback to Wikipedia Search API
        try {
          const wikiRes = await fetch(
            `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`
          );
          const wikiData = await wikiRes.json();
          const searchItems = wikiData?.query?.search || [];
          const results = searchItems.slice(0, 5).map((item) => ({
            title: item.title,
            snippet: item.snippet.replace(/<[^>]+>/g, ''),
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
          }));

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ query, results, source: 'wikipedia' }));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Search failed', details: err.message, results: [] }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [localControlPlugin(), react(), webSearchPlugin()],
  server: {
    port: 2210,
    proxy: {
      '/api': {
        target: 'http://localhost:11434',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: 2210,
    proxy: {
      '/api': {
        target: 'http://localhost:11434',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
