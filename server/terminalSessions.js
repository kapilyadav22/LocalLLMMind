import process from 'node:process';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const MAX_BUFFER = 256 * 1024;
export function createTerminalStore() {
  const sessions = new Map();
  const describe = (s) => ({ id: s.id, projectId: s.projectId, name: s.name, cwd: s.cwd, exited: s.exited, exitCode: s.exitCode });
  function get(id) { const session = sessions.get(id); if (!session) throw new Error('Terminal session expired. Start a new terminal.'); return session; }
  async function create({ projectId, cwd, cols = 80, rows = 24 }) {
    if (typeof projectId !== 'string' || !/^[\w-]{1,100}$/.test(projectId)) throw new Error('Invalid project ID.');
    if (sessions.size >= 24 || [...sessions.values()].filter((s) => s.projectId === projectId).length >= 6) throw new Error('Close a terminal before creating another (6 per project).');
    const { spawn } = await import('node-pty');
    const windows = process.platform === 'win32';
    const shell = windows ? 'powershell.exe' : process.env.SHELL || '/bin/bash';
    const base = path.basename(shell);
    const args = windows ? ['-NoLogo', '-NoProfile'] : base === 'zsh' ? ['-f'] : base === 'bash' ? ['--noprofile', '--norc', '-i'] : [];
    const terminal = spawn(shell, args, { cwd, name: 'xterm-256color', cols: clamp(cols, 20, 400), rows: clamp(rows, 5, 150), env: { ...process.env, TERM: 'xterm-256color' } });
    const s = { id: randomUUID(), name: `Terminal ${[...sessions.values()].filter((s) => s.projectId === projectId).length + 1}`, projectId, cwd, terminal, output: '', offset: 0, exited: false };
    terminal.onData((data) => { s.output += data; if (s.output.length > MAX_BUFFER) { const trim = s.output.length - MAX_BUFFER; s.output = s.output.slice(trim); s.offset += trim; } });
    terminal.onExit(({ exitCode }) => { s.exited = true; s.exitCode = exitCode; });
    sessions.set(s.id, s); return describe(s);
  }
  function read(id, cursor = 0) {
    const s = get(id); const start = Number.isSafeInteger(cursor) ? cursor : 0;
    return { ...describe(s), output: s.output.slice(Math.max(0, start - s.offset)), cursor: s.offset + s.output.length, truncated: start < s.offset };
  }
  function input(id, data) { const s = get(id); if (s.exited) throw new Error('This terminal has exited. Start a new one.'); if (typeof data !== 'string' || data.length > 65536) throw new Error('Terminal input is too large.'); s.terminal.write(data); }
  function resize(id, cols, rows) { const s = get(id); if (!s.exited) s.terminal.resize(clamp(cols, 20, 400), clamp(rows, 5, 150)); }
  function close(id) { const s = get(id); if (!s.exited) s.terminal.kill(); sessions.delete(id); }
  function dispose() { for (const id of sessions.keys()) { try { close(id); } catch { /* Already exited. */ } } }
  return { create, read, input, resize, close, dispose, list: (projectId) => [...sessions.values()].filter((s) => s.projectId === projectId).map(describe) };
}
function clamp(value, min, max) { return Math.max(min, Math.min(max, Number.isFinite(value) ? Math.floor(value) : min)); }
