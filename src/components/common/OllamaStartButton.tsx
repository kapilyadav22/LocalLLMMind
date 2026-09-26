import { useState, memo } from 'react';
import { Button, CircularProgress } from '@mui/material';
import { Play } from 'lucide-react';
import { localAction, isDefaultLocalOllama } from '../../services/localControlService';
import { checkConnection, fetchModels } from '../../services/ollamaService';
import { useChatStore } from '../../store/chatContext';

function OllamaStartButtonComponent() {
  const { state, dispatch } = useChatStore();
  const [starting, setStarting] = useState(false);
  const local = isDefaultLocalOllama(state.settings.ollamaUrl);

  const start = async () => {
    setStarting(true);
    try {
      await localAction('ollama/start');
      const connected = await checkConnection(state.settings.ollamaUrl);
      dispatch({ type: 'SET_CONNECTED', payload: connected });
      if (!connected) throw new Error('Ollama started, but the connection is not ready. Click Retry in a few seconds.');
      dispatch({ type: 'SET_MODELS', payload: await fetchModels(state.settings.ollamaUrl) });
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: null });
    } catch (error: any) {
      window.dispatchEvent(new CustomEvent('llm-toast', { detail: { severity: 'error', message: error.message } }));
    } finally {
      setStarting(false);
    }
  };

  return (
    <Button
      size="small"
      variant="contained"
      disabled={!local || starting}
      onClick={start}
      title={local ? 'Start the installed Ollama server on this computer' : 'Remote Ollama servers must be started on their host'}
      startIcon={starting ? <CircularProgress size={14} color="inherit" /> : <Play size={14} />}
      sx={{ flexShrink: 0 }}
    >
      {starting ? 'Starting Ollama…' : 'Start Ollama'}
    </Button>
  );
}

const OllamaStartButton = memo(OllamaStartButtonComponent);
export default OllamaStartButton;
