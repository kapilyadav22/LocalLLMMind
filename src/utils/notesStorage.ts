/**
 * Persistent Workspace Notes & Scratchpad Storage
 * Open WebUI-style persistent markdown notes with chat bi-directional sync.
 */

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isPinned?: boolean;
}

const NOTES_STORAGE_KEY = 'llm_ui_notes';
const ACTIVE_NOTE_STORAGE_KEY = 'llm_ui_active_note_id';

const INITIAL_DEFAULT_NOTE: NoteItem = {
  id: 'note_welcome',
  title: 'Welcome to Workspace Notes',
  content: `# 📝 Workspace Notes & Scratchpad

Use this space to draft ideas, organize research, or capture key outputs while conversing with your models.

### ✨ What you can do here:
- **Append from Chat**: Click the **Note** icon on any message bubble in your chat to append that answer directly into this document.
- **Send to Chat**: Click the **Send to Prompt** button above to paste this note directly into the message composer for model synthesis, review, or code transformation.
- **Live Markdown**: Toggle preview mode to render formatted Markdown, LaTeX math ($e^{i\\pi} + 1 = 0$), and syntax-highlighted code blocks.
- **Export & Download**: Export as \`.md\`, \`.txt\`, or copy clean formatted Markdown to your clipboard anytime.
`,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isPinned: true,
};

let memoryCache: NoteItem[] = [INITIAL_DEFAULT_NOTE];
let activeNoteCache: string = 'note_welcome';

/**
 * Load all notes from local storage
 */
export function loadNotes(): NoteItem[] {
  try {
    if (typeof localStorage === 'undefined') return [...memoryCache];
    const raw = localStorage.getItem(NOTES_STORAGE_KEY);
    if (!raw) {
      const initial = [INITIAL_DEFAULT_NOTE];
      saveNotes(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    const result = Array.isArray(parsed) && parsed.length > 0 ? parsed : [INITIAL_DEFAULT_NOTE];
    memoryCache = [...result];
    return result;
  } catch (err) {
    console.error('[NotesStorage] Failed to load notes:', err);
    return [...memoryCache];
  }
}

/**
 * Save all notes to local storage and broadcast change event
 */
export function saveNotes(notes: NoteItem[]): void {
  try {
    memoryCache = [...notes];
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    }
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('localllmmind-notes-updated', { detail: notes }));
    }
  } catch (err) {
    console.error('[NotesStorage] Failed to save notes:', err);
  }
}

/**
 * Get active note ID
 */
export function getActiveNoteId(): string {
  try {
    if (typeof localStorage === 'undefined') return activeNoteCache;
    const id = localStorage.getItem(ACTIVE_NOTE_STORAGE_KEY);
    if (id) return id;
    const all = loadNotes();
    const fallback = all[0]?.id || 'note_welcome';
    activeNoteCache = fallback;
    localStorage.setItem(ACTIVE_NOTE_STORAGE_KEY, fallback);
    return fallback;
  } catch {
    return activeNoteCache;
  }
}

/**
 * Set active note ID
 */
export function setActiveNoteId(id: string): void {
  try {
    activeNoteCache = id;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ACTIVE_NOTE_STORAGE_KEY, id);
    }
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('localllmmind-active-note-changed', { detail: id }));
    }
  } catch (err) {
    console.error('[NotesStorage] Failed to set active note id:', err);
  }
}

/**
 * Create a new note
 */
export function createNote(title = 'Untitled Note', content = ''): NoteItem {
  const all = loadNotes();
  const newNote: NoteItem = {
    id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: title.trim() || 'Untitled Note',
    content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updated = [newNote, ...all];
  saveNotes(updated);
  setActiveNoteId(newNote.id);
  return newNote;
}

/**
 * Update an existing note
 */
export function updateNote(
  id: string,
  updates: Partial<Pick<NoteItem, 'title' | 'content' | 'isPinned'>>
): NoteItem | null {
  const all = loadNotes();
  const idx = all.findIndex((n) => n.id === id);
  if (idx === -1) return null;

  const updatedNote: NoteItem = {
    ...all[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  all[idx] = updatedNote;
  saveNotes([...all]);
  return updatedNote;
}

/**
 * Delete a note by ID
 */
export function deleteNote(id: string): boolean {
  const all = loadNotes();
  const filtered = all.filter((n) => n.id !== id);
  if (filtered.length === all.length) return false;

  // Ensure at least one note remains
  if (filtered.length === 0) {
    filtered.push({
      id: `note_${Date.now()}`,
      title: 'Quick Scratchpad',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  saveNotes(filtered);
  const currentActive = getActiveNoteId();
  if (currentActive === id) {
    setActiveNoteId(filtered[0].id);
  }
  return true;
}

/**
 * Append text content to the currently active note (or create one if empty)
 */
export function appendContentToActiveNote(text: string, sourceTitle?: string): NoteItem {
  const clean = text.trim();
  const all = loadNotes();
  const activeId = getActiveNoteId();
  let targetNote = all.find((n) => n.id === activeId) || all[0];

  if (!targetNote) {
    targetNote = createNote('Scratchpad Notes', '');
  }

  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const heading = sourceTitle ? `\n\n### 💬 Captured from ${sourceTitle} (${timestamp})\n` : `\n\n---\n*Captured at ${timestamp}*\n\n`;

  const newContent = targetNote.content.trim()
    ? `${targetNote.content}${heading}${clean}\n`
    : `# ${targetNote.title}\n${heading}${clean}\n`;

  const updated = updateNote(targetNote.id, { content: newContent });
  return updated || targetNote;
}
