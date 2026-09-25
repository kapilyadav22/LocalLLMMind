import test from 'node:test';
import assert from 'node:assert/strict';
import { generateProject, MAX_CONTEXT_CHARS } from '../src/services/codeGenerationService.js';
const args = { model: 'coder', prompt: 'Build hello', language: 'Python', project: { files: [], comments: [] } };
function streamResponse(chunks) {
  return new Response(new ReadableStream({ start(controller) { chunks.forEach((chunk) => controller.enqueue(new TextEncoder().encode(chunk))); controller.close(); } }), { status: 200 });
}
test('handles split NDJSON and a final line without newline', async (t) => {
  let payload;
  const text = JSON.stringify({ summary: 'Hello', files: [{ path: 'main.py', content: 'print("hello")' }] });
  const wire = JSON.stringify({ message: { content: text } }) + '\n' + JSON.stringify({ done: true });
  t.mock.method(globalThis, 'fetch', async (_, request) => { payload = JSON.parse(request.body); return streamResponse([wire.slice(0, 10), wire.slice(10, 35), wire.slice(35)]); });
  const result = await generateProject(args);
  assert.equal(result.files[0].path, 'main.py'); assert.equal(payload.format.type, 'object');
});
test('does not accept a disconnected, errored or truncated response', async (t) => {
  for (const data of [{ error: 'Model out of memory' }, { done: true, done_reason: 'length' }, { message: { content: '{}' } }]) {
    const mock = t.mock.method(globalThis, 'fetch', async () => streamResponse([JSON.stringify(data)]));
    await assert.rejects(generateProject(args)); mock.mock.restore();
  }
});
test('passes cancellation through to the fetch request', async (t) => {
  const abort = new AbortController(); abort.abort();
  t.mock.method(globalThis, 'fetch', async (_, request) => { assert.equal(request.signal, abort.signal); request.signal.throwIfAborted(); });
  await assert.rejects(generateProject({ ...args, signal: abort.signal }), { name: 'AbortError' });
});
test('rejects oversized context before contacting the model', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Must not fetch'); });
  await assert.rejects(generateProject({ ...args, project: { files: [{ path: 'main.py', content: 'x'.repeat(MAX_CONTEXT_CHARS + 1) }], comments: [] } }), /too large/);
  assert.equal(fetch.mock.callCount(), 0);
});

test('Ollama receives attachments and only selected project files with its raw model name', async (t) => {
  let payload;
  const output = JSON.stringify({ summary: 'Done', files: [{ path: 'main.py', content: 'print(1)' }] });
  t.mock.method(globalThis, 'fetch', async (_, request) => { payload = JSON.parse(request.body); return streamResponse([JSON.stringify({ message: { content: output }, done: true })]); });
  await generateProject({ ...args, model: 'ollama:coder', project: { files: [{ path: 'main.py', content: 'SELECTED_SOURCE' }, { path: 'other.py', content: 'NOT_SELECTED_SOURCE' }], comments: [] }, contextPaths: ['main.py'], attachments: [{ path: 'requirements.txt', content: 'REFERENCE_TEXT' }] });
  assert.equal(payload.model, 'coder'); assert.match(payload.messages[1].content, /REFERENCE_TEXT/); assert.match(payload.messages[1].content, /SELECTED_SOURCE/); assert.doesNotMatch(payload.messages[1].content, /NOT_SELECTED_SOURCE/);
});
test('cloud requests receive configured keys and surface API errors', async (t) => {
  let headers;
  t.mock.method(globalThis, 'fetch', async (_, request) => { headers = request.headers; return new Response('Invalid key', { status: 401 }); });
  await assert.rejects(generateProject({ ...args, model: 'openai:gpt-6-astra', apiKeys: { openai: 'test-key' } }), /401|Invalid key/);
  assert.equal(headers.Authorization, 'Bearer test-key');
});
