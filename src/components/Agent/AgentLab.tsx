import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Checkbox, Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel, MenuItem, Select, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import ModelSelector from '../common/ModelSelector';
import MarkdownRenderer from '../common/MarkdownRenderer';
import { streamAnyChat } from '../../services/aiProviderService.js';
import { evaluateTask, evaluationSuite, validateSuite } from '../../agent/evaluations.js';
export default function AgentLab({ open, onClose, models, settings }: any) {
  const [tab, setTab] = useState(0), [model, setModel] = useState(settings.selectedModel || models[0]?.name || '');
  const [system, setSystem] = useState('You are a helpful, precise assistant.'), [prompt, setPrompt] = useState(''), [temperature, setTemperature] = useState(0.2), [topP, setTopP] = useState(0.9);
  const [contextWindow, setContextWindow] = useState(8192), [maxTokens, setMaxTokens] = useState(1024);
  const [response, setResponse] = useState(''), [stats, setStats] = useState<any>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [name, setName] = useState('My prompt'), [presets, setPresets] = useState<any[]>(() => { try { return JSON.parse(localStorage.getItem('llm_playground_presets') || '[]'); } catch { return []; } });
  const [selected, setSelected] = useState<string[]>([]), [suite, setSuite] = useState(JSON.stringify(evaluationSuite, null, 2));
  const [results, setResults] = useState<any[]>(() => { try { return JSON.parse(localStorage.getItem('llm_evaluation_results') || '[]'); } catch { return []; } });
  const [progress, setProgress] = useState(''); const controller = useRef<AbortController>(null);
  useEffect(() => { const stop = () => controller.current?.abort(); window.addEventListener('llm-stop-stream', stop); return () => { stop(); window.removeEventListener('llm-stop-stream', stop); }; }, []);
  async function play() {
    setBusy(true); setError(''); setResponse(''); setStats(null); controller.current = new AbortController(); const started = performance.now(); let first: number | null = null;
    try { await streamAnyChat({ model, localModels: models, settings, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }], options: { temperature, topP, contextWindow, maxTokens }, signal: controller.current.signal, onToken: (token) => { first ??= performance.now(); setResponse((text) => text + token); }, onDone: (metrics: any) => setStats({ durationMs: Math.round(performance.now() - started), firstTokenMs: first ? Math.round(first - started) : null, inputTokens: metrics.prompt_eval_count ?? null, outputTokens: metrics.eval_count ?? null, aborted: !!metrics.aborted }), onError: (e) => setError(e.message) }); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  async function evaluate() {
    setError(''); let tasks;
    try { tasks = validateSuite(JSON.parse(suite)); } catch (e: any) { setError(e.message); return; }
    setBusy(true); setResults([]); controller.current = new AbortController(); const output = [];
    try {
      for (const model of selected) for (const task of tasks) {
        if (controller.current.signal.aborted) break;
        setProgress(`${model} · ${task.name}`);
        const result = await evaluateTask(task, model, { ...settings, temperature, topP, contextWindow, maxTokens }, controller.current.signal, undefined);
        output.push(result); setResults([...output]);
      }
      localStorage.setItem('llm_evaluation_results', JSON.stringify(output));
    } catch (e: any) { setError(e.message); } finally { setBusy(false); setProgress(''); }
  }
  function savePreset() {
    const next = [{ name, system, prompt, temperature, topP, contextWindow, maxTokens, model }, ...presets.filter((p) => p.name !== name)].slice(0, 30);
    try { localStorage.setItem('llm_playground_presets', JSON.stringify(next)); setPresets(next); } catch { setError('Unable to save preset: browser storage is full.'); }
  }
  function exportResults() { const url = URL.createObjectURL(new Blob([JSON.stringify({ results, exportedAt: new Date().toISOString(), note: 'Assertion checks, not a general correctness score.' }, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'local-agent-evaluation.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  return <Dialog open={open} onClose={() => { controller.current?.abort(); onClose(); }} fullWidth maxWidth="lg">
    <DialogTitle>Prompt playground & agent evaluations</DialogTitle>
    <DialogContent><Tabs value={tab} onChange={(_, value) => setTab(value)}><Tab label="Playground" disabled={busy} /><Tab label="Evaluations" disabled={busy} /></Tabs>
      {error && <Alert severity="error">{error}</Alert>}
      <Stack direction="row" spacing={1} sx={{ my: 2, flexWrap: 'wrap' }}>
        <TextField size="small" label="Temperature" type="number" value={temperature} disabled={busy} onChange={(e) => setTemperature(Math.max(0, Math.min(2, Number(e.target.value))))} sx={{ width: 130 }} />
        <TextField size="small" label="Top P" type="number" value={topP} disabled={busy} onChange={(e) => setTopP(Math.max(0, Math.min(1, Number(e.target.value))))} sx={{ width: 110 }} />
        <TextField size="small" label="Context tokens" type="number" value={contextWindow} disabled={busy} onChange={(e) => setContextWindow(Math.max(1024, Math.min(131072, Number(e.target.value))))} sx={{ width: 150 }} />
        <TextField size="small" label="Max output tokens" type="number" value={maxTokens} disabled={busy} onChange={(e) => setMaxTokens(Math.max(32, Math.min(8192, Number(e.target.value))))} sx={{ width: 160 }} />
      </Stack>
      {tab === 0 ? <Stack spacing={2}>
        <ModelSelector onOpenSettings={undefined} value={model} onChange={setModel} variant="stacked" disabled={busy} />
        <Select size="small" disabled={busy} displayEmpty value="" onChange={(e) => { const p = presets.find((p) => p.name === e.target.value); if (p) { setSystem(p.system); setPrompt(p.prompt); setTemperature(p.temperature); setTopP(p.topP); setContextWindow(p.contextWindow); setMaxTokens(p.maxTokens); setModel(p.model); setName(p.name); } }}><MenuItem value="">Load a saved preset</MenuItem>{presets.map((p) => <MenuItem key={p.name} value={p.name}>{p.name}</MenuItem>)}</Select>
        <TextField label="System instructions" multiline minRows={2} value={system} disabled={busy} onChange={(e) => setSystem(e.target.value)} />
        <TextField label="Prompt" multiline minRows={3} value={prompt} disabled={busy} onChange={(e) => setPrompt(e.target.value)} />
        <Stack direction="row" spacing={1}><Button variant="contained" disabled={busy || !model || !prompt.trim()} onClick={play}>Run prompt</Button><TextField size="small" label="Preset name" value={name} onChange={(e) => setName(e.target.value)} /><Button disabled={!name.trim() || busy} onClick={savePreset}>Save preset</Button></Stack>
        <Box component="details"><summary>Exact input context</summary><Box component="pre" sx={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify([{ role: 'system', content: system }, { role: 'user', content: prompt }], null, 2)}</Box></Box>
        {stats && <Typography variant="caption">{stats.durationMs}ms · first token {stats.firstTokenMs ?? 'unavailable'}ms · input {stats.inputTokens ?? 'unavailable'} / output {stats.outputTokens ?? 'unavailable'} tokens {stats.aborted ? '· cancelled' : ''}</Typography>}
        <MarkdownRenderer content={response} />
      </Stack> : <Stack spacing={1.5}>
        <Alert severity="info">Each model runs the same in-memory fixtures. Only file inspection and draft proposals are allowed; there are no host commands or network tools. Results measure the displayed checks, not general code correctness. Generated tests are not executed.</Alert>
        <Stack direction="row" sx={{ flexWrap: 'wrap' }}>{models.map((m) => <FormControlLabel key={m.name} label={m.name} control={<Checkbox disabled={busy} checked={selected.includes(m.name)} onChange={(e) => setSelected(e.target.checked ? [...selected, m.name] : selected.filter((name) => name !== m.name))} />} />)}</Stack>
        <Box component="details"><summary>Edit task fixtures and explicit assertions</summary><TextField fullWidth multiline minRows={8} maxRows={18} value={suite} disabled={busy} onChange={(e) => setSuite(e.target.value)} slotProps={{ htmlInput: { 'aria-label': 'Evaluation suite JSON' } }} /></Box>
        <Stack direction="row" spacing={1}><Button variant="contained" disabled={busy || !selected.length} onClick={evaluate}>Run evaluation suite</Button><Button disabled={!results.length || busy} onClick={() => { try { exportResults(); } catch { setError('Suite JSON is invalid.'); } }}>Export results</Button></Stack>
        {progress && <Typography>{progress}</Typography>}
        <Box sx={{ overflowX: 'auto' }}><Box component="table" sx={{ width: '100%', textAlign: 'left', '& td, & th': { p: 1, borderBottom: 1, borderColor: 'divider' } }}><thead><tr><th>Model</th><th>Checks passed</th><th>Mean duration</th><th>Output tokens</th></tr></thead><tbody>{[...new Set(results.map((r) => r.model))].map((name) => { const rows = results.filter((r) => r.model === name); return <tr key={name}><td>{name}</td><td>{rows.filter((r) => r.passed).length}/{rows.length}</td><td>{(rows.reduce((sum, r) => sum + (r.durationMs || 0), 0) / rows.length / 1000).toFixed(1)}s</td><td>{rows.some((r) => r.outputTokens === null) ? 'unavailable' : rows.reduce((sum, r) => sum + r.outputTokens, 0)}</td></tr>; })}</tbody></Box></Box>
        {results.map((r, i) => <Box component="details" key={i}><summary>{r.model} · {r.task} · {r.passed ? 'check passed' : r.status === 'completed' ? 'check failed' : r.status}</summary><Box component="pre" sx={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(r, null, 2)}</Box></Box>)}
      </Stack>}
    </DialogContent><DialogActions>{busy && <Button color="error" onClick={() => controller.current?.abort()}>Stop run</Button>}<Button onClick={() => { controller.current?.abort(); onClose(); }}>Close</Button></DialogActions>
  </Dialog>;
}
