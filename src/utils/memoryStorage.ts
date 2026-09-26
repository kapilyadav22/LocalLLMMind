/**
 * Persistent Long-Term Memory Storage
 * Open WebUI-style cross-session memory management for AI context injection.
 */

export interface MemoryItem {
  id: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  source?: 'manual' | 'learned' | 'chat';
  conversationId?: string;
}

const MEMORIES_STORAGE_KEY = 'llm_ui_memories';

/**
 * Load all memories from storage
 */
export function loadMemories(): MemoryItem[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(MEMORIES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('[MemoryStorage] Failed to load memories:', err);
    return [];
  }
}

/**
 * Save all memories to storage
 */
export function saveMemories(memories: MemoryItem[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(MEMORIES_STORAGE_KEY, JSON.stringify(memories));
    }
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('localllmmind-memories-updated', { detail: memories }));
    }
  } catch (err) {
    console.error('[MemoryStorage] Failed to save memories:', err);
  }
}

/**
 * Add a new memory item
 */
export function addMemory(
  content: string,
  source: 'manual' | 'learned' | 'chat' = 'manual',
  conversationId?: string
): MemoryItem | null {
  const clean = content.trim();
  if (!clean) return null;

  const existing = loadMemories();
  // Check for duplicates
  if (existing.some((m) => m.content.toLowerCase() === clean.toLowerCase())) {
    return null;
  }

  const newMemory: MemoryItem = {
    id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    content: clean,
    createdAt: new Date().toISOString(),
    source,
    conversationId,
  };

  const updated = [newMemory, ...existing];
  saveMemories(updated);
  return newMemory;
}

/**
 * Update an existing memory
 */
export function updateMemory(id: string, content: string): MemoryItem | null {
  const clean = content.trim();
  if (!clean) return null;

  const existing = loadMemories();
  const index = existing.findIndex((m) => m.id === id);
  if (index === -1) return null;

  const updatedItem: MemoryItem = {
    ...existing[index],
    content: clean,
    updatedAt: new Date().toISOString(),
  };

  existing[index] = updatedItem;
  saveMemories([...existing]);
  return updatedItem;
}

/**
 * Delete a memory by ID
 */
export function deleteMemory(id: string): boolean {
  const existing = loadMemories();
  const filtered = existing.filter((m) => m.id !== id);
  if (filtered.length !== existing.length) {
    saveMemories(filtered);
    return true;
  }
  return false;
}

/**
 * Clear all memories
 */
export function clearAllMemories(): void {
  saveMemories([]);
}

/**
 * Format memories into structured context for system prompt injection
 */
export function formatMemoriesForSystemPrompt(memories: MemoryItem[]): string {
  if (!memories || memories.length === 0) return '';

  const list = memories.map((m) => `- ${m.content}`).join('\n');
  return `[USER MEMORY & PERSISTENT CONTEXT]\nThe following facts, preferences, and details are persistently remembered about the user across conversations:\n${list}\nNaturally adapt your responses according to this context without explicitly repeating that you retrieved it from memory unless asked.`;
}

/**
 * Heuristic extractor to discover facts or preferences in conversation turns
 */
export function detectPotentialMemories(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  const candidates: string[] = [];

  // Patterns for statements of fact, preference, or identity
  const patterns = [
    /(?:i prefer|i always prefer|i like)\s+([^.\n]{4,80})/gi,
    /(?:i work with|i use|my stack is|my tech stack is)\s+([^.\n]{4,80})/gi,
    /(?:i am a|i'm a)\s+([^.\n]{4,80})/gi,
    /(?:my name is|call me)\s+([^.\n]{2,40})/gi,
    /(?:i live in|i am based in|my timezone is)\s+([^.\n]{3,50})/gi,
    /(?:remember that|note that)\s+([^.\n]{4,100})/gi,
  ];

  for (const regex of patterns) {
    const matches = text.matchAll(regex);
    for (const match of matches) {
      if (match[0]) {
        const candidate = match[0].trim().replace(/^,\s*/, '');
        if (candidate.length >= 6 && candidate.length <= 120) {
          candidates.push(candidate.charAt(0).toUpperCase() + candidate.slice(1));
        }
      }
    }
  }

  return [...new Set(candidates)];
}
