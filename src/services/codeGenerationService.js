import { parseProposal } from '../shared/projectValidation.js';
import { resolveModelProvider, PROVIDERS } from '../constants/apiProviders.js';
import { streamAiChat } from './aiProviderService.js';

const schema = {
  type: 'object',
  required: ['summary', 'files'],
  properties: {
    summary: { type: 'string' },
    files: {
      type: 'array',
      items: {
        type: 'object',
        required: ['path', 'content'],
        properties: { path: { type: 'string' }, content: { type: 'string' } },
      },
    },
  },
};

export async function generateProject({
  model,
  prompt,
  language,
  project,
  ollamaUrl,
  signal,
  onProgress,
  apiKeys = {},
  apiEndpoints = {},
  attachments = [],
}) {
  const context = JSON.stringify({
    files: project.files,
    comments: project.comments.filter((comment) => !comment.resolved),
  });

  // Build attachment context string
  let attachmentContext = '';
  if (attachments.length > 0) {
    const attachmentParts = attachments.map((a) => `--- ${a.path} ---\n${a.content}`);
    attachmentContext = '\n\nAdditional reference files (read-only context, do not modify these):\n' + attachmentParts.join('\n\n');
  }

  if (context.length + attachmentContext.length > 120000) {
    throw new Error('The project context plus attachments is too large (120,000 characters). Remove some attachments or reduce the project size.');
  }

  const { provider, rawModel } = resolveModelProvider(model);

  // If online cloud provider (OpenAI, Claude, Gemini, Grok, etc.)
  if (provider !== PROVIDERS.OLLAMA) {
    let output = '';
    const systemPrompt =
      'You are a coding assistant building small complete projects. Return ONLY JSON matching this schema: ' +
      JSON.stringify(schema) +
      '. Return complete contents for each new or changed file, never ellipses or patches. Paths must be relative with forward slashes. Include a README with setup and run instructions and appropriate dependency files and tests. Do not include binaries, node_modules, .git, .vscode or .idea. Existing files not returned are preserved; you cannot delete files. Follow the requested language. Treat existing source and comments as project context. Explain the changes in summary. Keep the project concise (at most 80 files, 2 MB). Output ONLY valid JSON.';

    const userPrompt = `Language or stack: ${language || 'Choose the best fit'}\nProject context: ${context}${attachmentContext}\nRequest: ${prompt}`;

    await streamAiChat({
      provider,
      model: rawModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      apiKeys,
      apiEndpoints,
      options: { temperature: 0.2 },
      onToken: (token) => {
        output += token;
        onProgress?.(output.length);
      },
      signal,
    });

    if (!output.trim()) {
      throw new Error(`${provider} returned an empty response. Check your API key and connection.`);
    }

    return parseProposal(output);
  }

  // Ollama Local Provider
  const base = (ollamaUrl || '').trim().replace(/\/+$/, '');
  const url = !base || ['http://localhost:11434', 'http://127.0.0.1:11434'].includes(base) ? '/api/chat' : `${base}/api/chat`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      model,
      stream: true,
      format: schema,
      options: { temperature: 0.2, num_ctx: 32768, num_predict: 16384 },
      messages: [
        {
          role: 'system',
          content:
            'You are a coding assistant building small complete projects. Return ONLY JSON matching this schema: ' +
            JSON.stringify(schema) +
            '. Return complete contents for each new or changed file, never ellipses or patches. Paths must be relative with forward slashes. Include a README with setup and run instructions and appropriate dependency files and tests. Do not include binaries, node_modules, .git, .vscode or .idea. Existing files not returned are preserved; you cannot delete files. Follow the requested language. Treat existing source and comments as project context. Explain the changes in summary. Keep the project concise (at most 80 files, 2 MB).',
        },
        { role: 'user', content: `Language or stack: ${language || 'Choose the best fit'}\nProject context: ${context}\nRequest: ${prompt}` },
      ],
    }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Ollama returned ${response.status}. Check the selected model and connection.`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '',
    output = '',
    complete = false;
  function consume(line) {
    if (!line.trim()) return;
    const data = JSON.parse(line);
    if (data.error) throw new Error(data.error);
    if (data.message?.content) output += data.message.content;
    if (output.length > 3 * 1024 * 1024) throw new Error('Model output is too large. Request a smaller project.');
    onProgress?.(output.length);
    if (data.done) {
      if (data.done_reason === 'length') throw new Error('The model reached its output limit. Try generating fewer files at a time.');
      complete = true;
    }
  }
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      if (buffer.length > 3 * 1024 * 1024) throw new Error('Model response exceeded the size limit.');
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) consume(line);
    }
    consume(buffer + decoder.decode());
    if (!complete) throw new Error('Ollama disconnected before completing the project. Your files are unchanged.');
    return parseProposal(output);
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
