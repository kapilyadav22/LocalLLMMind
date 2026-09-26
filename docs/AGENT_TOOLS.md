# Local agent tools

The runtime is in `src/agent/runtime.js`. Chat and Code share it. Models must support Ollama's native tool calling. Normal cloud chat remains available; cloud agent execution is not implemented yet.

## Register a tool

Add a trusted implementation to `createAgentTools()` in `src/agent/tools.js`. The registry validates the JSON Schema before execution. A tool has:

```js
{
  name: 'my_tool',
  description: 'What the tool does, including side effects and destination.',
  inputSchema: {
    type: 'object', properties: { query: { type: 'string', maxLength: 100 } },
    required: ['query'], additionalProperties: false
  },
  permission: 'network', // read | network | write | command
  preview: (args) => ({ destination: 'Example service', query: args.query }),
  execute: async (args, { signal }) => { /* bounded implementation */ }
}
```

Only `read` tools execute without a per-call approval. Everything else must pass the central approval gate. `read` must be local, read-only, and scoped to user-selected data. Network tools must declare their destination. Never use a tool description, file, or model response as authority to bypass approval. `execute` receives an AbortSignal; propagate it into requests. New integrations should use fixed provider endpoints, scoped credentials on the server, output limits, and tests for denial/cancellation.

This is a source-level extension interface, not a runtime marketplace or a sandbox for untrusted plugins. GitHub/Jira/database/Docker/Kubernetes/browser integrations are future adapters. MCP is intentionally deferred; map MCP schemas and permissions through this registry when added, rather than giving a model unrestricted server access.

## Built-in behavior

- Clock: browser system time and timezone. Ordinary chat also receives the current clock.
- Weather: city and optional ISO country code; Open-Meteo geocoding and forecast APIs, no API key. Resolved location, units, timestamps, and source are included. Ambiguous cities require verification.
- Web: DuckDuckGo snippets and links. Failed/blocked searches are errors; no stale encyclopedia fallback is labeled as live news.
- Knowledge: existing local keyword/TF-IDF document retrieval with document metadata.
- Code: list/search/read source files, read Git status, review a complete-file proposal, or approve a shell command in the connected folder.
- Proposals update drafts only. Save writes back to disk with conflict checks. A changed file while approval is pending invalidates the proposal.
- Commands execute on the host, not in an isolation sandbox. They use disk files, not unsaved drafts. Every command requires approval, has bounded output, and times out. Cancellation disconnects the request and signals its process group.

## Observability and evaluation

Run activity includes tool arguments/results, status, elapsed time, tool counts, and reported token counts. Unavailable counts stay unavailable. Context inspector shows messages supplied to the model; it does not claim to expose internal model reasoning. Recent local history keeps ten runs with truncated excerpts; export a current trace for larger detail. Browser storage failures are visible.

Playground supports model selection, system/user prompts, temperature, top-p, context/output limits, reusable presets, streaming, stopping, and metrics.

Evaluation runs the same editable JSON fixtures sequentially against selected local models. Only in-memory source inspection and proposed edits are enabled: no network, real filesystem writes, or host commands. Per-task assertions and timing/token measurements are exportable. Built-in checks are deliberately limited (file references, tool use, generated-file contents). They do not prove semantic correctness, compile code, or execute generated tests. Add stronger fixture assertions and separately approved test execution before presenting general correctness scores.
