import { useState, useMemo, useCallback, memo } from 'react';
import {
  FormControl,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  alpha,
  useTheme,
  Stack,
  Tooltip,
} from '@mui/material';
import { Bot, Key, Cloud, HardDrive, CheckCircle2, AlertCircle } from 'lucide-react';
import { useChatStore } from '../../store/chatContext';
import { PROVIDERS, PROVIDER_CONFIGS, resolveModelProvider } from '../../constants/apiProviders';
import { DEFAULT_MODEL_BY_PROVIDER } from '../../constants/models';
import ApiKeyDialog from './ApiKeyDialog';

const ALL_PROVIDERS = [
  { id: PROVIDERS.OPENAI, name: 'OpenAI', shortName: 'OpenAI', color: '#10a37f' },
  { id: PROVIDERS.ANTHROPIC, name: 'Anthropic Claude', shortName: 'Claude', color: '#d97706' },
  { id: PROVIDERS.GEMINI, name: 'Google Gemini', shortName: 'Gemini', color: '#3b82f6' },
  { id: PROVIDERS.GROK, name: 'xAI Grok', shortName: 'Grok', color: '#8b5cf6' },
  { id: PROVIDERS.OLLAMA, name: 'Ollama (Local)', shortName: 'Ollama', color: '#64748b' },
  { id: PROVIDERS.JEV, name: 'Jev (TypeSafe)', shortName: 'Jev', color: '#ec4899' },
  { id: PROVIDERS.CUSTOM, name: 'Custom / OpenRouter', shortName: 'Custom', color: '#0ea5e9' },
];

function ModelSelectorComponent({
  value,
  onChange,
  size = 'small',
  variant = 'chip', // 'chip' | 'standard' | 'stacked'
  onOpenSettings,
  disabled = false,
}) {
  const theme = useTheme();
  const { state } = useChatStore();
  const [apiKeyDialogTarget, setApiKeyDialogTarget] = useState(null);

  const localModels = state.models || [];
  const apiKeys = state.settings.apiKeys || {};

  // Resolve current active provider
  const currentProviderInfo = useMemo(() => {
    return resolveModelProvider(value, localModels);
  }, [value, localModels]);

  const activeProviderId = currentProviderInfo.provider || PROVIDERS.OPENAI;

  // Models available for active provider
  const availableModelsForProvider = useMemo(() => {
    if (activeProviderId === PROVIDERS.OLLAMA) {
      return localModels.map((m) => ({
        id: m.name,
        name: m.name,
        context: m.size ? `${(m.size / 1e9).toFixed(1)}GB` : 'Local',
        description: 'Locally hosted model in Ollama',
        badge: 'Local',
        badgeColor: '#64748b',
      }));
    }

    const config = PROVIDER_CONFIGS.find((p) => p.id === activeProviderId);
    return config ? config.models : [];
  }, [activeProviderId, localModels]);

  // Check if a provider has its required API key
  const hasProviderKey = useCallback(
    (providerId) => {
      if (providerId === PROVIDERS.OLLAMA) return state.isConnected;
      return Boolean(apiKeys[providerId]?.trim());
    },
    [apiKeys, state.isConnected]
  );

  // Switch provider handler
  const handleProviderChange = (e) => {
    const newProvider = e.target.value;
    let nextModel = '';

    if (newProvider === PROVIDERS.OLLAMA) {
      nextModel = localModels[0]?.name || '';
    } else {
      const cfg = PROVIDER_CONFIGS.find((p) => p.id === newProvider);
      nextModel = DEFAULT_MODEL_BY_PROVIDER[newProvider] || cfg?.models[0]?.id || '';
    }

    if (nextModel) {
      onChange(nextModel);
      if (newProvider !== PROVIDERS.OLLAMA && !hasProviderKey(newProvider)) {
        setApiKeyDialogTarget({
          providerId: newProvider,
          modelName: nextModel,
        });
      }
    }
  };

  // Switch model handler
  const handleModelChange = (e) => {
    const selected = e.target.value;
    onChange(selected);

    if (activeProviderId !== PROVIDERS.OLLAMA && !hasProviderKey(activeProviderId)) {
      setApiKeyDialogTarget({
        providerId: activeProviderId,
        modelName: selected,
      });
    }
  };

  const currentHasKey = hasProviderKey(activeProviderId);
  const activeProviderMeta = ALL_PROVIDERS.find((p) => p.id === activeProviderId) || ALL_PROVIDERS[0];

  // Active model metadata for display
  const activeModelMeta = useMemo(() => {
    return availableModelsForProvider.find((m) => m.id === value) || {
      name: value || 'Select model',
      context: '',
      description: '',
    };
  }, [availableModelsForProvider, value]);

  // Compact Chip Layout (Side by Side Provider + Model pills)
  if (variant === 'chip') {
    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
        {/* Provider Dropdown */}
        <FormControl size={size}>
          <Select
            value={activeProviderId}
            onChange={handleProviderChange}
            disabled={disabled}
            displayEmpty
            variant="outlined"
            MenuProps={{
              PaperProps: {
                sx: {
                  maxHeight: 380,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  boxShadow: theme.shadows[4],
                },
              },
            }}
            sx={{
              borderRadius: 2,
              fontSize: '0.78rem',
              bgcolor: alpha(activeProviderMeta.color, 0.08),
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: alpha(activeProviderMeta.color, 0.25),
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: activeProviderMeta.color,
              },
              '& .MuiSelect-select': {
                py: 0.5,
                pl: 1,
                pr: 3.2,
                display: 'flex',
                alignItems: 'center',
                gap: 0.6,
              },
            }}
            renderValue={(val) => {
              const p = ALL_PROVIDERS.find((item) => item.id === val);
              return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                  {val === PROVIDERS.OLLAMA ? (
                    <HardDrive size={13} color={p?.color || '#64748b'} />
                  ) : (
                    <Cloud size={13} color={p?.color || '#3b82f6'} />
                  )}
                  <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.78rem', color: p?.color }}>
                    {p?.shortName || val}
                  </Typography>
                </Box>
              );
            }}
          >
            {ALL_PROVIDERS.map((prov) => {
              const ready = hasProviderKey(prov.id);
              return (
                <MenuItem key={prov.id} value={prov.id} sx={{ py: 0.75, px: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: prov.color,
                          flexShrink: 0,
                        }}
                      />
                      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.82rem' }}>
                        {prov.name}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={ready ? (prov.id === PROVIDERS.OLLAMA ? 'Local' : 'Ready') : 'Key'}
                      sx={{
                        height: 16,
                        fontSize: '0.62rem',
                        fontWeight: 600,
                        bgcolor: ready ? alpha(theme.palette.success.main, 0.12) : alpha(theme.palette.warning.main, 0.12),
                        color: ready ? 'success.main' : 'warning.main',
                      }}
                    />
                  </Box>
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>

        {/* Model Dropdown for that Provider */}
        <FormControl size={size} sx={{ minWidth: 150, maxWidth: 260 }}>
          <Select
            value={value || ''}
            onChange={handleModelChange}
            disabled={disabled}
            displayEmpty
            variant="outlined"
            MenuProps={{
              PaperProps: {
                sx: {
                  maxHeight: 420,
                  minWidth: 280,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  boxShadow: theme.shadows[4],
                },
              },
            }}
            sx={{
              borderRadius: 2,
              fontSize: '0.8rem',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'divider',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'primary.main',
              },
              '& .MuiSelect-select': {
                py: 0.5,
                pl: 1,
                pr: 3.5,
                display: 'flex',
                alignItems: 'center',
                gap: 0.6,
              },
            }}
            renderValue={() => (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, minWidth: 0 }}>
                <Bot size={14} color="var(--mui-palette-primary-main, #3b82f6)" />
                <Typography variant="body2" noWrap sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                  {activeModelMeta.name}
                </Typography>
                {!currentHasKey && activeProviderId !== PROVIDERS.OLLAMA && (
                  <Tooltip title="API key required for this provider">
                    <Key size={12} color={theme.palette.warning.main} />
                  </Tooltip>
                )}
              </Box>
            )}
          >
            {availableModelsForProvider.length === 0 ? (
              <MenuItem disabled sx={{ fontSize: '0.8rem', fontStyle: 'italic' }}>
                {activeProviderId === PROVIDERS.OLLAMA ? 'No local models downloaded' : 'No models available'}
              </MenuItem>
            ) : (
              availableModelsForProvider.map((m) => {
                const isSelected = value === m.id;
                return (
                  <MenuItem key={m.id} value={m.id} sx={{ py: 0.8, px: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 1 }}>
                      <Box sx={{ minWidth: 0, mr: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Typography variant="body2" sx={{ fontWeight: isSelected ? 600 : 500, fontSize: '0.82rem' }}>
                            {m.name}
                          </Typography>
                          {m.badge && (
                            <Chip
                              size="small"
                              label={m.badge}
                              sx={{
                                height: 16,
                                fontSize: '0.6rem',
                                fontWeight: 600,
                                bgcolor: alpha(m.badgeColor || '#3b82f6', 0.12),
                                color: m.badgeColor || 'primary.main',
                              }}
                            />
                          )}
                        </Box>
                        {m.description && (
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', fontSize: '0.68rem', mt: 0.2 }}>
                            {m.description}
                          </Typography>
                        )}
                      </Box>
                      {m.context && (
                        <Chip
                          label={m.context}
                          size="small"
                          sx={{ height: 18, fontSize: '0.64rem', bgcolor: 'action.hover', flexShrink: 0 }}
                        />
                      )}
                    </Box>
                  </MenuItem>
                );
              })
            )}
          </Select>
        </FormControl>

        {apiKeyDialogTarget && (
          <ApiKeyDialog
            open={Boolean(apiKeyDialogTarget)}
            onClose={() => setApiKeyDialogTarget(null)}
            providerId={apiKeyDialogTarget.providerId}
            modelName={apiKeyDialogTarget.modelName}
            onOpenFullSettings={onOpenSettings}
          />
        )}
      </Box>
    );
  }

  // Stacked / Form Layout (e.g. in Settings or AI Right Sidebar)
  return (
    <Stack spacing={1.25} sx={{ width: '100%' }}>
      {/* Provider Selector */}
      <Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5, display: 'block' }}>
          Provider
        </Typography>
        <FormControl size={size} fullWidth>
          <Select
            value={activeProviderId}
            onChange={handleProviderChange}
            disabled={disabled}
            sx={{ borderRadius: 1.5, fontSize: '0.84rem' }}
          >
            {ALL_PROVIDERS.map((prov) => {
              const ready = hasProviderKey(prov.id);
              return (
                <MenuItem key={prov.id} value={prov.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: prov.color }} />
                      <Typography variant="body2">{prov.name}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {ready ? (
                        <CheckCircle2 size={13} color={theme.palette.success.main} />
                      ) : (
                        <AlertCircle size={13} color={theme.palette.warning.main} />
                      )}
                      <Typography variant="caption" sx={{ fontSize: '0.68rem', color: ready ? 'success.main' : 'warning.main' }}>
                        {ready ? 'Ready' : 'Key Needed'}
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
      </Box>

      {/* Model Selector for that Provider */}
      <Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5, display: 'block' }}>
          Model
        </Typography>
        <FormControl size={size} fullWidth>
          <Select
            value={value || ''}
            onChange={handleModelChange}
            disabled={disabled}
            MenuProps={{
              PaperProps: {
                sx: { maxHeight: 380, borderRadius: 2 },
              },
            }}
            sx={{ borderRadius: 1.5, fontSize: '0.84rem' }}
          >
            {availableModelsForProvider.length === 0 ? (
              <MenuItem disabled sx={{ fontSize: '0.82rem', fontStyle: 'italic' }}>
                {activeProviderId === PROVIDERS.OLLAMA ? 'No local models downloaded' : 'No models configured'}
              </MenuItem>
            ) : (
              availableModelsForProvider.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <Box sx={{ minWidth: 0, mr: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: value === m.id ? 600 : 400 }}>
                        {m.name}
                      </Typography>
                      {m.description && (
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', fontSize: '0.68rem' }}>
                          {m.description}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
                      {m.badge && (
                        <Chip
                          label={m.badge}
                          size="small"
                          sx={{ height: 18, fontSize: '0.64rem', bgcolor: alpha(m.badgeColor || '#3b82f6', 0.12), color: m.badgeColor || 'primary.main' }}
                        />
                      )}
                      {m.context && (
                        <Chip
                          label={m.context}
                          size="small"
                          sx={{ height: 18, fontSize: '0.64rem', bgcolor: 'action.hover' }}
                        />
                      )}
                    </Box>
                  </Box>
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>
      </Box>

      {apiKeyDialogTarget && (
        <ApiKeyDialog
          open={Boolean(apiKeyDialogTarget)}
          onClose={() => setApiKeyDialogTarget(null)}
          providerId={apiKeyDialogTarget.providerId}
          modelName={apiKeyDialogTarget.modelName}
          onOpenFullSettings={onOpenSettings}
        />
      )}
    </Stack>
  );
}

const ModelSelector = memo(ModelSelectorComponent);
export default ModelSelector;
