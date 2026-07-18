/**
 * Ollama API Service
 * Handles communication with the Ollama REST API.
 * Uses Vite proxy in dev (/api → localhost:11434/api).
 * In production or for remote servers, baseUrl can be configured.
 */

function getBaseUrl(customUrl) {
  // If a custom URL is provided (e.g., remote server), use it directly
  if (customUrl && customUrl !== 'http://localhost:11434') {
    return customUrl;
  }
  // In dev, use the Vite proxy (relative path)
  // In production, fall back to localhost:11434
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
      // Keep the last potentially incomplete line in the buffer
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
