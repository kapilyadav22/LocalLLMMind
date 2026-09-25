/**
 * Code runner supporting both native local execution (via local-api python3/node)
 * and client-side sandboxed execution (JavaScript, Web preview, JSON).
 */
import { localAction } from '../services/localControlService';

let pyodideInstance = null;
let pyodideLoadingPromise = null;

async function loadPyodideAsync() {
  if (pyodideInstance) return pyodideInstance;
  if (pyodideLoadingPromise) return pyodideLoadingPromise;

  pyodideLoadingPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Pyodide CDN timed out. Ensure internet connectivity or run app with npm run dev.'));
    }, 10000);

    if (window.loadPyodide) {
      window.loadPyodide()
        .then((py) => {
          clearTimeout(timeout);
          pyodideInstance = py;
          resolve(py);
        })
        .catch((err) => {
          clearTimeout(timeout);
          reject(err);
        });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
    script.async = true;
    script.onload = async () => {
      try {
        const py = await window.loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/',
        });
        clearTimeout(timeout);
        pyodideInstance = py;
        resolve(py);
      } catch (err) {
        clearTimeout(timeout);
        reject(err);
      }
    };
    script.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Failed to load Pyodide WebAssembly runtime from CDN.'));
    };
    document.head.appendChild(script);
  });

  return pyodideLoadingPromise;
}

export async function runCodeSnippet({ code, path = '', allFiles = [] }) {
  const start = performance.now();
  const ext = path.split('.').pop()?.toLowerCase() || '';

  // 1. HTML / Web files
  if (['html', 'htm'].includes(ext)) {
    return {
      success: true,
      isWeb: true,
      html: code,
      durationMs: 0,
      exitCode: 0,
      logs: [{ type: 'info', text: 'HTML file ready for Live Web Preview.' }],
    };
  }

  // 2. Try native local execution via localControlService
  if (['py', 'python', 'js', 'mjs', 'cjs', 'ts', 'tsx', 'sh', 'bash', 'go', 'rs', 'rb'].includes(ext)) {
    try {
      const filesToSend = allFiles.map((f) => (f.path === path ? { path: f.path, content: code } : f));
      if (!filesToSend.some((f) => f.path === path)) {
        filesToSend.push({ path, content: code });
      }

      let runCommand = null;
      if (['py', 'python'].includes(ext)) runCommand = `python3 "${path}"`;
      else if (['js', 'mjs', 'cjs'].includes(ext)) runCommand = `node "${path}"`;
      else if (['ts', 'tsx'].includes(ext)) runCommand = `node --loader ts-node/esm "${path}" || npx -y tsx "${path}"`;
      else if (['sh', 'bash'].includes(ext)) runCommand = `bash "${path}"`;
      else if (['go'].includes(ext)) runCommand = `go run "${path}"`;
      else if (['rs'].includes(ext)) runCommand = `cargo run || rustc "${path}" -o temp_bin && ./temp_bin`;
      else if (['rb'].includes(ext)) runCommand = `ruby "${path}"`;

      if (runCommand) {
        const result = await localAction('projects/run', {
          command: runCommand,
          files: filesToSend,
          systemAccess: true,
        });

        const logs = [];
        if (result.stdout) {
          result.stdout.split('\n').forEach((line) => {
            if (line) logs.push({ type: 'log', text: line });
          });
        }
        if (result.stderr) {
          result.stderr.split('\n').forEach((line) => {
            if (line) logs.push({ type: 'error', text: line });
          });
        }
        if (!logs.length) {
          logs.push({ type: 'info', text: `Program completed with no output (Exit ${result.exitCode}).` });
        }

        return {
          success: result.exitCode === 0,
          logs,
          durationMs: result.durationMs ?? Math.round(performance.now() - start),
          exitCode: result.exitCode,
        };
      }
    } catch (localErr) {
      console.warn('Native local execution unavailable or failed:', localErr.message);
      // Fall through to in-browser execution
    }
  }

  // 3. Client-side JavaScript Execution
  if (['js', 'mjs', 'cjs', 'ts'].includes(ext)) {
    const logs = [];
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalInfo = console.info;

    try {
      console.log = (...args) => logs.push({ type: 'log', text: args.map(formatArg).join(' ') });
      console.warn = (...args) => logs.push({ type: 'warn', text: args.map(formatArg).join(' ') });
      console.error = (...args) => logs.push({ type: 'error', text: args.map(formatArg).join(' ') });
      console.info = (...args) => logs.push({ type: 'info', text: args.map(formatArg).join(' ') });

      const runner = new Function(code);
      const result = runner();

      if (result !== undefined) {
        logs.push({ type: 'return', text: `=> ${formatArg(result)}` });
      }

      const duration = Math.round(performance.now() - start);
      return {
        success: true,
        logs: logs.length ? logs : [{ type: 'info', text: 'Code executed successfully with no output.' }],
        durationMs: duration,
        exitCode: 0,
      };
    } catch (err) {
      const duration = Math.round(performance.now() - start);
      return {
        success: false,
        logs: [...logs, { type: 'error', text: `${err.name}: ${err.message}` }],
        durationMs: duration,
        exitCode: 1,
      };
    } finally {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
      console.info = originalInfo;
    }
  }

  // 4. Client-side Pyodide WASM fallback for Python (if native local runner wasn't reachable)
  if (['py', 'python'].includes(ext)) {
    try {
      const py = await loadPyodideAsync();
      const logs = [];

      py.setStdout({
        batched: (text) => {
          if (text) logs.push({ type: 'log', text });
        },
      });
      py.setStderr({
        batched: (text) => {
          if (text) logs.push({ type: 'error', text });
        },
      });

      if (allFiles.length > 0) {
        for (const f of allFiles) {
          try {
            const parts = f.path.split('/');
            if (parts.length > 1) {
              const dir = parts.slice(0, -1).join('/');
              py.FS.mkdirTree(dir);
            }
            py.FS.writeFile(f.path, f.path === path ? code : f.content);
          } catch {
            // ignore
          }
        }
      }

      const result = await py.runPythonAsync(code);
      if (result !== undefined && result !== null) {
        const repr = typeof result.toString === 'function' ? result.toString() : String(result);
        if (repr && repr !== 'None') {
          logs.push({ type: 'return', text: `=> ${repr}` });
        }
      }

      const duration = Math.round(performance.now() - start);
      return {
        success: true,
        logs: logs.length ? logs : [{ type: 'info', text: 'Program completed with no terminal output.' }],
        durationMs: duration,
        exitCode: 0,
      };
    } catch (err) {
      const duration = Math.round(performance.now() - start);
      return {
        success: false,
        logs: [{ type: 'error', text: `Python execution failed: ${err.message}` }],
        durationMs: duration,
        exitCode: 1,
      };
    }
  }

  // 5. JSON validation
  if (ext === 'json') {
    try {
      JSON.parse(code);
      return {
        success: true,
        durationMs: Math.round(performance.now() - start),
        exitCode: 0,
        logs: [{ type: 'log', text: 'Valid JSON syntax confirmed.' }],
      };
    } catch (err) {
      return {
        success: false,
        durationMs: Math.round(performance.now() - start),
        exitCode: 1,
        logs: [{ type: 'error', text: `JSON Syntax Error: ${err.message}` }],
      };
    }
  }

  return {
    success: false,
    durationMs: 0,
    exitCode: 1,
    logs: [{ type: 'warn', text: `Running .${ext} files directly is not supported.` }],
  };
}

export async function runTerminalCommand({ command, allFiles = [], systemAccess = true }) {
  const start = performance.now();
  const trimmed = String(command || '').trim();
  if (!trimmed) {
    return { success: true, logs: [], durationMs: 0, exitCode: 0 };
  }

  try {
    const result = await localAction('projects/run', {
      command: trimmed,
      files: allFiles,
      systemAccess,
    });

    const logs = [];
    if (result.stdout) {
      result.stdout.split('\n').forEach((line) => {
        if (line) logs.push({ type: 'log', text: line });
      });
    }
    if (result.stderr) {
      result.stderr.split('\n').forEach((line) => {
        if (line) logs.push({ type: 'error', text: line });
      });
    }
    if (!logs.length && result.exitCode === 0) {
      logs.push({ type: 'info', text: 'Command completed successfully (Exit 0).' });
    }

    return {
      success: result.exitCode === 0,
      logs,
      durationMs: result.durationMs ?? Math.round(performance.now() - start),
      exitCode: result.exitCode,
    };
  } catch (err) {
    return {
      success: false,
      logs: [{ type: 'error', text: err.message }],
      durationMs: Math.round(performance.now() - start),
      exitCode: 1,
    };
  }
}

function formatArg(arg) {
  if (typeof arg === 'object' && arg !== null) {
    try {
      return JSON.stringify(arg, null, 2);
    } catch {
      return String(arg);
    }
  }
  return String(arg);
}
