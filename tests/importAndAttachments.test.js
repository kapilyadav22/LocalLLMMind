import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { importProjectArchive, importDirectoryFiles, importDirectoryHandle, readAttachments, normalizeMetadata } from '../src/utils/projectImport.js';
import { commitStagedFiles, restoreFile } from '../src/utils/workspaceChanges.js';
import { formatCode } from '../src/utils/codeFormatter.js';

async function archive(entries) {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(entries)) zip.file(path, content);
  return new File([await zip.generateAsync({ type: 'uint8array' })], 'project.zip');
}
test('imports wrapped repository ZIP and skips dependencies, editor files and binary assets', async () => {
  const result = await importProjectArchive(await archive({ 'repo-main/src/index.js': 'console.log(1)', 'repo-main/README.md': '# Hi', 'repo-main/node_modules/a/index.js': 'dependency', 'repo-main/.git/config': 'git', 'repo-main/.vscode/settings.json': '{}', 'repo-main/logo.png': new Uint8Array([0, 1, 255]) }));
  assert.deepEqual(result.files.map((file) => file.path), ['README.md', 'src/index.js']);
  assert.equal(result.skipped.length, 4);
});
test('rejects malicious ZIP traversal even when the zip library sanitizes it', async () => {
  await assert.rejects(importProjectArchive(await archive({ '../escape.py': 'x' })), /unsafe/);
});
test('imports exported metadata safely and restores comments', async () => {
  const result = await importProjectArchive(await archive({ 'main.py': 'print(1)', '.localllmmind.json': JSON.stringify({ name: 'Demo', summary: 'test', comments: [{ path: 'main.py', text: 'Check this', from: 1 }, null, { path: 'missing', text: 'bad' }] }) }));
  assert.equal(result.name, 'Demo'); assert.equal(result.comments.length, 1); assert.equal(result.comments[0].to, 1);
  assert.equal(normalizeMetadata({ name: {}, comments: [{ path: 'main.py', text: {} }] }, result.files).comments.length, 0);
});
test('folder fallback preserves relative paths and imports more than 80 source files', async () => {
  const files = Array.from({ length: 100 }, (_, i) => {
    const file = new File(['x'], `${i}.py`);
    Object.defineProperty(file, 'webkitRelativePath', { value: `demo/src/${i}.py` }); return file;
  });
  const result = await importDirectoryFiles(files);
  assert.equal(result.files.length, 100); assert.equal(result.name, 'demo'); assert.equal(result.files[0].path, 'src/0.py');
});
test('native directory handles import nested files and do not traverse ignored directories', async () => {
  const file = (name, text) => ({ kind: 'file', getFile: async () => new File([text], name) });
  const handle = { name: 'native', async *entries() { yield ['src', { kind: 'directory', async *entries() { yield ['main.py', file('main.py', 'print(1)')]; } }]; yield ['node_modules', { kind: 'directory', entries() { throw new Error('Must not traverse'); } }]; } };
  const result = await importDirectoryHandle(handle);
  assert.deepEqual(result.files, [{ path: 'src/main.py', content: 'print(1)' }]); assert.equal(result.skipped.length, 1);
});
test('attachments detect duplicates, binary content, credentials and size limits without blocking text', async () => {
  const initial = await readAttachments([new File(['reference'], 'README.md'), new File(['<svg/>'], 'diagram.svg')]);
  assert.equal(initial.attachments.length, 2);
  const next = await readAttachments([new File(['again'], 'README.md'), new File([new Uint8Array([0, 1])], 'binary.dat'), new File(['SECRET=1'], '.env'), new File(['x'.repeat(512 * 1024 + 1)], 'large.txt')], initial.attachments);
  assert.equal(next.attachments.length, 2); assert.equal(next.skipped.length, 4);
});
test('commits only staged paths, preserves unstaged changes and supports deletion', () => {
  const base = [{ path: 'a', content: 'old a' }, { path: 'b', content: 'old b' }, { path: 'c', content: 'deleted' }];
  const current = [{ path: 'a', content: 'new a' }, { path: 'b', content: 'new b' }];
  assert.deepEqual(commitStagedFiles(current, base, new Set(['a', 'c'])), [{ path: 'a', content: 'new a' }, { path: 'b', content: 'old b' }]);
  assert.equal(restoreFile(current, base[2]).length, 3);
});
test('syntax-aware formatting preserves string contents; Python is not reindented heuristically', async () => {
  const source = 'const text = `a\n  b`;';
  const formatted = await formatCode(source, 'main.js'); assert.match(formatted, /`a\n  b`/);
  await assert.rejects(formatCode('if True:\n    print(1)\nprint(2)\n', 'main.py'), /left unchanged/);
  assert.equal(await formatCode('{"a":1}', 'a.json'), '{ "a": 1 }\n');
});
