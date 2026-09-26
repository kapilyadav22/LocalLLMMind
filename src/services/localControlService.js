let sessionToken, statusRequest;
export async function localStatus() {
  const response = await fetch('/local-api/status', { signal: AbortSignal.timeout(5000) });
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('Desktop controls require running this app locally with npm run dev or npm run preview.');
  }
  const status = await response.json(); sessionToken = status.token; return status;
}
export async function localAction(action, body = {}, retry = true, signal = undefined) {
  if (!sessionToken) {
    statusRequest ||= localStatus().finally(() => { statusRequest = null; });
    await statusRequest;
  }
  const response = await fetch(`/local-api/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-LocalLLMMind-Token': sessionToken },
    body: JSON.stringify(body),
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(action === 'projects/run' ? 75000 : 45000)]) : AbortSignal.timeout(action === 'projects/run' ? 75000 : 45000),
  });
  if (response.status === 403 && retry) { sessionToken = null; return localAction(action, body, false, signal); }
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Local server is unavailable. Restart npm run dev and reconnect.');
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Local action failed.');
  return result;
}
export function isDefaultLocalOllama(url) {
  return !url || ['http://localhost:11434', 'http://127.0.0.1:11434'].includes(url.trim().replace(/\/+$/, ''));
}
