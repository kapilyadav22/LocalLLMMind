export async function localStatus() {
  const response = await fetch('/local-api/status', { signal: AbortSignal.timeout(5000) });
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('Desktop controls require running this app locally with npm run dev or npm run preview.');
  }
  return response.json();
}
export async function localAction(action, body = {}) {
  const status = await localStatus();
  const response = await fetch(`/local-api/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-LocalLLMMind-Token': status.token },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Local action failed.');
  return result;
}
export function isDefaultLocalOllama(url) {
  return !url || ['http://localhost:11434', 'http://127.0.0.1:11434'].includes(url.trim().replace(/\/+$/, ''));
}
