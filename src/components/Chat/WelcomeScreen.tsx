import { Box, Typography, alpha, useTheme, CircularProgress } from '@mui/material';
import {
  Code2,
  Zap,
  TestTube2,
  Layers,
} from 'lucide-react';
import { useChatStore } from '../../store/chatContext';
import { PROVIDERS, resolveModelProvider } from '../../constants/apiProviders';
import { APP_NAME } from '../../constants/appConstants';
import AppLogo from '../common/AppLogo';
import BrandText from '../common/BrandText';
import DeveloperBadge from '../common/DeveloperBadge';

const suggestions = [
  {
    icon: <Zap size={16} />,
    title: 'Code Review & Optimization',
    text: 'Review code for performance bottlenecks, memory leaks, and concurrency',
  },
  {
    icon: <TestTube2 size={16} />,
    title: 'Test Suite Generator',
    text: 'Generate end-to-end unit tests with edge cases and mocks',
  },
  {
    icon: <Layers size={16} />,
    title: 'Architecture & Design',
    text: 'Design a clean, modular API and system architecture',
  },
  {
    icon: <Code2 size={16} />,
    title: 'Debug & Root Cause',
    text: 'Analyze stack trace and identify race conditions or edge cases',
  },
];

function ConnectionSetupCard({ isOnline }) {
  const { state } = useChatStore();
  if (isOnline || state.isConnected) return null;
  if (!state.connectionChecked) return <CircularProgress size={24} />;
  return (
    <Box sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, maxWidth: 460, textAlign: 'left', bgcolor: 'background.paper', mb: 3 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>Bring your local models online</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, mb: 1.5, fontSize: '0.82rem' }}>
        Start your installed Ollama server using the Start Ollama button above, or switch to an online cloud provider (OpenAI, Claude, Gemini, Grok, Jev) below.
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Need Ollama? <a href="https://ollama.com/download" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>Download Ollama</a>.
      </Typography>
    </Box>
  );
}

export default function WelcomeScreen({ onSuggestionClick }) {
  const theme = useTheme();
  const { state, getActiveConversation } = useChatStore();
  const activeConvo = getActiveConversation?.() || state.conversations.find((c) => c.id === state.activeConversationId);
  const currentModel = activeConvo?.model || state.settings?.selectedModel || '';
  const { provider } = resolveModelProvider(currentModel, state.models || []);
  const isOnline = provider !== PROVIDERS.OLLAMA;

  const showSuggestions = isOnline || (state.isConnected && state.models.length > 0) || Boolean(
    state.settings?.apiKeyOpenAI ||
    state.settings?.apiKeyAnthropic ||
    state.settings?.apiKeyGemini ||
    state.settings?.apiKeyGrok ||
    state.settings?.apiKeys?.openai ||
    state.settings?.apiKeys?.anthropic ||
    state.settings?.apiKeys?.gemini ||
    state.settings?.apiKeys?.grok ||
    state.settings?.apiKeys?.jev ||
    state.settings?.apiKeys?.custom
  );

  const activeProject = activeConvo?.projectId
    ? state.projects?.find((p) => p.id === activeConvo.projectId)
    : null;

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
        animation: 'fadeIn 0.4s ease-out',
        '@keyframes fadeIn': {
          from: { opacity: 0, transform: 'translateY(12px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      {/* Logo */}
      <Box sx={{ mb: 2 }}>
        <AppLogo size={52} showText={false} />
      </Box>

      {/* Active Project Pill if chat belongs to a project */}
      {activeProject && (
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            px: 1.75,
            py: 0.5,
            mb: 2,
            borderRadius: 1.5,
            bgcolor: alpha(activeProject.color || theme.palette.primary.main, 0.08),
            border: '1px solid',
            borderColor: alpha(activeProject.color || theme.palette.primary.main, 0.25),
          }}
        >
          <Box
            sx={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              bgcolor: activeProject.color || theme.palette.primary.main,
            }}
          />
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              fontSize: '0.78rem',
              color: activeProject.color || 'primary.main',
            }}
          >
            Project: {activeProject.name}
          </Typography>
        </Box>
      )}

      <Box sx={{ mb: 0.75, display: "flex", justifyContent: "center" }}>
        <BrandText fontSize={{ xs: "1.9rem", sm: "2.3rem" }} fontWeight={800} />
      </Box>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 3.5, maxWidth: 460, lineHeight: 1.6 }}
      >
        {activeProject
          ? `New conversation in "${activeProject.name}". Context is preserved within this project.`
          : 'Ask a question, analyze code, or pick a workflow below.'}
      </Typography>

      {/* Connection status card (only shown if using Ollama and offline) */}
      <ConnectionSetupCard isOnline={isOnline} />

      {/* Modern Workflow Cards */}
      {showSuggestions && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 1.5,
            maxWidth: 580,
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
                borderRadius: 2.5,
                border: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.18s ease',
                bgcolor: 'background.paper',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: alpha(theme.palette.primary.main, 0.03),
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                },
              }}
            >
              <Box sx={{ color: 'primary.main', mt: 0.25, flexShrink: 0 }}>{s.icon}</Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.84rem', color: 'text.primary', mb: 0.35 }}>
                  {s.title}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.4, display: 'block' }}>
                  {s.text}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <DeveloperBadge variant="watermark" />
      </Box>
    </Box>
  );
}
