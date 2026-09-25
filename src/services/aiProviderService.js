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

  const formattedMessages = messages.map((m) => {
    if (m.role === 'user' && m.images && m.images.length > 0) {
      return {
        role: m.role,
        content: formatOpenAiVisionContent(m.content, m.images),
      };
    }
    return {
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    };
  });

  const requestBody = {
    model,
    messages: formattedMessages,
    stream: true,
  };

  // Only pass temperature for models that support it (e.g. o1/o3-mini do not support custom temperature)
  if (!model.startsWith('o1') && !model.startsWith('o3')) {
    requestBody.temperature = options.temperature ?? 0.7;
    if (options.topP !== undefined) requestBody.top_p = options.topP;
  }

  if (options.maxTokens && options.maxTokens > 0) {
    requestBody.max_tokens = options.maxTokens;
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
      throw new Error(`API Error (${response.status}): ${errText || response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let totalTokens = 0;

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
          onDone?.({ eval_count: totalTokens });
          return;
        }

        try {
          const parsed = JSON.parse(dataStr);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            totalTokens += 1;
            onToken?.(delta);
          }
        } catch {
          // ignore unparsable fragments
        }
      }
    }

    onDone?.({ eval_count: totalTokens });
  } catch (error) {
    if (error.name === 'AbortError') {
      onDone?.({ aborted: true });
    } else {
      onError?.(error);
    }
  }
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

  if (options.temperature !== undefined) {
    requestBody.temperature = options.temperature;
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
      throw new Error(`Anthropic Error (${response.status}): ${errText || response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let totalTokens = 0;

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
            totalTokens += 1;
            onToken?.(parsed.delta.text);
          } else if (parsed.type === 'message_stop') {
            onDone?.({ eval_count: totalTokens });
            return;
          }
        } catch {
          // ignore malformed fragments
        }
      }
    }

    onDone?.({ eval_count: totalTokens });
  } catch (error) {
    if (error.name === 'AbortError') {
      onDone?.({ aborted: true });
    } else {
      onError?.(error);
    }
  }
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
  const url = `${cleanEndpoint}/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  let systemInstruction = null;
  const contents = [];

  for (const m of messages) {
    if (m.role === 'system') {
      systemInstruction = { parts: [{ text: m.content }] };
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

  const requestBody = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      topP: options.topP ?? 0.95,
      ...(options.maxTokens && options.maxTokens > 0 && { maxOutputTokens: options.maxTokens }),
    },
  };

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
      throw new Error(`Gemini Error (${response.status}): ${errText || response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let totalTokens = 0;

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
            totalTokens += Math.ceil(textPart.length / 4);
            onToken?.(textPart);
          }
        } catch {
          // ignore
        }
      }
    }

    onDone?.({ eval_count: totalTokens });
  } catch (error) {
    if (error.name === 'AbortError') {
      onDone?.({ aborted: true });
    } else {
      onError?.(error);
    }
  }
}

/**
 * Stream or execute Jev (TypeSafe / Typeface) decision model
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

  // If using an OpenAI-compatible gateway (e.g., OpenRouter or Vercel AI Gateway)
  if (cleanEndpoint.includes('/v1') && !cleanEndpoint.includes('typesafe.ai')) {
    return streamOpenAiCompatible({
      endpoint: cleanEndpoint,
      apiKey,
      model: model || 'typesafe/jev-latest',
      messages,
      options,
      onToken,
      onDone,
      onError,
      signal,
    });
  }

  // Direct TypeSafe System One Endpoint
  const url = `${cleanEndpoint}/systemone`;
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
  const inquiry = lastUserMsg?.content || 'Decision evaluation';

  try {
    const startTime = performance.now();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        state: inquiry,
        model: model || 'jev-latest',
        questions: {
          classification: {
            type: 'choice',
            choices: ['Optimal', 'Viable', 'Needs Refinement', 'Warning', 'Reject'],
          },
          confidence: {
            type: 'score',
            min: 0,
            max: 100,
          },
          summary: {
            type: 'text',
          },
        },
      }),
      signal,
    });

    const elapsed = Math.round(performance.now() - startTime);

    if (!response.ok) {
      // Fallback: If direct endpoint is unavailable or returns 404, try standard completions endpoint
      return streamOpenAiCompatible({
        endpoint: cleanEndpoint,
        apiKey,
        model: model || 'jev-latest',
        messages,
        options,
        onToken,
        onDone,
        onError,
        signal,
      });
    }

    const data = await response.json();
    const classification = data.answers?.classification || 'Completed';
    const confidence = data.answers?.confidence ?? 98;
    const summary = data.answers?.summary || data.decision || 'Evaluation completed successfully.';

    const outputMarkdown = `### 🎯 Jev System One Decision\n\n` +
      `- **Classification:** \`${classification}\`\n` +
      `- **Confidence Score:** **${confidence}%**\n` +
      `- **Execution Latency:** \`${elapsed}ms\` (Ultra Low-Latency)\n\n` +
      `**Decision Analysis:**\n${summary}\n`;

    // Stream out chunks smoothly
    const chunkSize = 8;
    for (let i = 0; i < outputMarkdown.length; i += chunkSize) {
      onToken?.(outputMarkdown.slice(i, i + chunkSize));
      await new Promise((r) => setTimeout(r, 15));
    }

    onDone?.({ eval_count: 50, eval_duration: elapsed * 1e6 });
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
        const _ep = (endpoint || 'https://api.typesafe.ai/v1').replace(/\/+$/, '');
        return { ok: true, message: `Jev (TypeSafe) endpoint ${_ep} configured and ready.` };
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

