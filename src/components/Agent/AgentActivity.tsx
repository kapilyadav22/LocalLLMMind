import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Typography,
  MenuItem,
  Select,
  IconButton,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

export default function AgentActivity({ runtime, compact = false, visible = true, onToggleVisibility }: any) {
  const { trace, approval, history = [], storageError } = runtime;
  const [selected, setSelected] = useState('');
  const run = selected ? history.find((r: any) => r.id === selected) || trace : trace;
  const theme = useTheme();

  function exportRun() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(run, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-${run.id}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <>
      {visible && (
        <Box
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            p: 1.25,
            px: 2,
            maxHeight: compact ? 220 : 420,
            overflow: 'auto',
            bgcolor: alpha(theme.palette.background.paper, 0.75),
            transition: 'all 0.2s ease',
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', mb: 0.75 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.82rem' }}>
                ⚡ Agent activity
              </Typography>
              <Select
                size="small"
                displayEmpty
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                inputProps={{ 'aria-label': 'Agent run history' }}
                sx={{ fontSize: 11, maxWidth: 230, height: 26 }}
              >
                <MenuItem value="">Current run</MenuItem>
                {history.map((item: any) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.model} · {new Date(item.startedAt).toLocaleTimeString()} · {item.status}
                  </MenuItem>
                ))}
              </Select>
              {run && (
                <Button size="small" variant="outlined" onClick={exportRun} sx={{ height: 24, fontSize: '0.7rem', textTransform: 'none', py: 0 }}>
                  Export trace
                </Button>
              )}
            </Stack>

            {onToggleVisibility && (
              <Tooltip title="Hide agent activity (toggle in toolbar)">
                <IconButton size="small" onClick={onToggleVisibility} sx={{ color: 'text.secondary', p: '2px' }}>
                  <X size={14} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>

          {storageError && <Alert severity="warning" sx={{ mb: 1, py: 0 }}>{storageError}</Alert>}
          {!run && (
            <Typography variant="caption" color="text.secondary">
              Implicit web search, tool calls, and run metrics appear here in real time.
            </Typography>
          )}
          {run && (
            <>
              <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 500, color: 'text.secondary' }}>
                {run.model} · <strong style={{ color: run.status === 'completed' ? '#10b981' : undefined }}>{run.status}</strong> · {(run.durationMs / 1000).toFixed(1)}s · input {run.inputTokens ?? 'unavailable'} / output {run.outputTokens ?? 'unavailable'} tokens
              </Typography>
              {run.error && <Alert severity="warning" sx={{ mb: 0.75, py: 0 }}>{run.error}</Alert>}
              {run.steps?.map((step: any, i: number) => (
                <Box component="details" key={i} sx={{ py: 0.25, fontSize: 12, '& summary': { cursor: 'pointer', fontWeight: 500 } }}>
                  <summary>{step.name} · {step.status} · {step.durationMs}ms</summary>
                  <Box component="pre" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: 200, overflow: 'auto', bgcolor: alpha(theme.palette.text.primary, 0.04), p: 1, borderRadius: 1, my: 0.5 }}>
                    {JSON.stringify(step.arguments, null, 2)}{'\n'}{step.output}
                  </Box>
                </Box>
              ))}
              <Box component="details" sx={{ fontSize: 12, '& summary': { cursor: 'pointer', fontWeight: 500 } }}>
                <summary>Context inspector · {run.context?.length || 0} messages {run.contextTruncatedForStorage ? '(saved excerpts)' : ''}</summary>
                <Box component="pre" sx={{ whiteSpace: 'pre-wrap', maxHeight: 240, overflow: 'auto', bgcolor: alpha(theme.palette.text.primary, 0.04), p: 1, borderRadius: 1, my: 0.5 }}>
                  {JSON.stringify(run.context, null, 2)}
                </Box>
              </Box>
              <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', mt: 0.75 }}>
                {Object.entries(run.toolCounts || {}).map(([name, count]) => (
                  <Chip key={name} size="small" label={`${name}: ${count}`} sx={{ height: 18, fontSize: '0.66rem' }} />
                ))}
              </Stack>
            </>
          )}
        </Box>
      )}

      {/* Approval modal dialog remains rendered and active even when the activity box is hidden */}
      <Dialog open={!!approval} fullWidth maxWidth="md" onClose={() => approval?.resolve(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Approve {approval?.name}?</DialogTitle>
        <DialogContent>
          <Alert severity={approval?.permission === 'network' ? 'info' : approval?.permission === 'command' ? 'warning' : 'info'} sx={{ mb: 1.5 }}>
            {approval?.permission === 'network'
              ? 'This sends the displayed query to an external service.'
              : approval?.permission === 'command'
              ? 'This command runs on your computer and can modify files or access the network. Review it carefully.'
              : 'This replaces the editor draft after your approval. Save to disk remains a separate action.'}
          </Alert>
          <Typography sx={{ mt: 1, mb: 1 }} variant="body2">{approval?.description}</Typography>
          <Box component="pre" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: 250, overflow: 'auto', bgcolor: 'action.hover', p: 1, borderRadius: 1 }}>
            {JSON.stringify(approval?.arguments, null, 2)}
          </Box>
          {approval?.preview && (
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 1.5 }}>
              {Object.entries(approval.preview).map(([name, value]) => (
                <Box key={name} sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>{name}</Typography>
                  <Box component="pre" sx={{ fontSize: 12, whiteSpace: 'pre-wrap', height: 180, overflow: 'auto', bgcolor: 'action.hover', p: 1, borderRadius: 1 }}>
                    {String(value)}
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => approval?.resolve(false)}>Deny</Button>
          <Button variant="contained" onClick={() => approval?.resolve(true)}>Approve once</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
