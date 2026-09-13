import { useEffect, useState } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Box,
  Typography,
  Chip,
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { fetchModels } from '../../services/ollamaService';
import { useChatStore } from '../../store/chatContext';

export default function ModelSelector({ value, onChange, size = 'small', variant = 'standard' }) {
  const { state, dispatch } = useChatStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadModels = async () => {
      setLoading(true);
      try {
        const models = await fetchModels(state.settings.ollamaUrl);
        if (isMounted) dispatch({ type: 'SET_MODELS', payload: models });
      } catch (err) {
        if (isMounted) console.error('Failed to fetch models:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (state.isConnected) {
      loadModels();
    }
    return () => { isMounted = false; };
  }, [state.isConnected, state.settings.ollamaUrl, dispatch]);

  const formatSize = (bytes) => {
    if (!bytes) return '';
    const gb = bytes / 1e9;
    return gb >= 1 ? `${gb.toFixed(1)}GB` : `${(bytes / 1e6).toFixed(0)}MB`;
  };

  const hasSelected = state.models.some((m) => m.name === value);

  if (state.models.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {loading ? (
          <CircularProgress size={16} />
        ) : (
          <Typography variant="caption" color="text.secondary">
            {state.isConnected ? 'No models (pull in Settings)' : 'Disconnected'}
          </Typography>
        )}
      </Box>
    );
  }

  if (variant === 'chip') {
    return (
      <FormControl size={size} sx={{ minWidth: 160 }}>
        <Select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          displayEmpty
          variant="outlined"
          sx={{
            borderRadius: 3,
            fontSize: '0.85rem',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'divider',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'primary.main',
            },
            '& .MuiSelect-select': {
              py: 0.75,
              pl: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            },
          }}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <SmartToyIcon sx={{ fontSize: 16, color: 'primary.main' }} />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {selected || 'Select model'}
              </Typography>
            </Box>
          )}
        >
          {!hasSelected && value && (
            <MenuItem value={value} disabled>
              <Typography variant="body2" color="text.secondary">
                {value} (not installed)
              </Typography>
            </MenuItem>
          )}
          {state.models.map((model) => (
            <MenuItem key={model.name} value={model.name}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <Typography variant="body2">{model.name}</Typography>
                {model.size && (
                  <Chip
                    label={formatSize(model.size)}
                    size="small"
                    sx={{ ml: 2, height: 20, fontSize: '0.7rem' }}
                  />
                )}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }

  return (
    <FormControl size={size} fullWidth>
      <InputLabel>Model</InputLabel>
      <Select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        label="Model"
      >
        {!hasSelected && value && (
          <MenuItem value={value} disabled>
            <Typography variant="body2" color="text.secondary">
              {value} (not installed)
            </Typography>
          </MenuItem>
        )}
        {state.models.map((model) => (
          <MenuItem key={model.name} value={model.name}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <Typography variant="body2">{model.name}</Typography>
              {model.size && (
                <Chip
                  label={formatSize(model.size)}
                  size="small"
                  sx={{ ml: 2, height: 20, fontSize: '0.7rem' }}
                />
              )}
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
