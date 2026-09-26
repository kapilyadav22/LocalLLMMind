import test from 'node:test';
import assert from 'node:assert/strict';
import { createToolRegistry, objectSchema, textSchema } from '../src/agent/toolRegistry.js';
import { runAgent, streamAgentTurn } from '../src/agent/runtime.js';
import { createAgentTools } from '../src/agent/tools.js';
import { checkEvaluation, validateSuite, evaluationSuite, evaluateTask } from '../src/agent/evaluations.js';
import { fetchRunningModels, setModelLoaded, streamChat, pullModel } from '../src/services/ollamaService.js';
const tool = { name: 'change_file', description: 'Test action', permission: 'write', inputSchema: objectSchema({ content: textSchema(20) }) };
test('tool registry rejects unknown tools, extra arguments, invalid schemas and denied actions', async () => {
  let executions = 0, approvals = 0;
  const registry = createToolRegistry([{ ...tool, execute: () => { executions++; return { ok: true }; } }]);
  const context = { approve: async () => { approvals++; return false; } };
  await assert.rejects(registry.execute('missing', {}, context), /Unknown tool/);
  await assert.rejects(registry.execute('change_file', { content: 'x', surprise: 1 }, context), /Invalid tool arguments/);
  const denied = await registry.execute('change_file', { content: 'x' }, context);
  assert.equal(denied.denied, true); assert.equal(executions, 0); assert.equal(approvals, 1);
  await registry.execute('change_file', { content: 'x' }, { approve: async () => true }); assert.equal(executions, 1);
});
test('aborting while permission is pending prevents execution', async () => {
  const controller = new AbortController(); let called = false;
  const registry = createToolRegistry([{ ...tool, execute: () => { called = true; } }]);
  await assert.rejects(registry.execute('change_file', { content: 'x' }, { signal: controller.signal, approve: async () => { controller.abort(); return true; } }), /abort/i);
  assert.equal(called, false);
});
test('agent loop executes calls, returns tool results to the model, and accumulates real metrics', async () => {
  let rounds = 0, captured; const events = [];
  const result = await runAgent({ model: 'test', messages: [{ role: 'user', content: 'clock' }], tools: [{ name: 'clock', description: 'clock', permission: 'read', inputSchema: objectSchema(), execute: () => ({ year: 2026 }) }], approve: async () => false, onTrace: (run) => events.push(run.status), turn: async ({ messages }) => {
    rounds++; captured = messages;
    return rounds === 1 ? { message: { role: 'assistant', content: '', tool_calls: [{ function: { name: 'clock', arguments: {} } }] }, metrics: { prompt_eval_count: 10, eval_count: 2 } } : { message: { role: 'assistant', content: '2026' }, metrics: { prompt_eval_count: 20, eval_count: 3 } };
  } });
  assert.equal(result.status, 'completed'); assert.equal(result.toolCounts.clock, 1);
  assert.equal(result.inputTokens, 30); assert.equal(result.outputTokens, 5);
  assert.ok(captured.some((m) => m.role === 'tool' && m.content.includes('2026'))); assert.equal(events.at(-1), 'completed');
});
test('agent step cap and failed calls are visible instead of fabricated success', async () => {
  let trace;
  await assert.rejects(runAgent({ model: 'test', messages: [], tools: [], approve: async () => false, maxSteps: 1, onTrace: (run) => { trace = run; }, turn: async () => ({ message: { role: 'assistant', content: '', tool_calls: [{ function: { name: 'invented', arguments: {} } }] }, metrics: {} }) }), /step limit/);
  assert.equal(trace.status, 'limited'); assert.equal(trace.steps[1].status, 'failed'); assert.equal(trace.inputTokens, null);
});
test('file proposals detect edits made during approval and do not overwrite them', async () => {
  const project = { files: [{ path: 'a.js', content: 'before' }] }; let applied = false;
  const registry = createToolRegistry(createAgentTools({ getProject: () => project, applyFile: () => { applied = true; } }));
  await assert.rejects(registry.execute('propose_file', { path: 'a.js', content: 'after', reason: 'test' }, { approve: async () => { project.files[0].content = 'user edit'; return true; } }), /changed while awaiting/);
  assert.equal(applied, false);
});
test('stream transport handles split JSON and tool calls, and reports Ollama errors', async (t) => {
  const previous = globalThis.fetch; t.after(() => { globalThis.fetch = previous; });
  const encoder = new TextEncoder();
  globalThis.fetch = async () => new Response(new ReadableStream({ start(controller) { for (const text of ['{"message":{"cont', 'ent":"Hi","tool_calls":[{"function":{"name":"clock","arguments":{}}}]}', '}\n{"done":true,"eval_count":2}\n']) controller.enqueue(encoder.encode(text)); controller.close(); } }));
  let text = ''; const output = await streamAgentTurn({ model: 'test', messages: [], tools: [], settings: {}, onToken: (s) => { text += s; } });
  assert.equal(text, 'Hi'); assert.equal(output.message.tool_calls[0].function.name, 'clock');
  globalThis.fetch = async () => new Response('{"error":"model does not support tools"}\n');
  await assert.rejects(streamAgentTurn({ model: 'test', messages: [], tools: [], settings: {} }), /does not support tools/);
  globalThis.fetch = async () => new Response('{"message":{"content":"partial"}}\n');
  await assert.rejects(streamAgentTurn({ model: 'test', messages: [], tools: [], settings: {} }), /before completion/);
});
test('model unload retains files and uses Ollama keep_alive zero; loaded models come from ps', async (t) => {
  const previous = globalThis.fetch; t.after(() => { globalThis.fetch = previous; }); const requests = [];
  globalThis.fetch = async (url, init) => { requests.push({ url, init }); return new Response(JSON.stringify(url.endsWith('/ps') ? { models: [{ name: 'test' }] } : { done: true })); };
  assert.equal((await fetchRunningModels())[0].name, 'test');
  await setModelLoaded({ model: 'test', loaded: false }); assert.equal(requests[1].init.method, 'POST'); assert.equal(JSON.parse(requests[1].init.body).keep_alive, 0);
});
test('evaluations use explicit checks and isolate fixture changes from host tools', async () => {
  assert.equal(validateSuite(evaluationSuite).length, 5);
  await assert.rejects(async () => validateSuite([{ name: 'x', prompt: 'x', files: [], checks: { unsupported: true } }]));
  const task = evaluationSuite[0]; const run = { status: 'completed', response: 'src/login.ts', steps: [{ name: 'read_file', status: 'completed' }] };
  assert.equal(checkEvaluation(task, run, task.files), true); assert.equal(checkEvaluation(task, { ...run, response: 'guessed' }, task.files), false);
  const result = await evaluateTask(task, 'test', {}, undefined, undefined, async ({ tools }) => { assert.ok(tools.every((t) => !['command', 'network'].includes(t.permission))); return { ...run, durationMs: 20, inputTokens: 10, outputTokens: 5 }; });
  assert.equal(result.passed, true);
});

test('chat streaming reports embedded errors and incomplete streams without a false success', async (t) => {
  const previous = globalThis.fetch; t.after(() => { globalThis.fetch = previous; });
  for (const body of ['{"error":"model crashed"}\n', '{"message":{"content":"partial"}}\n']) {
    globalThis.fetch = async () => new Response(body);
    let error, completed = false;
    await streamChat({ model: 'test', onError: (e) => { error = e; }, onDone: () => { completed = true; } });
    assert.ok(error); assert.equal(completed, false);
  }
  globalThis.fetch = async () => new Response('{"message":{"content":"done"},"done":true}');
  let output = '', completed = false;
  await streamChat({ model: 'test', onToken: (text) => { output += text; }, onDone: () => { completed = true; } });
  assert.equal(output, 'done'); assert.equal(completed, true);
});
test('model pull requires terminal success and handles final lines without a newline', async (t) => {
  const previous = globalThis.fetch; t.after(() => { globalThis.fetch = previous; });
  globalThis.fetch = async () => new Response('{"status":"downloading"}\n{"error":"out of space"}');
  await assert.rejects(pullModel({ model: 'test' }), /out of space/);
  globalThis.fetch = async () => new Response('{"status":"downloading"}');
  await assert.rejects(pullModel({ model: 'test' }), /before completion/);
  globalThis.fetch = async () => new Response('{"status":"success"}');
  assert.equal(await pullModel({ model: 'test' }), true);
});
test('agent surfaces truncated or empty model responses as failures', async () => {
  await assert.rejects(runAgent({ model: 'test', messages: [], tools: [], turn: async () => ({ message: { content: '' }, metrics: {} }) }), /no answer/);
  await assert.rejects(runAgent({ model: 'test', messages: [], tools: [], turn: async () => ({ message: { content: 'partial' }, metrics: { done_reason: 'length' } }) }), /output limit/);
});

test('web_search has read permission and executes implicitly without approval prompt', async () => {
  let approvals = 0;
  let executed = false;
  const tools = createAgentTools();
  const searchTool = tools.find((t) => t.name === 'web_search');
  assert.equal(searchTool.permission, 'read');
  const mockTools = [{
    ...searchTool,
    execute: () => { executed = true; return { results: [{ title: 'Test', url: 'https://example.com' }] }; }
  }];
  const registry = createToolRegistry(mockTools);
  const result = await registry.execute('web_search', { query: 'test query' }, {
    approve: async () => { approvals++; return false; }
  });
  assert.equal(executed, true);
  assert.equal(approvals, 0);
  assert.equal(result.results.length, 1);
});
