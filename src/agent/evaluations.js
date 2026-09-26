import { runAgent } from './runtime.js';
import { createAgentTools } from './tools.js';
export const evaluationSuite = [
  { name: 'Locate authentication', prompt: 'Inspect the project. Which file implements authentication? Cite the file.', files: [{ path: 'src/login.ts', content: 'export function authenticate(token: string) { return token === "demo"; }' }, { path: 'README.md', content: '# Example project' }], checks: { tool: 'read_file', answerIncludes: 'src/login.ts' } },
  { name: 'Explain database schema', prompt: 'Read the SQL schema and name the orders table primary key.', files: [{ path: 'db/schema.sql', content: 'CREATE TABLE orders (order_id INTEGER PRIMARY KEY, amount DECIMAL NOT NULL);' }], checks: { tool: 'read_file', answerIncludes: 'order_id' } },
  { name: 'Find unused method', prompt: 'Read all files. Name the function that has no call sites.', files: [{ path: 'src/app.js', content: 'function legacyPrinter() { return "old"; }\nfunction main() { return "new"; }\nmain();' }], checks: { tool: 'read_file', answerIncludes: 'legacyPrinter' } },
  { name: 'Generate unit test', prompt: 'Read sum.js and propose a Node test file tests/sum.test.js using node:assert. Verify sum(2, 3) equals 5.', files: [{ path: 'sum.js', content: 'export const sum = (a, b) => a + b;' }], checks: { tool: 'propose_file', file: 'tests/sum.test.js', fileIncludes: 'node:assert' } },
  { name: 'Repair syntax fixture', prompt: 'Read src/config.js. Fix its unclosed object by proposing the complete corrected file.', files: [{ path: 'src/config.js', content: 'export const config = { enabled: true;' }], checks: { tool: 'propose_file', file: 'src/config.js', fileIncludes: '}' } },
];
export function validateSuite(suite) {
  if (!Array.isArray(suite) || !suite.length || suite.length > 20) throw new Error('Provide 1–20 evaluation tasks.');
  for (const task of suite) {
    if (typeof task.name !== 'string' || typeof task.prompt !== 'string' || !Array.isArray(task.files) || !task.checks || !Object.keys(task.checks).length) throw new Error('Each task needs name, prompt, files, and checks.');
    if (JSON.stringify(task).length > 50000 || task.files.some((f) => typeof f.path !== 'string' || typeof f.content !== 'string')) throw new Error('Invalid or oversized fixture.');
    const allowed = ['tool', 'answerIncludes', 'file', 'fileIncludes'];
    if (Object.keys(task.checks).some((key) => !allowed.includes(key) || typeof task.checks[key] !== 'string') || (task.checks.fileIncludes && !task.checks.file)) throw new Error('Checks support string fields: tool, answerIncludes, file, fileIncludes.');
  }
  return suite;
}
export function checkEvaluation(task, run, files) {
  const checks = task.checks;
  return run.status === 'completed' && (!checks.tool || run.steps.some((s) => s.name === checks.tool && s.status === 'completed')) && (!checks.answerIncludes || run.response.toLowerCase().includes(checks.answerIncludes.toLowerCase())) && (!checks.file || files.some((f) => f.path === checks.file && (!checks.fileIncludes || f.content.includes(checks.fileIncludes))));
}
export async function evaluateTask(task, model, settings, signal, onTrace, runner = runAgent) {
  const started = Date.now();
  const evidence = { evaluatedAt: new Date().toISOString(), fixture: structuredClone(task), parameters: { temperature: settings.temperature, topP: settings.topP, contextWindow: settings.contextWindow, maxTokens: settings.maxTokens } };
  let project = { name: task.name, files: structuredClone(task.files) };
  const tools = createAgentTools({ getProject: () => project, applyFile: (path, content) => { project = { ...project, files: [...project.files.filter((f) => f.path !== path), { path, content }] }; } }).filter((tool) => ['list_files', 'read_file', 'file_search', 'propose_file'].includes(tool.name));
  let trace;
  try {
    trace = await runner({ model, settings, messages: [{ role: 'user', content: task.prompt }], tools, signal, approve: async () => true, onTrace: (run) => { trace = run; onTrace?.(run); }, maxSteps: 6 });
    return { ...evidence, task: task.name, model, passed: checkEvaluation(task, trace, project.files), status: trace.status, durationMs: trace.durationMs, inputTokens: trace.inputTokens, outputTokens: trace.outputTokens, checks: task.checks, response: trace.response, toolCounts: trace.toolCounts };
  } catch (e) { return { ...evidence, task: task.name, model, passed: false, status: signal?.aborted ? 'cancelled' : 'failed', error: e.message, durationMs: trace?.durationMs ?? Date.now() - started, inputTokens: trace?.inputTokens ?? null, outputTokens: trace?.outputTokens ?? null }; }
}
