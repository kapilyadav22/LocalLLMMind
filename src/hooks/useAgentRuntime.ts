import { useCallback, useRef, useState, useEffect } from 'react';
import { runAgent } from '../agent/runtime.js';
import { saveAgentRun, loadAgentRuns } from '../agent/runStorage.js';
import { resolveModelProvider } from '../constants/apiProviders.js';
export function useAgentRuntime(tools: any[]) {
  const [trace, setTrace] = useState<any>(null), [approval, setApproval] = useState<any>(null);
  const [history, setHistory] = useState<any[]>(loadAgentRuns), [storageError, setStorageError] = useState('');
  const toolsRef = useRef(tools), pending = useRef<any>(null); toolsRef.current = tools;
  useEffect(() => () => { pending.current?.(false); }, []);
  const approve = useCallback((request: any, signal?: AbortSignal) => new Promise<boolean>((resolve, reject) => {
    const abort = () => { setApproval(null); pending.current = null; reject(new DOMException('Cancelled', 'AbortError')); };
    const finish = (allowed: boolean) => { signal?.removeEventListener('abort', abort); setApproval(null); pending.current = null; resolve(allowed); };
    if (signal?.aborted) return abort();
    signal?.addEventListener('abort', abort, { once: true }); pending.current = finish;
    setApproval({ ...request, resolve: finish });
  }), []);
  const stream = useCallback(async (params: any) => {
    const { onDone, onError, ...options } = params;
    try {
      if (resolveModelProvider(params.model, params.localModels || []).provider !== 'ollama') throw new Error('Agent mode currently requires a tool-capable Ollama model. Switch to a local model or turn Agent mode off.');
      const result = await runAgent({ ...options, tools: toolsRef.current, approve, onTrace: (run) => {
        setTrace({ ...run, steps: run.steps.map((s) => ({ ...s })) });
        if (run.status !== 'running') { try { saveAgentRun(run); setHistory(loadAgentRuns()); } catch { setStorageError('Run history could not be saved. Export the current trace before leaving.'); } }
      } });
      onDone?.({ prompt_eval_count: result.inputTokens, eval_count: result.outputTokens, total_duration: result.durationMs * 1e6, agent: true });
      return result;
    } catch (e: any) { if (params.signal?.aborted) onDone?.({ aborted: true }); else onError?.(e); }
  }, [approve]);
  return { trace, approval, history, storageError, stream, setTrace };
}
