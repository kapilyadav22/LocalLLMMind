import { Box, Button, IconButton, Tooltip, alpha, useTheme } from '@mui/material';
import { Sparkles, Zap, TestTube2, Bug, X } from 'lucide-react';

export default function FloatingAiActionBar({
  selection,
  selectedSnippet,
  filePath,
  onAiAction,
  onDismiss,
}) {
  const theme = useTheme();

  if (!selectedSnippet || !selectedSnippet.trim() || !selection) return null;

  const lineCount = selection.to - selection.from + 1;
  const fileName = filePath?.split('/').pop() || 'code';

  const actions = [
    {
      id: 'explain',
      label: 'Explain',
      icon: <Sparkles size={13} color="#f59e0b" />,
      tooltip: 'Explain how this code works step-by-step',
      generatePrompt: (code) =>
        `In ${fileName} (lines ${selection.from}–${selection.to}):\n\`\`\`\n${code}\n\`\`\`\n\nPlease explain how this code works step-by-step, including edge cases and any potential side effects.`,
    },
    {
      id: 'refactor',
      label: 'Refactor',
      icon: <Zap size={13} color="#3b82f6" />,
      tooltip: 'Optimize and clean up this code',
      generatePrompt: (code) =>
        `In ${fileName} (lines ${selection.from}–${selection.to}):\n\`\`\`\n${code}\n\`\`\`\n\nPlease refactor and optimize this code for readability, performance, and best practices. Explain the improvements made.`,
    },
    {
      id: 'test',
      label: 'Tests',
      icon: <TestTube2 size={13} color="#10b981" />,
      tooltip: 'Generate unit tests for this function/logic',
      generatePrompt: (code) =>
        `In ${fileName} (lines ${selection.from}–${selection.to}):\n\`\`\`\n${code}\n\`\`\`\n\nPlease write comprehensive unit tests covering regular usage, edge cases, and error handling for this code.`,
    },
    {
      id: 'bugs',
      label: 'Find Bugs',
      icon: <Bug size={13} color="#ef4444" />,
      tooltip: 'Inspect for bugs, security flaws, or edge-case failures',
      generatePrompt: (code) =>
        `In ${fileName} (lines ${selection.from}–${selection.to}):\n\`\`\`\n${code}\n\`\`\`\n\nReview this code thoroughly for subtle bugs, performance pitfalls, security vulnerabilities, or type errors. Suggest concrete fixes.`,
    },
  ];

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 48,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.28)',
        p: 0.5,
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        animation: 'fadeInUp 0.2s ease-out',
        '@keyframes fadeInUp': {
          from: { opacity: 0, transform: 'translateX(-50%) translateY(8px)' },
          to: { opacity: 1, transform: 'translateX(-50%) translateY(0)' },
        },
      }}
    >
      <Box
        sx={{
          px: 1,
          py: 0.25,
          borderRadius: 1.5,
          bgcolor: alpha(theme.palette.primary.main, 0.1),
          color: 'primary.main',
          fontSize: '0.7rem',
          fontWeight: 700,
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
        }}
      >
        {lineCount} {lineCount === 1 ? 'line' : 'lines'}
      </Box>

      {actions.map((act) => (
        <Tooltip key={act.id} title={act.tooltip} arrow>
          <Button
            size="small"
            variant="text"
            startIcon={act.icon}
            onClick={() => onAiAction?.(act.id, act.generatePrompt(selectedSnippet))}
            sx={{
              textTransform: 'none',
              fontSize: '0.75rem',
              fontWeight: 600,
              py: 0.4,
              px: 1,
              borderRadius: 1.5,
              color: 'text.primary',
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            {act.label}
          </Button>
        </Tooltip>
      ))}

      <IconButton
        size="small"
        onClick={onDismiss}
        aria-label="Dismiss AI actions"
        sx={{ p: 0.5, ml: 0.5, color: 'text.secondary' }}
      >
        <X size={13} />
      </IconButton>
    </Box>
  );
}
