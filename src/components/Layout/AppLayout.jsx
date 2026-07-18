import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Drawer,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  useMediaQuery,
  useTheme,
  alpha,
  Typography,
  Button,
  LinearProgress,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SettingsIcon from '@mui/icons-material/Settings';
import RefreshIcon from '@mui/icons-material/Refresh';
import Sidebar from './Sidebar';
import ChatView from '../Chat/ChatView';
import SettingsDialog from '../Settings/SettingsDialog';
import { useChatStore } from '../../store/chatStore';
import { checkConnection, fetchModels } from '../../services/ollamaService';

const SIDEBAR_WIDTH = 280;

export default function AppLayout({ themeMode, onThemeToggle }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { state, dispatch } = useChatStore();

  // Snackbar state
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const prevConnected = useRef(null);

  // Show snackbar on connection state changes (skip initial load)
  useEffect(() => {
    if (!state.connectionChecked) return;
    if (prevConnected.current === null) {
      // First check completed — show result
      if (!state.isConnected) {
        setSnackbar({
          open: true,
          message: state.connectionError || `Cannot connect to Ollama at ${state.settings.ollamaUrl}`,
          severity: 'error',
        });
      }
      prevConnected.current = state.isConnected;
      return;
    }
    if (prevConnected.current !== state.isConnected) {
      if (state.isConnected) {
        setSnackbar({
          open: true,
          message: `Connected to Ollama · ${state.models.length} model(s) available`,
          severity: 'success',
        });
      } else {
        setSnackbar({
          open: true,
          message: state.connectionError || `Lost connection to Ollama`,
          severity: 'error',
        });
      }
      prevConnected.current = state.isConnected;
    }
  }, [state.isConnected, state.connectionChecked, state.connectionError, state.models.length, state.settings.ollamaUrl]);

  const handleRetryConnection = async () => {
    dispatch({ type: 'SET_CONNECTION_ERROR', payload: null });
    try {
      const connected = await checkConnection(state.settings.ollamaUrl);
      dispatch({ type: 'SET_CONNECTED', payload: connected });
      if (connected) {
        const models = await fetchModels(state.settings.ollamaUrl);
        dispatch({ type: 'SET_MODELS', payload: models });
        if (models.length === 0) {
          dispatch({ type: 'SET_CONNECTION_ERROR', payload: 'No models found. Pull a model first.' });
        }
      } else {
        dispatch({ type: 'SET_CONNECTION_ERROR', payload: `Cannot reach Ollama at ${state.settings.ollamaUrl}` });
      }
    } catch (err) {
      dispatch({ type: 'SET_CONNECTED', payload: false });
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: err.message });
    }
  };

  const handleToggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const sidebarContent = (
    <Sidebar
      onOpenSettings={() => setSettingsOpen(true)}
    />
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>
      {/* Mobile drawer */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          ModalProps={{ keepMounted: true }}
          PaperProps={{
            sx: {
              width: SIDEBAR_WIDTH,
              bgcolor: 'background.paper',
              borderRight: '1px solid',
              borderColor: 'divider',
            },
          }}
        >
          {sidebarContent}
        </Drawer>
      ) : (
        /* Desktop sidebar */
        <Box
          sx={{
            width: sidebarOpen ? SIDEBAR_WIDTH : 0,
            flexShrink: 0,
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'hidden',
            borderRight: sidebarOpen ? '1px solid' : 'none',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ width: SIDEBAR_WIDTH, height: '100%' }}>
            {sidebarContent}
          </Box>
        </Box>
      )}

      {/* Main content */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minWidth: 0,
          position: 'relative',
        }}
      >
        {/* Loading bar — shown before first connection check completes */}
        {!state.connectionChecked && (
          <LinearProgress
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 20,
              height: 3,
            }}
          />
        )}

        {/* Disconnection banner — shown when connection fails */}
        {state.connectionChecked && !state.isConnected && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.5,
              px: 2,
              py: 1,
              bgcolor: alpha(theme.palette.error.main, 0.1),
              borderBottom: '1px solid',
              borderColor: alpha(theme.palette.error.main, 0.2),
              animation: 'slideDown 0.3s ease-out',
              '@keyframes slideDown': {
                from: { opacity: 0, transform: 'translateY(-100%)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            <WarningAmberIcon sx={{ fontSize: 18, color: 'error.main' }} />
            <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 500, fontSize: '0.82rem' }}>
              {state.connectionError || `Cannot connect to Ollama at ${state.settings.ollamaUrl}`}
            </Typography>
            <Button
              size="small"
              startIcon={<RefreshIcon sx={{ fontSize: 14 }} />}
              onClick={handleRetryConnection}
              sx={{
                ml: 1,
                color: 'error.main',
                borderColor: alpha(theme.palette.error.main, 0.3),
                fontSize: '0.75rem',
                textTransform: 'none',
                minWidth: 0,
                px: 1.5,
                py: 0.25,
              }}
              variant="outlined"
            >
              Retry
            </Button>
            <Button
              size="small"
              startIcon={<SettingsIcon sx={{ fontSize: 14 }} />}
              onClick={() => setSettingsOpen(true)}
              sx={{
                color: 'error.main',
                borderColor: alpha(theme.palette.error.main, 0.3),
                fontSize: '0.75rem',
                textTransform: 'none',
                minWidth: 0,
                px: 1.5,
                py: 0.25,
              }}
              variant="outlined"
            >
              Settings
            </Button>
          </Box>
        )}

        {/* No models warning — connected but no models */}
        {state.connectionChecked && state.isConnected && state.models.length === 0 && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.5,
              px: 2,
              py: 1,
              bgcolor: alpha(theme.palette.warning.main, 0.1),
              borderBottom: '1px solid',
              borderColor: alpha(theme.palette.warning.main, 0.2),
            }}
          >
            <WarningAmberIcon sx={{ fontSize: 18, color: 'warning.main' }} />
            <Typography variant="body2" sx={{ color: 'warning.main', fontWeight: 500, fontSize: '0.82rem' }}>
              No models available. Pull a model first:
              <Box component="code" sx={{ ml: 0.5, px: 0.75, py: 0.25, borderRadius: 1, bgcolor: alpha(theme.palette.warning.main, 0.1), fontSize: '0.8rem' }}>
                ollama pull llama3.2
              </Box>
            </Typography>
            <Button
              size="small"
              startIcon={<RefreshIcon sx={{ fontSize: 14 }} />}
              onClick={handleRetryConnection}
              sx={{
                ml: 1,
                color: 'warning.main',
                borderColor: alpha(theme.palette.warning.main, 0.3),
                fontSize: '0.75rem',
                textTransform: 'none',
              }}
              variant="outlined"
            >
              Refresh
            </Button>
          </Box>
        )}

        {/* Top bar for mobile menu toggle */}
        <Box
          sx={{
            position: 'absolute',
            top: state.connectionChecked && !state.isConnected ? 52 : 12,
            left: 12,
            zIndex: 10,
            transition: 'top 0.3s ease',
          }}
        >
          {(isMobile || !sidebarOpen) && (
            <Tooltip title="Toggle sidebar">
              <IconButton
                onClick={handleToggleSidebar}
                sx={{
                  bgcolor: alpha(theme.palette.background.paper, 0.8),
                  backdropFilter: 'blur(10px)',
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.background.paper, 0.95),
                  },
                }}
              >
                <MenuIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <ChatView />
      </Box>

      {/* Settings dialog */}
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        themeMode={themeMode}
        onThemeToggle={onThemeToggle}
      />

      {/* Snackbar notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={snackbar.severity === 'error' ? 8000 : 4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ borderRadius: 3, fontWeight: 500 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
