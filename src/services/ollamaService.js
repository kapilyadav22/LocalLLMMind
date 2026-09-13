/**
 * Ollama API Service
 * Handles communication with the Ollama REST API.
 * Uses Vite proxy in dev (/api → localhost:11434/api).
 * In production or for remote servers, baseUrl can be configured.
 */

function getBaseUrl(customUrl) {
  const cleanUrl = customUrl ? customUrl.trim().replace(/\/+$/, '') : '';
  // If a custom URL is provided (e.g., remote server), use it directly
  if (cleanUrl && cleanUrl !== 'http://localhost:11434' && cleanUrl !== 'http://127.0.0.1:11434') {
    return cleanUrl;
  }
  // In dev/preview with Vite proxy, use relative path to prevent CORS restrictions
  return '';
}

/**
 * Check if Ollama is reachable
 */
export async function checkConnection(ollamaUrl = 'http://localhost:11434') {
  try {
    const baseUrl = getBaseUrl(ollamaUrl);
    const url = baseUrl ? `${baseUrl}/api/tags` : '/api/tags';
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Fetch available models from Ollama
 */
export async function fetchModels(ollamaUrl = 'http://localhost:11434') {
  const baseUrl = getBaseUrl(ollamaUrl);
  const url = baseUrl ? `${baseUrl}/api/tags` : '/api/tags';
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.statusText}`);
  }
  const data = await response.json();
  return data.models || [];
}

/**
 * Stream a chat completion from Ollama
 * @param {Object} params
 * @param {string} params.model - The model name
 * @param {Array} params.messages - Array of {role, content} messages
 * @param {Object} params.options - Model options (temperature, top_p, etc.)
 * @param {string} params.ollamaUrl - Ollama server URL
 * @param {function} params.onToken - Callback for each streamed token
 * @param {function} params.onDone - Callback when streaming completes
 * @param {function} params.onError - Callback on error
 * @param {AbortSignal} params.signal - AbortController signal
 */
export async function streamChat({
  model,
  messages,
  options = {},
  ollamaUrl = 'http://localhost:11434',
  onToken,
  onDone,
  onError,
  signal,
}) {
  const baseUrl = getBaseUrl(ollamaUrl);
  const url = baseUrl ? `${baseUrl}/api/chat` : '/api/chat';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        options: {
          temperature: options.temperature ?? 0.7,
          top_p: options.topP ?? 0.9,
          num_ctx: options.contextWindow || options.numCtx || 4096,
          ...(options.maxTokens && { num_predict: options.maxTokens }),
        },
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.message?.content) {
            onToken?.(parsed.message.content);
          }
          if (parsed.done) {
            onDone?.(parsed);
            return;
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer);
        if (parsed.message?.content) {
          onToken?.(parsed.message.content);
        }
        if (parsed.done) {
          onDone?.(parsed);
          return;
        }
      } catch {
        // Skip
      }
    }

    onDone?.({});
  } catch (error) {
    if (error.name === 'AbortError') {
      onDone?.({ aborted: true });
    } else {
      onError?.(error);
    }
  }
}

/**
 * Pull a model from Ollama library with streaming progress
 * @param {Object} params
 * @param {string} params.model - Model name (e.g. 'llama3.2', 'deepseek-r1:8b')
 * @param {string} params.ollamaUrl - Ollama server URL
 * @param {function} params.onProgress - Callback with { status, completed, total, percent }
 * @param {AbortSignal} params.signal - Abort signal
 */
export async function pullModel({ model, ollamaUrl = 'http://localhost:11434', onProgress, signal }) {
  const baseUrl = getBaseUrl(ollamaUrl);
  const url = baseUrl ? `${baseUrl}/api/pull` : '/api/pull';

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: model, stream: true }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Failed to pull model: ${errorText || response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        const percent =
          parsed.total && parsed.completed
            ? Math.round((parsed.completed / parsed.total) * 100)
            : 0;
        onProgress?.({
          status: parsed.status || '',
          completed: parsed.completed || 0,
          total: parsed.total || 0,
          percent,
        });
        if (parsed.status === 'success') {
          return true;
        }
      } catch {
        // Skip malformed lines
      }
    }
  }
  return true;
}

/**
 * Delete a model from Ollama
 */
export async function deleteModel({ model, ollamaUrl = 'http://localhost:11434' }) {
  const baseUrl = getBaseUrl(ollamaUrl);
  const url = baseUrl ? `${baseUrl}/api/delete` : '/api/delete';

  const response = await fetch(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: model }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Failed to delete model: ${errorText || response.statusText}`);
  }
  return true;
}

/**
 * Fetch detailed info about a specific model
 */
export async function showModel({ model, ollamaUrl = 'http://localhost:11434' }) {
  const baseUrl = getBaseUrl(ollamaUrl);
  const url = baseUrl ? `${baseUrl}/api/show` : '/api/show';

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: model }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get model info: ${response.statusText}`);
  }
  return await response.json();
}

/**
 * Generate a concise, smart conversation title using the local model
 * Runs non-streaming with low token prediction limit for rapid completion
 */
export async function generateConversationTitle({
  model,
  userMessage,
  ollamaUrl = 'http://localhost:11434',
}) {
  if (!model || !userMessage) return null;
  const baseUrl = getBaseUrl(ollamaUrl);
  const url = baseUrl ? `${baseUrl}/api/chat` : '/api/chat';

  try {
    const prompt = `Summarize the following user request into a concise 3 to 5 word title for a chat sidebar. Do not include quotes, markdown, or punctuation:\n"${userMessage.slice(0, 300)}"`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 12,
        },
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return null;
    const data = await response.json();
    let title = (data.message?.content || '').trim();
    // Clean up any extraneous quotes or punctuation
    title = title.replace(/^["'#*`]+|["'#*`]+$/g, '').trim();
    if (title.length > 50) title = title.slice(0, 50) + '…';
    return title || null;
  } catch (err) {
    console.warn('[OllamaService] Smart auto-titling skipped:', err.message);
    return null;
  }
}


