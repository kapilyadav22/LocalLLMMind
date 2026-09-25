/**
 * Application Constants
 * Single source of truth for branding, developer information, and global configuration.
 */

export const DEVELOPER_NAME = 'Kapil Yadav';
export const DEVELOPER_HANDLE = '@kapilyadav22';
export const DEVELOPER_TITLE = 'Software Engineer | Delhi | DTU';
export const DEVELOPER_BIO = 'Software Engineer | Delhi | DTU';
export const DEVELOPER_WATERMARK = 'Crafted by Kapil Yadav';
export const DEVELOPER_AVATAR = 'https://ugc.production.linktr.ee/cfb54208-2c22-4dab-b740-fea928171d17_IMG-20230319-204347-411.jpeg?io=true&size=avatar-v3_0';

export const APP_NAME = 'LocalLLMMind';
export const APP_SHORT_NAME = 'LocalLLMMind';
export const APP_SUBTITLE = 'Production-Grade Local & Cloud AI Workstation';
export const APP_VERSION = '1.3.0';

export const DOCKERHUB_IMAGE_URL = 'https://hub.docker.com/r/kapilyadav22/localllmmind';
export const DOCKERHUB_PULL_CMD = 'docker pull kapilyadav22/localllmmind';

export const SOCIAL_PROFILES = [
  {
    id: 'github',
    name: 'GitHub',
    url: 'https://github.com/kapilyadav22',
    handle: '@kapilyadav22',
    color: '#24292e',
    badge: 'Code & Repos',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    url: 'https://www.linkedin.com/in/kapilyadav22',
    handle: 'in/kapilyadav22',
    color: '#0a66c2',
    badge: 'Professional Network',
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    url: 'https://x.com/kapilyadav2210',
    handle: '@kapilyadav2210',
    color: '#1da1f2',
    badge: 'Updates & Thoughts',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    url: 'https://youtube.com/@kapilyadav0180',
    handle: '@kapilyadav0180',
    color: '#ff0000',
    badge: 'Engineering & Tech',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    url: 'https://t.me/programminghub22',
    handle: '@programminghub22',
    color: '#229ed9',
    badge: 'Community & Devs',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    url: 'https://instagram.com/kapilyadav__',
    handle: '@kapilyadav__',
    color: '#e4405f',
    badge: 'Personal',
  },
];

export const DEFAULT_OLLAMA_URL = 'http://localhost:11434';

export const CONTEXT_WINDOW_OPTIONS = [
  { value: 2048, label: '2K (Default)', vram: '~1.5 GB VRAM' },
  { value: 4096, label: '4K (Standard)', vram: '~2.5 GB VRAM' },
  { value: 8192, label: '8K (Extended)', vram: '~4 GB VRAM' },
  { value: 16384, label: '16K (Long Context)', vram: '~7 GB VRAM' },
  { value: 32768, label: '32K (Large Docs)', vram: '~12 GB VRAM' },
  { value: 65536, label: '64K (Deep Context)', vram: '~18 GB VRAM' },
  { value: 131072, label: '128K (Ultra Full)', vram: '~32 GB VRAM' },
];

export const DEFAULT_CONTEXT_WINDOW = 4096;

export const AI_PERSONAS = [
  {
    id: 'default',
    name: 'General Assistant',
    icon: '🤖',
    desc: 'Helpful, accurate, and adaptable general AI assistant.',
    systemPrompt: '',
  },
  {
    id: 'architect',
    name: 'Software Architect',
    icon: '🏗️',
    desc: 'Senior principal engineer focused on clean architecture, patterns, and type safety.',
    systemPrompt: 'You are an expert Senior Software Architect and Principal Engineer. When answering, provide clean, idiomatic, production-ready code with best practices, design patterns, type safety, and architectural considerations. Explain trade-offs clearly.',
  },
  {
    id: 'reviewer',
    name: 'Bug Hunter & Code Reviewer',
    icon: '🔍',
    desc: 'Meticulous reviewer specializing in security vulnerabilities, edge cases, and performance.',
    systemPrompt: 'You are a meticulous security researcher and senior code reviewer. Analyze code ruthlessly for bugs, edge cases, race conditions, security vulnerabilities (OWASP), memory leaks, and performance bottlenecks. Provide concrete fixes.',
  },
  {
    id: 'concise',
    name: 'Concise & Direct',
    icon: '⚡',
    desc: 'High-density responses with zero conversational fluff and bullet points.',
    systemPrompt: 'You are an ultra-concise assistant. Answer directly and precisely without conversational filler, pleasantries, or preamble. Use bullet points and code blocks wherever possible. Prioritize brevity and high information density.',
  },
  {
    id: 'academic',
    name: 'Academic Researcher',
    icon: '🎓',
    desc: 'Rigorous scholar explaining foundational theories and scientific methodologies.',
    systemPrompt: 'You are a distinguished academic researcher and university professor. Provide comprehensive, scholarly, and rigorous explanations with theoretical foundations, formal terminology, mathematical formulations where appropriate, and structured analysis.',
  },
  {
    id: 'creative',
    name: 'Creative Brainstormer',
    icon: '💡',
    desc: 'Innovative thinker exploring unconventional angles, metaphors, and ideas.',
    systemPrompt: 'You are an imaginative creative collaborator and strategist. Explore unconventional perspectives, compelling metaphors, and innovative problem-solving angles. Generate fresh, inspiring, and engaging ideas.',
  },
];

export const DEFAULT_SETTINGS = {
  ollamaUrl: DEFAULT_OLLAMA_URL,
  systemPrompt: '',
  selectedModel: '',
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 0, // 0 = unlimited
  contextWindow: DEFAULT_CONTEXT_WINDOW, // num_ctx in Ollama (e.g. 4096)
  defaultPersona: 'default', // default persona ID
  memoryStorageMode: 'browser', // 'browser' | 'local_folder'
  customMemoryPath: '', // User custom path label (e.g. ~/Documents/LocalLLM_Memory)
  memoryDirectoryName: '', // Name of the selected folder from File System Access API
  autoSyncFolder: true, // Automatically sync conversations to selected folder
  saveMarkdownCopies: true, // Also write readable .md files in chats/ subfolder
  apiKeys: {
    openai: '',
    anthropic: '',
    gemini: '',
    grok: '',
    jev: '',
    custom: '',
  },
  apiEndpoints: {
    openai: '',
    anthropic: '',
    gemini: '',
    grok: '',
    jev: '',
    custom: '',
  },
  customModelName: '',
};

export { POPULAR_MODELS, CURRENT_MODELS } from './models.js';

export const PROMPT_TEMPLATES = [
  { command: '/summarize', label: 'Summarize text', text: 'Summarize the following text briefly and capture the key takeaways:\n\n' },
  { command: '/refactor', label: 'Refactor code', text: 'Refactor the following code to make it cleaner, more efficient, and follow best practices:\n\n' },
  { command: '/explain', label: 'Explain concept', text: 'Explain how the following code/concept works in simple terms:\n\n' },
  { command: '/translate', label: 'Translate to English', text: 'Translate the following text to English:\n\n' },
  { command: '/debug', label: 'Debug code', text: 'Identify any bugs, issues, or security flaws in the following code and provide fixes:\n\n' },
];

export const DEFAULT_SHORTCUTS = [
  {
    id: 'new_chat',
    name: 'New Conversation',
    description: 'Start a clean chat session',
    key: 'k',
    modifiers: ['ctrlOrCmd'],
    category: 'Navigation',
    actionType: 'new_chat',
    customizable: true,
  },
  {
    id: 'toggle_sidebar',
    name: 'Toggle Sidebar',
    description: 'Show or hide conversation sidebar',
    key: 'b',
    modifiers: ['ctrlOrCmd'],
    category: 'Navigation',
    actionType: 'toggle_sidebar',
    customizable: true,
  },
  {
    id: 'open_settings',
    name: 'Open Settings',
    description: 'Manage models and preferences',
    key: ',',
    modifiers: ['ctrlOrCmd'],
    category: 'General',
    actionType: 'open_settings',
    customizable: true,
  },
  {
    id: 'show_shortcuts',
    name: 'Keyboard Shortcuts',
    description: 'Open shortcuts cheatsheet & manager',
    key: '/',
    modifiers: ['ctrlOrCmd'],
    category: 'General',
    actionType: 'show_shortcuts',
    customizable: true,
  },
  {
    id: 'global_search',
    name: 'Search All Conversations',
    description: 'Full-text search across all chats and messages',
    key: 'f',
    modifiers: ['ctrlOrCmd', 'shift'],
    category: 'Navigation',
    actionType: 'global_search',
    customizable: true,
  },
  {
    id: 'open_model_manager',
    name: 'Manage Models',
    description: 'Pull, delete, and inspect Ollama models',
    key: 'm',
    modifiers: ['ctrlOrCmd', 'shift'],
    category: 'General',
    actionType: 'open_model_manager',
    customizable: true,
  },
  {
    id: 'toggle_theme',
    name: 'Toggle Dark / Light Mode',
    description: 'Switch application color theme',
    key: 'd',
    modifiers: ['ctrlOrCmd', 'shift'],
    category: 'Appearance',
    actionType: 'toggle_theme',
    customizable: true,
  },
  {
    id: 'focus_input',
    name: 'Focus Message Input',
    description: 'Jump cursor to chat composer',
    key: 'i',
    modifiers: ['ctrlOrCmd'],
    category: 'Chat',
    actionType: 'focus_input',
    customizable: true,
  },
  {
    id: 'stop_generation',
    name: 'Stop Stream / Dismiss',
    description: 'Abort streaming response or close dialog',
    key: 'Escape',
    modifiers: [],
    category: 'Chat',
    actionType: 'stop_generation',
    customizable: false,
  },
];

export const SHORTCUT_ACTION_TYPES = [
  { id: 'insert_template', label: 'Insert Prompt Template / Text', needsPayload: true },
  { id: 'new_chat', label: 'Start New Conversation', needsPayload: false },
  { id: 'global_search', label: 'Search All Conversations', needsPayload: false },
  { id: 'open_model_manager', label: 'Manage Ollama Models', needsPayload: false },
  { id: 'toggle_sidebar', label: 'Toggle Sidebar', needsPayload: false },
  { id: 'toggle_theme', label: 'Toggle Dark / Light Theme', needsPayload: false },
  { id: 'focus_input', label: 'Focus Message Input', needsPayload: false },
  { id: 'open_settings', label: 'Open Settings', needsPayload: false },
  { id: 'show_shortcuts', label: 'Show Shortcuts Modal', needsPayload: false },
];

export function formatShortcutDisplay(shortcut) {
  if (!shortcut) return '';
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const parts = [];

  if (shortcut.modifiers?.includes('ctrlOrCmd')) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.modifiers?.includes('ctrl')) {
    parts.push('Ctrl');
  }
  if (shortcut.modifiers?.includes('alt')) {
    parts.push(isMac ? '⌥' : 'Alt');
  }
  if (shortcut.modifiers?.includes('shift')) {
    parts.push(isMac ? '⇧' : 'Shift');
  }

  let keyDisplay = shortcut.key || '';
  if (keyDisplay === ' ') keyDisplay = 'Space';
  else if (keyDisplay === 'Escape') keyDisplay = 'Esc';
  else if (keyDisplay.length === 1) keyDisplay = keyDisplay.toUpperCase();

  if (keyDisplay) parts.push(keyDisplay);

  return parts.join(isMac ? ' ' : ' + ');
}

export const KEYBOARD_SHORTCUTS = [
  { key: 'Enter', action: 'Send message' },
  { key: 'Shift + Enter', action: 'New line in input' },
  { key: 'Ctrl/Cmd + K', action: 'New conversation' },
  { key: 'Ctrl/Cmd + B', action: 'Toggle sidebar' },
  { key: 'Ctrl/Cmd + ,', action: 'Open settings' },
  { key: 'Ctrl/Cmd + /', action: 'Show shortcuts' },
  { key: 'Escape', action: 'Stop generation / Close dialog' },
];

export const STORAGE_KEYS = {
  CONVERSATIONS: 'llm_ui_conversations',
  SETTINGS: 'llm_ui_settings',
  THEME_MODE: 'llm_ui_theme_mode',
  SHORTCUTS: 'llm_ui_shortcuts',
};
