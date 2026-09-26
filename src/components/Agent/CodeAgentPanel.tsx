import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import { createAgentTools } from '../../agent/tools.js';
import { useAgentRuntime } from '../../hooks/useAgentRuntime';
import AgentActivity from './AgentActivity';
import MarkdownRenderer from '../common/MarkdownRenderer';
import ModelSelector from '../common/ModelSelector';
export default function CodeAgentPanel({ project, settings, models, initialModel, onApplyFile, onBusy }: any) {
  const latest = useRef(project); latest.current = project;
  const apply = useRef(onApplyFile); apply.current = onApplyFile;
  const [prompt, setPrompt] = useState(''), [model, setModel] = useState(initialModel), [response, setResponse] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const controller = useRef<AbortController>(null);
  const runtime = useAgentRuntime(createAgentTools({ getProject: () => latest.current, applyFile: (path, content) => apply.current(path, content) }));
  useEffect(() => { const stop = () => controller.current?.abort(); window.addEventListener('llm-stop-stream', stop); return () => { stop(); onBusy(false); window.removeEventListener('llm-stop-stream', stop); }; }, [onBusy]);
  async function run() {
    setBusy(true); onBusy(true); setError(''); setResponse(''); controller.current = new AbortController();
    try { await runtime.stream({ model, localModels: models, settings, messages: [{ role: 'user', content: `Project: ${project.name}\nSource files: ${project.files.length}. Inspect with tools; do not assume structure.\n${prompt}` }], signal: controller.current.signal, onToken: (token: string) => setResponse((old) => old + token), onError: (e: Error) => setError(e.message) }); }
    finally { setBusy(false); onBusy(false); }
  }
  return <Stack spacing={1.5}>
    <Typography variant="subtitle2">Local developer agent</Typography>
    <Typography variant="caption" color="text.secondary">Inspect files and Git, investigate bugs, and propose fixes. Commands and file changes require approval. Use a tool-capable Ollama model.</Typography>
    <ModelSelector onOpenSettings={undefined} value={model} onChange={setModel} disabled={busy} variant="stacked" />
    <TextField label="Ask the project agent" multiline minRows={3} value={prompt} disabled={busy} onChange={(e) => setPrompt(e.target.value)} placeholder="Analyze this project and report likely bugs with file references." />
    {busy ? <Button color="error" onClick={() => controller.current?.abort()}>Stop agent</Button> : <Button variant="contained" disabled={!prompt.trim() || !model} onClick={run}>Run agent</Button>}
    {error && <Alert severity="error">{error}</Alert>}
    <AgentActivity runtime={runtime} />
    {response && <Box sx={{ overflowWrap: 'anywhere' }}><MarkdownRenderer content={response} /></Box>}
  </Stack>;
}
