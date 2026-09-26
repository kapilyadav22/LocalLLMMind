const key = 'localllmmind_agent_runs_v1';
export function loadAgentRuns() { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } }
export function saveAgentRun(run) {
  const compact = { ...run, response: run.response?.slice(0, 30000), steps: run.steps.map((step) => ({ ...step, arguments: JSON.stringify(step.arguments || {}).slice(0, 2000), output: step.output?.slice(0, 2000) })), context: run.context.slice(-12).map((m) => ({ ...m, content: m.content.slice(0, 3000) })), contextTruncatedForStorage: true };
  localStorage.setItem(key, JSON.stringify([compact, ...loadAgentRuns().filter((r) => r.id !== run.id)].slice(0, 10)));
}
