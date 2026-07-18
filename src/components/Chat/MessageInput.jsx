import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  IconButton,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
  Fade,
  Alert,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import ModelSelector from '../common/ModelSelector';
import { useChatStore } from '../../store/chatStore';
import { useVoiceInput } from '../../hooks/useAudio';

const PROMPT_TEMPLATES = [
  { command: '/summarize', label: 'Summarize text', text: 'Summarize the following text briefly and capture the key takeaways:\n\n' },
  { command: '/refactor', label: 'Refactor code', text: 'Refactor the following code to make it cleaner, more efficient, and follow best practices:\n\n' },
  { command: '/explain', label: 'Explain concept', text: 'Explain how the following code/concept works in simple terms:\n\n' },
  { command: '/translate', label: 'Translate to English', text: 'Translate the following text to English:\n\n' },
  { command: '/debug', label: 'Debug code', text: 'Identify any bugs, issues, or security flaws in the following code and provide fixes:\n\n' },
];

export default function MessageInput({ onSend, onStop, disabled }) {
  const [input, setInput] = useState('');
  const [interimText, setInterimText] = useState('');
  const inputRef = useRef(null);
  const theme = useTheme();
  const { state, getActiveConversation, dispatch } = useChatStore();
  const activeConvo = getActiveConversation();
  const currentModel = activeConvo?.model || state.settings.selectedModel || (state.models[0]?.name ?? '');

  // Voice input
  const {
    isListening,
    isSupported: isMicSupported,
    error: micError,
    toggleListening,
  } = useVoiceInput({
    onResult: (transcript) => {
      setInput((prev) => {
        const separator = prev && !prev.endsWith(' ') ? ' ' : '';
        return prev + separator + transcript;
      });
      setInterimText('');
    },
    onInterim: (transcript) => {
      setInterimText(transcript);
    },
    continuous: true,
  });
  const [showMicError, setShowMicError] = useState(false);

  useEffect(() => {
    if (micError) {
      setShowMicError(true);
    }
  }, [micError]);

  const filteredTemplates = useMemo(() => {
    if (!input.startsWith('/') || input.includes(' ')) return [];
    const query = input.toLowerCase();
    return PROMPT_TEMPLATES.filter((t) => t.command.startsWith(query));
  }, [input]);

  const handleSelectTemplate = (text) => {
    setInput(text);
    // Focus the input
    if (inputRef.current) {
      const textarea = inputRef.current.querySelector('textarea');
      if (textarea) textarea.focus();
    }
  };
  const getPlaceholder = () => {
    if (isListening) return 'Listening… speak now';
    if (!state.connectionChecked) return 'Connecting to Ollama…';
    if (!state.isConnected) return '⚠ Ollama is not connected — check Settings';
    if (state.models.length === 0) return '⚠ No models found — pull a model first';
    if (!currentModel) return 'Select a model to start chatting…';
    return 'Send a message…';
  };

  const isInputDisabled = !state.isConnected || state.models.length === 0 || !currentModel;

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || disabled || isInputDisabled) return;
    // Stop listening if active
    if (isListening) toggleListening();
    setInterimText('');
    onSend(text, currentModel);
    setInput('');
    // Reset textarea height
    if (inputRef.current) {
      const textarea = inputRef.current.querySelector('textarea');
      if (textarea) textarea.style.height = 'auto';
    }
  }, [input, disabled, isInputDisabled, isListening, toggleListening, onSend, currentModel]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleModelChange = (model) => {
    if (activeConvo) {
      dispatch({ type: 'SET_CONVERSATION_MODEL', payload: { id: activeConvo.id, model } });
    }
    dispatch({ type: 'UPDATE_SETTINGS', payload: { selectedModel: model } });
  };

  return (
    <Box
      sx={{
        px: { xs: 1.5, md: 3 },
        pb: { xs: 1.5, md: 2 },
        pt: 1,
        maxWidth: 820,
        mx: 'auto',
        width: '100%',
      }}
    >
      {/* Microphone Error Alert */}
      {showMicError && micError && (
        <Alert
          severity="error"
          onClose={() => setShowMicError(false)}
          sx={{ mb: 1.5, borderRadius: 3 }}
        >
          {micError}
        </Alert>
      )}

      {/* Prompt Suggestions */}
      {filteredTemplates.length > 0 && (
        <Box
          sx={{
            mb: 1.5,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: alpha(theme.palette.background.paper, 0.9),
            backdropFilter: 'blur(10px)',
            overflow: 'hidden',
            boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.15)}`,
            animation: 'fadeInUp 0.2s ease-out',
          }}
        >
          {filteredTemplates.map((template) => (
            <Box
              key={template.command}
              onClick={() => handleSelectTemplate(template.text)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 2,
                py: 1.25,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  '& .cmd-label': { color: 'primary.main' },
                },
              }}
            >
              <Typography variant="body2" className="cmd-label" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {template.command}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {template.label}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Voice recording indicator */}
      <Fade in={isListening}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            mb: 1,
            py: 0.75,
            px: 2,
            borderRadius: 3,
            bgcolor: alpha(theme.palette.error.main, 0.08),
            border: '1px solid',
            borderColor: alpha(theme.palette.error.main, 0.2),
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'error.main',
              animation: 'pulse 1.5s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                '50%': { opacity: 0.4, transform: 'scale(0.8)' },
              },
            }}
          />
          <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 500 }}>
            Listening…
          </Typography>
          {interimText && (
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontStyle: 'italic',
                maxWidth: 300,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {interimText}
            </Typography>
          )}
        </Box>
      </Fade>

      <Box
        ref={inputRef}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 4,
          border: '1px solid',
          borderColor: isListening
            ? alpha(theme.palette.error.main, 0.4)
            : isInputDisabled
              ? alpha(theme.palette.error.main, 0.2)
              : 'divider',
          bgcolor: alpha(theme.palette.background.paper, 0.6),
          backdropFilter: 'blur(10px)',
          transition: 'all 0.2s ease',
          opacity: isInputDisabled ? 0.7 : 1,
          '&:focus-within': {
            borderColor: isInputDisabled
              ? alpha(theme.palette.error.main, 0.2)
              : 'primary.main',
            boxShadow: isInputDisabled
              ? 'none'
              : `0 0 0 2px ${alpha(theme.palette.primary.main, 0.15)}`,
          },
          ...(isListening && {
            boxShadow: `0 0 0 2px ${alpha(theme.palette.error.main, 0.2)}`,
          }),
        }}
      >
        <TextField
          multiline
          maxRows={8}
          placeholder={getPlaceholder()}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isInputDisabled}
          fullWidth
          variant="standard"
          slotProps={{
            input: {
              disableUnderline: true,
            },
          }}
          sx={{
            px: 2,
            pt: 1.5,
            pb: 0.5,
            '& .MuiInputBase-input': {
              fontSize: '0.938rem',
              lineHeight: 1.6,
              '&::placeholder': {
                color: isListening
                  ? 'error.main'
                  : isInputDisabled
                    ? 'error.main'
                    : 'text.secondary',
                opacity: isInputDisabled ? 0.8 : 0.7,
              },
            },
          }}
        />

        {/* Bottom bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 1.5,
            pb: 1,
            pt: 0.5,
          }}
        >
          <ModelSelector
            value={currentModel}
            onChange={handleModelChange}
            variant="chip"
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {/* Microphone button */}
            {isMicSupported && (
              <Tooltip title={isListening ? 'Stop listening' : 'Voice input'}>
                <IconButton
                  onClick={toggleListening}
                  disabled={isInputDisabled}
                  sx={{
                    color: isListening ? '#fff' : 'text.secondary',
                    bgcolor: isListening
                      ? 'error.main'
                      : 'transparent',
                    '&:hover': {
                      bgcolor: isListening
                        ? 'error.dark'
                        : alpha(theme.palette.text.primary, 0.08),
                    },
                    transition: 'all 0.2s ease',
                    ...(isListening && {
                      animation: 'micPulse 2s ease-in-out infinite',
                      '@keyframes micPulse': {
                        '0%, 100%': { boxShadow: `0 0 0 0 ${alpha(theme.palette.error.main, 0.4)}` },
                        '50%': { boxShadow: `0 0 0 8px ${alpha(theme.palette.error.main, 0)}` },
                      },
                    }),
                  }}
                >
                  {isListening ? <MicOffIcon sx={{ fontSize: 20 }} /> : <MicIcon sx={{ fontSize: 20 }} />}
                </IconButton>
              </Tooltip>
            )}

            {/* Send / Stop button */}
            {state.isStreaming ? (
              <Tooltip title="Stop generating">
                <IconButton
                  onClick={onStop}
                  sx={{
                    color: 'error.main',
                    bgcolor: alpha(theme.palette.error.main, 0.1),
                    '&:hover': {
                      bgcolor: alpha(theme.palette.error.main, 0.2),
                    },
                  }}
                >
                  <StopCircleIcon />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title={isInputDisabled ? 'Connect to Ollama first' : 'Send message (Enter)'}>
                <span>
                  <IconButton
                    onClick={handleSend}
                    disabled={!input.trim() || disabled || isInputDisabled}
                    sx={{
                      color: input.trim() && !isInputDisabled ? '#fff' : 'text.secondary',
                      bgcolor: input.trim() && !isInputDisabled
                        ? 'primary.main'
                        : 'transparent',
                      '&:hover': {
                        bgcolor: input.trim() && !isInputDisabled
                          ? 'primary.dark'
                          : alpha(theme.palette.primary.main, 0.1),
                      },
                      '&.Mui-disabled': {
                        color: 'text.secondary',
                        bgcolor: 'transparent',
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <SendIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Box>
        </Box>
      </Box>

      <Box sx={{ textAlign: 'center', mt: 1 }}>
        <Box
          component="span"
          sx={{ fontSize: '0.7rem', color: 'text.secondary', opacity: 0.6 }}
        >
          LLM responses can be inaccurate. Verify important information.
        </Box>
      </Box>
    </Box>
  );
}
