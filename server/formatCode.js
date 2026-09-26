import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { Buffer } from 'node:buffer';

// Send source through stdin. Never execute it or overwrite a project file.
export async function formatPython({ root, content, filePath }) {
  if (typeof content !== 'string' || Buffer.byteLength(content) > 2 * 1024 * 1024) throw new Error('Formatting supports source files up to 2 MB.');
  if (typeof filePath !== 'string' || !/\.pyi?$/i.test(filePath)) throw new Error('The local formatter supports Python files only.');
  const python = path.join(root, '.formatter-venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
  try { await access(python); } catch { throw new Error('Python formatter is not installed. Run npm run setup:formatters in the app folder, then retry.'); }
  return new Promise((resolve, reject) => {
    const child = spawn(python, ['-m', 'black', '--quiet', '--config', path.join(root, 'server/black.toml'), ...(filePath.endsWith('.pyi') ? ['--pyi'] : []), '-'], { cwd: root, shell: false, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', failure;
    const timer = setTimeout(() => { failure = 'Formatting timed out; source was left unchanged.'; child.kill('SIGKILL'); }, 15000);
    child.stdout.on('data', (data) => { stdout += data; if (stdout.length > 4 * 1024 * 1024) { failure = 'Formatted output is too large.'; child.kill('SIGKILL'); } });
    child.stderr.on('data', (data) => { stderr = (stderr + data).slice(-5000); });
    child.stdin.on('error', () => {});
    child.once('error', (error) => { clearTimeout(timer); reject(error); });
    child.once('close', (code) => {
      clearTimeout(timer);
      if (failure || code !== 0) reject(new Error(failure || (/No module named black/.test(stderr) ? 'Run npm run setup:formatters to install Black.' : stderr.trim() || 'Python formatting failed.')));
      else resolve({ content: stdout, formatter: 'Black' });
    });
    child.stdin.end(content);
  });
}
