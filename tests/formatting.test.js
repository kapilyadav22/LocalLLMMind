import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { formatPython } from '../server/formatCode.js';
import { formatCode } from '../src/utils/codeFormatter.js';
const root = fileURLToPath(new URL('../', import.meta.url));
const available = existsSync(`${root}/.formatter-venv/${process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python'}`);
test('Python formatter preserves comments and multiline strings and is idempotent', { skip: !available }, async () => {
  const source = '# keep this comment\ndef greet( name ):\n    text = """first\n  second"""\n    return { "name":name,"text":text }\n';
  const { content } = await formatPython({ root, content: source, filePath: 'main.py' });
  assert.match(content, /def greet\(name\):/);
  assert.match(content, /# keep this comment/);
  assert.match(content, /first\n  second/);
  assert.equal((await formatPython({ root, content, filePath: 'main.py' })).content, content);
});
test('Python formatter rejects syntax errors and unsupported paths', { skip: !available }, async () => {
  await assert.rejects(formatPython({ root, content: 'def broken(\n', filePath: 'bad.py' }), /Cannot parse|cannot format/);
  await assert.rejects(formatPython({ root, content: '', filePath: 'file.js' }), /Python files only/);
});
test('Prettier formats TypeScript and rejects invalid source', async () => {
  assert.equal(await formatCode('const x:number={a:1}.a', 'a.ts'), 'const x: number = { a: 1 }.a;\n');
  await assert.rejects(formatCode('const = ;', 'a.js'), /Unexpected token/);
});
