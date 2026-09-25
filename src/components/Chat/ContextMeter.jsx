import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Tooltip,
  Popover,
  LinearProgress,
  Chip,
  alpha,
  useTheme,
  Button,
} from '@mui/material';
import {
  Cpu,
  AlertTriangle,
  CheckCircle2,
  GitFork,
} from 'lucide-react';
import { useChatStore } from '../../store/chatContext';

export default function ContextMeter({ onForkConversation = null }) {
  const theme = useTheme();
  const { state, getActiveConversation } = useChatStore();
  const activeConvo = getActiveConversation();
  const [anchorEl, setAnchorEl] = useState(null);

  const contextLimit = state.settings.contextWindow || 4096;

  // Calculate estimated tokens across conversation
  const stats = useMemo(() => {
    const messages = activeConvo?.messages || [];
    let systemTokens = Math.ceil((state.settings.systemPrompt || '').length / 3.8);
    let userTokens = 0;
    let assistantTokens = 0;

    messages.forEach((m) => {
      const count = Math.ceil((m.content || '').length / 3.8);
      if (m.role === 'user') userTokens += count;
      else assistantTokens += count;
    });

    const totalTokens = systemTokens + userTokens + assistantTokens;
    const percentage = Math.min(100, Math.round((totalTokens / contextLimit) * 100));
    const remainingTokens = Math.max(0, contextLimit - totalTokens);

    let status = 'healthy';
    let color = theme.palette.primary.main;
    if (percentage >= 85) {
      status = 'critical';
      color = theme.palette.error.main;
    } else if (percentage >= 65) {
      status = 'warning';
      color = theme.palette.warning.main;
    } else {
      color = theme.palette.primary.main;
    }

    return {
      systemTokens,
      userTokens,
      assistantTokens,
      totalTokens,
      contextLimit,
      percentage,
      remainingTokens,
      status,
      color,
      messageCount: messages.length,
    };
  }, [activeConvo?.messages, state.settings.systemPrompt, contextLimit, theme]);

  if (!activeConvo) return null;

  return (
    <>
      <Tooltip title="Context Window & Token Meter (Click to view breakdown)">
        <Box
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.25,
            py: 0.5,
            borderRadius: 2,
            cursor: 'pointer',
            bgcolor: alpha(stats.color, 0.08),
            border: '1px solid',
            borderColor: alpha(stats.color, 0.25),
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: alpha(stats.color, 0.16),
              borderColor: stats.color,
            },
          }}
        >
          <Cpu size={14} color={stats.color} />
          <Box sx={{ display: { xs: 'none', sm: 'block' }, width: 48 }}>
            <LinearProgress
              variant="determinate"
              value={stats.percentage}
              sx={{
                height: 4,
                borderRadius: 2,
                bgcolor: alpha(stats.color, 0.2),
                '& .MuiLinearProgress-bar': {
                  bgcolor: stats.color,
                  borderRadius: 2,
                },
              }}
            />
          </Box>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              fontSize: '0.72rem',
              color: stats.color,
              letterSpacing: '0.02em',
            }}
          >
            {stats.totalTokens.toLocaleString()} / {(stats.contextLimit / 1024).toFixed(0)}k
          </Typography>
        </Box>
      </Tooltip>

      {/* Context Breakdown Popover */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              width: 320,
              p: 2.5,
              borderRadius: 3,
              boxShadow: '0 12px 36px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(16px)',
              border: '1px solid',
              borderColor: 'divider',
            },
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Cpu size={18} color={stats.color} />
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              Context Window Meter
            </Typography>
          </Box>
          <Chip
            size="small"
            label={`${stats.percentage}% Full`}
            sx={{
              fontWeight: 700,
              fontSize: '0.7rem',
              bgcolor: alpha(stats.color, 0.15),
              color: stats.color,
              borderColor: alpha(stats.color, 0.4),
              border: '1px solid',
            }}
          />
        </Box>

        {/* Progress Bar */}
        <Box sx={{ mb: 2 }}>
          <LinearProgress
            variant="determinate"
            value={stats.percentage}
            sx={{
              height: 7,
              borderRadius: 4,
              bgcolor: alpha(theme.palette.text.primary, 0.08),
              '& .MuiLinearProgress-bar': {
                bgcolor: stats.color,
                borderRadius: 4,
              },
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.75 }}>
            <Typography variant="caption" color="text.secondary">
              Used: <strong>{stats.totalTokens.toLocaleString()}</strong> tokens
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Max: <strong>{stats.contextLimit.toLocaleString()}</strong> tokens
            </Typography>
          </Box>
        </Box>

        {/* Breakdown Breakdown */}
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.background.default, 0.6),
            border: '1px solid',
            borderColor: 'divider',
            mb: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.secondary">
              Conversation Turns ({stats.messageCount} msgs)
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              ~{(stats.userTokens + stats.assistantTokens).toLocaleString()} tokens
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.secondary">
              System Prompt & Personas
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              ~{stats.systemTokens.toLocaleString()} tokens
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed', borderColor: 'divider', pt: 0.75 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: stats.color }}>
              Headroom Remaining
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: stats.color }}>
              ~{stats.remainingTokens.toLocaleString()} tokens
            </Typography>
          </Box>
        </Box>

        {/* Status Notice */}
        {stats.percentage >= 85 ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main', mb: 2 }}>
            <AlertTriangle size={16} />
            <Typography variant="caption" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
              Context is nearly full. Older conversation history will be truncated by Ollama.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.main', mb: 2 }}>
            <CheckCircle2 size={16} />
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', lineHeight: 1.3 }}>
              Ample headroom. Model has full visibility over entire chat history.
            </Typography>
          </Box>
        )}

        {/* Actions */}
        {onForkConversation && (
          <Button
            fullWidth
            size="small"
            variant="outlined"
            startIcon={<GitFork size={14} />}
            onClick={() => {
              setAnchorEl(null);
              onForkConversation();
            }}
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
          >
            Fork into New Chat Branch
          </Button>
        )}
      </Popover>
    </>
  );
}
