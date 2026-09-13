/**
 * Web Search Service
 * Connects to the local web search proxy to provide live web grounding for local models.
 * Engineered for LocalLLMMind by Kapil Kumar Yadav.
 */

export async function performWebSearch(query) {
  if (!query || !query.trim()) {
    return { results: [], query: '' };
  }

  const cleanQuery = query.trim();

  try {
    const res = await fetch(`/api/websearch?q=${encodeURIComponent(cleanQuery)}`);
    if (!res.ok) {
      throw new Error(`Web search failed with HTTP ${res.status}`);
    }
    const data = await res.json();
    return {
      query: cleanQuery,
      results: Array.isArray(data.results) ? data.results : [],
      source: data.source || 'web',
    };
  } catch (err) {
    console.warn('[WebSearchService] Search query failed, trying direct Wikipedia fallback:', err);
    try {
      const wikiRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQuery)}&format=json&origin=*`
      );
      const wikiData = await wikiRes.json();
      const items = wikiData?.query?.search || [];
      const results = items.slice(0, 5).map((item) => ({
        title: item.title,
        snippet: item.snippet.replace(/<[^>]+>/g, ''),
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
      }));
      return { query: cleanQuery, results, source: 'wikipedia' };
    } catch (wikiErr) {
      console.error('[WebSearchService] All search providers failed:', wikiErr);
      return { query: cleanQuery, results: [], error: wikiErr.message };
    }
  }
}

/**
 * Injects structured search results into the prompt context for Ollama
 */
export function formatSearchContext(query, results) {
  if (!results || results.length === 0) return '';

  const formattedSources = results
    .map((r, i) => `[${i + 1}] "${r.title}"\nURL: ${r.url}\nSummary: ${r.snippet}`)
    .join('\n\n');

  return `[LIVE WEB SEARCH CONTEXT FOR: "${query}"]
${formattedSources}

[GROUNDING INSTRUCTIONS]
Answer the user's question accurately using the live web search findings above alongside your general knowledge.
Cite specific facts using bracketed numbers like [1], [2] matching the sources above. If the search results do not directly answer the question, state what is known and clarify.
`;
}
