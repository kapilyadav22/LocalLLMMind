const KEYS = {
  CONVERSATIONS: 'llm_ui_conversations',
  PROJECTS: 'llm_ui_projects',
  SETTINGS: 'llm_ui_settings',
  THEME_MODE: 'llm_ui_theme_mode',
  THEME_CONFIG: 'llm_ui_theme_config',
  SHORTCUTS: 'llm_ui_shortcuts',
  SIDEBAR_OPEN: 'llm_ui_sidebar_open',
};

export function loadSidebarOpen() {
  try {
    const data = localStorage.getItem(KEYS.SIDEBAR_OPEN);
    if (data === null) return true;
    return data === 'true';
  } catch {
    return true;
  }
}

export function saveSidebarOpen(open) {
  try {
    localStorage.setItem(KEYS.SIDEBAR_OPEN, String(open));
  } catch (e) {
    console.error('Failed to save sidebar state:', e);
  }
}

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

export const DEFAULT_THEME_CONFIG = {
  preset: 'cyber_dark',
  mode: 'dark',
  customPrimaryColor: null,
  fontSizeScale: 1.0,
  bubbleStyle: 'rounded',
  fontFamily: 'system',
  ambientGlow: true,
  codeThemeSync: true,
};

export function loadThemeConfig() {
  try {
    const raw = localStorage.getItem(KEYS.THEME_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_THEME_CONFIG, ...parsed };
    }
    const legacyMode = localStorage.getItem(KEYS.THEME_MODE);
    if (legacyMode === 'light') {
      return { ...DEFAULT_THEME_CONFIG, preset: 'clean_light', mode: 'light' };
    }
    return { ...DEFAULT_THEME_CONFIG };
  } catch {
    return { ...DEFAULT_THEME_CONFIG };
  }
}

export function saveThemeConfig(config) {
  try {
    localStorage.setItem(KEYS.THEME_CONFIG, JSON.stringify(config));
    if (config?.mode) {
      localStorage.setItem(KEYS.THEME_MODE, config.mode);
    }
  } catch (e) {
    console.error('Failed to save theme config:', e);
  }
}

export function loadThemeMode() {
  try {
    const config = loadThemeConfig();
    return config.mode || localStorage.getItem(KEYS.THEME_MODE) || 'dark';
  } catch {
    return 'dark';
  }
}

export function saveThemeMode(mode) {
  try {
    localStorage.setItem(KEYS.THEME_MODE, mode);
    const config = loadThemeConfig();
    const nextPreset = mode === 'light' ? 'clean_light' : (config.preset === 'clean_light' ? 'cyber_dark' : config.preset);
    saveThemeConfig({
      ...config,
      mode,
      preset: nextPreset,
    });
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

export function loadSidebarWidth() {
  try {
    const data = localStorage.getItem("llm_ui_sidebar_width");
    if (!data) return 260;
    const parsed = parseInt(data, 10);
    return isNaN(parsed) ? 260 : Math.min(480, Math.max(220, parsed));
  } catch {
    return 260;
  }
}

export function saveSidebarWidth(width) {
  try {
    localStorage.setItem("llm_ui_sidebar_width", String(width));
  } catch (e) {
    console.error("Failed to save sidebar width:", e);
  }
}
