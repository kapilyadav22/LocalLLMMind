import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, realpath, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createFolderStore } from '../server/workspaceFolders.js';
import { createTerminalStore } from '../server/terminalSessions.js';
import { reconcileFolder, folderChanges, resolveFolderConflict } from '../src/utils/folderSync.js';
import { searchProject } from '../src/utils/projectSearch.js';
async function fixture(t) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'llm-milestone-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
test('folder save updates originals, creates and deletes files, and detects external edits', async (t) => {
  const root = await fixture(t), folders = createFolderStore();
  await writeFile(path.join(root, 'a.py'), 'original');
  const initial = await folders.connect(root);
  const changes = [{ path: 'a.py', content: 'edited', expectedHash: initial.hashes['a.py'] }, { path: 'src/new.py', content: 'new', expectedHash: null }];
  assert.equal((await folders.save(initial.id, changes)).saved.length, 2);
  assert.equal(await readFile(path.join(root, 'a.py'), 'utf8'), 'edited');
  const disk = await folders.scan(initial.id);
  await writeFile(path.join(root, 'a.py'), 'external');
  const conflict = await folders.save(initial.id, [{ path: 'a.py', content: 'clobber', expectedHash: disk.hashes['a.py'] }, { path: 'other.py', content: 'no partial write', expectedHash: null }]);
  assert.deepEqual(conflict.conflicts, ['a.py']); assert.equal(conflict.saved.length, 0);
  assert.equal(await readFile(path.join(root, 'a.py'), 'utf8'), 'external');
  await folders.save(initial.id, [{ path: 'src/new.py', content: null, expectedHash: disk.hashes['src/new.py'] }]);
  await assert.rejects(readFile(path.join(root, 'src/new.py')), /ENOENT/);
});
test('folder connection skips dependencies and symlinks and refuses unsafe writes', async (t) => {
  const root = await fixture(t), outside = await fixture(t), folders = createFolderStore();
  await mkdir(path.join(root, 'node_modules')); await writeFile(path.join(root, 'node_modules/a.js'), 'dependency');
  await writeFile(path.join(root, 'a.py'), 'hello'); await writeFile(path.join(root, '.env'), 'secret');
  await writeFile(path.join(root, '.localllmmind.json'), '{}');
  await symlink(outside, path.join(root, 'escape'));
  const snapshot = await folders.connect(root);
  assert.deepEqual(snapshot.files.map((f) => f.path), ['a.py']);
  for (const filePath of ['../outside', 'escape/a.py', '.env', '.git/config']) await assert.rejects(folders.save(snapshot.id, [{ path: filePath, content: 'x', expectedHash: null }]));
});
test('three-way folder reconciliation handles additions, deletions, conflicts and resolution', () => {
  const project = { files: [{ path: 'a', content: 'mine' }, { path: 'b', content: 'old' }], diskFiles: [{ path: 'a', content: 'base' }, { path: 'b', content: 'old' }], diskHashes: { a: 'oldhash' } };
  const next = reconcileFolder(project, { files: [{ path: 'a', content: 'theirs' }, { path: 'c', content: 'added' }], hashes: { a: 'newhash', c: 'c' } });
  assert.deepEqual(next.diskConflicts, ['a']); assert.equal(next.files.find((f) => f.path === 'b'), undefined);
  assert.equal(next.files.find((f) => f.path === 'c').content, 'added');
  assert.deepEqual(folderChanges(next), [{ path: 'a', content: 'mine', expectedHash: 'newhash' }]);
  assert.equal(resolveFolderConflict(next, 'a', 'disk').files[0].content, 'theirs');
  assert.equal(resolveFolderConflict(next, 'a', 'mine').files[0].content, 'mine');
  assert.deepEqual(reconcileFolder(next, { files: next.diskFiles, hashes: next.diskHashes }).diskConflicts, ['a']);
});
test('project search supports case, whole word, path filters, line navigation and result cap', () => {
  const files = [{ path: 'src/a.py', content: 'hello HELLO helloWorld\nhello' }, { path: 'test.py', content: 'hello' }];
  assert.equal(searchProject(files, 'hello').matches.length, 5);
  const result = searchProject(files, 'hello', { wholeWord: true, caseSensitive: true, pathFilter: 'src/' });
  assert.equal(result.matches.length, 2); assert.equal(result.matches[1].line, 2);
  assert.equal(searchProject(files, 'hello', { limit: 2 }).truncated, true);
  assert.equal(searchProject(files, '').matches.length, 0);
});
test('PTY shell preserves cwd and environment, streams output, interrupts and terminates', { timeout: 15000 }, async (t) => {
  const root = await fixture(t); await mkdir(path.join(root, 'sub'));
  const store = createTerminalStore(); t.after(() => store.dispose());
  const session = await store.create({ projectId: 'test', cwd: root });
  async function waitFor(text) {
    for (let i = 0; i < 100; i++) { const data = store.read(session.id); if (data.output.includes(text)) return data; await new Promise((r) => setTimeout(r, 50)); }
    throw new Error(`Missing terminal output ${text}: ${store.read(session.id).output}`);
  }
  store.input(session.id, 'cd sub\rexport LLM_TEST_VALUE=working\r');
  store.input(session.id, "printf 'RESULT_%s_%s\\n' \"$LLM_TEST_VALUE\" \"${PWD##*/}\"\r");
  await waitFor('RESULT_working_sub');
  store.input(session.id, "node -e 'setInterval(()=>console.log(42),100)'\r");
  await waitFor('42'); store.input(session.id, '\u0003');
  store.input(session.id, "printf 'STOP_%s\\n' OK\r"); await waitFor('STOP_OK');
  store.resize(session.id, 100, 30); assert.equal(store.list('test').length, 1);
  store.close(session.id); assert.equal(store.list('test').length, 0);
});
