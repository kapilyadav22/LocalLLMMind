import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, IconButton, MenuItem, Select, Stack, Typography, Tooltip } from '@mui/material';
import { Plus, Square, X, Eraser } from 'lucide-react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { localAction } from '../../services/localControlService';

function TerminalSurface({ session, onError }) {
  const host = useRef(null);
  useEffect(() => {
    let alive = true, timer, cursor = 0, chain = Promise.resolve();
    const terminal = new Terminal({ fontSize: 12, cursorBlink: true, scrollback: 3000, screenReaderMode: true, theme: { background: '#0d1117', foreground: '#c9d1d9' } });
    const fit = new FitAddon(); terminal.loadAddon(fit); terminal.open(host.current);
    const size = () => { if (!alive || !host.current?.clientWidth) return; fit.fit(); localAction('terminals/resize', { id: session.id, cols: terminal.cols, rows: terminal.rows }).catch((error) => alive && onError(error.message)); };
    const observer = new ResizeObserver(size); observer.observe(host.current); size();
    const input = terminal.onData((data) => {
      chain = chain.then(() => alive && localAction('terminals/input', { id: session.id, input: data })).catch((error) => alive && onError(error.message));
    });
    async function poll() {
      try {
        const result = await localAction('terminals/read', { id: session.id, cursor });
        if (!alive) return;
        if (result.truncated) terminal.writeln('\r\n[Older output was trimmed]\r\n');
        if (result.output) terminal.write(result.output);
        cursor = result.cursor;
        if (result.exited) { terminal.writeln(`\r\n[Process exited: ${result.exitCode}]`); return; }
        timer = setTimeout(poll, 300);
      } catch (error) { if (alive) onError(error.message); }
    }
    poll();
    return () => { alive = false; clearTimeout(timer); observer.disconnect(); input.dispose(); terminal.dispose(); };
  }, [session.id, onError]);
  return <Box ref={host} aria-label="Interactive project terminal" sx={{ flex: 1, minHeight: 100, overflow: 'hidden', p: 0.5 }} />;
}

export default function PersistentTerminal({ projectId, prepareFolder, connectedPath }) {
  const [sessions, setSessions] = useState([]), [active, setActive] = useState('');
  const [error, setError] = useState(''), [creating, setCreating] = useState(false);
  const [replay, setReplay] = useState(0);
  useEffect(() => {
    let alive = true;
    localAction('terminals/list', { projectId }).then(({ sessions }) => { if (alive) { setSessions(sessions); setActive(sessions[0]?.id || ''); } }).catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [projectId]);
  async function create() {
    setCreating(true); setError('');
    try {
      const folderId = await prepareFolder();
      const session = await localAction('terminals/create', { folderId, projectId });
      setSessions((items) => [...items, session]); setActive(session.id);
    } catch (e) { setError(e.message); }
    finally { setCreating(false); }
  }
  async function close() {
    try { await localAction('terminals/close', { id: active }); const next = sessions.filter((s) => s.id !== active); setSessions(next); setActive(next[0]?.id || ''); }
    catch (e) { setError(e.message); }
  }
  const session = sessions.find((s) => s.id === active);
  return <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', px: 1, py: 0.5 }}>
      {sessions.length > 0 && <Select size="small" value={active} inputProps={{ 'aria-label': 'Terminal session' }} onChange={(e) => setActive(e.target.value)} sx={{ minWidth: 125, fontSize: 12 }}>{sessions.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}</Select>}
      <Button size="small" startIcon={<Plus size={14} />} disabled={creating} onClick={create}>{creating ? 'Starting…' : 'New terminal'}</Button>
      {session && <>
        <Tooltip title="Interrupt foreground process (Ctrl+C)"><IconButton aria-label="Stop running command" size="small" onClick={() => localAction('terminals/input', { id: active, input: '\u0003' }).catch((e) => setError(e.message))}><Square size={14} /></IconButton></Tooltip>
        <Tooltip title="Reconnect output"><IconButton aria-label="Reconnect terminal output" size="small" onClick={() => { setError(''); setReplay((n) => n + 1); }}><Eraser size={14} /></IconButton></Tooltip>
        <Tooltip title="Terminate this shell"><IconButton aria-label="Terminate terminal session" size="small" onClick={close}><X size={14} /></IconButton></Tooltip>
      </>}
    </Stack>
    {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
    {session ? <TerminalSurface key={`${active}:${replay}`} session={session} onError={setError} /> : <Box sx={{ p: 2 }}>
      <Typography variant="body2">Start an interactive shell in {connectedPath || 'a saved project working folder'}.</Typography>
      <Typography variant="caption" color="text.secondary">Commands run on your computer. New terminals save current edits first. Sessions keep running when this panel closes, until terminated or the app server stops.</Typography>
    </Box>}
  </Box>;
}
