/**
 * Prompt Storage Utility for LocalMind
 * Handles persistence of custom prompts and merging with built-in defaults.
 * Designed & Engineered by Kapil Kumar Yadav
 */

import { DEFAULT_PROMPTS } from '../constants/promptLibrary';

const STORAGE_KEY = 'localmind_custom_prompts';

/**
 * Load all prompts: merges custom prompts with default prompts
 * @returns {Array} All active prompts
 */
export function loadAllPrompts() {
  const custom = loadCustomPrompts();
  // Filter out any default prompts that might have been customized or deleted
  return [...DEFAULT_PROMPTS, ...custom];
}

/**
 * Load custom user prompts from localStorage
 * @returns {Array} List of custom prompts
 */
export function loadCustomPrompts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to load custom prompts from localStorage:', e);
    return [];
  }
}

/**
 * Save custom user prompts to localStorage
 * @param {Array} prompts
 */
export function saveCustomPrompts(prompts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
    // Dispatch event so other components or open dialogs update in real-time
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('localmind-prompts-updated'));
    }
  } catch (e) {
    console.error('Failed to save custom prompts to localStorage:', e);
  }
}

/**
 * Add a new custom prompt
 * @param {Object} promptData - { command, title, description, category, template, icon }
 * @returns {Object} Created prompt
 */
export function addCustomPrompt(promptData) {
  const custom = loadCustomPrompts();
  const id = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  let command = (promptData.command || '').trim();
  if (!command.startsWith('/')) {
    command = `/${command}`;
  }
  // Sanitize command (only alphanumeric and hyphens/underscores)
  command = command.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (!command.startsWith('/')) {
    command = `/${command}`;
  }

  const newPrompt = {
    id,
    command,
    title: promptData.title?.trim() || 'Untitled Prompt',
    description: promptData.description?.trim() || '',
    category: promptData.category || 'Custom',
    icon: promptData.icon || '✨',
    template: promptData.template || '',
    isCustom: true,
    createdAt: new Date().toISOString(),
  };

  const updated = [newPrompt, ...custom];
  saveCustomPrompts(updated);
  return newPrompt;
}

/**
 * Update an existing custom prompt
 * @param {string} id
 * @param {Object} updates
 */
export function updateCustomPrompt(id, updates) {
  const custom = loadCustomPrompts();
  const index = custom.findIndex((p) => p.id === id);
  if (index === -1) return false;

  let command = updates.command ? updates.command.trim() : custom[index].command;
  if (!command.startsWith('/')) command = `/${command}`;
  command = command.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (!command.startsWith('/')) command = `/${command}`;

  custom[index] = {
    ...custom[index],
    ...updates,
    command,
    updatedAt: new Date().toISOString(),
  };

  saveCustomPrompts(custom);
  return true;
}

/**
 * Delete a custom prompt by ID
 * @param {string} id
 */
export function deleteCustomPrompt(id) {
  const custom = loadCustomPrompts();
  const updated = custom.filter((p) => p.id !== id);
  saveCustomPrompts(updated);
}

/**
 * Export custom prompts as JSON file
 */
export function exportPromptsAsJson() {
  const custom = loadCustomPrompts();
  const payload = {
    application: 'LocalMind',
    version: '1.2.0',
    exportedAt: new Date().toISOString(),
    prompts: custom,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `localmind_prompts_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Import custom prompts from JSON file
 * @param {File} file
 * @returns {Promise<number>} Count of imported prompts
 */
export function importPromptsFromJson(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const incoming = Array.isArray(data) ? data : data.prompts;
        if (!Array.isArray(incoming)) {
          throw new Error('Invalid prompts file format');
        }

        const current = loadCustomPrompts();
        const currentIds = new Set(current.map((p) => p.id));
        const toAdd = incoming.filter((p) => p && p.title && p.template && !currentIds.has(p.id));

        const merged = [
          ...toAdd.map((p) => ({
            ...p,
            id: p.id || `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            isCustom: true,
          })),
          ...current,
        ];

        saveCustomPrompts(merged);
        resolve(toAdd.length);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
