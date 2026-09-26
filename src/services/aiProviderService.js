/**
 * AI Provider Service
 * Unified communication layer for local (Ollama) and cloud AI providers:
 * - OpenAI (GPT-4o, o1, o3-mini)
 * - Anthropic Claude (Claude 3.7 Sonnet, Claude 3.5 Sonnet, Haiku)
 * - Google Gemini (Gemini 2.5 Flash, Pro)
 * - xAI Grok (Grok 2, Grok 2 Vision)
 * - Jev (TypeSafe / Typeface System One decision model)
 * - Custom / OpenAI-Compatible (OpenRouter, Groq, DeepSeek, vLLM)
 */

import { PROVIDERS, PROVIDER_CONFIGS, resolveModelProvider } from '../constants/apiProviders.js';
import { streamChat as streamOllamaChat } from './ollamaService.js';
import { localAction } from './localControlService.js';

export class MissingApiKeyError extends Error {
  constructor(provider, model) {
    const config = PROVIDER_CONFIGS.find((p) => p.id === provider);
    const providerName = config ? config.name : provider;
    super(`API key not configured for ${providerName}. Please set your API key in Settings.`);
    this.name = 'MissingApiKeyError';
    this.provider = provider;
    this.model = model;
    this.providerName = providerName;
  }
}

/**
 * Format vision images for OpenAI/Grok/Custom
 */
function formatOpenAiVisionContent(text, images = []) {
  if (!images || images.length === 0) return text;
  const content = [];
  if (text) {
    content.push({ type: 'text', text });
  }
  for (const img of images) {
    const base64Data = img.base64 || (img.preview?.startsWith('data:') ? img.preview.split(',')[1] : '');
    const mimeType = img.type || 'image/jpeg';
    if (base64Data) {
      content.push({
        type: 'image_url',
        image_url: {
          url: `data:${mimeType};base64,${base64Data}`,
        },
      });
    }
  }
  return content;
}

// Cache of models that do not support custom temperature
export const temperatureUnsupportedModels = new Set();
// Cache of models that require max_completion_tokens instead of max_tokens
export const maxCompletionTokensModels = new Set();

/**
 * Checks if a model is a reasoning / thinking model that rejects custom temperature or max_tokens
 */
export function isReasoningModel(modelName = '') {
  if (!modelName) return false;
  const m = String(modelName).toLowerCase().trim();
  const clean = m.includes('/') ? m.split('/').pop() : m.includes(':') ? m.split(':').pop() : m;

  return (
    clean.startsWith('o1') ||
    clean.startsWith('o3') ||
    clean.startsWith('o4') ||
    clean.includes('reasoning') ||
    clean.includes('reasoner') ||
    clean.includes('r1') ||
    clean.includes('qwq') ||
    temperatureUnsupportedModels.has(modelName) ||
    temperatureUnsupportedModels.has(clean)
  );
}

async function processOpenAiStream(response, onToken, onDone) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let totalTokens = 0;
  const streamStartTime = performance.now();
  let firstTokenTime = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;
      const dataStr = trimmed.replace(/^data:\s*/, '');
      if (dataStr === '[DONE]') {
        const elapsedMs = Math.max(performance.now() - streamStartTime, 1);
        const ttftMs = firstTokenTime ? firstTokenTime - streamStartTime : null;
        onDone?.({
          eval_count: totalTokens,
          eval_duration: elapsedMs * 1e6,
          prompt_eval_duration: ttftMs ? ttftMs * 1e6 : undefined,
          total_duration: elapsedMs * 1e6,
        });
        return;
      }

      try {
        const parsed = JSON.parse(dataStr);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          if (!firstTokenTime) firstTokenTime = performance.now();
          totalTokens += 1;
          onToken?.(delta);
        }
      } catch {
        // ignore unparsable fragments
      }
    }
  }

  const elapsedMs = Math.max(performance.now() - streamStartTime, 1);
  const ttftMs = firstTokenTime ? firstTokenTime - streamStartTime : null;
  onDone?.({
    eval_count: totalTokens,
    eval_duration: elapsedMs * 1e6,
    prompt_eval_duration: ttftMs ? ttftMs * 1e6 : undefined,
    total_duration: elapsedMs * 1e6,
  });
}

/**
 * Stream OpenAI-compatible chat completion (OpenAI, Grok, Custom, OpenRouter)
 */
async function streamOpenAiCompatible({
  endpoint,
  apiKey,
  model,
  messages,
  options = {},
  onToken,
  onDone,
  onError,
  signal,
}) {
  const cleanEndpoint = (endpoint || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const url = `${cleanEndpoint}/chat/completions`;

  const reasoning = isReasoningModel(model);

  const formattedMessages = messages.map((m) => {
    // If reasoning model, convert 'system' role to 'developer'
    const role = (reasoning && m.role === 'system') ? 'developer' : m.role;
    if (m.role === 'user' && m.images && m.images.length > 0) {
      return {
        role,
        content: formatOpenAiVisionContent(m.content, m.images),
      };
    }
    return {
      role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    };
  });

  const requestBody = {
    model,
    messages: formattedMessages,
    stream: true,
  };

  // Only pass temperature & top_p for models that support it
  if (!reasoning && !temperatureUnsupportedModels.has(model)) {
    if (options.temperature !== undefined) {
      requestBody.temperature = options.temperature;
    } else {
      requestBody.temperature = 0.7;
    }
    if (options.topP !== undefined) {
      requestBody.top_p = options.topP;
    }
  }

  // Token limits: reasoning models require max_completion_tokens
  if (options.maxTokens && options.maxTokens > 0) {
    if (reasoning || maxCompletionTokensModels.has(model)) {
      requestBody.max_completion_tokens = options.maxTokens;
    } else {
      requestBody.max_tokens = options.maxTokens;
    }
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      let errJson = null;
      try {
        errJson = JSON.parse(errText);
      } catch {
        // Not JSON
      }

      const errMsg = (errJson?.error?.message || errText || '').toLowerCase();
      const errParam = (errJson?.error?.param || '').toLowerCase();
      const errCode = (errJson?.error?.code || '').toLowerCase();

      // Check if error is due to unsupported temperature / top_p / max_tokens / system role
      const isTempError =
        errParam === 'temperature' ||
        (errCode === 'unsupported_value' && errMsg.includes('temperature')) ||
        (errMsg.includes('temperature') && (errMsg.includes('unsupported') || errMsg.includes('does not support') || errMsg.includes('only the default')));

      const isTopPError =
        errParam === 'top_p' ||
        (errMsg.includes('top_p') && (errMsg.includes('unsupported') || errMsg.includes('does not support')));

      const isMaxTokensError =
        errParam === 'max_tokens' ||
        (errMsg.includes('max_tokens') && (errMsg.includes('max_completion_tokens') || errMsg.includes('not supported') || errMsg.includes('unsupported')));

      const isSystemRoleError =
        errMsg.includes("'system'") && (errMsg.includes('not supported') || errMsg.includes('developer'));

      // Auto-remediation: retry with adjusted parameters
      if (isTempError || isTopPError || isMaxTokensError || isSystemRoleError) {
        if (isTempError) temperatureUnsupportedModels.add(model);
        if (isMaxTokensError) maxCompletionTokensModels.add(model);

        console.warn(`[aiProviderService] Model "${model}" rejected parameter(s). Auto-adjusting and retrying...`);

        const adjustedBody = { ...requestBody };

        if (isTempError || isTopPError) {
          delete adjustedBody.temperature;
          delete adjustedBody.top_p;
        }

        if (isMaxTokensError) {
          if (adjustedBody.max_tokens) {
            adjustedBody.max_completion_tokens = adjustedBody.max_tokens;
            delete adjustedBody.max_tokens;
          }
        }

        if (isSystemRoleError) {
          adjustedBody.messages = adjustedBody.messages.map((m) =>
            m.role === 'system' ? { ...m, role: 'developer' } : m
          );
        }

        const retryRes = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(adjustedBody),
          signal,
        });

        if (retryRes.ok) {
          return await processOpenAiStream(retryRes, onToken, onDone);
        }

        const retryErrText = await retryRes.text().catch(() => retryRes.statusText);
        throw new Error(`API Error (${retryRes.status}): ${retryErrText || retryRes.statusText}`);
      }

      throw new Error(`API Error (${response.status}): ${errText || response.statusText}`);
    }

    return await processOpenAiStream(response, onToken, onDone);
  } catch (error) {
    if (error.name === 'AbortError') {
      onDone?.({ aborted: true });
    } else {
      onError?.(error);
    }
  }
}

async function processAnthropicStream(response, onToken, onDone) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let totalTokens = 0;
  const streamStartTime = performance.now();
  let firstTokenTime = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;
      const dataStr = trimmed.replace(/^data:\s*/, '');

      try {
        const parsed = JSON.parse(dataStr);
        if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
          if (!firstTokenTime) firstTokenTime = performance.now();
          totalTokens += 1;
          onToken?.(parsed.delta.text);
        } else if (parsed.type === 'message_stop') {
          const elapsedMs = Math.max(performance.now() - streamStartTime, 1);
          const ttftMs = firstTokenTime ? firstTokenTime - streamStartTime : null;
          onDone?.({
            eval_count: totalTokens,
            eval_duration: elapsedMs * 1e6,
            prompt_eval_duration: ttftMs ? ttftMs * 1e6 : undefined,
            total_duration: elapsedMs * 1e6,
          });
          return;
        }
      } catch {
        // ignore malformed fragments
      }
    }
  }

  const elapsedMs = Math.max(performance.now() - streamStartTime, 1);
  const ttftMs = firstTokenTime ? firstTokenTime - streamStartTime : null;
  onDone?.({
    eval_count: totalTokens,
    eval_duration: elapsedMs * 1e6,
    prompt_eval_duration: ttftMs ? ttftMs * 1e6 : undefined,
    total_duration: elapsedMs * 1e6,
  });
}

/**
 * Stream Anthropic Claude chat completion
 */
async function streamAnthropic({
  endpoint,
  apiKey,
  model,
  messages,
  options = {},
  onToken,
  onDone,
  onError,
  signal,
}) {
  const cleanEndpoint = (endpoint || 'https://api.anthropic.com/v1').replace(/\/+$/, '');
  const url = `${cleanEndpoint}/messages`;

  let systemPrompt = '';
  const conversationMessages = [];

  for (const m of messages) {
    if (m.role === 'system') {
      systemPrompt = m.content;
    } else {
      if (m.role === 'user' && m.images && m.images.length > 0) {
        const contentParts = [];
        for (const img of m.images) {
          const base64Data = img.base64 || (img.preview?.startsWith('data:') ? img.preview.split(',')[1] : '');
          const mediaType = img.type || 'image/jpeg';
          if (base64Data) {
            contentParts.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data,
              },
            });
          }
        }
        if (m.content) {
          contentParts.push({ type: 'text', text: m.content });
        }
        conversationMessages.push({ role: 'user', content: contentParts });
      } else {
        conversationMessages.push({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content || '',
        });
      }
    }
  }

  const requestBody = {
    model,
    messages: conversationMessages,
    max_tokens: options.maxTokens && options.maxTokens > 0 ? options.maxTokens : 4096,
    stream: true,
  };

  if (systemPrompt) {
    requestBody.system = systemPrompt;
  }

  const reasoning = isReasoningModel(model);
  if (!reasoning && !temperatureUnsupportedModels.has(model)) {
    if (options.temperature !== undefined) {
      requestBody.temperature = options.temperature;
    }
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(requestBody),
      signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      let errJson = null;
      try {
        errJson = JSON.parse(errText);
      } catch {
        // Not JSON
      }

      const errMsg = (errJson?.error?.message || errText || '').toLowerCase();

      // Check if error is due to unsupported or deprecated temperature
      const isTempError =
        errMsg.includes('temperature') &&
        (errMsg.includes('deprecated') ||
         errMsg.includes('unsupported') ||
         errMsg.includes('does not support') ||
         errMsg.includes('must be 1') ||
         errMsg.includes('only the default'));

      if (isTempError && requestBody.temperature !== undefined) {
        temperatureUnsupportedModels.add(model);
        console.warn(`[aiProviderService] Anthropic model "${model}" rejected temperature (${errMsg}). Auto-retrying without temperature...`);

        const adjustedBody = { ...requestBody };
        delete adjustedBody.temperature;

        const retryRes = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify(adjustedBody),
          signal,
        });

        if (retryRes.ok) {
          return await processAnthropicStream(retryRes, onToken, onDone);
        }

        const retryErrText = await retryRes.text().catch(() => retryRes.statusText);
        throw new Error(`Anthropic Error (${retryRes.status}): ${retryErrText || retryRes.statusText}`);
      }

      throw new Error(`Anthropic Error (${response.status}): ${errText || response.statusText}`);
    }

    return await processAnthropicStream(response, onToken, onDone);
  } catch (error) {
    if (error.name === 'AbortError') {
      onDone?.({ aborted: true });
    } else {
      onError?.(error);
    }
  }
}

async function processGeminiStream(response, onToken, onDone) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let totalTokens = 0;
  const streamStartTime = performance.now();
  let firstTokenTime = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;
      const dataStr = trimmed.replace(/^data:\s*/, '');

      try {
        const parsed = JSON.parse(dataStr);
        const candidate = parsed.candidates?.[0];
        const textPart = candidate?.content?.parts?.[0]?.text;
        if (textPart) {
          if (!firstTokenTime) firstTokenTime = performance.now();
          totalTokens += Math.ceil(textPart.length / 4);
          onToken?.(textPart);
        }
      } catch {
        // ignore malformed fragments
      }
    }
  }

  const elapsedMs = Math.max(performance.now() - streamStartTime, 1);
  const ttftMs = firstTokenTime ? firstTokenTime - streamStartTime : null;
  onDone?.({
    eval_count: totalTokens,
    eval_duration: elapsedMs * 1e6,
    prompt_eval_duration: ttftMs ? ttftMs * 1e6 : undefined,
    total_duration: elapsedMs * 1e6,
  });
}

/**
 * Stream Google Gemini chat completion
 */
async function streamGemini({
  endpoint,
  apiKey,
  model,
  messages,
  options = {},
  onToken,
  onDone,
  onError,
  signal,
}) {
  const cleanEndpoint = (endpoint || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
  const cleanModel = model.replace(/^models\//, '');
  const url = `${cleanEndpoint}/models/${cleanModel}:streamGenerateContent?alt=sse&key=${apiKey}`;

  let systemInstruction = null;
  const contents = [];

  for (const m of messages) {
    if (m.role === 'system') {
      systemInstruction = {
        parts: [{ text: m.content || '' }],
      };
    } else {
      const parts = [];
      if (m.images && m.images.length > 0) {
        for (const img of m.images) {
          const base64Data = img.base64 || (img.preview?.startsWith('data:') ? img.preview.split(',')[1] : '');
          const mimeType = img.type || 'image/jpeg';
          if (base64Data) {
            parts.push({
              inlineData: {
                mimeType,
                data: base64Data,
              },
            });
          }
        }
      }
      if (m.content) {
        parts.push({ text: m.content });
      }
      contents.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts,
      });
    }
  }

  const reasoning = isReasoningModel(model);

  const requestBody = {
    contents,
    generationConfig: {
      ...(options.maxTokens && options.maxTokens > 0 && { maxOutputTokens: options.maxTokens }),
    },
  };

  if (!reasoning && !temperatureUnsupportedModels.has(model)) {
    requestBody.generationConfig.temperature = options.temperature ?? 0.7;
    requestBody.generationConfig.topP = options.topP ?? 0.95;
  }

  if (systemInstruction) {
    requestBody.systemInstruction = systemInstruction;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      let errJson = null;
      try {
        errJson = JSON.parse(errText);
      } catch {
        // Not JSON
      }

      const errMsg = (errJson?.error?.message || errText || '').toLowerCase();
      const isTempError =
        errMsg.includes('temperature') &&
        (errMsg.includes('deprecated') ||
         errMsg.includes('unsupported') ||
         errMsg.includes('does not support') ||
         errMsg.includes('invalid'));

      if (isTempError && requestBody.generationConfig?.temperature !== undefined) {
        temperatureUnsupportedModels.add(model);
        console.warn(`[aiProviderService] Gemini model "${model}" rejected temperature. Auto-retrying without temperature...`);

        const adjustedBody = { ...requestBody };
        adjustedBody.generationConfig = { ...adjustedBody.generationConfig };
        delete adjustedBody.generationConfig.temperature;
        delete adjustedBody.generationConfig.topP;

        const retryRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(adjustedBody),
          signal,
        });

        if (retryRes.ok) {
          return await processGeminiStream(retryRes, onToken, onDone);
        }

        const retryErrText = await retryRes.text().catch(() => retryRes.statusText);
        throw new Error(`Gemini Error (${retryRes.status}): ${retryErrText || retryRes.statusText}`);
      }

      throw new Error(`Gemini Error (${response.status}): ${errText || response.statusText}`);
    }

    return await processGeminiStream(response, onToken, onDone);
  } catch (error) {
    if (error.name === 'AbortError') {
      onDone?.({ aborted: true });
    } else {
      onError?.(error);
    }
  }
}

/**
 * Execute TypeSafe Jev System One structured decision endpoint
 *
 * Dedicated request adapter for Jev:
 * - Direct POST to https://api.typesafe.ai/v1/systemone (via /local-api/jev/systemone backend route)
 * - State + Questions payload structure (not /chat/completions)
 * - Questions can be bool, choice, score, text
 * - Protects API key by prioritizing backend proxy so keys are not exposed in browser network logs
 */
export async function executeJevSystemOne({
  state,
  questions = {},
  model = 'typesafe/jev-1.13',
  apiKey,
  endpoint,
  signal,
}) {
  if (!state || typeof state !== 'string' || !state.trim()) {
    throw new Error('Jev System One requires a non-empty state description.');
  }

  // Attempt backend route first so API key stays securely on backend server
  try {
    const result = await localAction('jev/systemone', {
      state: state.trim(),
      questions,
      model: model || 'typesafe/jev-1.13',
      apiKey: apiKey?.trim() || undefined,
      endpoint,
    });
    return result;
  } catch (backendError) {
    // If backend proxy unavailable or desktop controls not running, fallback to direct fetch
    const cleanKey = apiKey?.trim();
    if (!cleanKey) {
      throw new Error(
        backendError.message ||
        'TypeSafe API key is required. Set it in Settings or configure TYPESAFE_API_KEY on the backend server.'
      );
    }

    const cleanEndpoint = (endpoint || 'https://api.typesafe.ai/v1').replace(/\/+$/, '');
    const url = `${cleanEndpoint}/systemone`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cleanKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'typesafe/jev-1.13',
        state: state.trim(),
        questions,
      }),
      signal,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error?.message || data.message || `TypeSafe API Error (${response.status})`);
    }

    return data;
  }
}

/**
 * Stream or execute Jev (TypeSafe) decision model
 */
async function streamJev({
  endpoint,
  apiKey,
  model,
  messages,
  options = {},
  onToken,
  onDone,
  onError,
  signal,
}) {
  const cleanEndpoint = (endpoint || 'https://api.typesafe.ai/v1').replace(/\/+$/, '');

  // If user configured an OpenAI-compatible gateway (e.g. OpenRouter or custom proxy)
  if (cleanEndpoint.includes('/v1') && !cleanEndpoint.includes('typesafe.ai') && !cleanEndpoint.includes('localhost') && !cleanEndpoint.includes('127.0.0.1')) {
    return streamOpenAiCompatible({
      endpoint: cleanEndpoint,
      apiKey,
      model: model || 'typesafe/jev-1.13',
      messages,
      options,
      onToken,
      onDone,
      onError,
      signal,
    });
  }

  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
  const inquiry = lastUserMsg?.content || 'Decision evaluation';

  try {
    const startTime = performance.now();

    // Support structured questions passed in options or provide default decision questions
    const questions = options.questions || {
      needs_human: {
        type: 'bool',
        instructions: 'Does this state/incident need immediate human escalation?',
      },
      classification: {
        type: 'choice',
        choices: ['Optimal', 'Viable', 'Needs Refinement', 'Warning', 'Critical'],
        instructions: 'Classify the overall quality, safety, and operational state.',
      },
      confidence: {
        type: 'score',
        min: 0,
        max: 100,
        instructions: 'Confidence score (0-100) regarding this evaluation.',
      },
      summary: {
        type: 'text',
        instructions: 'Provide a concise 1-2 sentence rationalization for this decision.',
      },
    };

    const data = await executeJevSystemOne({
      state: inquiry,
      questions,
      model: model || 'typesafe/jev-1.13',
      apiKey,
      endpoint,
      signal,
    });

    const elapsed = Math.round(performance.now() - startTime);
    const answers = data.answers || data.results || data || {};

    let outputMarkdown = `### 🎯 TypeSafe Jev Decision Result\n\n`;
    outputMarkdown += `> **Model:** \`${model || 'typesafe/jev-1.13'}\` • **Latency:** \`${elapsed}ms\` • **API:** \`System One (Structured Decision)\`\n\n`;

    outputMarkdown += `#### 📋 Structured Evaluations\n\n`;
    for (const [key, val] of Object.entries(answers)) {
      if (typeof val === 'object' && val !== null) {
        const valText = val.value !== undefined ? String(val.value) : JSON.stringify(val);
        const confText = val.confidence !== undefined ? ` *(confidence: ${Math.round(val.confidence * 100)}%)*` : '';
        const reasonText = val.reasoning ? `\n  - *Reasoning:* ${val.reasoning}` : '';
        outputMarkdown += `- **${key}:** \`${valText}\`${confText}${reasonText}\n`;
      } else {
        outputMarkdown += `- **${key}:** \`${val}\`\n`;
      }
    }

    if (data.decision || data.summary) {
      outputMarkdown += `\n**Decision Summary:**\n${data.decision || data.summary}\n`;
    }

    // Stream out chunks smoothly
    const chunkSize = 16;
    for (let i = 0; i < outputMarkdown.length; i += chunkSize) {
      onToken?.(outputMarkdown.slice(i, i + chunkSize));
      await new Promise((r) => setTimeout(r, 10));
    }

    onDone?.({ eval_count: Object.keys(answers).length * 10, eval_duration: elapsed * 1e6 });
  } catch (error) {
    if (error.name === 'AbortError') {
      onDone?.({ aborted: true });
    } else {
      onError?.(error);
    }
  }
}

/**
 * Test connectivity and API key validity for a given provider
 */
export async function testProviderConnection(providerId, apiKey, endpoint) {
  if (!apiKey || !apiKey.trim()) {
    return { ok: false, message: 'Please enter an API key' };
  }

  const cleanKey = apiKey.trim();

  try {
    switch (providerId) {
      case PROVIDERS.OPENAI: {
        const ep = (endpoint || 'https://api.openai.com/v1').replace(/\/+$/, '');
        const res = await fetch(`${ep}/models`, {
          headers: { Authorization: `Bearer ${cleanKey}` },
          signal: AbortSignal.timeout(6000),
        });
        if (res.ok) return { ok: true, message: 'OpenAI API key verified successfully!' };
        const data = await res.json().catch(() => ({}));
        return { ok: false, message: data.error?.message || `HTTP ${res.status}: ${res.statusText}` };
      }

      case PROVIDERS.ANTHROPIC: {
        const ep = (endpoint || 'https://api.anthropic.com/v1').replace(/\/+$/, '');
        const res = await fetch(`${ep}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': cleanKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'hi' }],
          }),
          signal: AbortSignal.timeout(7000),
        });
        if (res.ok || res.status === 200) return { ok: true, message: 'Anthropic Claude key verified!' };
        const data = await res.json().catch(() => ({}));
        return { ok: false, message: data.error?.message || `HTTP ${res.status}: ${res.statusText}` };
      }

      case PROVIDERS.GEMINI: {
        const ep = (endpoint || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
        const res = await fetch(`${ep}/models?key=${cleanKey}`, {
          signal: AbortSignal.timeout(6000),
        });
        if (res.ok) return { ok: true, message: 'Google Gemini API key verified!' };
        const data = await res.json().catch(() => ({}));
        return { ok: false, message: data.error?.message || `HTTP ${res.status}: ${res.statusText}` };
      }

      case PROVIDERS.GROK: {
        const ep = (endpoint || 'https://api.x.ai/v1').replace(/\/+$/, '');
        const res = await fetch(`${ep}/models`, {
          headers: { Authorization: `Bearer ${cleanKey}` },
          signal: AbortSignal.timeout(6000),
        });
        if (res.ok) return { ok: true, message: 'xAI Grok key verified!' };
        const data = await res.json().catch(() => ({}));
        return { ok: false, message: data.error?.message || `HTTP ${res.status}: ${res.statusText}` };
      }

      case PROVIDERS.JEV: {
        try {
          const res = await executeJevSystemOne({
            state: 'Connection probe test to verify TypeSafe Jev API credentials.',
            questions: {
              active: {
                type: 'bool',
                instructions: 'Is the API operational?',
              },
            },
            model: 'typesafe/jev-1.13',
            apiKey: cleanKey,
            endpoint,
          });
          if (res && (res.answers || res.status === 200 || !res.error)) {
            return { ok: true, message: 'TypeSafe Jev API connection verified successfully!' };
          }
          return { ok: false, message: res.error || 'Unexpected response from TypeSafe Jev' };
        } catch (err) {
          return { ok: false, message: err.message || 'Connection to TypeSafe Jev failed' };
        }
      }

      case PROVIDERS.CUSTOM: {
        const ep = (endpoint || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
        const res = await fetch(`${ep}/models`, {
          headers: { Authorization: `Bearer ${cleanKey}` },
          signal: AbortSignal.timeout(6000),
        });
        if (res.ok) return { ok: true, message: 'Custom endpoint and key verified!' };
        return { ok: false, message: `Server returned HTTP ${res.status}` };
      }

      default:
        return { ok: false, message: 'Unknown provider' };
    }
  } catch (err) {
    return { ok: false, message: err.message || 'Connection failed' };
  }
}

/**
 * Stream any chat completion (Ollama or online cloud providers)
 */
export async function streamAnyChat({
  model,
  messages,
  options = {},
  settings = {},
  localModels = [],
  onToken,
  onDone,
  onError,
  signal,
}) {
  const { provider, rawModel } = resolveModelProvider(model, localModels);

  // 1. Local Ollama Provider
  if (provider === PROVIDERS.OLLAMA) {
    return streamOllamaChat({
      model: rawModel || model,
      messages,
      options,
      ollamaUrl: settings.ollamaUrl,
      onToken,
      onDone,
      onError,
      signal,
    });
  }

  // 2. Online Cloud Providers
  const apiKeys = settings.apiKeys || {};
  const apiEndpoints = settings.apiEndpoints || {};
  const apiKey = (apiKeys[provider] || '').trim();
  const customEndpoint = (apiEndpoints[provider] || '').trim();

  if (!apiKey) {
    throw new MissingApiKeyError(provider, rawModel);
  }

  const startTime = performance.now();

  const handleDone = (parsed = {}) => {
    const elapsedSeconds = (performance.now() - startTime) / 1000;
    const tokenCount = parsed.eval_count || 1;
    onDone?.({
      ...parsed,
      eval_count: tokenCount,
      eval_duration: elapsedSeconds * 1e9,
      model: `${provider}:${rawModel}`,
    });
  };

  switch (provider) {
    case PROVIDERS.OPENAI:
      return streamOpenAiCompatible({
        endpoint: customEndpoint || 'https://api.openai.com/v1',
        apiKey,
        model: rawModel,
        messages,
        options,
        onToken,
        onDone: handleDone,
        onError,
        signal,
      });

    case PROVIDERS.ANTHROPIC:
      return streamAnthropic({
        endpoint: customEndpoint || 'https://api.anthropic.com/v1',
        apiKey,
        model: rawModel,
        messages,
        options,
        onToken,
        onDone: handleDone,
        onError,
        signal,
      });

    case PROVIDERS.GEMINI:
      return streamGemini({
        endpoint: customEndpoint || 'https://generativelanguage.googleapis.com/v1beta',
        apiKey,
        model: rawModel,
        messages,
        options,
        onToken,
        onDone: handleDone,
        onError,
        signal,
      });

    case PROVIDERS.GROK:
      return streamOpenAiCompatible({
        endpoint: customEndpoint || 'https://api.x.ai/v1',
        apiKey,
        model: rawModel,
        messages,
        options,
        onToken,
        onDone: handleDone,
        onError,
        signal,
      });

    case PROVIDERS.JEV:
      return streamJev({
        endpoint: customEndpoint || 'https://api.typesafe.ai/v1',
        apiKey,
        model: rawModel,
        messages,
        options,
        onToken,
        onDone: handleDone,
        onError,
        signal,
      });

    case PROVIDERS.CUSTOM:
      return streamOpenAiCompatible({
        endpoint: customEndpoint || 'https://openrouter.ai/api/v1',
        apiKey,
        model: rawModel || settings.customModelName || 'deepseek/deepseek-r1',
        messages,
        options,
        onToken,
        onDone: handleDone,
        onError,
        signal,
      });

    default:
      throw new Error(`Unsupported model provider: ${provider}`);
  }
}

export { streamAnyChat as streamAiChat };

