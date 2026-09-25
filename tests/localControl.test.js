import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { Buffer } from 'node:buffer';
import { mkdtemp, realpath, readFile, rm, symlink, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createLocalControl, isLocalRequest } from '../server/localControl.js';

function request(handler, route, { method = 'GET', body, token, origin = 'http://localhost:5173', host = 'localhost:5173', address = '127.0.0.1' } = {}) {
  return new Promise((resolve, reject) => {
    const req = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))]);
    req.url = route; req.method = method; req.socket = { remoteAddress: address };
    req.headers = { host, origin, 'content-type': 'application/json', ...(token ? { 'x-localllmmind-token': token } : {}) };
    let status;
    const res = { writeHead(code) { status = code; }, end(data) { resolve({ status, data: JSON.parse(data) }); } };
    handler(req, res, () => resolve({ next: true })).catch(reject);
  });
}
async function fixture(t, overrides = {}) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'llm-control-test-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const opens = [];
  const handler = createLocalControl({ root, probe: async () => true, findOllama: async () => '/fake/ollama', findIdes: async () => [{ id: 'code', label: 'Code', target: '/fake/code' }], openIde: async (...args) => opens.push(args), ...overrides });
  const status = await request(handler, '/local-api/status');
  return { handler, root, token: status.data.token, opens };
}
test('host, origin, remote address and fetch metadata protect local actions', () => {
  const req = { headers: { host: 'localhost:5173', origin: 'http://localhost:5173' }, socket: { remoteAddress: '::1' } };
  assert.equal(isLocalRequest(req), true);
  for (const headers of [{ host: 'evil.example', origin: 'http://evil.example' }, { origin: 'https://evil.example' }, { 'sec-fetch-site': 'cross-site' }]) assert.equal(isLocalRequest({ ...req, headers: { ...req.headers, ...headers } }), false);
  assert.equal(isLocalRequest({ ...req, socket: { remoteAddress: '192.168.1.5' } }), false);
});
test('requires session token and same-origin requests before mutations', async (t) => {
  const { handler, token } = await fixture(t);
  assert.equal((await request(handler, '/local-api/ollama/start', { method: 'POST', body: {} })).status, 403);
  assert.equal((await request(handler, '/local-api/ollama/start', { method: 'POST', body: {}, token, origin: 'https://evil.example' })).status, 403);
  assert.equal((await request(handler, '/local-api/ollama/start', { method: 'POST', body: {}, token })).data.running, true);
});
test('reports missing Ollama without trying to execute a shell', async (t) => {
  const { handler, token } = await fixture(t, { probe: async () => false, findOllama: async () => null });
  const result = await request(handler, '/local-api/ollama/start', { method: 'POST', body: {}, token });
  assert.equal(result.status, 400); assert.match(result.data.error, /not installed/);
});
test('writes separate snapshots, includes comments, and opens only known snapshot IDs', async (t) => {
  const { handler, token, opens } = await fixture(t);
  const body = { name: 'Test', files: [{ path: 'src/main.py', content: 'print("hello")' }], comments: [{ path: 'src/main.py', text: 'Review me' }] };
  const first = await request(handler, '/local-api/projects/save', { method: 'POST', body, token });
  const second = await request(handler, '/local-api/projects/save', { method: 'POST', body, token });
  assert.equal(first.status, 200); assert.notEqual(first.data.path, second.data.path);
  assert.equal(await readFile(path.join(first.data.path, 'src/main.py'), 'utf8'), 'print("hello")');
  assert.equal(JSON.parse(await readFile(path.join(first.data.path, '.localllmmind.json'), 'utf8')).comments[0].text, 'Review me');
  assert.equal((await request(handler, '/local-api/projects/open', { method: 'POST', body: { id: '../../etc', ide: 'code' }, token })).status, 400);
  assert.equal((await request(handler, '/local-api/projects/open', { method: 'POST', body: { id: first.data.id, ide: 'evil' }, token })).status, 400);
  assert.equal((await request(handler, '/local-api/projects/open', { method: 'POST', body: { id: first.data.id, ide: 'code' }, token })).status, 200);
  assert.deepEqual(opens, [['/fake/code', [first.data.path]]]);
});
test('rejects traversal and symlinked workspace roots', async (t) => {
  const { handler, token, root } = await fixture(t);
  const bad = await request(handler, '/local-api/projects/save', { method: 'POST', body: { files: [{ path: '../escape', content: 'x' }] }, token });
  assert.equal(bad.status, 400);
  await mkdir(path.join(root, 'outside'));
  await symlink(path.join(root, 'outside'), path.join(root, '.local-workspaces'));
  const linked = await request(handler, '/local-api/projects/save', { method: 'POST', body: { files: [{ path: 'main.py', content: 'x' }] }, token });
  assert.equal(linked.status, 400); assert.match(linked.data.error, /symbolic/);
});

test('runs code in a temporary directory and captures stdout/stderr', async (t) => {
  const { handler, token } = await fixture(t);
  const body = {
    entryPoint: 'src/main.py',
    files: [
      { path: 'src/main.py', content: 'print("Hello from python test")' },
    ],
  };
  const res = await request(handler, '/local-api/projects/run', { method: 'POST', body, token });
  assert.equal(res.status, 200);
  assert.equal(res.data.exitCode, 0);
  assert.match(res.data.stdout, /Hello from python test/);
});

