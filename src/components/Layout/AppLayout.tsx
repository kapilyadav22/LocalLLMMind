import { useState, useEffect, useRef, lazy, Suspense } from 'react';
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
import {
  Code2,
  MessageSquare,
  Menu,
  PanelLeft,
  PanelLeftClose,
  AlertTriangle,
  Settings as SettingsIconLucide,
  RotateCw,
  Plus,
} from 'lucide-react';
import OllamaStartButton from '../common/OllamaStartButton';
import Sidebar from './Sidebar';
import ChatView from '../Chat/ChatView';
import CustomAlertDialog from '../common/CustomAlertDialog';
import AppLogo from '../common/AppLogo';
import { useChatStore } from '../../store/chatContext';
import { checkConnection, fetchModels } from '../../services/ollamaService';
import { DEFAULT_SHORTCUTS } from '../../constants/appConstants';
import { loadSidebarOpen, saveSidebarOpen } from '../../utils/storage';

const CodeWorkspace = lazy(() => import('../Code/CodeWorkspace'));
const SettingsDialog = lazy(() => import('../Settings/SettingsDialog'));
const ModelManagerDialog = lazy(() => import('../Settings/ModelManagerDialog'));
const GlobalSearchDialog = lazy(() => import('./GlobalSearchDialog'));
const KeyboardShortcutsDialog = lazy(() => import('../common/KeyboardShortcutsDialog'));
const AboutMeModal = lazy(() => import('../About/AboutMeModal'));
const JevDecisionStudioModal = lazy(() => import('../common/JevDecisionStudioModal'));
const SIDEBAR_WIDTH = 280;

export default function AppLayout({
  themeMode,
  onThemeToggle,
  themeConfig,
  onUpdateThemeConfig,
}: any) {
  const [mode, setMode] = useState('chat');
  const [codeOpened, setCodeOpened] = useState(false);
  const changeMode = (next) => { setMode(next); if (next === 'code') setCodeOpened(true); };
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 900) return false;
    return loadSidebarOpen();
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState(0);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [modelManagerOpen, setModelManagerOpen] = useState(false);

  useEffect(() => {
    const handleOpenAppearance = () => {
      setSettingsInitialTab(5);
      setSettingsOpen(true);
    };
    window.addEventListener('localllmmind-open-appearance', handleOpenAppearance);
    return () => window.removeEventListener('localllmmind-open-appearance', handleOpenAppearance);
  }, []);
  const [aboutMeOpen, setAboutMeOpen] = useState(false);
  const [jevStudioOpen, setJevStudioOpen] = useState(false);
  const { state, dispatch } = useChatStore();

  // Listen for global open-about-me and open-jev-studio events
  useEffect(() => {
    const handleOpenAboutMe = () => setAboutMeOpen(true);
    const handleOpenJevStudio = () => setJevStudioOpen(true);
    window.addEventListener('open-about-me', handleOpenAboutMe);
    window.addEventListener('open-jev-studio', handleOpenJevStudio);
    return () => {
      window.removeEventListener('open-about-me', handleOpenAboutMe);
      window.removeEventListener('open-jev-studio', handleOpenJevStudio);
    };
  }, []);

  const handleOpenSettings = (tabIndex = 0) => {
    setSettingsInitialTab(typeof tabIndex === 'number' ? tabIndex : 0);
    setSettingsOpen(true);
  };

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

  // Listen for global toast feedback notifications
  useEffect(() => {
    const handleToast = (e) => {
      if (e.detail?.message) {
        setSnackbar({
          open: true,
          message: e.detail.message,
          severity: e.detail.severity || 'info',
        });
      }
    };
    window.addEventListener('llm-toast', handleToast);
    return () => window.removeEventListener('llm-toast', handleToast);
  }, []);

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

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isEditingField =
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable;
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      const shortcutsList: any[] = Array.isArray(state.shortcuts) ? state.shortcuts : Object.values(state.shortcuts || {});
      for (const s of shortcutsList) {
        const matchKey =
          s.key?.toLowerCase() === e.key?.toLowerCase() ||
          (s.key === ' ' && e.key === ' ') ||
          (s.key === 'Escape' && e.key === 'Escape');

        const sModifiers = s.modifiers || [];
        const matchCmd = sModifiers.includes('ctrlOrCmd') ? isCmdOrCtrl : !isCmdOrCtrl;
        const matchShift = sModifiers.includes('shift') ? Boolean(e.shiftKey) : !e.shiftKey;
        const matchAlt = sModifiers.includes('alt') ? Boolean(e.altKey) : !e.altKey;

        if (matchKey && matchCmd && matchShift && matchAlt) {
          // If typing inside an input field, only fire if modifier was present or it's Escape
          if (isEditingField && !isCmdOrCtrl && !e.altKey && e.key !== 'Escape') {
            continue;
          }

          e.preventDefault();

          const action = s.actionType || s.id;
          switch (action) {
            case 'new_chat':
              setMode('chat');
              dispatch({ type: 'NEW_CONVERSATION' });
              break;
            case 'toggle_sidebar':
              handleToggleSidebar();
              break;
            case 'open_settings':
              setSettingsOpen((prev) => !prev);
              break;
            case 'global_search':
              setGlobalSearchOpen((prev) => !prev);
              break;
            case 'open_model_manager':
              setModelManagerOpen((prev) => !prev);
              break;
            case 'show_shortcuts':
              setShortcutsOpen((prev) => !prev);
              break;
            case 'toggle_theme':
              onThemeToggle?.();
              break;
            case 'focus_input': {
              const inputEl = document.getElementById('chat-message-input');
              inputEl?.focus();
              break;
            }
            case 'stop_generation':
              if (state.isStreaming) {
                window.dispatchEvent(new CustomEvent('llm-stop-stream'));
              } else if (settingsOpen) {
                setSettingsOpen(false);
              } else if (shortcutsOpen) {
                setShortcutsOpen(false);
              } else if (globalSearchOpen) {
                setGlobalSearchOpen(false);
              } else if (modelManagerOpen) {
                setModelManagerOpen(false);
              }
              break;
            case 'insert_template': {
              const textToInsert = s.payload || '';
              window.dispatchEvent(
                new CustomEvent('llm-insert-text', { detail: { text: textToInsert } })
              );
              break;
            }
            default:
              break;
          }
          return;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.shortcuts, state.isStreaming, settingsOpen, shortcutsOpen, globalSearchOpen, modelManagerOpen, dispatch, onThemeToggle]);

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('localllmmind_sidebar_width');
    return saved ? Math.max(200, Math.min(500, parseInt(saved, 10))) : SIDEBAR_WIDTH;
  });
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(SIDEBAR_WIDTH);

  const handleSidebarDragStart = (e) => {
    e.preventDefault();
    setIsDraggingSidebar(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = sidebarWidth;

    function handleMouseMove(moveEvent) {
      const delta = moveEvent.clientX - dragStartX.current;
      const nextWidth = Math.max(200, Math.min(500, dragStartWidth.current + delta));
      setSidebarWidth(nextWidth);
    }

    function handleMouseUp() {
      setIsDraggingSidebar(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setSidebarWidth((w) => {
        localStorage.setItem('localllmmind_sidebar_width', String(Math.round(w)));
        return w;
      });
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleToggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      if (!isMobile) saveSidebarOpen(next);
      return next;
    });
  };

  const sidebarContent = (
    <Sidebar
      onNavigateChat={() => setMode('chat')}
      onOpenSettings={handleOpenSettings}
      onOpenShortcuts={() => setShortcutsOpen(true)}
      onOpenGlobalSearch={() => setGlobalSearchOpen(true)}
      onOpenModelManager={() => setModelManagerOpen(true)}
      onOpenAboutMe={() => setAboutMeOpen(true)}
      onCloseMobile={() => isMobile && setSidebarOpen(false)}
      onToggleSidebar={handleToggleSidebar}
      isMobile={isMobile}
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
          slotProps={{
            paper: {
              sx: {
                width: sidebarWidth,
                bgcolor: 'background.paper',
                borderRight: '1px solid',
                borderColor: 'divider',
              },
            },
          }}
        >
          {sidebarContent}
        </Drawer>
      ) : (
        /* Desktop sidebar (Draggable) */
        <Box
          sx={{
            width: sidebarOpen ? sidebarWidth : 0,
            flexShrink: 0,
            transition: isDraggingSidebar ? 'none' : 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'hidden',
            borderRight: sidebarOpen ? '1px solid' : 'none',
            borderColor: 'divider',
            position: 'relative',
          }}
        >
          <Box sx={{ width: sidebarWidth, height: '100%' }}>
            {sidebarContent}
          </Box>
          {sidebarOpen && (
            <Box
              onMouseDown={handleSidebarDragStart}
              title="Drag to resize sidebar"
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 5,
                height: '100%',
                cursor: 'col-resize',
                zIndex: 20,
                transition: 'background-color 0.15s',
                '&:hover, &:active': {
                  bgcolor: 'primary.main',
                },
              }}
            />
          )}
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
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1,
            borderBottom: 1,
            borderColor: 'divider',
            flexShrink: 0,
          }}
        >
          {!isMobile && (
            <Tooltip title={sidebarOpen ? 'Hide sidebar (Cmd+B)' : 'Show sidebar (Cmd+B)'}>
              <IconButton
                size="small"
                onClick={handleToggleSidebar}
                aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
                sx={{
                  color: sidebarOpen ? 'text.secondary' : 'primary.main',
                  bgcolor: sidebarOpen ? 'transparent' : alpha(theme.palette.primary.main, 0.08),
                  border: '1px solid',
                  borderColor: sidebarOpen ? 'divider' : alpha(theme.palette.primary.main, 0.25),
                  borderRadius: 1.5,
                  mr: 0.5,
                  p: '6px',
                  '&:hover': {
                    color: 'text.primary',
                    bgcolor: alpha(theme.palette.text.primary, 0.06),
                  },
                }}
              >
                {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
              </IconButton>
            </Tooltip>
          )}
          <Button
            size="small"
            variant={mode === 'chat' ? 'contained' : 'text'}
            startIcon={<MessageSquare size={14} />}
            onClick={() => changeMode('chat')}
            sx={{
              fontWeight: mode === 'chat' ? 600 : 500,
              fontSize: '0.8rem',
              py: 0.5,
              px: 1.25,
            }}
          >
            Chat
          </Button>
          <Button
            size="small"
            variant={mode === 'code' ? 'contained' : 'text'}
            startIcon={<Code2 size={14} />}
            onClick={() => changeMode('code')}
            sx={{
              fontWeight: mode === 'code' ? 600 : 500,
              fontSize: '0.8rem',
              py: 0.5,
              px: 1.25,
            }}
          >
            Code
          </Button>
        </Box>
        {/* Loading bar — shown before first connection check completes */}
        {!state.connectionChecked && (
          <LinearProgress
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 20,
              height: 2,
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
              flexWrap: 'wrap',
              px: 2,
              py: 1,
              bgcolor: alpha(theme.palette.error.main, 0.08),
              borderBottom: '1px solid',
              borderColor: alpha(theme.palette.error.main, 0.15),
              animation: 'slideDown 0.3s ease-out',
              '@keyframes slideDown': {
                from: { opacity: 0, transform: 'translateY(-100%)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            <OllamaStartButton />
            <AlertTriangle size={16} color={theme.palette.error.main} />
            <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 500, fontSize: '0.82rem' }}>
              {state.connectionError || `Cannot connect to Ollama at ${state.settings.ollamaUrl}`}
            </Typography>
            <Button
              size="small"
              startIcon={<RotateCw size={12} />}
              onClick={handleRetryConnection}
              sx={{
                ml: 1,
                color: 'error.main',
                borderColor: alpha(theme.palette.error.main, 0.3),
                fontSize: '0.75rem',
                minWidth: 0,
                px: 1.2,
                py: 0.2,
              }}
              variant="outlined"
            >
              Retry
            </Button>
            <Button
              size="small"
              startIcon={<SettingsIconLucide size={12} />}
              onClick={() => setSettingsOpen(true)}
              sx={{
                color: 'error.main',
                borderColor: alpha(theme.palette.error.main, 0.3),
                fontSize: '0.75rem',
                minWidth: 0,
                px: 1.2,
                py: 0.2,
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
              bgcolor: alpha(theme.palette.warning.main, 0.08),
              borderBottom: '1px solid',
              borderColor: alpha(theme.palette.warning.main, 0.15),
            }}
          >
            <AlertTriangle size={16} color={theme.palette.warning.main} />
            <Typography variant="body2" sx={{ color: 'warning.main', fontWeight: 500, fontSize: '0.82rem' }}>
              No models available. Pull a model to get started.
            </Typography>
            <Button
              size="small"
              startIcon={<RotateCw size={12} />}
              onClick={() => setModelManagerOpen(true)}
              sx={{
                ml: 1,
                color: 'warning.main',
                borderColor: alpha(theme.palette.warning.main, 0.3),
                fontSize: '0.75rem',
              }}
              variant="outlined"
            >
              Pull a model
            </Button>
          </Box>
        )}

        {/* Mobile Header Bar */}
        {isMobile && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 1.5,
              py: 0.75,
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              zIndex: 15,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton size="small" onClick={handleToggleSidebar} edge="start" sx={{ p: '6px' }}>
                <Menu size={18} />
              </IconButton>
              <AppLogo size={24} fontSize="0.95rem" />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Tooltip title="New chat">
                <IconButton
                  size="small"
                  onClick={() => dispatch({ type: 'NEW_CONVERSATION' })}
                  sx={{
                    color: 'primary.main',
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    p: '6px',
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.15) },
                  }}
                >
                  <Plus size={16} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Settings">
                <IconButton size="small" onClick={() => setSettingsOpen(true)} sx={{ color: 'text.secondary', p: '6px' }}>
                  <SettingsIconLucide size={16} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        )}

        <Box sx={{ display: mode === 'chat' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}>
          <ChatView onOpenSettings={(tabIdx = 1) => { setSettingsInitialTab(tabIdx); setSettingsOpen(true); }} />
        </Box>
        {codeOpened && <Box sx={{ display: mode === 'code' ? 'flex' : 'none', flex: 1, minHeight: 0 }}>
          <Suspense fallback={<LinearProgress sx={{ width: '100%' }} />}><CodeWorkspace active={mode === 'code'} onModels={() => setModelManagerOpen(true)} /></Suspense>
        </Box>}
      </Box>

      {/* Lazy Loaded Dialogs in Suspense */}
      <Suspense fallback={null}>
        {settingsOpen && (
          <SettingsDialog
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            themeMode={themeMode}
            onThemeToggle={onThemeToggle}
            themeConfig={themeConfig}
            onUpdateThemeConfig={onUpdateThemeConfig}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={handleToggleSidebar}
            initialTab={settingsInitialTab}
          />
        )}

        {shortcutsOpen && (
          <KeyboardShortcutsDialog
            open={shortcutsOpen}
            onClose={() => setShortcutsOpen(false)}
          />
        )}

        {globalSearchOpen && (
          <GlobalSearchDialog
            open={globalSearchOpen}
            onClose={() => setGlobalSearchOpen(false)}
          />
        )}

        {modelManagerOpen && (
          <ModelManagerDialog
            open={modelManagerOpen}
            onClose={() => setModelManagerOpen(false)}
            ollamaUrl={state.settings.ollamaUrl}
            onModelsChanged={async () => {
              try {
                 const models = await fetchModels(state.settings.ollamaUrl);
                dispatch({ type: 'SET_MODELS', payload: models });
              } catch (err) {
                console.error('[AppLayout] Failed to refresh models:', err);
              }
            }}
          />
        )}

        {aboutMeOpen && (
          <AboutMeModal
            open={aboutMeOpen}
            onClose={() => setAboutMeOpen(false)}
          />
        )}

        {jevStudioOpen && (
          <JevDecisionStudioModal
            open={jevStudioOpen}
            onClose={() => setJevStudioOpen(false)}
            onOpenSettings={() => handleOpenSettings(1)}
          />
        )}
      </Suspense>

      {/* Snackbar notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={snackbar.severity === 'error' ? 8000 : 4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity as any}
          variant="filled"
          sx={{ borderRadius: 3, fontWeight: 500 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Custom Alert & Confirmation Dialog */}
      <CustomAlertDialog />
    </Box>
  );
}
