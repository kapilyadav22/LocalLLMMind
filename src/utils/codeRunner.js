/**
 * Native local execution with explicit errors, sandboxed HTML preview, and JSON validation.
 */
import { localAction } from '../services/localControlService.js';

export async function runCodeSnippet({ code, path = '', allFiles = [], projectId }) {
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

      {
        const result = await localAction('projects/run', { entryPoint: path, files: filesToSend, projectId });

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
      return { success: false, logs: [{ type: 'error', text: localErr.message }], durationMs: Math.round(performance.now() - start), exitCode: 1 };
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

export async function runTerminalCommand({ command, allFiles = [], systemAccess = true, projectId }) {
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
      projectId,
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
