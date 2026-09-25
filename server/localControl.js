import process from 'node:process';
import { Buffer } from 'node:buffer';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { spawn } from 'node:child_process';
import { access, mkdir, mkdtemp, writeFile, realpath, lstat, rm } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { validateFiles, validateFilePath, MAX_PROJECT_BYTES } from '../src/shared/projectValidation.js';

const loopback = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
const IDE_OPTIONS = [
  { id: 'antigravity', label: 'Antigravity', mac: '/Applications/Antigravity IDE.app', cli: 'antigravity' },
  { id: 'vscode', label: 'VS Code', mac: '/Applications/Visual Studio Code.app', cli: 'code' },
  { id: 'cursor', label: 'Cursor', mac: '/Applications/Cursor.app', cli: 'cursor' },
  { id: 'idea', label: 'IntelliJ IDEA', mac: '/Applications/IntelliJ IDEA.app', cli: 'idea' },
];
async function exists(file, executable = false) {
  try { await access(file, executable ? constants.X_OK : constants.F_OK); return true; } catch { return false; }
}
async function executable(name) {
  const suffix = process.platform === 'win32' ? '.exe' : '';
  const standardPaths = process.platform === 'darwin'
    ? ['/opt/homebrew/bin', '/opt/homebrew/sbin', '/usr/local/bin', '/usr/bin', '/bin', '/usr/sbin', '/sbin']
    : ['/usr/local/bin', '/usr/bin', '/bin', '/usr/sbin', '/sbin'];
  const envPaths = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
  const allDirs = [...new Set([...envPaths, ...standardPaths])];
  const candidates = allDirs.map((dir) => path.join(dir, name + suffix));
  if (name === 'ollama') candidates.push('/usr/local/bin/ollama', '/opt/homebrew/bin/ollama', '/Applications/Ollama.app/Contents/Resources/ollama');
  for (const candidate of candidates) if (await exists(candidate, true)) return candidate;
  return null;
}
async function ideOptions() {
  const found = [];
  for (const option of IDE_OPTIONS) {
    let target = process.platform === 'darwin' && await exists(option.mac) ? option.mac : await executable(option.cli);
    if (!target && option.id === 'antigravity' && process.platform === 'darwin' && await exists('/Applications/Antigravity.app')) target = '/Applications/Antigravity.app';
    if (target) found.push({ ...option, target });
  }
  return found;
}
async function ollamaRunning() {
  try {
    const response = await fetch('http://127.0.0.1:11434/api/tags', { signal: AbortSignal.timeout(1200) });
    return response.ok && Array.isArray((await response.json()).models);
  } catch { return false; }
}
function launch(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: false, stdio: 'ignore', detached: true });
    child.once('error', reject);
    child.once('spawn', () => { child.unref(); resolve(); });
  });
}
async function readJson(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new Error('JSON body required.');
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_PROJECT_BYTES * 3) throw new Error('Request exceeds 6 MB.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString());
}
export function isLocalRequest(req) {
  try {
    const host = new URL(`http://${req.headers.host}`);
    return loopback.has(req.socket.remoteAddress) && localHosts.has(host.hostname) &&
      (!req.headers.origin || req.headers.origin === host.origin) &&
      (!req.headers['sec-fetch-site'] || ['same-origin', 'none'].includes(req.headers['sec-fetch-site']));
  } catch { return false; }
}

export function createLocalControl({ root, probe = ollamaRunning, findOllama = () => executable('ollama'), findIdes = ideOptions, openIde = launch } = {}) {
  const token = randomBytes(32).toString('hex');
  const workspaceRoot = path.resolve(root, '.local-workspaces');
  const snapshots = new Map();
  let starting;
  async function startOllama() {
    if (await probe()) return { running: true, message: 'Ollama is already running.' };
    const binary = await findOllama();
    if (!binary) throw new Error('Ollama is not installed. Install it from ollama.com, then retry.');
    let output = '';
    let failure;
    const child = spawn(binary, ['serve'], { shell: false, detached: true, stdio: ['ignore', 'ignore', 'pipe'], env: { ...process.env, OLLAMA_HOST: '127.0.0.1:11434' } });
    child.stderr.on('data', (data) => { output = (output + data.toString()).slice(-2000); });
    child.once('error', (error) => { failure = error.message; });
    child.once('exit', (code) => { failure = `Ollama exited (${code}). ${output}`; });
    child.unref();
    for (let i = 0; i < 30; i++) {
      if (await probe()) { child.stderr.unref(); return { running: true, message: 'Ollama is ready.' }; }
      if (failure) throw new Error(failure);
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    // Keep draining stderr so a running server cannot block on a full pipe.
    child.stderr.unref();
    throw new Error('Ollama is still starting. Retry the connection in a few seconds.');
  }
  return async (req, res, next) => {
    const route = req.url.split('?')[0];
    if (!route.startsWith('/local-api/')) return next();
    const send = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(JSON.stringify(data));
    };
    if (!isLocalRequest(req)) return send(403, { error: 'Desktop controls are available only from this computer using localhost.' });
    try {
      if (req.method === 'GET' && route === '/local-api/status') {
        const [running, binary, ides] = await Promise.all([probe(), findOllama(), findIdes()]);
        return send(200, { token, running, installed: !!binary, ides: ides.map(({ id, label }) => ({ id, label })) });
      }
      const supplied = Buffer.from(req.headers['x-localllmmind-token'] || '');
      if (supplied.length !== token.length || !timingSafeEqual(supplied, Buffer.from(token))) return send(403, { error: 'Local session expired. Retry the action.' });
      if (req.method !== 'POST') return send(405, { error: 'POST required.' });
      const data = await readJson(req);
      if (route === '/local-api/ollama/start') {
        starting ||= startOllama().finally(() => { starting = null; });
        return send(200, await starting);
      }
      if (route === '/local-api/projects/save') {
        const files = validateFiles(data.files);
        await mkdir(workspaceRoot, { recursive: true });
        if ((await lstat(workspaceRoot)).isSymbolicLink() || await realpath(workspaceRoot) !== workspaceRoot) throw new Error('Workspace directory must not be a symbolic link.');
        const id = randomUUID();
        const directory = await mkdtemp(path.join(workspaceRoot, `${id}-`));
        try {
          for (const file of files) {
            const destination = path.join(directory, file.path);
            await mkdir(path.dirname(destination), { recursive: true });
            await writeFile(destination, file.content, { flag: 'wx' });
          }
          await writeFile(path.join(directory, '.localllmmind.json'), JSON.stringify({ name: String(data.name || 'Project').slice(0, 200), comments: Array.isArray(data.comments) ? data.comments : [], savedAt: new Date().toISOString() }, null, 2), { flag: 'wx' });
        } catch (error) { await rm(directory, { recursive: true, force: true }); throw error; }
        snapshots.set(id, directory);
        return send(200, { id, path: directory });
      }
      if (route === '/local-api/projects/open') {
        const directory = snapshots.get(data.id);
        if (!directory || await realpath(directory) !== directory) throw new Error('Save a new project snapshot before opening it.');
        const ide = (await findIdes()).find((option) => option.id === data.ide);
        if (!ide) throw new Error('That IDE is not installed or its CLI is unavailable.');
        if (process.platform === 'darwin' && ide.target.endsWith('.app')) await openIde('/usr/bin/open', ['-a', ide.target, directory]);
        else await openIde(ide.target, [directory]);
        return send(200, { opened: true, path: directory });
      }
      if (route === '/local-api/projects/run') {
        const files = validateFiles(data.files);
        let cmd = null;
        let args = [];
        let useShell = false;

        if (data.systemAccess && data.command) {
          useShell = true;
          cmd = String(data.command).trim();
          args = [];
        } else if (data.command) {
          const matchArgs = String(data.command).trim().match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
          if (!matchArgs.length) throw new Error('Empty command.');
          const rawCmd = matchArgs[0];
          args = matchArgs.slice(1).map((a) => a.replace(/^['"]|['"]$/g, ''));
          const allowed = new Set(['python', 'python3', 'node', 'pytest', 'cat', 'ls', 'echo', 'pwd', 'find', 'git', 'sh', 'bash', 'grep', 'which']);
          if (!allowed.has(rawCmd.toLowerCase())) {
            throw new Error(`Command "${rawCmd}" is not permitted in terminal.`);
          }
          cmd = (rawCmd === 'python' || rawCmd === 'python3')
            ? (await executable('python3')) || (await executable('python'))
            : await executable(rawCmd);
          if (!cmd) throw new Error(`Executable "${rawCmd}" was not found on this system.`);
        } else if (data.entryPoint) {
          validateFilePath(data.entryPoint);
          const ext = path.extname(data.entryPoint).toLowerCase();
          if (['.py'].includes(ext)) {
            cmd = (await executable('python3')) || (await executable('python'));
            if (!cmd) throw new Error('python3 is not installed or not in PATH.');
            args = [data.entryPoint];
          } else if (['.js', '.mjs', '.cjs'].includes(ext)) {
            cmd = await executable('node');
            if (!cmd) throw new Error('node is not installed or not in PATH.');
            args = [data.entryPoint];
          } else {
            throw new Error(`Running ${ext} files is not supported.`);
          }
        } else {
          throw new Error('entryPoint or command required.');
        }

        await mkdir(workspaceRoot, { recursive: true });
        if ((await lstat(workspaceRoot)).isSymbolicLink() || (await realpath(workspaceRoot)) !== workspaceRoot) {
          throw new Error('Workspace directory must not be a symbolic link.');
        }

        const id = randomUUID();
        const directory = await mkdtemp(path.join(workspaceRoot, `run-${id}-`));

        try {
          for (const file of files) {
            const destination = path.join(directory, file.path);
            await mkdir(path.dirname(destination), { recursive: true });
            await writeFile(destination, file.content, { flag: 'wx' });
          }

          const enhancedPath = [...new Set([...(process.env.PATH || '').split(path.delimiter), '/opt/homebrew/bin', '/opt/homebrew/sbin', '/usr/local/bin', '/usr/bin', '/bin'])].join(path.delimiter);
          const start = Date.now();
          const { stdout, stderr, exitCode } = await new Promise((resolve) => {
            let out = '';
            let err = '';
            const spawnOptions = {
              cwd: directory,
              shell: useShell,
              timeout: useShell ? 60000 : 30000,
              env: {
                ...process.env,
                PATH: enhancedPath,
                PYTHONUNBUFFERED: '1',
              },
            };

            const child = useShell ? spawn(cmd, spawnOptions) : spawn(cmd, args, spawnOptions);

            child.stdout?.on('data', (d) => {
              if (out.length < 50000) out += d.toString();
            });
            child.stderr?.on('data', (d) => {
              if (err.length < 50000) err += d.toString();
            });

            child.once('error', (e) => {
              resolve({ stdout: out, stderr: `${err}\n${e.message}`.trim(), exitCode: 1 });
            });

            child.once('exit', (code) => {
              resolve({ stdout: out, stderr: err, exitCode: code ?? 0 });
            });
          });

          const durationMs = Date.now() - start;
          return send(200, { stdout, stderr, exitCode, durationMs });
        } finally {
          await rm(directory, { recursive: true, force: true }).catch(() => {});
        }
      }
      return send(404, { error: 'Unknown local action.' });
    } catch (error) { return send(400, { error: error.message }); }
  };
}
export function localControlPlugin() {
  const install = (server) => { server.middlewares.use(createLocalControl({ root: server.config.root })); };
  return { name: 'localllmmind-local-control', configureServer: install, configurePreviewServer: install };
}
