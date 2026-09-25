import test from 'node:test';
import assert from 'node:assert/strict';
import { CURRENT_MODELS, DEFAULT_MODEL_BY_PROVIDER } from '../src/constants/models.js';
import { PROVIDERS, PROVIDER_CONFIGS, resolveModelProvider } from '../src/constants/apiProviders.js';
import { computeGitStatus, computeUnifiedDiff } from '../src/utils/gitService.js';
import { GIT_STATUS_TYPES } from '../src/constants/gitConstants.js';

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
