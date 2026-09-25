/**
 * Models Configuration
 * Single source of truth for all frontier AI models and local models.
 */

export const CURRENT_MODELS = {
  openai: [
    'gpt-6-astra',
    'gpt-6-sol',
    'gpt-6-luna',
  ],

  anthropic: [
    'claude-fable-5-1',
    'claude-opus-5-5',
    'claude-sonnet-5',
    'claude-haiku-4-5',
  ],

  gemini: [
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3.1-pro-preview',
    'gemini-3-flash-preview',
  ],

  grok: [
    'grok-4.7',
    'grok-4.20',
    'grok-4.20-reasoning',
    'grok-4.20-non-reasoning',
  ],
};

export const DEFAULT_MODEL_BY_PROVIDER = {
  openai: 'gpt-6-astra',
  anthropic: 'claude-sonnet-5',
  gemini: 'gemini-3.8-flash',
  grok: 'grok-4.20-reasoning',
  jev: 'jev-latest',
  custom: 'deepseek/deepseek-r1',
  ollama: '',
};

export const MODEL_METADATA = {
  // OpenAI Models
  'gpt-6-astra': {
    name: 'GPT-6 Astra',
    provider: 'openai',
    context: '256K',
    description: 'Flagship frontier intelligence with autonomous coding & multivariable reasoning',
    badge: 'Flagship',
    badgeColor: '#10a37f',
  },
  'gpt-6-sol': {
    name: 'GPT-6 Sol',
    provider: 'openai',
    context: '128K',
    description: 'High-speed balanced model optimized for daily engineering & synthesis',
    badge: 'Fast',
    badgeColor: '#0ea5e9',
  },
  'gpt-6-luna': {
    name: 'GPT-6 Luna',
    provider: 'openai',
    context: '128K',
    description: 'Ultra-low latency compact model for real-time suggestions & edits',
    badge: 'Compact',
    badgeColor: '#6366f1',
  },

  // Anthropic Claude Models
  'claude-fable-5-1': {
    name: 'Claude Fable 5.1',
    provider: 'anthropic',
    context: '500K',
    description: 'Next-generation deep analytical writing, creative synthesis & strategic planning',
    badge: 'Creative',
    badgeColor: '#ec4899',
  },
  'claude-opus-5-5': {
    name: 'Claude Opus 5.5',
    provider: 'anthropic',
    context: '500K',
    description: 'State-of-the-art complex scientific research, math proofs & deep architecture',
    badge: 'Research',
    badgeColor: '#d97706',
  },
  'claude-sonnet-5': {
    name: 'Claude Sonnet 5',
    provider: 'anthropic',
    context: '256K',
    description: 'Industry benchmark software development, fullstack engineering & reasoning',
    badge: 'Recommended',
    badgeColor: '#f59e0b',
  },
  'claude-haiku-4-5': {
    name: 'Claude Haiku 4.5',
    provider: 'anthropic',
    context: '128K',
    description: 'Blazing fast sub-second response times with cost-efficient precision',
    badge: 'Ultra Fast',
    badgeColor: '#10b981',
  },

  // Google Gemini Models
  'gemini-3.8-flash': {
    name: 'Gemini 3.8 Flash',
    provider: 'gemini',
    context: '2M',
    description: 'Flagship ultra-speed multimodal model with 2M native token context',
    badge: '2M Context',
    badgeColor: '#3b82f6',
  },
  'gemini-3.7-flash': {
    name: 'Gemini 3.7 Flash',
    provider: 'gemini',
    context: '2M',
    description: 'Hybrid reasoning and high-throughput streaming intelligence',
    badge: 'Hybrid',
    badgeColor: '#2563eb',
  },
  'gemini-3.6-flash': {
    name: 'Gemini 3.6 Flash',
    provider: 'gemini',
    context: '1M',
    description: 'High-throughput multimodal model for rapid code generation & vision',
    badge: '1M Context',
    badgeColor: '#0284c7',
  },
  'gemini-3.5-flash': {
    name: 'Gemini 3.5 Flash',
    provider: 'gemini',
    context: '1M',
    description: 'Balanced general intelligence and multimodal reasoning',
    badge: 'Balanced',
    badgeColor: '#06b6d4',
  },
  'gemini-3.5-flash-lite': {
    name: 'Gemini 3.5 Flash Lite',
    provider: 'gemini',
    context: '1M',
    description: 'Cost-optimized lightweight speed model for routine tasks',
    badge: 'Lite',
    badgeColor: '#14b8a6',
  },
  'gemini-3.1-flash-lite': {
    name: 'Gemini 3.1 Flash Lite',
    provider: 'gemini',
    context: '500K',
    description: 'Ultra-fast compact generation for instant classification and edits',
    badge: 'Lite',
    badgeColor: '#10b981',
  },
  'gemini-3.1-pro-preview': {
    name: 'Gemini 3.1 Pro Preview',
    provider: 'gemini',
    context: '2M',
    description: 'Deep context reasoning and cross-file repository analysis preview',
    badge: 'Preview',
    badgeColor: '#8b5cf6',
  },
  'gemini-3-flash-preview': {
    name: 'Gemini 3 Flash Preview',
    provider: 'gemini',
    context: '1M',
    description: 'Next-gen frontier flash preview with experimental capabilities',
    badge: 'Preview',
    badgeColor: '#a855f7',
  },

  // xAI Grok Models
  'grok-4.7': {
    name: 'Grok 4.7',
    provider: 'grok',
    context: '256K',
    description: 'Flagship frontier reasoning and uncensored analytical exploration',
    badge: 'Flagship',
    badgeColor: '#8b5cf6',
  },
  'grok-4.20': {
    name: 'Grok 4.20',
    provider: 'grok',
    context: '256K',
    description: 'High-capacity general model for coding, writing and complex queries',
    badge: 'General',
    badgeColor: '#7c3aed',
  },
  'grok-4.20-reasoning': {
    name: 'Grok 4.20 Reasoning',
    provider: 'grok',
    context: '256K',
    description: 'Deep multi-step chain-of-thought verification for math and logic',
    badge: 'Reasoning',
    badgeColor: '#c084fc',
  },
  'grok-4.20-non-reasoning': {
    name: 'Grok 4.20 Non-Reasoning',
    provider: 'grok',
    context: '128K',
    description: 'Direct response streaming with minimal latency and high density',
    badge: 'Direct',
    badgeColor: '#6d28d9',
  },

  // Jev (TypeSafe / Typeface)
  'jev-latest': {
    name: 'Jev Latest',
    provider: 'jev',
    context: '64K',
    description: 'Sub-100ms structured decision, classification & triage model',
    badge: 'Sub-100ms',
    badgeColor: '#ec4899',
  },
  'jev-1.13.0': {
    name: 'Jev 1.13.0',
    provider: 'jev',
    context: '64K',
    description: 'Pinned enterprise production decision model',
    badge: 'Pinned',
    badgeColor: '#db2777',
  },
  'jev-1': {
    name: 'Jev 1',
    provider: 'jev',
    context: '64K',
    description: 'TypeSafe Jev family foundation classifier',
    badge: 'Stable',
    badgeColor: '#be185d',
  },

  // Custom / OpenRouter
  'deepseek/deepseek-r1': {
    name: 'DeepSeek R1',
    provider: 'custom',
    context: '64K',
    description: 'Open-weights reasoning model via OpenRouter / Custom endpoint',
    badge: 'Open Reasoning',
    badgeColor: '#64748b',
  },
  'meta-llama/llama-3.3-70b-instruct': {
    name: 'Llama 3.3 70B',
    provider: 'custom',
    context: '128K',
    description: 'Flagship open-weights instruction-tuned model',
    badge: 'Open Weights',
    badgeColor: '#475569',
  },
};

export const POPULAR_MODELS = [
  { name: 'llama3.2', desc: 'Meta Llama 3.2 (3B) - Fast & capable general model' },
  { name: 'llama3.2-vision:11b', desc: 'Meta Llama 3.2 Vision (11B) - Multimodal visual reasoning & OCR' },
  { name: 'deepseek-r1:8b', desc: 'DeepSeek-R1 (8B) - State-of-the-art reasoning model' },
  { name: 'qwen2.5-coder:7b', desc: 'Qwen 2.5 Coder (7B) - Top-tier programming assistant' },
  { name: 'llava:7b', desc: 'LLaVA (7B) - Lightweight multimodal visual assistant' },
  { name: 'mistral', desc: 'Mistral (7B) - Reliable instruction following' },
  { name: 'moondream', desc: 'Moondream 2 (1.8B) - Ultra-fast compact visual chat' },
  { name: 'gemma2', desc: 'Google Gemma 2 (9B) - High reasoning benchmark scores' },
];

/**
 * Returns metadata for a model ID or generates a fallback
 */
export function getModelMetadata(modelId) {
  if (!modelId) return null;
  if (MODEL_METADATA[modelId]) return MODEL_METADATA[modelId];

  // Fallback for custom or local models
  return {
    name: modelId,
    provider: 'ollama',
    context: 'Custom',
    description: 'Local or custom specified model',
    badge: null,
  };
}
