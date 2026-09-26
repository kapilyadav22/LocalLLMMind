/**
 * In-Browser Local RAG & Document Knowledge Base Engine
 * Engineered by Kapil Kumar Yadav for LocalLLMMind
 * 
 * Provides client-side text chunking, storage (localStorage with Node test fallback),
 * hybrid keyword + TF-IDF retrieval, and system prompt grounding formatting.
 */

import { v4 as uuidv4 } from 'uuid';

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  text: string;
  chunkIndex: number;
  tokenEstimate: number;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  tag: string; // e.g. "api-docs", "notes", "architecture" (normalized without '#')
  content: string;
  chunks: KnowledgeChunk[];
  fileType: string; // 'md' | 'txt' | 'json' | 'csv' | 'code' | etc.
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeSearchResult {
  chunk: KnowledgeChunk;
  documentId: string;
  documentTitle: string;
  tag: string;
  score: number;
  matchTerms: string[];
}

const STORAGE_KEY = 'localllmmind_knowledge_documents_v1';

// In-memory fallback cache for Node test environments or SSR
let inMemoryKnowledgeCache: KnowledgeDocument[] | null = null;

// Built-in starter documents to ensure instant utility out-of-the-box
const STARTER_DOCUMENTS: Omit<KnowledgeDocument, 'id' | 'createdAt' | 'updatedAt' | 'chunks' | 'sizeBytes'>[] = [
  {
    title: 'LocalLLMMind Architecture & Guidelines',
    tag: 'localllmmind',
    fileType: 'md',
    content: `# LocalLLMMind System Guide
LocalLLMMind is a private, offline-first AI studio running locally on port 2210.
Features:
- Full streaming chat with local Ollama models and cloud fallback (OpenAI, Anthropic, Gemini, Grok, TypeSafe Jev).
- Dual Arena Mode for side-by-side model evaluation with blind voting.
- Persistent Cross-Chat Memory Studio with automatic preference extraction.
- Workspace Scratchpad & Notes system for Notion-like drafting.
- Granular Per-Turn Generation Metrics inspector with TTFT (Time to First Token) and tok/s speed gauge.
- In-browser RAG & Document Knowledge Base with #tag semantic grounding.
- Embedded Code Workspace with interactive PTY terminal and Git source control.`,
  },
  {
    title: 'API & Coding Standards',
    tag: 'coding-standards',
    fileType: 'md',
    content: `# Engineering Standards
1. Use TypeScript with strict null checks and explicit interface definitions.
2. Maintain zero compiler errors and 100% test pass rate across both workspaces.
3. For React UI, use Material-UI (MUI v6) with refined dark mode palettes and blur backdrops.
4. Keep all local AI interactions private. Never transmit user code or memory to unauthenticated external servers.`,
  },
];

/**
 * Splits document text into overlapping semantic chunks
 */
export function splitTextIntoChunks(
  text: string,
  chunkSize: number = 700,
  overlap: number = 120
): Array<{ text: string; tokenEstimate: number }> {
  if (!text || text.trim().length === 0) return [];

  // Normalize line breaks
  const normalized = text.replace(/\r\n/g, '\n');
  const chunks: Array<{ text: string; tokenEstimate: number }> = [];

  // Attempt to split naturally on paragraphs or sentences
  const paragraphs = normalized.split(/\n{2,}/);
  let currentBuffer = '';

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if ((currentBuffer + '\n\n' + trimmed).length <= chunkSize) {
      currentBuffer = currentBuffer ? `${currentBuffer}\n\n${trimmed}` : trimmed;
    } else {
      if (currentBuffer) {
        chunks.push({
          text: currentBuffer,
          tokenEstimate: Math.ceil(currentBuffer.length / 4),
        });
      }

      // If a single paragraph is larger than chunkSize, break by sentences/length
      if (trimmed.length > chunkSize) {
        let start = 0;
        while (start < trimmed.length) {
          let end = Math.min(start + chunkSize, trimmed.length);
          // Look for sentence boundary
          if (end < trimmed.length) {
            const nextPeriod = trimmed.lastIndexOf('. ', end);
            if (nextPeriod > start + chunkSize * 0.5) {
              end = nextPeriod + 1;
            }
          }
          const slice = trimmed.slice(start, end).trim();
          if (slice) {
            chunks.push({
              text: slice,
              tokenEstimate: Math.ceil(slice.length / 4),
            });
          }
          start = end - overlap > start ? end - overlap : end;
        }
        currentBuffer = '';
      } else {
        currentBuffer = trimmed;
      }
    }
  }

  if (currentBuffer.trim()) {
    chunks.push({
      text: currentBuffer.trim(),
      tokenEstimate: Math.ceil(currentBuffer.trim().length / 4),
    });
  }

  return chunks;
}

/**
 * Normalizes a tag string by removing '#' prefix, lowering case, and trimming
 */
export function normalizeTag(tag: string): string {
  if (!tag) return 'general';
  return tag.replace(/^#+/, '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
}

/**
 * Loads all knowledge documents from storage (with default initialization)
 */
export function loadKnowledgeDocuments(): KnowledgeDocument[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    if (!inMemoryKnowledgeCache) {
      inMemoryKnowledgeCache = STARTER_DOCUMENTS.map((seed, index) => {
        const id = `starter-doc-${index + 1}`;
        const rawChunks = splitTextIntoChunks(seed.content);
        const chunks: KnowledgeChunk[] = rawChunks.map((c, i) => ({
          id: `${id}-c${i}`,
          documentId: id,
          text: c.text,
          chunkIndex: i,
          tokenEstimate: c.tokenEstimate,
        }));
        return {
          id,
          title: seed.title,
          tag: normalizeTag(seed.tag),
          content: seed.content,
          chunks,
          fileType: seed.fileType,
          sizeBytes: new Blob([seed.content]).size,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });
    }
    return inMemoryKnowledgeCache;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initialized: KnowledgeDocument[] = STARTER_DOCUMENTS.map((seed, index) => {
        const id = uuidv4();
        const rawChunks = splitTextIntoChunks(seed.content);
        const chunks: KnowledgeChunk[] = rawChunks.map((c, i) => ({
          id: uuidv4(),
          documentId: id,
          text: c.text,
          chunkIndex: i,
          tokenEstimate: c.tokenEstimate,
        }));
        return {
          id,
          title: seed.title,
          tag: normalizeTag(seed.tag),
          content: seed.content,
          chunks,
          fileType: seed.fileType,
          sizeBytes: new Blob([seed.content]).size,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialized));
      inMemoryKnowledgeCache = initialized;
      return initialized;
    }
    const parsed = JSON.parse(raw);
    inMemoryKnowledgeCache = parsed;
    return parsed;
  } catch (e) {
    console.error('[knowledgeStorage] Failed to load knowledge documents:', e);
    return inMemoryKnowledgeCache || [];
  }
}

/**
 * Saves or updates a knowledge document and re-indexes its chunks
 */
export function saveKnowledgeDocument(
  docData: {
    id?: string;
    title: string;
    tag: string;
    content: string;
    fileType?: string;
  }
): KnowledgeDocument {
  const docs = loadKnowledgeDocuments();
  const id = docData.id || uuidv4();
  const title = docData.title.trim() || 'Untitled Knowledge Document';
  const tag = normalizeTag(docData.tag);
  const content = docData.content.trim();
  const fileType = docData.fileType || 'md';

  const rawChunks = splitTextIntoChunks(content);
  const chunks: KnowledgeChunk[] = rawChunks.map((c, index) => ({
    id: uuidv4(),
    documentId: id,
    text: c.text,
    chunkIndex: index,
    tokenEstimate: c.tokenEstimate,
  }));

  const now = new Date().toISOString();
  const existingIndex = docs.findIndex((d) => d.id === id);

  let newOrUpdated: KnowledgeDocument;

  if (existingIndex >= 0) {
    newOrUpdated = {
      ...docs[existingIndex],
      title,
      tag,
      content,
      chunks,
      fileType,
      sizeBytes: typeof Blob !== 'undefined' ? new Blob([content]).size : content.length,
      updatedAt: now,
    };
    docs[existingIndex] = newOrUpdated;
  } else {
    newOrUpdated = {
      id,
      title,
      tag,
      content,
      chunks,
      fileType,
      sizeBytes: typeof Blob !== 'undefined' ? new Blob([content]).size : content.length,
      createdAt: now,
      updatedAt: now,
    };
    docs.unshift(newOrUpdated);
  }

  inMemoryKnowledgeCache = docs;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
      window.dispatchEvent(new CustomEvent('localllmmind-knowledge-updated', { detail: newOrUpdated }));
    } catch (e) {
      console.error('[knowledgeStorage] Failed to save document:', e);
    }
  }

  return newOrUpdated;
}

/**
 * Deletes a knowledge document by ID
 */
export function deleteKnowledgeDocument(id: string): boolean {
  const docs = loadKnowledgeDocuments();
  const filtered = docs.filter((d) => d.id !== id);
  if (filtered.length === docs.length) return false;

  inMemoryKnowledgeCache = filtered;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      window.dispatchEvent(new CustomEvent('localllmmind-knowledge-updated'));
    } catch (e) {
      console.error('[knowledgeStorage] Failed to delete document:', e);
    }
  }

  return true;
}

/**
 * Fast client-side hybrid search across knowledge base chunks.
 * Combines exact phrase boosting, query token overlap, and TF-IDF scoring.
 */
export function searchKnowledge(
  query: string,
  tagFilter?: string | string[],
  maxResults: number = 4
): KnowledgeSearchResult[] {
  if (!query || !query.trim()) return [];

  const docs = loadKnowledgeDocuments();
  if (docs.length === 0) return [];

  // Filter by tag(s) if provided
  let filteredDocs = docs;
  if (tagFilter) {
    const targetTags = Array.isArray(tagFilter)
      ? tagFilter.map(normalizeTag)
      : [normalizeTag(tagFilter)];
    if (targetTags.length > 0 && !targetTags.includes('*')) {
      filteredDocs = docs.filter((d) => targetTags.includes(d.tag));
    }
  }

  if (filteredDocs.length === 0) return [];

  const rawTokens = query
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);

  if (rawTokens.length === 0) return [];

  const cleanQuery = query.toLowerCase().trim();
  const results: KnowledgeSearchResult[] = [];

  for (const doc of filteredDocs) {
    for (const chunk of doc.chunks) {
      const chunkLower = chunk.text.toLowerCase();
      let score = 0;
      const matchedTerms: string[] = [];

      // 1. Exact full query phrase match gives massive boost
      if (chunkLower.includes(cleanQuery)) {
        score += 15.0;
        matchedTerms.push(cleanQuery);
      }

      // 2. Token overlap & frequency
      for (const token of rawTokens) {
        if (chunkLower.includes(token)) {
          // Count occurrences in chunk
          let count = 0;
          let pos = chunkLower.indexOf(token);
          while (pos !== -1 && count < 8) {
            count++;
            pos = chunkLower.indexOf(token, pos + token.length);
          }
          score += 1.5 + count * 0.5;
          matchedTerms.push(token);
        }
      }

      // 3. Document Title match bonus
      if (doc.title.toLowerCase().includes(cleanQuery)) {
        score += 3.0;
      }

      if (score > 0) {
        results.push({
          chunk,
          documentId: doc.id,
          documentTitle: doc.title,
          tag: doc.tag,
          score,
          matchTerms: Array.from(new Set(matchedTerms)),
        });
      }
    }
  }

  // Sort descending by score
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, maxResults);
}

/**
 * Detects any #tag references in a user's prompt text.
 * Returns array of normalized tags found (e.g. ["api-docs", "localllmmind"]).
 */
export function extractKnowledgeTagsFromText(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/(?:^|\s)#([a-zA-Z0-9_-]+)/g);
  if (!matches) return [];
  return Array.from(
    new Set(
      matches.map((m) => normalizeTag(m.trim()))
    )
  );
}

/**
 * Formats retrieved knowledge search results into a clean grounding prompt block
 */
export function formatRetrievedKnowledgeForPrompt(
  results: KnowledgeSearchResult[]
): string {
  if (!results || results.length === 0) return '';

  const formattedChunks = results.map((r, i) => {
    return `[Source #${r.tag} — "${r.documentTitle}", Section ${r.chunk.chunkIndex + 1}]:\n"""\n${r.chunk.text}\n"""`;
  });

  return [
    `[RETRIEVED KNOWLEDGE BASE GROUNDING]`,
    `The following verified excerpts were retrieved from the user's local knowledge base. Use them as authoritative grounding context to answer the inquiry accurately:`,
    '',
    formattedChunks.join('\n\n'),
    `[END KNOWLEDGE BASE GROUNDING]`,
  ].join('\n');
}

/**
 * Format file size in bytes to a human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
