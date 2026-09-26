import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress,
  alpha,
  useTheme,
} from '@mui/material';
import { Key, Eye, EyeOff, ExternalLink, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { getProviderConfig, PROVIDERS } from '../../constants/apiProviders';
import { testProviderConnection } from '../../services/aiProviderService';
import { useChatStore } from '../../store/chatContext';
import { showToast } from '../../utils/toast';

export interface ApiKeyDialogProps {
  open: boolean;
  onClose: () => void;
  providerId?: any;
  modelName?: string;
  onSuccess?: (key?: string) => void;
  onOpenFullSettings?: () => void;
}

export default function ApiKeyDialog({
  open,
  onClose,
  providerId = PROVIDERS.OPENAI,
  modelName = "",
  onSuccess,
  onOpenFullSettings,
}: ApiKeyDialogProps) {
  const theme = useTheme();
  const { state, dispatch } = useChatStore();
  const provider = getProviderConfig(providerId) || getProviderConfig(PROVIDERS.OPENAI);

  const existingKey = state.settings.apiKeys?.[providerId] || '';
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (open) {
      setApiKey(existingKey);
      setTestResult(null);
      setShowKey(false);
    }
  }, [open, existingKey]);

  const handleTest = async () => {
    if (!apiKey.trim()) {
      setTestResult({ ok: false, message: 'Please enter an API key first' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testProviderConnection(
        providerId,
        apiKey.trim(),
        state.settings.apiEndpoints?.[providerId]
      );
      setTestResult(res);
    } catch (err) {
      setTestResult({ ok: false, message: err.message || 'Connection test failed' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setTestResult({ ok: false, message: 'API key cannot be empty' });
      return;
    }

    const updatedKeys = {
      ...(state.settings.apiKeys || {}),
      [providerId]: trimmed,
    };

    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: { apiKeys: updatedKeys },
    });

    showToast(`${provider.name} API key saved!`, 'success');
    onSuccess?.(trimmed);
    onClose?.();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2.5,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            backgroundImage: 'none',
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2.5,
          py: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 2,
              bgcolor: alpha(provider.badgeColor || theme.palette.primary.main, 0.12),
              color: provider.badgeColor || theme.palette.primary.main,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Key size={18} />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {provider.name} API Key
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Cloud Model Authentication
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <X size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, py: 2.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.5 }}>
          To chat with {modelName ? <strong>{modelName}</strong> : 'this model'}, an API key for{' '}
          <strong>{provider.name}</strong> is required. Keys are stored locally in your browser.
        </Typography>

        <TextField
          fullWidth
          size="small"
          label={`${provider.name} API Key`}
          type={showKey ? 'text' : 'password'}
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            setTestResult(null);
          }}
          placeholder={provider.keyPlaceholder}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
          }}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setShowKey((prev) => !prev)}
                    edge="end"
                    tabIndex={-1}
                    sx={{ color: 'text.secondary' }}
                  >
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
          sx={{ mb: 1.5 }}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          {provider.keyDocumentationUrl ? (
            <Button
              component="a"
              href={provider.keyDocumentationUrl}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              startIcon={<ExternalLink size={13} />}
              sx={{
                fontSize: '0.75rem',
                textTransform: 'none',
                color: 'text.secondary',
                p: 0,
                '&:hover': { color: 'primary.main', bgcolor: 'transparent' },
              }}
            >
              Get {provider.name} Key
            </Button>
          ) : <Box />}

          <Button
            size="small"
            variant="outlined"
            onClick={handleTest}
            disabled={testing || !apiKey.trim()}
            sx={{ fontSize: '0.75rem', py: 0.25, px: 1.25 }}
          >
            {testing ? <CircularProgress size={12} sx={{ mr: 0.5 }} /> : null}
            Test Key
          </Button>
        </Box>

        {testResult && (
          <Alert
            severity={testResult.ok ? 'success' : 'error'}
            icon={testResult.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            sx={{ py: 0.5, fontSize: '0.8rem', alignItems: 'center' }}
          >
            {testResult.message}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.75, borderTop: '1px solid', borderColor: 'divider', gap: 1 }}>
        {onOpenFullSettings && (
          <Button
            size="small"
            color="inherit"
            onClick={() => {
              onClose?.();
              onOpenFullSettings();
            }}
            sx={{ mr: 'auto', fontSize: '0.8rem', color: 'text.secondary' }}
          >
            All Providers
          </Button>
        )}
        <Button size="small" onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={handleSave}
          disabled={!apiKey.trim()}
        >
          Save &amp; Continue
        </Button>
      </DialogActions>
    </Dialog>
  );
}
