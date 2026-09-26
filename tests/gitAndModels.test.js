import test from 'node:test';
import assert from 'node:assert/strict';
import { CURRENT_MODELS, DEFAULT_MODEL_BY_PROVIDER } from '../src/constants/models.js';
import { PROVIDERS, PROVIDER_CONFIGS, resolveModelProvider } from '../src/constants/apiProviders.js';
import { computeGitStatus, computeUnifiedDiff } from '../src/utils/gitService.js';
import { GIT_STATUS_TYPES } from '../src/constants/gitConstants.js';
import { formatMemoriesForSystemPrompt, detectPotentialMemories } from '../src/utils/memoryStorage.ts';
import { createNote, updateNote, deleteNote, appendContentToActiveNote, loadNotes } from '../src/utils/notesStorage.ts';
import { computeGenerationMetrics, formatMetricsMarkdown } from '../src/utils/generationMetrics.ts';

test('CURRENT_MODELS contains all specified latest models', () => {
  assert.deepEqual(CURRENT_MODELS.openai, ['gpt-6-astra', 'gpt-6-sol', 'gpt-6-luna']);
  assert.deepEqual(CURRENT_MODELS.anthropic, [
    'claude-fable-5-1',
    'claude-opus-5-5',
    'claude-sonnet-5',
    'claude-haiku-4-5',
  ]);
  assert.deepEqual(CURRENT_MODELS.gemini, [
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3.1-pro-preview',
    'gemini-3-flash-preview',
  ]);
  assert.deepEqual(CURRENT_MODELS.grok, [
    'grok-4.7',
    'grok-4.20',
    'grok-4.20-reasoning',
    'grok-4.20-non-reasoning',
  ]);
});

test('resolveModelProvider maps latest models to their respective providers', () => {
  assert.equal(resolveModelProvider('gpt-6-astra').provider, PROVIDERS.OPENAI);
  assert.equal(resolveModelProvider('claude-sonnet-5').provider, PROVIDERS.ANTHROPIC);
  assert.equal(resolveModelProvider('gemini-3.8-flash').provider, PROVIDERS.GEMINI);
  assert.equal(resolveModelProvider('grok-4.20-reasoning').provider, PROVIDERS.GROK);
});

test('computeGitStatus detects modified, untracked, and deleted files accurately', () => {
  const baseFiles = [
    { path: 'src/index.js', content: 'console.log("hello");\n' },
    { path: 'src/old.js', content: 'legacy code;\n' },
  ];

  const currentFiles = [
    { path: 'src/index.js', content: 'console.log("hello world!");\n' },
    { path: 'src/new.js', content: 'const x = 10;\n' },
  ];

  const stagedPaths = new Set(['src/index.js']);
  const result = computeGitStatus(currentFiles, baseFiles, stagedPaths);

  assert.equal(result.stats.total, 3);
  assert.equal(result.stats.modified, 1);
  assert.equal(result.stats.added, 1);
  assert.equal(result.stats.deleted, 1);

  assert.equal(result.statusByPath['src/index.js'].status, GIT_STATUS_TYPES.MODIFIED);
  assert.equal(result.statusByPath['src/index.js'].staged, true);

  assert.equal(result.statusByPath['src/new.js'].status, GIT_STATUS_TYPES.UNTRACKED);
  assert.equal(result.statusByPath['src/new.js'].staged, false);

  assert.equal(result.statusByPath['src/old.js'].status, GIT_STATUS_TYPES.DELETED);
});

test('computeUnifiedDiff calculates additions and removals', () => {
  const diff = computeUnifiedDiff('hello\nworld', 'hello\nbeautiful\nworld', 'test.txt');
  const added = diff.filter((l) => l.type === 'add');
  const removed = diff.filter((l) => l.type === 'remove');

  assert.equal(added.length, 1);
  assert.equal(added[0].text, 'beautiful');
  assert.equal(removed.length, 0);
});

import { isReasoningModel, streamAnyChat, executeJevSystemOne } from "../src/services/aiProviderService.js";

test("isReasoningModel identifies reasoning models and variants", () => {
  assert.equal(isReasoningModel("o1"), true);
  assert.equal(isReasoningModel("o1-mini"), true);
  assert.equal(isReasoningModel("o3-mini"), true);
  assert.equal(isReasoningModel("openai/o1-preview"), true);
  assert.equal(isReasoningModel("deepseek-reasoner"), true);
  assert.equal(isReasoningModel("grok-4.20-reasoning"), true);
  assert.equal(isReasoningModel("deepseek/deepseek-r1"), true);
  assert.equal(isReasoningModel("gpt-4o"), false);
});

test("streamAnyChat auto-recovers when provider rejects temperature with 400", async (t) => {
  let callCount = 0;
  let receivedBodies = [];

  t.mock.method(globalThis, "fetch", async (url, options) => {
    callCount++;
    receivedBodies.push(JSON.parse(options.body));
    if (callCount === 1) {
      // First call returns 400 temperature error
      return new Response(
        JSON.stringify({
          error: {
            message: "Unsupported value: 'temperature' does not support 0.7 with this model. Only the default (1) value is supported.",
            type: "invalid_request_error",
            param: "temperature",
            code: "unsupported_value"
          }
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    // Second call (auto-retry) returns valid SSE stream
    return new Response(
      "data: " + JSON.stringify({ choices: [{ delta: { content: "Success response" } }] }) + "\n\ndata: [DONE]\n\n",
      { status: 200, headers: { "Content-Type": "text/event-stream" } }
    );
  });

  let tokens = [];
  let done = false;
  await streamAnyChat({
    model: "openai:custom-model-x",
    messages: [{ role: "user", content: "hello" }],
    settings: { apiKeys: { openai: "test-key" } },
    options: { temperature: 0.7 },
    onToken: (tok) => tokens.push(tok),
    onDone: () => { done = true; },
  });

  assert.equal(callCount, 2, "Should have automatically retried once");
  assert.equal("temperature" in receivedBodies[0], true, "First request had temperature");
  assert.equal("temperature" in receivedBodies[1], false, "Second request had temperature stripped");
  assert.equal(tokens.join(""), "Success response");
  assert.equal(done, true);
});

test("streamAnyChat auto-recovers when Anthropic rejects temperature as deprecated", async (t) => {
  let callCount = 0;
  let receivedBodies = [];

  t.mock.method(globalThis, "fetch", async (url, options) => {
    callCount++;
    receivedBodies.push(JSON.parse(options.body));
    if (callCount === 1) {
      // First call returns 400 temperature deprecated error from Anthropic
      return new Response(
        JSON.stringify({
          type: "error",
          error: {
            type: "invalid_request_error",
            message: "temperature is deprecated for this model."
          }
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    // Second call (auto-retry) returns valid Anthropic SSE stream
    return new Response(
      "data: " + JSON.stringify({ type: "content_block_delta", delta: { text: "Anthropic success response" } }) + "\n\ndata: " + JSON.stringify({ type: "message_stop" }) + "\n\n",
      { status: 200, headers: { "Content-Type": "text/event-stream" } }
    );
  });

  let tokens = [];
  let done = false;
  await streamAnyChat({
    model: "claude-sonnet-5",
    messages: [{ role: "user", content: "hello" }],
    settings: { apiKeys: { anthropic: "sk-ant-test-key" } },
    options: { temperature: 0.7 },
    onToken: (tok) => tokens.push(tok),
    onDone: () => { done = true; },
  });

  assert.equal(callCount, 2, "Should have automatically retried once");
  assert.equal("temperature" in receivedBodies[0], true, "First request had temperature");
  assert.equal("temperature" in receivedBodies[1], false, "Second request had temperature removed");
  assert.equal(tokens.join(""), "Anthropic success response");
  assert.equal(done, true);
});

test("resolveModelProvider maps jev models to PROVIDERS.JEV", () => {
  assert.equal(resolveModelProvider('typesafe/jev-1.13').provider, PROVIDERS.JEV);
  assert.equal(resolveModelProvider('typesafe/jev-latest').provider, PROVIDERS.JEV);
  assert.equal(resolveModelProvider('typesafe/jev-1').provider, PROVIDERS.JEV);
});

test("executeJevSystemOne dispatches exact POST to https://api.typesafe.ai/v1/systemone with state and questions", async (t) => {
  let capturedUrl = '';
  let capturedMethod = '';
  let capturedHeaders = {};
  let capturedBody = {};

  t.mock.method(globalThis, "fetch", async (url, options) => {
    if (typeof url === 'string' && url.includes('/local-api/')) {
      throw new Error('Local server offline for test');
    }
    capturedUrl = url;
    capturedMethod = options.method;
    capturedHeaders = options.headers;
    capturedBody = JSON.parse(options.body);

    return new Response(
      JSON.stringify({
        answers: {
          needs_human: {
            value: true,
            confidence: 0.98,
            reasoning: "Production 500 errors require urgent intervention.",
          },
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  });

  const state = "Three production deployments failed and users are getting 500 errors.";
  const questions = {
    needs_human: {
      type: "bool",
      instructions: "Does this incident need immediate human escalation?",
    },
  };

  const result = await executeJevSystemOne({
    state,
    questions,
    model: "typesafe/jev-1.13",
    apiKey: "test-typesafe-key-123",
  });

  assert.equal(capturedUrl, "https://api.typesafe.ai/v1/systemone");
  assert.equal(capturedMethod, "POST");
  assert.equal(capturedHeaders.Authorization, "Bearer test-typesafe-key-123");
  assert.equal(capturedHeaders["Content-Type"], "application/json");
  assert.equal(capturedBody.model, "typesafe/jev-1.13");
  assert.equal(capturedBody.state, state);
  assert.deepEqual(capturedBody.questions, questions);
  assert.equal(result.answers.needs_human.value, true);
});

test("message queue flow executes prompts sequentially FIFO without dropped messages", () => {
  const queue = [];
  const processed = [];

  const enqueue = (item) => {
    queue.push(item);
  };

  const processNext = () => {
    if (queue.length > 0) {
      const next = queue.shift();
      processed.push(next);
      return next;
    }
    return null;
  };

  // User submits 2 messages while model is streaming
  enqueue({ id: '1', text: 'First queued prompt' });
  enqueue({ id: '2', text: 'Second queued prompt' });
  assert.equal(queue.length, 2);

  // When active stream finishes, process sequentially
  const first = processNext();
  assert.equal(first.text, 'First queued prompt');
  assert.equal(queue.length, 1);

  const second = processNext();
  assert.equal(second.text, 'Second queued prompt');
  assert.equal(queue.length, 0);
  assert.deepEqual(processed.map((p) => p.text), ['First queued prompt', 'Second queued prompt']);
});

test('formatMemoriesForSystemPrompt builds structured user memory context block', () => {
  const empty = formatMemoriesForSystemPrompt([]);
  assert.equal(empty, '');

  const memories = [
    { id: '1', content: 'Prefers TypeScript and functional components' },
    { id: '2', content: 'Local dev server runs on port 2210' },
  ];
  const formatted = formatMemoriesForSystemPrompt(memories);
  assert.ok(formatted.includes('[USER MEMORY & PERSISTENT CONTEXT]'));
  assert.ok(formatted.includes('- Prefers TypeScript and functional components'));
  assert.ok(formatted.includes('- Local dev server runs on port 2210'));
});

test('detectPotentialMemories extracts candidate facts and preferences from chat text', () => {
  const input = "Hello! I prefer TypeScript over vanilla JavaScript, and my tech stack is React with Vite.";
  const candidates = detectPotentialMemories(input);
  assert.ok(candidates.length >= 2);
  assert.ok(candidates.some((c) => c.toLowerCase().includes('typescript')));
  assert.ok(candidates.some((c) => c.toLowerCase().includes('react with vite')));

  const noMatches = detectPotentialMemories("Can you please help me write a quick function?");
  assert.equal(noMatches.length, 0);
});

test('createNote and updateNote manage workspace markdown documents', () => {
  const note = createNote('Architecture Discussion', '# System Architecture\nInitial draft.');
  assert.ok(note.id);
  assert.equal(note.title, 'Architecture Discussion');
  assert.ok(note.content.includes('Initial draft.'));

  const updated = updateNote(note.id, {
    title: 'Updated Architecture v2',
    content: '# System Architecture\nAdded database replication plan.',
  });
  assert.equal(updated.title, 'Updated Architecture v2');
  assert.ok(updated.content.includes('database replication plan'));
});

test('appendContentToActiveNote appends text with markdown section header', () => {
  const appended = appendContentToActiveNote('const api = "http://localhost:2210";', 'Ollama Assistant');
  assert.ok(appended.content.includes('http://localhost:2210'));
  assert.ok(appended.content.includes('Ollama Assistant'));
});

test('computeGenerationMetrics returns null for missing or invalid metrics', () => {
  assert.equal(computeGenerationMetrics(null), null);
  assert.equal(computeGenerationMetrics({}), null);
  assert.equal(computeGenerationMetrics({ eval_count: 50 }), null);
});

test('computeGenerationMetrics accurately calculates tokPerSec, TTFT, and durations', () => {
  const raw = {
    eval_count: 120,
    eval_duration: 2.4e9,
    prompt_eval_count: 45,
    prompt_eval_duration: 3.5e8,
    total_duration: 2.8e9,
    load_duration: 0.05e9,
    model: 'llama3.3:latest',
  };

  const metrics = computeGenerationMetrics(raw);
  assert.ok(metrics);
  assert.equal(metrics.evalCount, 120);
  assert.equal(metrics.duration, '2.40');
  assert.equal(metrics.tokPerSec, '50.0');
  assert.equal(metrics.promptTokens, 45);
  assert.equal(metrics.promptDuration, '0.35');
  assert.equal(metrics.totalDuration, '2.80');
  assert.equal(metrics.loadDuration, '0.05');
  assert.equal(metrics.ttftMs, 350);
  assert.equal(metrics.model, 'llama3.3:latest');

  const md = formatMetricsMarkdown(metrics);
  assert.ok(md.includes('50.0 tokens/sec'));
  assert.ok(md.includes('120 tokens'));
  assert.ok(md.includes('TTFT'));
  assert.ok(md.includes('350ms'));
});



