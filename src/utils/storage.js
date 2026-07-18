const KEYS = {
  CONVERSATIONS: 'llm_ui_conversations',
  SETTINGS: 'llm_ui_settings',
  THEME_MODE: 'llm_ui_theme_mode',
};

export function loadConversations() {
  try {
    const data = localStorage.getItem(KEYS.CONVERSATIONS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveConversations(conversations) {
  try {
    localStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify(conversations));
  } catch (e) {
    console.error('Failed to save conversations:', e);
  }
}

let saveTimeout;
export function saveConversationsDebounced(conversations) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveConversations(conversations);
  }, 800); // Debounce localStorage writes by 800ms
}

export function loadSettings() {
  try {
    const data = localStorage.getItem(KEYS.SETTINGS);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export function loadThemeMode() {
  try {
    return localStorage.getItem(KEYS.THEME_MODE) || 'dark';
  } catch {
    return 'dark';
  }
}

export function saveThemeMode(mode) {
  try {
    localStorage.setItem(KEYS.THEME_MODE, mode);
  } catch (e) {
    console.error('Failed to save theme mode:', e);
  }
}
