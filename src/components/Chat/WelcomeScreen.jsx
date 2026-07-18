import { Box, Typography, alpha, useTheme, Button, CircularProgress } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlined';
import SpeedIcon from '@mui/icons-material/Speed';
import CodeIcon from '@mui/icons-material/Code';
import SchoolIcon from '@mui/icons-material/School';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import TerminalIcon from '@mui/icons-material/Terminal';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useChatStore } from '../../store/chatStore';

const suggestions = [
  { icon: <ChatBubbleOutlineIcon />, text: 'Explain quantum computing in simple terms' },
  { icon: <CodeIcon />, text: 'Write a Python function to sort a list' },
  { icon: <SchoolIcon />, text: 'Teach me about machine learning' },
  { icon: <SpeedIcon />, text: 'Help me optimize my React app performance' },
];

function ConnectionSetupCard() {
  const theme = useTheme();
  const { state } = useChatStore();

  // Still checking
  if (!state.connectionChecked) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          p: 4,
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: alpha(theme.palette.background.paper, 0.5),
          maxWidth: 480,
          width: '100%',
          animation: 'fadeIn 0.4s ease-out',
          '@keyframes fadeIn': {
            from: { opacity: 0 },
            to: { opacity: 1 },
          },
        }}
      >
        <CircularProgress size={32} />
        <Typography variant="body2" color="text.secondary">
          Connecting to Ollama…
        </Typography>
      </Box>
    );
  }

  // Connected successfully
  if (state.isConnected && state.models.length > 0) {
    return null; // Don't show card — show suggestions instead
  }

  // Connected but no models
  if (state.isConnected && state.models.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          p: 3,
          borderRadius: 4,
          border: '1px solid',
          borderColor: alpha(theme.palette.warning.main, 0.3),
          bgcolor: alpha(theme.palette.warning.main, 0.05),
          maxWidth: 480,
          width: '100%',
          animation: 'fadeInUp 0.5s ease-out',
          '@keyframes fadeInUp': {
            from: { opacity: 0, transform: 'translateY(10px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CheckCircleIcon sx={{ color: 'success.main', fontSize: 22 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Ollama is running — but no models found
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          Pull a model to start chatting. Run one of these in your terminal:
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {['ollama pull llama3.2', 'ollama pull mistral', 'ollama pull gemma3'].map((cmd) => (
            <Box
              key={cmd}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 2,
                py: 1,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.background.default, 0.8),
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                color: 'text.primary',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <TerminalIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              {cmd}
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  // Not connected
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2.5,
        p: 3,
        borderRadius: 4,
        border: '1px solid',
        borderColor: alpha(theme.palette.error.main, 0.25),
        bgcolor: alpha(theme.palette.error.main, 0.04),
        maxWidth: 480,
        width: '100%',
        animation: 'fadeInUp 0.5s ease-out',
        '@keyframes fadeInUp': {
          from: { opacity: 0, transform: 'translateY(10px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <CloudOffIcon sx={{ color: 'error.main', fontSize: 22 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'error.main' }}>
          Cannot connect to Ollama
        </Typography>
      </Box>

      {state.connectionError && (
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, fontSize: '0.82rem' }}>
          {state.connectionError}
        </Typography>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Quick Setup
        </Typography>

        {[
          { step: '1', text: 'Install Ollama', cmd: 'curl -fsSL https://ollama.com/install.sh | sh' },
          { step: '2', text: 'Start the server', cmd: 'ollama serve' },
          { step: '3', text: 'Pull a model', cmd: 'ollama pull llama3.2' },
        ].map((item) => (
          <Box key={item.step} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
            <Box
              sx={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: alpha(theme.palette.primary.main, 0.15),
                color: 'primary.main',
                fontSize: '0.7rem',
                fontWeight: 700,
                flexShrink: 0,
                mt: 0.25,
              }}
            >
              {item.step}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.25 }}>
                {item.text}
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 1.5,
                  bgcolor: alpha(theme.palette.background.default, 0.8),
                  fontFamily: 'monospace',
                  fontSize: '0.78rem',
                  color: 'text.secondary',
                  border: '1px solid',
                  borderColor: 'divider',
                  overflowX: 'auto',
                }}
              >
                <TerminalIcon sx={{ fontSize: 12, flexShrink: 0 }} />
                {item.cmd}
              </Box>
            </Box>
          </Box>
        ))}
      </Box>

      <Typography variant="caption" color="text.secondary">
        Trying to connect to: <strong>{state.settings.ollamaUrl}</strong>
        {' · '}Change this in Settings.
      </Typography>
    </Box>
  );
}

export default function WelcomeScreen({ onSuggestionClick }) {
  const theme = useTheme();
  const { state } = useChatStore();

  const showSuggestions = state.isConnected && state.models.length > 0;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        px: 3,
        textAlign: 'center',
        animation: 'fadeIn 0.6s ease-out',
        '@keyframes fadeIn': {
          from: { opacity: 0, transform: 'translateY(20px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      {/* Logo / Hero */}
      <Box
        sx={{
          position: 'relative',
          mb: 4,
        }}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)}, ${alpha(theme.palette.secondary.main, 0.2)})`,
            border: '2px solid',
            borderColor: state.isConnected
              ? alpha(theme.palette.primary.main, 0.3)
              : alpha(theme.palette.error.main, 0.3),
            mx: 'auto',
            animation: state.isConnected ? 'float 3s ease-in-out infinite' : 'none',
            opacity: state.isConnected ? 1 : 0.6,
            transition: 'all 0.3s ease',
            '@keyframes float': {
              '0%, 100%': { transform: 'translateY(0)' },
              '50%': { transform: 'translateY(-8px)' },
            },
          }}
        >
          <SmartToyIcon sx={{ fontSize: 40, color: state.isConnected ? 'primary.main' : 'text.secondary' }} />
        </Box>
      </Box>

      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          mb: 1,
          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Local LLM Chat
      </Typography>

      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ mb: 4, maxWidth: 460 }}
      >
        Chat with your locally running AI models. Private, fast, and fully under your control.
      </Typography>

      {/* Connection status card (shown when not connected / no models) */}
      <ConnectionSetupCard />

      {/* Suggestion cards (only shown when connected with models) */}
      {showSuggestions && (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
              maxWidth: 560,
              width: '100%',
            }}
          >
            {suggestions.map((s, i) => (
              <Box
                key={i}
                onClick={() => onSuggestionClick?.(s.text)}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.5,
                  p: 2,
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  bgcolor: alpha(theme.palette.background.paper, 0.5),
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                    transform: 'translateY(-2px)',
                    boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.15)}`,
                  },
                  animation: `fadeInUp 0.5s ease-out ${i * 0.1}s both`,
                  '@keyframes fadeInUp': {
                    from: { opacity: 0, transform: 'translateY(10px)' },
                    to: { opacity: 1, transform: 'translateY(0)' },
                  },
                }}
              >
                <Box sx={{ color: 'primary.main', mt: 0.25, flexShrink: 0 }}>{s.icon}</Box>
                <Typography variant="body2" sx={{ textAlign: 'left', color: 'text.secondary', lineHeight: 1.5 }}>
                  {s.text}
                </Typography>
              </Box>
            ))}
          </Box>
        </>
      )}

      <Box sx={{ mt: 4, display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <AutoAwesomeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
        <Typography variant="caption" color="text.secondary">
          Powered by Ollama · Models run 100% locally
        </Typography>
      </Box>
    </Box>
  );
}
