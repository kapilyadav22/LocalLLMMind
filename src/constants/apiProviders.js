/**
 * Online API Providers Configuration & Model Definitions
 * Single source of truth for cloud and online model providers.
 */

import { CURRENT_MODELS, MODEL_METADATA } from './models.js';

export const PROVIDERS = {
  OLLAMA: 'ollama',
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  GEMINI: 'gemini',
  GROK: 'grok',
  JEV: 'jev',
  CUSTOM: 'custom',
};

const mapModels = (modelIds, defaultDesc) =>
  modelIds.map((id) => ({
    id,
    name: MODEL_METADATA[id]?.name || id,
    context: MODEL_METADATA[id]?.context || '128K',
    description: MODEL_METADATA[id]?.description || defaultDesc,
    badge: MODEL_METADATA[id]?.badge,
    badgeColor: MODEL_METADATA[id]?.badgeColor,
  }));

export const PROVIDER_CONFIGS = [
  {
    id: PROVIDERS.OPENAI,
    name: 'OpenAI',
    shortName: 'OpenAI',
    description: 'GPT-6 Astra, GPT-6 Sol, and GPT-6 Luna frontier models',
    defaultEndpoint: 'https://api.openai.com/v1',
    keyPlaceholder: 'sk-proj-...',
    keyDocumentationUrl: 'https://platform.openai.com/api-keys',
    badgeColor: '#10a37f',
    models: mapModels(CURRENT_MODELS.openai, 'OpenAI model'),
  },
  {
    id: PROVIDERS.ANTHROPIC,
    name: 'Anthropic Claude',
    shortName: 'Claude',
    description: 'Claude Fable 5.1, Opus 5.5, Sonnet 5, and Haiku 4.5 models',
    defaultEndpoint: 'https://api.anthropic.com/v1',
    keyPlaceholder: 'sk-ant-api03-...',
    keyDocumentationUrl: 'https://console.anthropic.com/settings/keys',
    badgeColor: '#d97706',
    models: mapModels(CURRENT_MODELS.anthropic, 'Anthropic Claude model'),
  },
  {
    id: PROVIDERS.GEMINI,
    name: 'Google Gemini',
    shortName: 'Gemini',
    description: 'Gemini 3.8 Flash, 3.7 Flash, 3.6 Flash, 3.5, and 3.1 models',
    defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta',
    keyPlaceholder: 'AIzaSy...',
    keyDocumentationUrl: 'https://aistudio.google.com/app/apikey',
    badgeColor: '#3b82f6',
    models: mapModels(CURRENT_MODELS.gemini, 'Google Gemini model'),
  },
  {
    id: PROVIDERS.GROK,
    name: 'xAI Grok',
    shortName: 'Grok',
    description: 'Grok 4.7, Grok 4.20 Reasoning, and Grok 4.20 Non-Reasoning models',
    defaultEndpoint: 'https://api.x.ai/v1',
    keyPlaceholder: 'xai-...',
    keyDocumentationUrl: 'https://console.x.ai',
    badgeColor: '#8b5cf6',
    models: mapModels(CURRENT_MODELS.grok, 'xAI Grok model'),
  },
  {
    id: PROVIDERS.JEV,
    name: 'Jev (TypeSafe / Typeface)',
    shortName: 'Jev',
    description: 'System One ultra-fast classifier, triage & decision model',
    defaultEndpoint: 'https://api.typesafe.ai/v1',
    keyPlaceholder: 'ts_... or gateway key',
    keyDocumentationUrl: 'https://typesafe.ai',
    badgeColor: '#ec4899',
    models: [
      { id: 'typesafe/jev-1.13', name: 'Jev 1.13', context: '64K', description: 'Fast structured decision model (Recommended, ~$0.042/1M tokens)' },
      { id: 'typesafe/jev-latest', name: 'Jev Latest', context: '64K', description: 'Sub-100ms structured decision & classification' },
      { id: 'typesafe/jev-1', name: 'Jev 1', context: '64K', description: 'TypeSafe Jev family foundation classifier' },
      { id: 'jev-latest', name: 'Jev Latest (Alias)', context: '64K', description: 'Sub-100ms structured decision & classification' },
      { id: 'jev-1.13.0', name: 'Jev 1.13.0 (Legacy alias)', context: '64K', description: 'Pinned enterprise decision model' },
    ],
  },
  {
    id: PROVIDERS.CUSTOM,
    name: 'Custom / OpenAI-Compatible',
    shortName: 'Custom',
    description: 'OpenRouter, Groq, DeepSeek, Together, LMStudio, vLLM',
    defaultEndpoint: 'https://openrouter.ai/api/v1',
    keyPlaceholder: 'sk-or-v1-... or your API key',
    keyDocumentationUrl: 'https://openrouter.ai/keys',
    badgeColor: '#64748b',
    models: [
      { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (OpenRouter)', context: '64K', description: 'Open reasoning model via OpenRouter' },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B (OpenRouter)', context: '128K', description: 'Flagship open-weights model' },
    ],
  },
];

/**
 * Returns provider definition for a given provider ID
 */
export function getProviderConfig(providerId) {
  return PROVIDER_CONFIGS.find((p) => p.id === providerId) || null;
}

/**
 * Identify provider from a model identifier (e.g., 'openai:gpt-4o' or 'gpt-4o')
 */
export function resolveModelProvider(modelId, localModels = []) {
  if (!modelId) return { provider: PROVIDERS.OLLAMA, rawModel: '' };

  // Explicit prefix syntax: "provider:model"
  const prefixMatch = modelId.match(/^([a-z0-9_-]+):(.*)$/);
  if (prefixMatch) {
    const [, prefix, raw] = prefixMatch;
    if (prefix === PROVIDERS.OLLAMA) return { provider: PROVIDERS.OLLAMA, rawModel: raw };
    const matched = PROVIDER_CONFIGS.find((p) => p.id === prefix);
    if (matched) {
      return { provider: matched.id, rawModel: raw };
    }
  }

  // Check known online provider models
  for (const provider of PROVIDER_CONFIGS) {
    const found = provider.models.find((m) => m.id === modelId);
    if (found) {
      return { provider: provider.id, rawModel: found.id };
    }
  }

  // Check if model belongs to local Ollama models list
  const isLocal = localModels.some((m) => m.name === modelId);
  if (isLocal) {
    return { provider: PROVIDERS.OLLAMA, rawModel: modelId };
  }

  // Default to Ollama if no other matches found
  return { provider: PROVIDERS.OLLAMA, rawModel: modelId };
}
