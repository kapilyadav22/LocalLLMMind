import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Slider,
  Typography,
  Box,
  IconButton,
  Divider,
  Switch,
  Alert,
  Chip,
  LinearProgress,
  CircularProgress,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  useMediaQuery,
  alpha,
  useTheme,
  MenuItem,
  Select,
  FormControl,
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import {
  Link,
  Key,
  Eye,
  EyeOff,
  ExternalLink,
  Sliders,
  Palette,
  CheckCircle2,
  AlertCircle,
  Download,
  Upload,
  Bot,
  Trash2,
  AlertTriangle,
  Keyboard,
  HardDrive,
  FolderOpen,
  RotateCw,
  Cloud,
  Folder,
  FolderInput,
  X,
} from 'lucide-react';
import ShortcutsManager from '../common/ShortcutsManager';
import DeveloperBadge from '../common/DeveloperBadge';
import { showCustomAlert, showCustomConfirm } from '../../utils/dialogService';
import { checkConnection, fetchModels, pullModel, deleteModel } from '../../services/ollamaService';
import { PROVIDERS, PROVIDER_CONFIGS } from '../../constants/apiProviders';
import { testProviderConnection } from '../../services/aiProviderService';
import { useChatStore } from '../../store/chatContext';
import { POPULAR_MODELS, CONTEXT_WINDOW_OPTIONS, AI_PERSONAS } from '../../constants/appConstants';
import {
  isFileSystemAccessSupported,
  pickMemoryDirectory,
  syncToDirectory,
  readFromDirectory,
  getStoredDirectoryHandle,
  clearStoredDirectoryHandle,
  verifyPermission,
} from '../../utils/fileSystemStorage';
import { showToast } from '../../utils/toast';

const SETTINGS_SECTIONS = [
  { id: 0, label: 'Connection', icon: Link, description: 'Ollama server endpoint & connectivity test' },
  { id: 1, label: 'API Providers & Keys', icon: Key, description: 'OpenAI, Claude, Gemini, Grok, Jev (TypeSafe)' },
  { id: 2, label: 'Parameters', icon: Sliders, description: 'Model generation parameters & default prompt' },
  { id: 3, label: 'Models', icon: Bot, description: 'Installed models & library downloads' },
  { id: 4, label: 'Shortcuts', icon: Keyboard, description: 'Custom keyboard shortcuts & hotkey actions' },
  { id: 5, label: 'Appearance', icon: Palette, description: 'Color theme & visual appearance' },
  { id: 6, label: 'Storage & Memory', icon: HardDrive, description: 'Local chat persistence, backups, & data management' },
];

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ py: 0.5 }}>{children}</Box> : null;
}

export default function SettingsDialog({
  open,
  onClose,
  themeMode,
  onThemeToggle,
  sidebarOpen,
  onToggleSidebar,
  initialTab = 0,
}) {
  const { state, dispatch } = useChatStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  // Local settings state
  const [localSettings, setLocalSettings] = useState({ ...state.settings });

  // Storage & Memory directory state
  const [dirHandle, setDirHandle] = useState(null);
  const [dirPermission, setDirPermission] = useState(false);
  const [syncingDir, setSyncingDir] = useState(false);
  const [loadingDir, setLoadingDir] = useState(false);
  const fsSupported = isFileSystemAccessSupported();

  useEffect(() => {
    if (open) {
      setLocalSettings({ ...state.settings });
      (async () => {
        try {
          const handle = await getStoredDirectoryHandle();
          if (handle) {
            setDirHandle(handle);
            const perm = await verifyPermission(handle, false);
            setDirPermission(perm);
          } else {
            setDirHandle(null);
            setDirPermission(false);
          }
        } catch {
          setDirHandle(null);
          setDirPermission(false);
        }
      })();
    }
  }, [open, state.settings]);

  // Model manager state
  const [modelToPull, setModelToPull] = useState('');
  const [pullProgress, setPullProgress] = useState(null); // { status, completed, total, percent }
  const [isPulling, setIsPulling] = useState(false);
  const [modelError, setModelError] = useState(null);
  const [modelSuccess, setModelSuccess] = useState(null);
  const pullAbortControllerRef = useRef(null);

  // Clear confirmation
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  // API Providers & Keys state
  const [showApiKeys, setShowApiKeys] = useState({});
  const [testingProvider, setTestingProvider] = useState({});
  const [providerResults, setProviderResults] = useState({});

  const handleApiKeyChange = (providerId, val) => {
    setLocalSettings((prev) => ({
      ...prev,
      apiKeys: {
        ...(prev.apiKeys || {}),
        [providerId]: val,
      },
    }));
    setProviderResults((prev) => ({ ...prev, [providerId]: null }));
  };

  const handleApiEndpointChange = (providerId, val) => {
    setLocalSettings((prev) => ({
      ...prev,
      apiEndpoints: {
        ...(prev.apiEndpoints || {}),
        [providerId]: val,
      },
    }));
    setProviderResults((prev) => ({ ...prev, [providerId]: null }));
  };

  const handleTestProvider = async (providerId) => {
    const key = localSettings.apiKeys?.[providerId] || '';
    const endpoint = localSettings.apiEndpoints?.[providerId] || '';
    if (!key.trim()) {
      setProviderResults((prev) => ({ ...prev, [providerId]: { ok: false, message: 'Please enter an API key first' } }));
      return;
    }
    setTestingProvider((prev) => ({ ...prev, [providerId]: true }));
    setProviderResults((prev) => ({ ...prev, [providerId]: null }));
    try {
      const res = await testProviderConnection(providerId, key, endpoint);
      setProviderResults((prev) => ({ ...prev, [providerId]: res }));
    } catch (err) {
      setProviderResults((prev) => ({ ...prev, [providerId]: { ok: false, message: err.message || 'Test failed' } }));
    } finally {
      setTestingProvider((prev) => ({ ...prev, [providerId]: false }));
    }
  };

  const handleSettingChange = (key, value) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSelectDirectory = async () => {
    try {
      const handle = await pickMemoryDirectory();
      setDirHandle(handle);
      setDirPermission(true);
      handleSettingChange('memoryStorageMode', 'local_folder');
      handleSettingChange('memoryDirectoryName', handle.name);
      if (!localSettings.customMemoryPath) {
        handleSettingChange('customMemoryPath', handle.name);
      }
      // Immediate sync
      const result = await syncToDirectory(handle, {
        conversations: state.conversations,
        projects: state.projects,
        settings: localSettings,
        saveMarkdown: localSettings.saveMarkdownCopies !== false,
      });
      showToast(`Connected to "${handle.name}" (${result.conversationsCount} chats saved)`, 'success');
    } catch (err) {
      if (err.name !== 'AbortError') {
        showToast(err.message || 'Failed to select directory', 'error');
      }
    }
  };

  const handleDisconnectDirectory = async () => {
    await clearStoredDirectoryHandle();
    setDirHandle(null);
    setDirPermission(false);
    handleSettingChange('memoryStorageMode', 'browser');
    handleSettingChange('memoryDirectoryName', '');
    showToast('Reverted to Browser LocalStorage', 'info');
  };

  const handleManualSync = async () => {
    if (!dirHandle) return;
    setSyncingDir(true);
    try {
      const result = await syncToDirectory(dirHandle, {
        conversations: state.conversations,
        projects: state.projects,
        settings: localSettings,
        saveMarkdown: localSettings.saveMarkdownCopies !== false,
      });
      setDirPermission(true);
      showToast(`Synced ${result.conversationsCount} chats & ${result.projectsCount} projects to "${dirHandle.name}"`, 'success');
    } catch (err) {
      showToast(`Sync failed: ${err.message}`, 'error');
    } finally {
      setSyncingDir(false);
    }
  };

  const handleRestoreFromDirectory = async () => {
    if (!dirHandle) return;
    setLoadingDir(true);
    try {
      const result = await readFromDirectory(dirHandle);
      if (result.conversations.length === 0 && (!result.projects || result.projects.length === 0)) {
        showToast(`No conversations found in "${dirHandle.name}"`, 'warning');
      } else {
        dispatch({
          type: 'IMPORT_DATA',
          payload: {
            conversations: result.conversations,
            projects: result.projects,
          },
        });
        showToast(`Loaded ${result.conversations.length} conversations and ${result.projects?.length || 0} projects from folder`, 'success');
      }
    } catch (err) {
      showToast(`Failed to load from folder: ${err.message}`, 'error');
    } finally {
      setLoadingDir(false);
    }
  };

  const handleSave = () => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: localSettings });
    onClose();
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const connected = await checkConnection(localSettings.ollamaUrl);
    setTestResult(connected ? 'success' : 'error');
    if (connected) {
      try {
        const models = await fetchModels(localSettings.ollamaUrl);
        dispatch({ type: 'SET_MODELS', payload: models });
      } catch {
        // ignore
      }
    }
    setTesting(false);
  };

  const refreshModels = async () => {
    try {
      const models = await fetchModels(localSettings.ollamaUrl);
      dispatch({ type: 'SET_MODELS', payload: models });
    } catch (err) {
      setModelError(`Failed to refresh models: ${err.message}`);
    }
  };

  const handleStartPull = async (modelName?: string) => {
    const target = (modelName || modelToPull).trim();
    if (!target) return;

    setIsPulling(true);
    setModelError(null);
    setModelSuccess(null);
    setPullProgress({ status: 'Starting pull…', completed: 0, total: 0, percent: 0 });

    pullAbortControllerRef.current = new AbortController();

    try {
      await pullModel({
        model: target,
        ollamaUrl: localSettings.ollamaUrl,
        onProgress: (p) => setPullProgress(p),
        signal: pullAbortControllerRef.current.signal,
      });
      setModelSuccess(`Model "${target}" pulled successfully!`);
      setModelToPull('');
      setPullProgress(null);
      await refreshModels();
    } catch (err) {
      if (err.name !== 'AbortError') {
        setModelError(err.message);
      }
    } finally {
      setIsPulling(false);
      pullAbortControllerRef.current = null;
    }
  };

  const handleCancelPull = () => {
    if (pullAbortControllerRef.current) {
      pullAbortControllerRef.current.abort();
      pullAbortControllerRef.current = null;
      setIsPulling(false);
      setPullProgress(null);
      setModelError('Pull cancelled by user');
    }
  };

  const handleDeleteModel = async (modelName) => {
    const confirmed = await showCustomConfirm({
      title: 'Delete Model?',
      message: `Are you sure you want to permanently delete model "${modelName}" from your local Ollama installation?`,
      type: 'error',
      confirmText: 'Delete Model',
      confirmColor: 'error',
    });
    if (!confirmed) return;
    try {
      await deleteModel({ model: modelName, ollamaUrl: localSettings.ollamaUrl });
      setModelSuccess(`Model "${modelName}" deleted successfully!`);
      await refreshModels();
    } catch (err) {
      setModelError(`Failed to delete model: ${err.message}`);
    }
  };

  const handleExportChats = () => {
    try {
      const backupPayload = {
        version: 2,
        exportedAt: new Date().toISOString(),
        conversations: state.conversations,
        projects: state.projects || [],
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `localllmmind-backup-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  const handleImportChats = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result as string);
        if (Array.isArray(imported)) {
          // Legacy backup format (array of conversations)
          dispatch({ type: 'IMPORT_CONVERSATIONS', payload: imported });
          showCustomAlert({
            title: 'Import Successful',
            message: `Successfully imported ${imported.length} conversations into LocalLLMMind!`,
            type: 'success',
          });
        } else if (imported && Array.isArray(imported.conversations)) {
          // Version 2 backup format (includes projects and conversations)
          dispatch({
            type: 'IMPORT_DATA',
            payload: {
              conversations: imported.conversations,
              projects: Array.isArray(imported.projects) ? imported.projects : [],
            },
          });
          const projCount = imported.projects?.length || 0;
          showCustomAlert({
            title: 'Import Successful',
            message: `Successfully imported ${imported.conversations.length} conversations and ${projCount} project folder(s) into LocalLLMMind!`,
            type: 'success',
          });
        } else {
          showCustomAlert({
            title: 'Invalid Backup File',
            message: 'The selected backup file is invalid. It must contain a valid conversations array.',
            type: 'error',
          });
        }
      } catch (err) {
        showCustomAlert({
          title: 'Import Failed',
          message: `Failed to parse backup file: ${err.message}`,
          type: 'error',
        });
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleClearAllConversations = () => {
    dispatch({ type: 'CLEAR_ALL_CONVERSATIONS' });
    setClearConfirmOpen(false);
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '';
    const gb = bytes / 1e9;
    return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / 1e6).toFixed(0)} MB`;
  };

  const activeSection = SETTINGS_SECTIONS.find((s) => s.id === tab) || SETTINGS_SECTIONS[0];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: 'background.paper',
            borderRadius: isMobile ? 0 : 4,
            border: '1px solid',
            borderColor: 'divider',
            height: isMobile ? '100%' : 660,
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
          },
        },
      }}
    >
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Vertical Navigation Sidebar */}
        <Box
          sx={{
            width: { xs: 68, sm: 220 },
            flexShrink: 0,
            bgcolor: alpha(theme.palette.background.default, 0.6),
            borderRight: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            p: 2,
          }}
        >
          {/* Header */}
          <Box sx={{ mb: 2, px: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'primary.main',
                }}
              >
                <Sliders size={18} />
              </Box>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                  Settings
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
                  Workstation Preferences
                </Typography>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ mb: 1.5 }} />

          {/* Vertical Menu List */}
          <List disablePadding sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {SETTINGS_SECTIONS.map((sec) => {
              const isSelected = tab === sec.id;
              const IconComp = sec.icon;
              return (
                <ListItemButton
                  key={sec.id}
                  selected={isSelected}
                  onClick={() => setTab(sec.id)}
                  sx={{
                    borderRadius: 2.5,
                    px: { xs: 1, sm: 1.5 },
                    py: 1,
                    transition: 'all 0.15s ease',
                    bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
                    color: isSelected ? 'primary.main' : 'text.primary',
                    '&:hover': {
                      bgcolor: isSelected
                        ? alpha(theme.palette.primary.main, 0.16)
                        : alpha(theme.palette.text.primary, 0.04),
                    },
                    '&.Mui-selected': {
                      bgcolor: alpha(theme.palette.primary.main, 0.12),
                      color: 'primary.main',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.16),
                      },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: { xs: 'auto', sm: 30 },
                      color: isSelected ? 'primary.main' : 'text.secondary',
                      mr: { xs: 0, sm: 1 },
                      justifyContent: 'center',
                    }}
                  >
                    <IconComp size={18} />
                  </ListItemIcon>
                  <ListItemText
                    primary={sec.label}
                    slotProps={{
                      primary: {
                        sx: { fontSize: '0.84rem', fontWeight: isSelected ? 700 : 500 },
                      },
                    }}
                    sx={{ display: { xs: 'none', sm: 'block' } }}
                  />
                </ListItemButton>
              );
            })}
          </List>

          <Box sx={{ mt: 'auto', pt: 1.5, display: { xs: 'none', sm: 'flex' }, justifyContent: 'center' }}>
            <DeveloperBadge variant="watermark" />
          </Box>
        </Box>

        {/* Right Content Column */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header with Title + Close */}
          <Box
            sx={{
              px: 3,
              py: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>
                {activeSection?.label || 'Settings'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.74rem' }}>
                {activeSection?.description}
              </Typography>
            </Box>
            <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
              <X size={18} />
            </IconButton>
          </Box>

          {/* Scrollable Content */}
          <DialogContent sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
            {/* Connection Tab */}
            <TabPanel value={tab} index={0}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Ollama Server URL
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              value={localSettings.ollamaUrl}
              onChange={(e) => handleSettingChange('ollamaUrl', e.target.value)}
              placeholder="http://localhost:11434"
            />
            <Button
              variant="outlined"
              onClick={handleTestConnection}
              disabled={testing}
              sx={{ whiteSpace: 'nowrap', minWidth: 100 }}
            >
              {testing ? 'Testing…' : 'Test'}
            </Button>
          </Box>
          {testResult && (
            <Alert
              severity={testResult}
              icon={testResult === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              sx={{ mt: 2, borderRadius: 2 }}
            >
              {testResult === 'success'
                ? 'Successfully connected to Ollama!'
                : 'Cannot reach Ollama. Check the URL and ensure Ollama is running.'}
            </Alert>
          )}

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            System Prompt
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            A system message prepended to every conversation to guide the model&apos;s behavior.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            size="small"
            value={localSettings.systemPrompt}
            onChange={(e) => handleSettingChange('systemPrompt', e.target.value)}
            placeholder="You are a helpful assistant..."
          />
        </TabPanel>

        {/* API Providers & Keys Tab */}
        <TabPanel value={tab} index={1}>
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Online AI Providers &amp; Cloud Models
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Configure API keys for OpenAI, Anthropic Claude, Google Gemini, xAI Grok, Jev (TypeSafe / Typeface), or custom endpoints.
              Keys are stored locally in your browser.
            </Typography>
          </Box>

          <Stack spacing={2}>
            {PROVIDER_CONFIGS.map((provider) => {
              const keyVal = localSettings.apiKeys?.[provider.id] || '';
              const endpointVal = localSettings.apiEndpoints?.[provider.id] || '';
              const isVisible = Boolean(showApiKeys[provider.id]);
              const isTesting = Boolean(testingProvider[provider.id]);
              const result = providerResults[provider.id];
              const hasKey = Boolean(keyVal.trim());

              return (
                <Card
                  key={provider.id}
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    borderColor: hasKey ? alpha(provider.badgeColor || theme.palette.primary.main, 0.4) : 'divider',
                    bgcolor: alpha(theme.palette.background.paper, 0.6),
                    transition: 'border-color 0.2s',
                  }}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    {/* Header: Provider Name + Status */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: 1.5,
                            bgcolor: alpha(provider.badgeColor || theme.palette.primary.main, 0.12),
                            color: provider.badgeColor || theme.palette.primary.main,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Key size={16} />
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
                            {provider.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {provider.description}
                          </Typography>
                        </Box>
                      </Box>

                      <Chip
                        size="small"
                        label={hasKey ? 'Configured' : 'Not Set'}
                        color={hasKey ? 'success' : 'default'}
                        variant={hasKey ? 'filled' : 'outlined'}
                        sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                      />
                    </Box>

                    {/* API Key Input */}
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type={isVisible ? 'text' : 'password'}
                        label={`${provider.name} API Key`}
                        value={keyVal}
                        onChange={(e) => handleApiKeyChange(provider.id, e.target.value)}
                        placeholder={provider.keyPlaceholder}
                        slotProps={{
                          input: {
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  size="small"
                                  onClick={() => setShowApiKeys((prev) => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                                  edge="end"
                                  tabIndex={-1}
                                  sx={{ color: 'text.secondary' }}
                                >
                                  {isVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          },
                        }}
                      />
                      <Button
                        variant="outlined"
                        size="small"
                        disabled={isTesting || !hasKey}
                        onClick={() => handleTestProvider(provider.id)}
                        sx={{ whiteSpace: 'nowrap', minWidth: 90 }}
                      >
                        {isTesting ? <CircularProgress size={14} sx={{ mr: 0.5 }} /> : null}
                        Test
                      </Button>
                    </Box>

                    {/* Test result message if any */}
                    {result && (
                      <Alert
                        severity={result.ok ? 'success' : 'error'}
                        icon={result.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                        sx={{ py: 0.25, px: 1.5, my: 1, fontSize: '0.78rem', alignItems: 'center' }}
                      >
                        {result.message}
                      </Alert>
                    )}

                    {/* Supported Models Preview & Documentation Link */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mt: 1.25 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5, fontSize: '0.72rem' }}>
                          Models:
                        </Typography>
                        {provider.models.slice(0, 4).map((m) => (
                          <Chip
                            key={m.id}
                            label={m.name}
                            size="small"
                            sx={{ height: 18, fontSize: '0.66rem', bgcolor: 'action.hover' }}
                          />
                        ))}
                        {provider.models.length > 4 && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
                            +{provider.models.length - 4} more
                          </Typography>
                        )}
                      </Box>

                      {provider.keyDocumentationUrl && (
                        <Button
                          component="a"
                          href={provider.keyDocumentationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="small"
                          startIcon={<ExternalLink size={12} />}
                          sx={{
                            fontSize: '0.72rem',
                            textTransform: 'none',
                            color: 'text.secondary',
                            p: 0,
                            '&:hover': { color: 'primary.main', bgcolor: 'transparent' },
                          }}
                        >
                          Get API Key
                        </Button>
                      )}
                    </Box>

                    {/* Custom Endpoint override for Custom/OpenAI/Jev/Enterprise */}
                    {(provider.id === PROVIDERS.CUSTOM || provider.id === PROVIDERS.JEV || endpointVal) && (
                      <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px dashed', borderColor: 'divider' }}>
                        <TextField
                          fullWidth
                          size="small"
                          label={provider.id === PROVIDERS.CUSTOM ? 'Base URL (OpenAI-compatible)' : 'Endpoint URL Override (optional)'}
                          value={endpointVal}
                          onChange={(e) => handleApiEndpointChange(provider.id, e.target.value)}
                          placeholder={provider.defaultEndpoint}
                          helperText={provider.id === PROVIDERS.CUSTOM ? 'e.g. https://openrouter.ai/api/v1 or https://api.groq.com/openai/v1' : `Default: ${provider.defaultEndpoint}`}
                          slotProps={{ formHelperText: { sx: { fontSize: '0.68rem' } } }}
                        />
                        {provider.id === PROVIDERS.CUSTOM && (
                          <TextField
                            fullWidth
                            size="small"
                            label="Custom Model Name"
                            value={localSettings.customModelName || ''}
                            onChange={(e) => handleSettingChange('customModelName', e.target.value)}
                            placeholder="deepseek/deepseek-r1 or meta-llama/llama-3.3-70b-instruct"
                            sx={{ mt: 1 }}
                          />
                        )}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        </TabPanel>

        {/* Parameters Tab */}
        <TabPanel value={tab} index={2}>
          <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
            Temperature
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Controls randomness. Lower = more focused, higher = more creative.
          </Typography>
          <Box sx={{ px: 1 }}>
            <Slider
              value={localSettings.temperature}
              onChange={(_, v) => handleSettingChange('temperature', v)}
              min={0}
              max={2}
              step={0.1}
              valueLabelDisplay="auto"
              marks={[
                { value: 0, label: '0' },
                { value: 0.7, label: '0.7' },
                { value: 2, label: '2' },
              ]}
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
            Top P
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Nucleus sampling. 0.9 means consider top 90% probable tokens.
          </Typography>
          <Box sx={{ px: 1 }}>
            <Slider
              value={localSettings.topP}
              onChange={(_, v) => handleSettingChange('topP', v)}
              min={0}
              max={1}
              step={0.05}
              valueLabelDisplay="auto"
              marks={[
                { value: 0, label: '0' },
                { value: 0.9, label: '0.9' },
                { value: 1, label: '1' },
              ]}
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
            Max Tokens
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Maximum number of tokens to generate. 0 means no limit.
          </Typography>
          <TextField
            type="number"
            size="small"
            value={localSettings.maxTokens === 0 ? '' : localSettings.maxTokens}
            placeholder="0 (unlimited)"
            onChange={(e) => {
              const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
              handleSettingChange('maxTokens', val);
            }}
            slotProps={{ htmlInput: { min: 0, step: 256 } }}
            sx={{ width: 170 }}
          />
          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
            Context Window (num_ctx)
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
            Allocates token memory for conversation history and document ingestion. Larger values require more GPU VRAM.
          </Typography>
          <FormControl size="small" fullWidth sx={{ maxWidth: 380 }}>
            <Select
              value={localSettings.contextWindow || 4096}
              onChange={(e) => handleSettingChange('contextWindow', Number(e.target.value))}
            >
              {CONTEXT_WINDOW_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {opt.label} ({opt.value.toLocaleString()} tokens)
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                      {opt.vram}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
            Default AI Persona
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
            Preset role and system instructions applied to newly started conversations.
          </Typography>
          <FormControl size="small" fullWidth sx={{ maxWidth: 380 }}>
            <Select
              value={localSettings.defaultPersona || 'default'}
              onChange={(e) => handleSettingChange('defaultPersona', e.target.value)}
            >
              {AI_PERSONAS.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {p.icon} {p.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', display: 'block' }}>
                      {p.desc}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </TabPanel>

        {/* Models Tab */}
        <TabPanel value={tab} index={3}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Pull a New Model
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
            Enter a model tag from the Ollama Library or click a popular recommendation below:
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="e.g. llama3.2, deepseek-r1:8b"
              value={modelToPull}
              onChange={(e) => setModelToPull(e.target.value)}
              disabled={isPulling}
              onKeyDown={(e) => e.key === 'Enter' && handleStartPull()}
            />
            {isPulling ? (
              <Button
                variant="outlined"
                color="error"
                onClick={handleCancelPull}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Cancel
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={() => handleStartPull()}
                disabled={!modelToPull.trim()}
                startIcon={<Download size={16} />}
                disableElevation
                sx={{ whiteSpace: 'nowrap' }}
              >
                Pull
              </Button>
            )}
          </Box>

          {/* Quick chips */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
            {POPULAR_MODELS.map((item) => {
              const name = typeof item === 'string' ? item : item.name;
              const desc = typeof item === 'string' ? item : item.desc;
              return (
                <Tooltip key={name} title={desc || name} arrow>
                  <Chip
                    label={name}
                    size="small"
                    clickable={!isPulling}
                    onClick={() => setModelToPull(name)}
                    sx={{ fontSize: '0.75rem' }}
                  />
                </Tooltip>
              );
            })}
          </Box>

          {/* Pull progress */}
          {pullProgress && (
            <Box sx={{ mb: 2, p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.06), border: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.2) }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  {pullProgress.status}
                </Typography>
                {pullProgress.percent > 0 && (
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {pullProgress.percent}%
                  </Typography>
                )}
              </Box>
              <LinearProgress
                variant={pullProgress.percent > 0 ? 'determinate' : 'indeterminate'}
                value={pullProgress.percent}
                sx={{ borderRadius: 1, height: 6 }}
              />
            </Box>
          )}

          {modelError && (
            <Alert severity="error" onClose={() => setModelError(null)} sx={{ mb: 2, borderRadius: 2 }}>
              {modelError}
            </Alert>
          )}

          {modelSuccess && (
            <Alert severity="success" onClose={() => setModelSuccess(null)} sx={{ mb: 2, borderRadius: 2 }}>
              {modelSuccess}
            </Alert>
          )}

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Installed Models ({state.models.length})
            </Typography>
            <Button size="small" onClick={refreshModels} sx={{ textTransform: 'none', fontSize: '0.78rem' }}>
              Refresh List
            </Button>
          </Box>

          {state.models.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              No models installed yet. Pull one above to start chatting!
            </Typography>
          ) : (
            <List dense disablePadding sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              {state.models.map((m, idx) => (
                <ListItem
                  key={m.name}
                  divider={idx < state.models.length - 1}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      size="small"
                      color="error"
                      onClick={() => handleDeleteModel(m.name)}
                      title={`Delete ${m.name}`}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  }
                  sx={{ py: 1 }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {m.name}
                        </Typography>
                        {m.details?.parameter_size && (
                          <Chip label={m.details.parameter_size} size="small" sx={{ height: 18, fontSize: '0.68rem' }} />
                        )}
                        {m.details?.quantization_level && (
                          <Chip label={m.details.quantization_level} size="small" sx={{ height: 18, fontSize: '0.68rem', bgcolor: alpha(theme.palette.text.primary, 0.05) }} />
                        )}
                      </Box>
                    }
                    secondary={m.size ? `Size: ${formatBytes(m.size)}` : null}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </TabPanel>

        {/* Shortcuts Tab */}
        <TabPanel value={tab} index={4}>
          <ShortcutsManager />
        </TabPanel>

        {/* Appearance Tab */}
        <TabPanel value={tab} index={5}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 2,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: alpha(theme.palette.background.paper, 0.5),
              }}
            >
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Dark Mode
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {themeMode === 'dark' ? 'Currently using dark theme' : 'Currently using light theme'}
                </Typography>
              </Box>
              <Switch
                checked={themeMode === 'dark'}
                onChange={onThemeToggle}
                color="primary"
              />
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 2,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: alpha(theme.palette.background.paper, 0.5),
              }}
            >
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Show Left Sidebar
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {sidebarOpen
                    ? 'Sidebar is currently visible (Shortcut: ⌘B / Ctrl+B)'
                    : 'Sidebar is currently hidden (Shortcut: ⌘B / Ctrl+B)'}
                </Typography>
              </Box>
              <Switch
                checked={Boolean(sidebarOpen)}
                onChange={onToggleSidebar}
                color="primary"
              />
            </Box>
          </Box>
        </TabPanel>

        {/* Storage & Memory Tab */}
        <TabPanel value={tab} index={6}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* 1. Storage Location Mode */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Chat Storage & Memory Location
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Select where your chat memory and conversation history are persisted on your device.
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                {/* Browser Storage Option */}
                <Box
                  onClick={() => handleSettingChange('memoryStorageMode', 'browser')}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    border: '1.5px solid',
                    borderColor: localSettings.memoryStorageMode === 'browser' ? 'primary.main' : 'divider',
                    bgcolor: localSettings.memoryStorageMode === 'browser' ? alpha(theme.palette.primary.main, 0.06) : alpha(theme.palette.background.paper, 0.4),
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: 'primary.main' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Cloud size={18} color={localSettings.memoryStorageMode === 'browser' ? theme.palette.primary.main : theme.palette.text.secondary} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                        Browser Memory
                      </Typography>
                    </Box>
                    <Chip label="Default" size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.4 }}>
                    Standard sandboxed browser storage. Fast, zero permissions needed.
                  </Typography>
                </Box>

                {/* Local Folder Option */}
                <Box
                  onClick={() => handleSettingChange('memoryStorageMode', 'local_folder')}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    border: '1.5px solid',
                    borderColor: localSettings.memoryStorageMode === 'local_folder' ? 'primary.main' : 'divider',
                    bgcolor: localSettings.memoryStorageMode === 'local_folder' ? alpha(theme.palette.primary.main, 0.06) : alpha(theme.palette.background.paper, 0.4),
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: 'primary.main' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FolderOpen size={18} color={localSettings.memoryStorageMode === 'local_folder' ? theme.palette.primary.main : theme.palette.text.secondary} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                        Local Directory
                      </Typography>
                    </Box>
                    <Chip
                      label={dirHandle ? 'Linked' : 'Custom'}
                      color={dirHandle ? 'success' : 'default'}
                      size="small"
                      sx={{ height: 18, fontSize: '0.65rem' }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.4 }}>
                    Store directly on disk in a folder of your choice with automatic sync.
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Folder Configuration (Shown when local_folder is selected) */}
            {localSettings.memoryStorageMode === 'local_folder' && (
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: alpha(theme.palette.background.paper, 0.6),
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Local Folder Binding
                  </Typography>
                  {dirHandle && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main', boxShadow: '0 0 6px #10b981' }} />
                      <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600 }}>
                        {dirPermission ? 'Ready & Linked' : 'Connected'}
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Directory Selector / Active Directory Card */}
                {dirHandle ? (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2.5,
                      bgcolor: alpha(theme.palette.background.default, 0.6),
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                        <Folder size={24} color={theme.palette.primary.main} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
                            {dirHandle.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {state.conversations.length} conversations · {(state.projects || []).length} projects
                          </Typography>
                        </Box>
                      </Box>
                      <Tooltip title="Disconnect folder">
                        <IconButton size="small" onClick={handleDisconnectDirectory} sx={{ color: 'text.secondary' }}>
                          <X size={16} />
                        </IconButton>
                      </Tooltip>
                    </Box>

                    {/* Action buttons */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={syncingDir ? <CircularProgress size={14} color="inherit" /> : <RotateCw size={14} />}
                        onClick={handleManualSync}
                        disabled={syncingDir}
                        disableElevation
                      >
                        {syncingDir ? 'Syncing…' : 'Sync to Folder Now'}
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={loadingDir ? <CircularProgress size={14} color="inherit" /> : <FolderOpen size={14} />}
                        onClick={handleRestoreFromDirectory}
                        disabled={loadingDir}
                      >
                        {loadingDir ? 'Loading…' : 'Load from Folder'}
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<FolderInput size={14} />}
                        onClick={handleSelectDirectory}
                      >
                        Change Folder
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 2.5,
                      border: '1.5px dashed',
                      borderColor: 'divider',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 1.5,
                    }}
                  >
                    <FolderOpen size={32} color={theme.palette.text.secondary} style={{ opacity: 0.6 }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        No local directory selected yet
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Choose any folder on your hard drive to store conversations and projects.
                      </Typography>
                    </Box>
                    {fsSupported ? (
                      <Button
                        variant="contained"
                        startIcon={<FolderOpen size={16} />}
                        onClick={handleSelectDirectory}
                        disableElevation
                      >
                        Select Directory on Computer
                      </Button>
                    ) : (
                      <Alert severity="info" sx={{ width: '100%', textAlign: 'left', borderRadius: 2 }}>
                        Direct folder access requires Chrome, Edge, Brave, or Arc. You can specify your target memory path below for your records and backup files.
                      </Alert>
                    )}
                  </Box>
                )}

                {/* Custom Memory Path Input */}
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.5, display: 'block' }}>
                    Memory Path (Custom Location)
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={localSettings.customMemoryPath || ''}
                    onChange={(e) => handleSettingChange('customMemoryPath', e.target.value)}
                    placeholder="e.g. ~/Documents/LocalLLM_Memory or /Volumes/Drive/AI_Chats"
                    helperText="Specify the designated path on your machine where chats should be archived."
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <Folder size={16} color={theme.palette.text.secondary} />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </Box>

                {/* Auto Sync Switch */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Auto-sync to local folder
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Automatically update disk files when new messages are added or chats are renamed.
                    </Typography>
                  </Box>
                  <Switch
                    checked={localSettings.autoSyncFolder !== false}
                    onChange={(e) => handleSettingChange('autoSyncFolder', e.target.checked)}
                    color="primary"
                  />
                </Box>

                {/* Markdown Copies Switch */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Generate readable Markdown files
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Writes each conversation as a `.md` file in the `chats/` subfolder for Obsidian, VS Code, and Notes.
                    </Typography>
                  </Box>
                  <Switch
                    checked={localSettings.saveMarkdownCopies !== false}
                    onChange={(e) => handleSettingChange('saveMarkdownCopies', e.target.checked)}
                    color="primary"
                  />
                </Box>
              </Box>
            )}

            <Divider />

            {/* 2. Manual Backup & Restore */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Manual JSON Backup & Restore
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Download a portable JSON snapshot or restore previous chat files.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button variant="outlined" startIcon={<Download size={16} />} onClick={handleExportChats} fullWidth>
                  Export Backup
                </Button>
                <Button variant="outlined" component="label" startIcon={<Upload size={16} />} fullWidth>
                  Import Backup
                  <input type="file" accept=".json" hidden onChange={handleImportChats} />
                </Button>
              </Box>
            </Box>

            <Divider />

            {/* 3. Danger Zone */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'error.main', mb: 0.5 }}>
                Danger Zone
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Permanently delete all stored chats and message histories from this browser.
              </Typography>
              <Button
                variant="outlined"
                color="error"
                startIcon={<AlertTriangle size={16} />}
                onClick={() => setClearConfirmOpen(true)}
              >
                Clear All Conversations
              </Button>
            </Box>
          </Box>
        </TabPanel>

          </DialogContent>

          {/* Clean Footer */}
          <DialogActions
            sx={{
              px: 3,
              py: 2,
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: alpha(theme.palette.background.default, 0.4),
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 1.5,
            }}
          >
            <Button onClick={onClose} color="inherit" sx={{ textTransform: 'none', fontWeight: 600 }}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              disableElevation
              sx={{ textTransform: 'none', fontWeight: 600, px: 2.5 }}
            >
              Save Settings
            </Button>
          </DialogActions>
        </Box>
      </Box>

      {/* Confirmation Dialog for Clearing Conversations */}
      <Dialog
        open={clearConfirmOpen}
        onClose={() => setClearConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Delete All Conversations?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to permanently clear all conversations? All chats will be lost unless you have exported a backup.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setClearConfirmOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleClearAllConversations} variant="contained" color="error" disableElevation>
            Delete Everything
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}

