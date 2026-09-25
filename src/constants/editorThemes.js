import { oneDark } from '@codemirror/theme-one-dark';
import { dracula } from '@uiw/codemirror-theme-dracula';
import { nord } from '@uiw/codemirror-theme-nord';
import { githubDark, githubLight } from '@uiw/codemirror-theme-github';
import { tokyoNight } from '@uiw/codemirror-theme-tokyo-night';
import { sublime } from '@uiw/codemirror-theme-sublime';

export const EDITOR_THEMES = [
  {
    id: 'oneDark',
    name: 'One Dark',
    type: 'dark',
    theme: oneDark,
    bg: '#282c34',
    fg: '#abb2bf',
    accent: '#61afef',
    desc: 'Atom / VS Code dark classic',
  },
  {
    id: 'dracula',
    name: 'Dracula',
    type: 'dark',
    theme: dracula,
    bg: '#282a36',
    fg: '#f8f8f2',
    accent: '#bd93f9',
    desc: 'Vibrant contrast with purple & pink accents',
  },
  {
    id: 'nord',
    name: 'Nord',
    type: 'dark',
    theme: nord,
    bg: '#2e3440',
    fg: '#d8dee9',
    accent: '#88c0d0',
    desc: 'Arctic, cool slate palette',
  },
  {
    id: 'tokyoNight',
    name: 'Tokyo Night',
    type: 'dark',
    theme: tokyoNight,
    bg: '#1a1b26',
    fg: '#a9b1d6',
    accent: '#7aa2f7',
    desc: 'Cyberpunk dark neon blue',
  },
  {
    id: 'githubDark',
    name: 'GitHub Dark',
    type: 'dark',
    theme: githubDark,
    bg: '#24292e',
    fg: '#e1e4e8',
    accent: '#79b8ff',
    desc: 'Official GitHub dark mode theme',
  },
  {
    id: 'sublime',
    name: 'Sublime Text',
    type: 'dark',
    theme: sublime,
    bg: '#303841',
    fg: '#ffffff',
    accent: '#fc5185',
    desc: 'Classic Monokai-inspired warmth',
  },
  {
    id: 'githubLight',
    name: 'GitHub Light',
    type: 'light',
    theme: githubLight,
    bg: '#ffffff',
    fg: '#24292e',
    accent: '#0366d6',
    desc: 'Clean, crisp daylight contrast',
  },
];

export const EDITOR_FONTS = [
  { id: 'JetBrains Mono', name: 'JetBrains Mono', family: '"JetBrains Mono", monospace' },
  { id: 'Fira Code', name: 'Fira Code', family: '"Fira Code", monospace' },
  { id: 'SF Mono', name: 'SF Mono (Apple)', family: '"SFMono-Regular", Consolas, monospace' },
  { id: 'Consolas', name: 'Consolas', family: 'Consolas, monospace' },
  { id: 'Courier New', name: 'Courier New', family: '"Courier New", monospace' },
];

export const FONT_SIZES = [11, 12, 13, 14, 15, 16, 18];

export const TAB_SIZES = [2, 4];

export const WINDOW_CONTROLS_OPTIONS = [
  { id: 'mac', label: 'macOS Traffic Lights' },
  { id: 'monochrome', label: 'Minimalist Gray' },
  { id: 'none', label: 'None' },
];

export const DEFAULT_EDITOR_SETTINGS = {
  themeId: 'oneDark',
  fontFamily: 'JetBrains Mono',
  fontSize: 13,
  lineNumbers: true,
  lineWrapping: false,
  tabSize: 2,
  windowControls: 'mac',
  highlightActiveLine: true,
};

const STORAGE_KEY = 'llm_ui_code_editor_settings';

export function loadEditorSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_EDITOR_SETTINGS;
    return { ...DEFAULT_EDITOR_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_EDITOR_SETTINGS;
  }
}

export function saveEditorSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save editor settings:', e);
  }
}
