import { useEffect } from 'react';
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
import { useChatStore } from '../../store/chatStore';

export default function ModelSelector({ value, onChange, size = 'small', variant = 'standard' }) {
  const { state, dispatch } = useChatStore();

  useEffect(() => {
    const loadModels = async () => {
      try {
        const models = await fetchModels(state.settings.ollamaUrl);
        dispatch({ type: 'SET_MODELS', payload: models });
      } catch (err) {
        console.error('Failed to fetch models:', err);
      }
    };

    if (state.isConnected) {
      loadModels();
    }
  }, [state.isConnected, state.settings.ollamaUrl, dispatch]);

  const formatSize = (bytes) => {
    if (!bytes) return '';
    const gb = bytes / 1e9;
    return gb >= 1 ? `${gb.toFixed(1)}GB` : `${(bytes / 1e6).toFixed(0)}MB`;
  };

  if (state.models.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {state.isConnected ? (
          <CircularProgress size={16} />
        ) : (
          <Typography variant="caption" color="text.secondary">
            No models available
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
