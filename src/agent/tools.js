import { objectSchema, textSchema } from './toolRegistry.js';
import { localAction } from '../services/localControlService.js';
import { searchProject } from '../utils/projectSearch.js';
import { validateFilePath } from '../shared/projectValidation.js';
export function clockContext() {
  return { iso: new Date().toISOString(), local: new Date().toLocaleString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
}
export function createAgentTools({ getProject, applyFile, knowledgeSearch } = {}) {
  const tools = [
    { name: 'current_datetime', description: 'Read the current date, time, and user timezone from the system clock.', permission: 'read', inputSchema: objectSchema(), execute: () => clockContext() },
    { name: 'web_search', description: 'Search the live web implicitly for current facts, information, documentation, and news. Cite returned URLs; snippets can be incomplete or outdated.', permission: 'read', inputSchema: objectSchema({ query: textSchema(300) }), execute: (args, ctx) => localAction('tools/live', { name: 'web_search', arguments: args }, true, ctx.signal) },
    { name: 'weather', description: 'Fetch current weather and today forecast via Open-Meteo for a city supplied by the user. Ask for location when absent; verify ambiguous locations.', permission: 'read', inputSchema: objectSchema({ city: textSchema(120), countryCode: { type: 'string', pattern: '^[A-Za-z]{2}$' } }, ['city']), execute: (args, ctx) => localAction('tools/live', { name: 'weather', arguments: args }, true, ctx.signal) },
  ];
  if (knowledgeSearch) tools.push({ name: 'knowledge_search', description: 'Search the user’s local document library; cite document titles and quote only relevant excerpts.', permission: 'read', inputSchema: objectSchema({ query: textSchema() }), execute: ({ query }) => knowledgeSearch(query) });
  if (!getProject) return tools;
  async function folderId() {
    const project = getProject();
    if (!project.connectedPath) throw new Error('Connect a local project folder before using Git or commands.');
    if (project.diskConflicts?.length) throw new Error('Resolve disk conflicts first.');
    return (await localAction('folders/connect', { path: project.connectedPath })).id;
  }
  tools.push(
    { name: 'list_files', description: 'List project source paths. Dependency/build folders and binary assets are excluded.', permission: 'read', inputSchema: objectSchema(), execute: () => ({ project: getProject().name, files: getProject().files.map((f) => f.path) }) },
    { name: 'file_search', description: 'Search source text across the project, including unsaved drafts.', permission: 'read', inputSchema: objectSchema({ query: textSchema(), pathFilter: { type: 'string', maxLength: 240 } }, ['query']), execute: ({ query, pathFilter }) => searchProject(getProject().files, query, { pathFilter, limit: 80 }) },
    { name: 'read_file', description: 'Read a source file with display-only line numbers, up to 250 lines per call. Line-number prefixes are NOT part of the source.', permission: 'read', inputSchema: objectSchema({ path: textSchema(240), startLine: { type: 'integer', minimum: 1 }, endLine: { type: 'integer', minimum: 1 } }, ['path']), execute: ({ path, startLine = 1, endLine = startLine + 249 }) => {
      const file = getProject().files.find((f) => f.path === path); if (!file) throw new Error('File not found.');
      const lines = file.content.split('\n'); return { path, totalLines: lines.length, content: lines.slice(startLine - 1, Math.min(endLine, startLine + 249)).map((line, i) => `${startLine + i}: ${line}`).join('\n').slice(0, 24000) };
    } },
    { name: 'git_status', description: 'Read branch and changed-file status from the connected Git repository.', permission: 'read', inputSchema: objectSchema(), execute: async (_, ctx) => localAction('tools/git-status', { folderId: await folderId() }, true, ctx.signal) },
    { name: 'propose_file', description: 'Propose complete raw source for a replacement or new file, without line-number prefixes or Markdown fences. Requires user review before changing the editor draft. Does not save to disk.', permission: 'write', inputSchema: objectSchema({ path: textSchema(240), content: { type: 'string', maxLength: 100000 }, reason: textSchema(1000) }), preview: ({ path, content }) => ({ before: getProject().files.find((f) => f.path === path)?.content ?? '(New file)', after: content }), execute: async ({ path, content }, ctx) => { validateFilePath(path); if ((getProject().files.find((f) => f.path === path)?.content ?? '(New file)') !== ctx.preview.before) throw new Error('File changed while awaiting approval. Review a new proposal.'); await applyFile(path, content, ctx); return { updatedDraft: path, savedToDisk: false, nextStep: 'User must press Save to persist changes to the original folder.' }; } },
    { name: 'run_command', description: 'Run a shell command in the connected project directory, with explicit approval for every call. Runs on the host with user permissions; can change files. Reads disk files, not unsaved editor drafts. Timeout 60 seconds.', permission: 'command', inputSchema: objectSchema({ command: textSchema(2000) }), preview: () => ({ workingDirectory: getProject().connectedPath || '(Not connected)' }), execute: async ({ command }, ctx) => {
      const project = getProject();
      return localAction('projects/run', { folderId: await folderId(), projectId: project.id, files: project.files, systemAccess: true, command }, true, ctx.signal);
    } },
  );
  return tools;
}
