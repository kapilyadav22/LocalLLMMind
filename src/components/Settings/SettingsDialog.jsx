import { useState } from 'react';
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
  FormControlLabel,
  Alert,
  Tabs,
  Tab,
  alpha,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LinkIcon from '@mui/icons-material/Link';
import TuneIcon from '@mui/icons-material/Tune';
import PaletteIcon from '@mui/icons-material/Palette';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import BackupIcon from '@mui/icons-material/Backup';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import { checkConnection } from '../../services/ollamaService';
import { useChatStore } from '../../store/chatStore';

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ py: 3 }}>{children}</Box> : null;
}

export default function SettingsDialog({ open, onClose, themeMode, onThemeToggle }) {
  const { state, dispatch } = useChatStore();
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  // Local settings state
  const [localSettings, setLocalSettings] = useState({ ...state.settings });

  const handleSettingChange = (key, value) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
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
    setTesting(false);
  };

  const handleExportChats = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.conversations, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `llm-chat-history-${new Date().toISOString().slice(0,10)}.json`);
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
        const imported = JSON.parse(e.target.result);
        if (Array.isArray(imported)) {
          dispatch({ type: 'IMPORT_CONVERSATIONS', payload: imported });
          alert(`Successfully imported ${imported.length} conversations!`);
        } else {
          alert('Invalid backup file. Must contain an array of conversations.');
        }
      } catch (err) {
        alert(`Failed to parse backup file: ${err.message}`);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 0,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Settings
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box sx={{ px: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              minWidth: 0,
              px: 2,
            },
          }}
        >
          <Tab icon={<LinkIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Connection" />
          <Tab icon={<TuneIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Parameters" />
          <Tab icon={<PaletteIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Appearance" />
          <Tab icon={<BackupIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Data" />
        </Tabs>
      </Box>

      <DialogContent sx={{ px: 3 }}>
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
              icon={testResult === 'success' ? <CheckCircleIcon /> : <ErrorIcon />}
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

        {/* Parameters Tab */}
        <TabPanel value={tab} index={1}>
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
            value={localSettings.maxTokens}
            onChange={(e) => handleSettingChange('maxTokens', parseInt(e.target.value) || 0)}
            inputProps={{ min: 0, step: 256 }}
            sx={{ width: 150 }}
          />
        </TabPanel>

        {/* Appearance Tab */}
        <TabPanel value={tab} index={2}>
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
        </TabPanel>

        {/* Data Tab */}
        <TabPanel value={tab} index={3}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Backup & Restore
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Export your chat history, active configurations, and custom settings as a backup file, or upload an existing backup to restore conversations.
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleExportChats}
                fullWidth
              >
                Export Backup
              </Button>

              <Button
                variant="outlined"
                component="label"
                startIcon={<UploadIcon />}
                fullWidth
              >
                Import Backup
                <input
                  type="file"
                  accept=".json"
                  hidden
                  onChange={handleImportChats}
                />
              </Button>
            </Box>
          </Box>
        </TabPanel>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disableElevation>
          Save Settings
        </Button>
      </DialogActions>
    </Dialog>
  );
}
