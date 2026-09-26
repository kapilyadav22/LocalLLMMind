import { createFolderStore } from './workspaceFolders.js';
import { createTerminalStore } from './terminalSessions.js';
import { formatPython } from './formatCode.js';
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
    if (size > MAX_PROJECT_BYTES * 3) throw new Error('Request exceeds the maximum project request size.');
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
  const folders = createFolderStore();
  const terminals = createTerminalStore();
  const snapshots = new Map();
  const runSessions = new Map();
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
  const handler = async (req, res, next) => {
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
      if (route === '/local-api/folders/connect') return send(200, await folders.connect(data.path));
      if (route === '/local-api/folders/scan') return send(200, await folders.scan(data.id));
      if (route === '/local-api/folders/save') return send(200, await folders.save(data.id, data.changes));
      if (route === '/local-api/folders/open-ide') {
        const folder = await folders.get(data.id);
        const ide = (await findIdes()).find((item) => item.id === data.ide);
        if (!ide) throw new Error('Selected IDE is unavailable.');
        if (process.platform === 'darwin' && ide.target.endsWith('.app')) await openIde('/usr/bin/open', ['-a', ide.target, folder.path]);
        else await openIde(ide.target, [folder.path]);
        return send(200, { path: folder.path });
      }
      if (route === '/local-api/terminals/create') {
        const folder = await folders.get(data.folderId);
        return send(200, await terminals.create({ projectId: data.projectId, cwd: folder.path, cols: data.cols, rows: data.rows }));
      }
      if (route === '/local-api/terminals/list') return send(200, { sessions: terminals.list(data.projectId) });
      if (route === '/local-api/terminals/read') return send(200, terminals.read(data.id, data.cursor));
      if (route === '/local-api/terminals/input') { terminals.input(data.id, data.input); return send(200, { ok: true }); }
      if (route === '/local-api/terminals/resize') { terminals.resize(data.id, data.cols, data.rows); return send(200, { ok: true }); }
      if (route === '/local-api/terminals/close') { terminals.close(data.id); return send(200, { ok: true }); }
      if (route === '/local-api/ollama/start') {
        starting ||= startOllama().finally(() => { starting = null; });
        return send(200, await starting);
      }
      if (route === '/local-api/jev/systemone') {
        const apiKey = (data.apiKey || process.env.TYPESAFE_API_KEY || process.env.JEV_API_KEY || '').trim();
        if (!apiKey) {
          return send(400, { error: 'TypeSafe API key is required. Set it in Settings or environment variable TYPESAFE_API_KEY.' });
        }
        const endpoint = (data.endpoint || 'https://api.typesafe.ai/v1').replace(/\/+$/, '');
        const targetUrl = `${endpoint}/systemone`;
        const payload = {
          model: data.model || 'typesafe/jev-1.13',
          state: data.state || '',
          questions: data.questions || {},
        };

        const apiRes = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const resData = await apiRes.json().catch(() => ({}));
        if (!apiRes.ok) {
          return send(apiRes.status, {
            error: resData.error?.message || resData.message || `TypeSafe API Error (${apiRes.status})`,
            details: resData,
          });
        }
        return send(200, resData);
      }
      if (route === '/local-api/projects/format') return send(200, await formatPython({ root, content: data.content, filePath: data.filePath }));
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
        const files = Array.isArray(data.files) && !data.files.length ? [] : validateFiles(data.files);
        if (data.projectId && !/^[a-zA-Z0-9-]{1,80}$/.test(data.projectId)) throw new Error('Invalid project session.');
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
          if (!files.some((file) => file.path === data.entryPoint)) throw new Error('Entry point is not in this project.');
          const ext = path.extname(data.entryPoint).toLowerCase();
          if (['.py'].includes(ext)) {
            cmd = (await executable('python3')) || (await executable('python'));
            if (!cmd) throw new Error('python3 is not installed or not in PATH.');
            args = [data.entryPoint];
          } else if (['.js', '.mjs', '.cjs'].includes(ext)) {
            cmd = await executable('node');
            if (!cmd) throw new Error('node is not installed or not in PATH.');
            args = [data.entryPoint];
          } else if (['.ts', '.sh', '.bash', '.go', '.rb'].includes(ext)) {
            const runtime = { '.ts': 'node', '.sh': 'bash', '.bash': 'bash', '.go': 'go', '.rb': 'ruby' }[ext];
            cmd = await executable(runtime);
            if (!cmd) throw new Error(`${runtime} is not installed or not in PATH.`);
            args = ext === '.go' ? ['run', data.entryPoint] : ext === '.ts' ? ['--experimental-strip-types', data.entryPoint] : [data.entryPoint];
          } else {
            throw new Error(`Running ${ext} files directly is not supported. Use the terminal with the project's build command.`);
          }
        } else {
          throw new Error('entryPoint or command required.');
        }

        const connected = data.folderId ? await folders.get(data.folderId) : null;
        await mkdir(workspaceRoot, { recursive: true });
        if ((await lstat(workspaceRoot)).isSymbolicLink() || (await realpath(workspaceRoot)) !== workspaceRoot) {
          throw new Error('Workspace directory must not be a symbolic link.');
        }

        const runKey = `${data.folderId || 'copy'}:${data.projectId}`;
        let session = data.projectId ? runSessions.get(runKey) : null;
        if (session?.busy) throw new Error('A command is already running for this project.');
        if (!session) {
          const directory = connected?.path || await mkdtemp(path.join(workspaceRoot, `run-${randomUUID()}-`));
          session = { directory, files: new Map(), busy: false };
          if (data.projectId) runSessions.set(runKey, session);
        }
        const { directory } = session;
        if (await realpath(directory) !== directory) throw new Error('Run directory must not be a symbolic link.');
        session.busy = true;
        try {
          if (!connected) {
          // Keep installed dependencies between commands; only synchronize editor-owned files.
          const incoming = new Set(files.map((file) => file.path));
          for (const previous of session.files.keys()) {
            if (!incoming.has(previous)) {
              const parent = path.dirname(path.join(directory, previous));
              if (await realpath(parent) !== parent) throw new Error('Cannot synchronize through a symbolic link.');
              await rm(path.join(directory, previous), { force: true });
            }
          }
          for (const file of files) {
            const destination = path.join(directory, file.path);
            let current = directory;
            for (const part of file.path.split('/').slice(0, -1)) {
              current = path.join(current, part);
              await mkdir(current, { recursive: true });
              if ((await lstat(current)).isSymbolicLink()) throw new Error('Cannot synchronize a symbolic link.');
            }
            const existing = await lstat(destination).catch(() => null);
            if (existing?.isSymbolicLink() || (existing && !existing.isFile())) throw new Error('Cannot synchronize a non-file.');
            if (session.files.get(file.path) !== file.content || !existing) await writeFile(destination, file.content);
          }
          session.files = new Map(files.map((file) => [file.path, file.content]));
          } else if (data.entryPoint) {
            const entry = path.join(directory, data.entryPoint);
            if (await realpath(entry) !== entry || !(await lstat(entry)).isFile()) throw new Error('Cannot run a symbolic link or missing entry point.');
          }

          const enhancedPath = [...new Set([...(process.env.PATH || '').split(path.delimiter), '/opt/homebrew/bin', '/opt/homebrew/sbin', '/usr/local/bin', '/usr/bin', '/bin'])].join(path.delimiter);
          const start = Date.now();
          const { stdout, stderr, exitCode } = await new Promise((resolve) => {
            let out = '';
            let err = '';
            const spawnOptions = {
              cwd: directory,
              shell: useShell,
              detached: process.platform !== 'win32',
              stdio: ['ignore', 'pipe', 'pipe'],
              env: {
                ...process.env,
                PATH: enhancedPath,
                PYTHONUNBUFFERED: '1',
              },
            };

            const child = useShell ? spawn(cmd, spawnOptions) : spawn(cmd, args, spawnOptions);

            let timedOut = false;
            const timer = setTimeout(() => {
              timedOut = true;
              try {
                if (process.platform === 'win32') child.kill('SIGKILL');
                else process.kill(-child.pid, 'SIGKILL');
              } catch { child.kill('SIGKILL'); }
            }, useShell ? 60000 : 30000);
            child.stdout?.on('data', (d) => {
              out = (out + d.toString()).slice(0, 50000);
            });
            child.stderr?.on('data', (d) => {
              err = (err + d.toString()).slice(0, 50000);
            });

            child.once('error', (e) => {
              clearTimeout(timer);
              resolve({ stdout: out, stderr: `${err}\n${e.message}`.trim(), exitCode: 1 });
            });

            child.once('close', (code, signal) => {
              clearTimeout(timer);
              resolve({ stdout: out, stderr: timedOut ? `${err}\nCommand timed out.` : signal ? `${err}\nStopped by ${signal}.` : err, exitCode: timedOut ? 124 : code ?? 1 });
            });
          });

          const durationMs = Date.now() - start;
          return send(200, { stdout, stderr, exitCode, durationMs, workingDirectory: directory });
        } finally {
          session.busy = false;
          if (!data.projectId && !connected) await rm(directory, { recursive: true, force: true }).catch(() => {});
        }
      }
      return send(404, { error: 'Unknown local action.' });
    } catch (error) { return send(400, { error: error.message }); }
  };
  handler.dispose = () => terminals.dispose();
  return handler;
}
export function localControlPlugin() {
  const install = (server) => { const handler = createLocalControl({ root: server.config.root }); server.middlewares.use(handler); server.httpServer?.once('close', handler.dispose); };
  return { name: 'localllmmind-local-control', configureServer: install, configurePreviewServer: install };
}
