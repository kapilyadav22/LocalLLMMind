import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Stack,
  Chip,
  Tabs,
  Tab,
  CircularProgress,
  InputBase,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Terminal as TerminalIcon,
  Play,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  Maximize2,
  Minimize2,
  CornerDownLeft,
  Shield,
  ShieldAlert,
  ShieldCheck,
  GripHorizontal,
} from 'lucide-react';



export default function CodeConsoleDrawer({
  open,
  onClose,
  onClear,
  onRerun,
  logs = [],
  executionInfo = {},
  busy = false,
  fileName = '',
  terminalHistory = [],
  onExecuteCommand,
  terminalBusy = false,
}) {
  const theme = useTheme();
  const [tab, setTab] = useState('terminal');
  const [commandInput, setCommandInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [commandList, setCommandList] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [drawerHeight, setDrawerHeight] = useState(() => {
    const saved = localStorage.getItem('localllmmind_terminal_height');
    return saved ? Math.max(160, Math.min(800, parseInt(saved, 10))) : 280;
  });
  const [isDraggingHeight, setIsDraggingHeight] = useState(false);

  // System access permission state
  const [hasSystemPermission, setHasSystemPermission] = useState(() => {
    return localStorage.getItem('localllmmind_terminal_permission') === 'granted';
  });
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [pendingCommand, setPendingCommand] = useState('');

  const terminalBottomRef = useRef(null);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(280);

  useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalHistory, logs, tab]);

  // Handle vertical drag resize
  const handleDragStart = useCallback((e) => {
    e.preventDefault();
    setIsDraggingHeight(true);
    dragStartY.current = e.clientY;
    dragStartHeight.current = drawerHeight;

    function handleMouseMove(moveEvent) {
      const delta = dragStartY.current - moveEvent.clientY;
      const maxHeight = window.innerHeight * 0.85;
      const nextHeight = Math.max(160, Math.min(maxHeight, dragStartHeight.current + delta));
      setDrawerHeight(nextHeight);
    }

    function handleMouseUp() {
      setIsDraggingHeight(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setDrawerHeight((finalHeight) => {
        localStorage.setItem('localllmmind_terminal_height', String(Math.round(finalHeight)));
        return finalHeight;
      });
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [drawerHeight]);

  if (!open) return null;

  const isWeb = Boolean(executionInfo.isWeb && executionInfo.html);
  const exitCode = executionInfo.exitCode ?? 0;
  const durationMs = executionInfo.durationMs ?? 0;

  function executeWithPermission(cmd) {
    if (!cmd || terminalBusy) return;
    setCommandList((prev) => [...prev, cmd]);
    setHistoryIndex(-1);
    setCommandInput('');

    if (!hasSystemPermission) {
      setPendingCommand(cmd);
      setPermissionDialogOpen(true);
      return;
    }

    onExecuteCommand?.(cmd, { systemAccess: true });
  }

  function handleGrantPermission() {
    setHasSystemPermission(true);
    localStorage.setItem('localllmmind_terminal_permission', 'granted');
    setPermissionDialogOpen(false);
    if (pendingCommand) {
      onExecuteCommand?.(pendingCommand, { systemAccess: true });
      setPendingCommand('');
    }
  }

  function handleDenyPermission() {
    setPermissionDialogOpen(false);
    if (pendingCommand) {
      // Execute in restricted non-shell mode
      onExecuteCommand?.(pendingCommand, { systemAccess: false });
      setPendingCommand('');
    }
  }

  function handleSubmitCommand(e) {
    e?.preventDefault();
    const cmd = commandInput.trim();
    if (!cmd) return;
    executeWithPermission(cmd);
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!commandList.length) return;
      const nextIndex = historyIndex === -1 ? commandList.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setCommandInput(commandList[nextIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= commandList.length) {
        setHistoryIndex(-1);
        setCommandInput('');
      } else {
        setHistoryIndex(nextIndex);
        setCommandInput(commandList[nextIndex]);
      }
    }
  }

  return (
    <Box
      sx={{
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: '#0d1117',
        color: '#c9d1d9',
        height: isExpanded ? '65vh' : `${drawerHeight}px`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.45)',
        position: 'relative',
        transition: isDraggingHeight ? 'none' : 'height 0.15s ease',
      }}
    >
      {/* Draggable resize bar on top */}
      <Box
        onMouseDown={handleDragStart}
        sx={{
          height: 6,
          cursor: 'ns-resize',
          bgcolor: isDraggingHeight ? 'primary.main' : 'transparent',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 0.15s',
          '&:hover': {
            bgcolor: 'primary.main',
          },
        }}
      >
        <GripHorizontal size={14} style={{ opacity: 0.4, color: '#c9d1d9' }} />
      </Box>

      {/* Header bar */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          px: 2,
          py: 0.5,
          bgcolor: '#161b22',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          minHeight: 38,
          mt: '4px',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              minHeight: 32,
              '& .MuiTab-root': {
                minHeight: 32,
                py: 0,
                px: 1.5,
                fontSize: '0.75rem',
                color: '#8b949e',
                fontWeight: 600,
                textTransform: 'none',
                gap: 0.75,
                '&.Mui-selected': { color: '#f0f6fc' },
              },
            }}
          >
            <Tab value="terminal" label="Terminal" icon={<TerminalIcon size={13} />} iconPosition="start" />
            <Tab value="console" label={`Run Output ${fileName ? `(${fileName})` : ''}`} icon={<Play size={12} />} iconPosition="start" />
            {isWeb && <Tab value="preview" label="Web Preview" icon={<Eye size={13} />} iconPosition="start" />}
          </Tabs>

          {/* System access permission indicator badge */}
          {tab === 'terminal' && (
            <Tooltip title={hasSystemPermission ? 'System access granted. Click to manage permissions.' : 'Restricted sandbox. Click to grant system access.'}>
              <Chip
                size="small"
                icon={hasSystemPermission ? <ShieldCheck size={11} color="#3fb950" /> : <ShieldAlert size={11} color="#d29922" />}
                label={hasSystemPermission ? 'System Access' : 'Permission Required'}
                onClick={() => setPermissionDialogOpen(true)}
                sx={{
                  height: 20,
                  fontSize: '0.68rem',
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                  bgcolor: hasSystemPermission ? alpha('#3fb950', 0.15) : alpha('#d29922', 0.15),
                  color: hasSystemPermission ? '#3fb950' : '#d29922',
                  border: '1px solid',
                  borderColor: hasSystemPermission ? alpha('#3fb950', 0.3) : alpha('#d29922', 0.3),
                }}
              />
            </Tooltip>
          )}

          {tab === 'console' && (
            busy ? (
              <Chip
                size="small"
                icon={<CircularProgress size={10} color="inherit" />}
                label="Running…"
                sx={{ height: 20, fontSize: '0.68rem', bgcolor: alpha('#58a6ff', 0.2), color: '#58a6ff' }}
              />
            ) : exitCode === 0 ? (
              <Chip
                size="small"
                icon={<CheckCircle2 size={11} color="#3fb950" />}
                label={`Exit 0 · ${durationMs}ms`}
                sx={{ height: 20, fontSize: '0.68rem', bgcolor: alpha('#3fb950', 0.15), color: '#3fb950' }}
              />
            ) : (
              <Chip
                size="small"
                icon={<AlertCircle size={11} color="#f85149" />}
                label={`Exit ${exitCode} · ${durationMs}ms`}
                sx={{ height: 20, fontSize: '0.68rem', bgcolor: alpha('#f85149', 0.15), color: '#f85149' }}
              />
            )
          )}

          {tab === 'terminal' && terminalBusy && (
            <Chip
              size="small"
              icon={<CircularProgress size={10} color="inherit" />}
              label="Executing…"
              sx={{ height: 20, fontSize: '0.68rem', bgcolor: alpha('#58a6ff', 0.2), color: '#58a6ff' }}
            />
          )}
        </Stack>

        <Stack direction="row" spacing={0.5} alignItems="center">
          {tab === 'console' && onRerun && (
            <Button
              size="small"
              startIcon={<Play size={11} />}
              disabled={busy}
              onClick={onRerun}
              sx={{ fontSize: '0.72rem', textTransform: 'none', py: 0.2, px: 1, color: '#58a6ff' }}
            >
              Re-run
            </Button>
          )}

          <Tooltip title={isExpanded ? 'Restore drawer height' : 'Expand drawer'}>
            <IconButton
              size="small"
              aria-label="Toggle drawer size"
              onClick={() => setIsExpanded(!isExpanded)}
              sx={{ color: '#8b949e', p: 0.5 }}
            >
              {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </IconButton>
          </Tooltip>

          {onClear && (
            <Tooltip title="Clear output">
              <IconButton size="small" aria-label="Clear output" onClick={onClear} sx={{ color: '#8b949e', p: 0.5 }}>
                <Trash2 size={13} />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title="Close">
            <IconButton size="small" aria-label="Close terminal" onClick={onClose} sx={{ color: '#8b949e', p: 0.5 }}>
              <X size={14} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Main Panel Content */}
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {tab === 'terminal' && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, p: 1.5 }}>
            {/* Terminal History Output */}
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', fontFamily: 'monospace', fontSize: '0.8rem', pr: 0.5 }}>
              {terminalHistory.length === 0 && (
                <Box sx={{ color: '#8b949e', fontStyle: 'italic', mb: 1 }}>
                  Local terminal ready. Run python, node, tests, or system utilities directly in the workspace.
                </Box>
              )}

              {terminalHistory.map((item) => (
                <Box key={item.id} sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, lineHeight: 1.5 }}>
                    <Typography component="span" sx={{ color: '#3fb950', fontWeight: 700, fontSize: '0.85rem' }}>➜</Typography>
                    <Typography component="span" sx={{ color: '#79c0ff', fontWeight: 600, fontSize: '0.8rem' }}>workspace</Typography>
                    <Typography component="span" sx={{ color: '#f0f6fc', fontWeight: 600, fontSize: '0.82rem' }}>$ {item.command}</Typography>
                    {item.durationMs !== undefined && (
                      <Typography variant="caption" sx={{ ml: 'auto', color: '#6e7681', fontSize: '0.68rem' }}>
                        {item.durationMs}ms
                      </Typography>
                    )}
                  </Box>

                  {item.logs?.map((l, i) => (
                    <Typography
                      key={i}
                      sx={{
                        color: l.type === 'error' ? '#f85149' : l.type === 'warn' ? '#d29922' : '#c9d1d9',
                        pl: 2,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontSize: '0.78rem',
                        lineHeight: 1.5,
                      }}
                    >
                      {l.text}
                    </Typography>
                  ))}
                </Box>
              ))}

              <div ref={terminalBottomRef} />
            </Box>



            {/* Terminal Command Input */}
            <Box
              component="form"
              onSubmit={handleSubmitCommand}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                bgcolor: '#161b22',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 1.5,
                px: 1.25,
                py: 0.35,
              }}
            >
              <Typography sx={{ color: '#3fb950', fontWeight: 700, fontSize: '0.9rem' }}>$</Typography>
              <InputBase
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={hasSystemPermission ? 'Type a command, e.g. python3 src/main.py, ls, pytest...' : 'Type a command (system permission requested on enter)...'}
                disabled={terminalBusy}
                fullWidth
                sx={{
                  color: '#f0f6fc',
                  fontFamily: 'monospace',
                  fontSize: '0.82rem',
                }}
              />
              <IconButton
                size="small"
                type="submit"
                disabled={!commandInput.trim() || terminalBusy}
                sx={{ color: '#58a6ff', p: 0.4 }}
              >
                <CornerDownLeft size={14} />
              </IconButton>
            </Box>
          </Box>
        )}

        {tab === 'console' && (
          <Box sx={{ flex: 1, overflow: 'auto', p: 1.5, fontFamily: 'monospace', fontSize: '0.8rem' }}>
            {logs.length === 0 && (
              <Box sx={{ color: '#8b949e', fontStyle: 'italic' }}>
                Click &ldquo;Run&rdquo; in the editor bar above to execute this file and view output.
              </Box>
            )}
            {logs.map((log, i) => (
              <Box
                key={i}
                sx={{
                  color:
                    log.type === 'error'
                      ? '#f85149'
                      : log.type === 'warn'
                      ? '#d29922'
                      : log.type === 'return'
                      ? '#79c0ff'
                      : log.type === 'info'
                      ? '#8b949e'
                      : '#c9d1d9',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  lineHeight: 1.5,
                  mb: 0.5,
                }}
              >
                {log.text}
              </Box>
            ))}
            <div ref={terminalBottomRef} />
          </Box>
        )}

        {tab === 'preview' && isWeb && (
          <Box sx={{ flex: 1, bgcolor: '#ffffff', overflow: 'hidden' }}>
            <iframe
              srcDoc={executionInfo.html}
              title="Web Sandbox Preview"
              style={{ width: '100%', height: '100%', border: 'none' }}
              sandbox="allow-scripts"
            />
          </Box>
        )}
      </Box>

      {/* Terminal System Permission Modal */}
      <Dialog
        open={permissionDialogOpen}
        onClose={() => setPermissionDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
            },
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
          <Shield size={20} color={theme.palette.warning.main} />
          <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700 }}>
            Terminal System Access
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.85rem', lineHeight: 1.5 }}>
            Allow LocalLLMMind to execute commands on your local system?
          </Typography>
          <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 1.5 }}>
            <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600, display: 'block' }}>
              Pending Command: {pendingCommand || 'System Terminal Execution'}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.72rem' }}>
            This grants access to run compilers, scripts, tests, and tools installed on your host OS. You can revoke this permission anytime.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={handleDenyPermission} color="inherit" size="small">
            Restricted Sandbox
          </Button>
          <Button onClick={handleGrantPermission} variant="contained" color="primary" size="small">
            Grant System Access
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
