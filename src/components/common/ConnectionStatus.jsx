import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Chip,
  Tooltip,
  CircularProgress,
  Box,
} from '@mui/material';
import { RotateCw } from 'lucide-react';
import { checkConnection, fetchModels } from '../../services/ollamaService';
import { useChatStore } from '../../store/chatContext';

export default function ConnectionStatus() {
  const { state, dispatch } = useChatStore();
  const [checking, setChecking] = useState(false);
  const checkingRef = useRef(false);

  const runCheck = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    setChecking(true);
    dispatch({ type: 'SET_CONNECTION_ERROR', payload: null });

    try {
      const connected = await checkConnection(state.settings.ollamaUrl);
      dispatch({ type: 'SET_CONNECTED', payload: connected });

      if (connected) {
        // Also fetch models on successful connection
        try {
          const models = await fetchModels(state.settings.ollamaUrl);
          dispatch({ type: 'SET_MODELS', payload: models });
          if (models.length === 0) {
            dispatch({
              type: 'SET_CONNECTION_ERROR',
              payload: 'Connected but no models found. Pull a model with: ollama pull llama3',
            });
          }
        } catch (err) {
          dispatch({ type: 'SET_CONNECTION_ERROR', payload: `Connected but failed to list models: ${err.message}` });
        }
      } else {
        dispatch({
          type: 'SET_CONNECTION_ERROR',
          payload: `Cannot reach Ollama at ${state.settings.ollamaUrl}. Make sure Ollama is running.`,
        });
      }
    } catch (err) {
      dispatch({ type: 'SET_CONNECTED', payload: false });
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: err.message });
    } finally {
      checkingRef.current = false;
      setChecking(false);
    }
  }, [state.settings.ollamaUrl, dispatch]);

  // Initial check + periodic polling
  useEffect(() => {
    runCheck();
    const interval = setInterval(runCheck, 30000);
    return () => clearInterval(interval);
  }, [runCheck]);

  const statusLabel = checking
    ? 'Checking…'
    : state.isConnected
      ? 'Connected'
      : 'Disconnected';

  const tooltipText = checking
    ? `Checking connection to ${state.settings.ollamaUrl}…`
    : state.isConnected
      ? `Connected to ${state.settings.ollamaUrl} · ${state.models.length} model(s) available`
      : state.connectionError || `Cannot reach Ollama at ${state.settings.ollamaUrl}`;

  return (
    <Tooltip title={tooltipText}>
      <Chip
        icon={
          checking ? (
            <CircularProgress size={12} sx={{ ml: 0.5 }} />
          ) : (
            <Box
              component="span"
              sx={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                bgcolor: state.isConnected ? '#22c55e' : '#ef4444',
                boxShadow: state.isConnected ? '0 0 6px rgba(34, 197, 94, 0.4)' : 'none',
                ml: 1,
              }}
            />
          )
        }
        label={statusLabel}
        size="small"
        variant="outlined"
        onClick={!checking ? runCheck : undefined}
        deleteIcon={!checking && !state.isConnected ? <RotateCw size={13} style={{ marginRight: 6 }} /> : undefined}
        onDelete={!checking && !state.isConnected ? runCheck : undefined}
        sx={{
          borderColor: checking
            ? 'text.secondary'
            : state.isConnected
              ? 'success.main'
              : 'error.main',
          color: 'text.secondary',
          fontSize: '0.75rem',
          height: 28,
          cursor: 'pointer',
          '& .MuiChip-icon': { ml: 0.5 },
          '& .MuiChip-deleteIcon': {
            color: 'text.secondary',
            '&:hover': { color: 'error.main' },
          },
          transition: 'all 0.2s ease',
        }}
      />
    </Tooltip>
  );
}
