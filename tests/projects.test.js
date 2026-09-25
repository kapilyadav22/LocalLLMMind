import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFiles, validateFilePath, mergeFiles, parseProposal } from '../src/shared/projectValidation.js';

for (const file of ['../escape.py', '/tmp/evil', 'a/../../b', 'C:/test.py', 'a\\b', 'a//b', '.git/config', '.vscode/tasks.json', 'NUL.txt', 'foo.', 'foo\0bar', '.localllmmind.json']) {
  test(`rejects unsafe path ${JSON.stringify(file)}`, () => assert.throws(() => validateFilePath(file)));
}
test('accepts nested source and common dotfiles', () => {
  for (const path of ['src/main.py', 'Cargo.toml', '.gitignore', '.env.example']) assert.equal(validateFilePath(path), path);
});
test('rejects duplicate, colliding and oversized projects', () => {
  assert.throws(() => validateFiles([{ path: 'a', content: '' }, { path: 'A', content: '' }]));
  assert.throws(() => validateFiles([{ path: 'a', content: '' }, { path: 'a/b', content: '' }]));
  assert.throws(() => validateFiles([{ path: 'a', content: 'x'.repeat(2 * 1024 * 1024 + 1) }]));
});
test('merges changed files without removing files or mutating originals', () => {
  const original = [{ path: 'a.py', content: 'old' }, { path: 'README.md', content: 'keep' }];
  const merged = mergeFiles(original, [{ path: 'a.py', content: 'new' }, { path: 'b.py', content: 'added' }]);
  assert.equal(merged.length, 3);
  assert.equal(merged.find((file) => file.path === 'README.md').content, 'keep');
  assert.equal(original[0].content, 'old');
});
test('parses structured proposals and rejects malformed/truncated responses', () => {
  assert.deepEqual(parseProposal('```json\n{"summary":"Done","files":[{"path":"main.py","content":"print(1)"}]}\n```').files, [{ path: 'main.py', content: 'print(1)' }]);
  assert.throws(() => parseProposal('{"files":['), /incomplete/);
  assert.throws(() => parseProposal('{"files":[{"path":"../escape","content":""}]}'), /Unsafe/);
});
