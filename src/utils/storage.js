const KEYS = {
  CONVERSATIONS: 'llm_ui_conversations',
  PROJECTS: 'llm_ui_projects',
  SETTINGS: 'llm_ui_settings',
  THEME_MODE: 'llm_ui_theme_mode',
  SHORTCUTS: 'llm_ui_shortcuts',
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

export function loadShortcuts() {
  try {
    const data = localStorage.getItem(KEYS.SHORTCUTS);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function saveShortcuts(shortcuts) {
  try {
    localStorage.setItem(KEYS.SHORTCUTS, JSON.stringify(shortcuts));
  } catch (e) {
    console.error('Failed to save shortcuts:', e);
  }
}

export function loadProjects() {
  try {
    const data = localStorage.getItem(KEYS.PROJECTS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveProjects(projects) {
  try {
    localStorage.setItem(KEYS.PROJECTS, JSON.stringify(projects));
  } catch (e) {
    console.error('Failed to save projects:', e);
  }
}

let saveProjectsTimeout;
export function saveProjectsDebounced(projects) {
  if (saveProjectsTimeout) clearTimeout(saveProjectsTimeout);
  saveProjectsTimeout = setTimeout(() => {
    saveProjects(projects);
  }, 800);
}
