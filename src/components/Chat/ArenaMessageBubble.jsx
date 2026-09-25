import { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Paper,
  Grid,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Copy,
  Check,
  Swords,
  Zap,
  Clock,
  Trophy,
  Scale,
} from 'lucide-react';
import MarkdownRenderer from '../common/MarkdownRenderer';
import { showToast } from '../../utils/toast';

export default function ArenaMessageBubble({ msg, onVote }) {
  const theme = useTheme();
  const [copiedA, setCopiedA] = useState(false);
  const [copiedB, setCopiedB] = useState(false);

  const modelA = msg.modelA || { name: 'Model A', content: '', isStreaming: false, metrics: null };
  const modelB = msg.modelB || { name: 'Model B', content: '', isStreaming: false, metrics: null };
  const vote = msg.vote; // 'A' | 'B' | 'tie' | null

  const handleCopy = async (text, which) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (which === 'A') {
        setCopiedA(true);
        setTimeout(() => setCopiedA(false), 2000);
      } else {
        setCopiedB(true);
        setTimeout(() => setCopiedB(false), 2000);
      }
      showToast('Response copied to clipboard', 'success');
    } catch {
      showToast('Failed to copy response', 'error');
    }
  };

  return (
    <Box
      sx={{
        my: 2.5,
        mx: 'auto',
        maxWidth: 960,
        width: '100%',
        px: { xs: 1, md: 2 },
      }}
    >
      {/* Arena Banner */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
          px: 2,
          py: 1,
          mb: 1.5,
          borderRadius: 2.5,
          bgcolor: alpha(theme.palette.secondary.main, 0.08),
          border: '1px solid',
          borderColor: alpha(theme.palette.secondary.main, 0.25),
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Swords size={18} color={theme.palette.secondary.main} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'secondary.main', letterSpacing: '0.02em' }}>
            Model Arena — Side-by-Side Dual Evaluation
          </Typography>
        </Box>

        {vote && (
          <Chip
            icon={vote === 'tie' ? <Scale size={13} style={{ marginLeft: 6 }} /> : <Trophy size={13} style={{ marginLeft: 6 }} />}
            label={vote === 'tie' ? 'Result: Tie' : `Winner: ${vote === 'A' ? modelA.name : modelB.name}`}
            size="small"
            color="success"
            sx={{ fontWeight: 700, fontSize: '0.72rem' }}
          />
        )}
      </Box>

      {/* Dual Split Columns */}
      <Grid container spacing={2}>
        {/* Column Model A */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              borderRadius: 3,
              border: '1.5px solid',
              borderColor: vote === 'A'
                ? 'success.main'
                : alpha(theme.palette.primary.main, 0.25),
              bgcolor: alpha(theme.palette.background.paper, 0.85),
              backdropFilter: 'blur(10px)',
              overflow: 'hidden',
              transition: 'all 0.2s ease',
              boxShadow: vote === 'A'
                ? `0 0 0 2px ${alpha(theme.palette.success.main, 0.25)}, 0 4px 20px ${alpha(theme.palette.success.main, 0.1)}`
                : 'none',
            }}
          >
            {/* Header Model A */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 2,
                py: 1,
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: alpha(theme.palette.primary.main, 0.05),
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                <Chip
                  label="Model A"
                  size="small"
                  sx={{
                    height: 20,
                    fontWeight: 800,
                    fontSize: '0.65rem',
                    bgcolor: 'primary.main',
                    color: '#fff',
                  }}
                />
                <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }} noWrap>
                  {modelA.name}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                {modelA.isStreaming ? (
                  <Chip
                    label="Generating…"
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '0.62rem',
                      fontWeight: 600,
                      bgcolor: alpha(theme.palette.warning.main, 0.15),
                      color: 'warning.main',
                    }}
                  />
                ) : modelA.metrics ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Chip
                      icon={<Zap size={11} style={{ marginLeft: 5 }} />}
                      label={`${modelA.metrics.tokPerSec} t/s`}
                      size="small"
                      sx={{ height: 18, fontSize: '0.62rem', fontWeight: 600 }}
                    />
                    <Chip
                      icon={<Clock size={11} style={{ marginLeft: 5 }} />}
                      label={`${modelA.metrics.duration}s`}
                      size="small"
                      sx={{ height: 18, fontSize: '0.62rem', fontWeight: 600 }}
                    />
                  </Box>
                ) : null}

                <Tooltip title={copiedA ? 'Copied!' : 'Copy Model A'}>
                  <IconButton size="small" onClick={() => handleCopy(modelA.content, 'A')} sx={{ p: 0.5 }}>
                    {copiedA ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {/* Content Model A */}
            <Box sx={{ p: 2, flex: 1, overflowY: 'auto' }}>
              {modelA.content ? (
                <MarkdownRenderer content={modelA.content} />
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  {modelA.isStreaming ? 'Streaming response from Model A…' : 'No response'}
                </Typography>
              )}
            </Box>

            {/* Footer Vote Model A */}
            <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: alpha(theme.palette.background.paper, 0.4) }}>
              <Button
                fullWidth
                size="small"
                variant={vote === 'A' ? 'contained' : 'outlined'}
                color={vote === 'A' ? 'success' : 'primary'}
                startIcon={<Trophy size={14} />}
                onClick={() => onVote('A')}
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
              >
                {vote === 'A' ? 'Winner: Model A' : 'Vote Model A'}
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Column Model B */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              borderRadius: 3,
              border: '1.5px solid',
              borderColor: vote === 'B'
                ? 'success.main'
                : alpha(theme.palette.secondary.main, 0.25),
              bgcolor: alpha(theme.palette.background.paper, 0.85),
              backdropFilter: 'blur(10px)',
              overflow: 'hidden',
              transition: 'all 0.2s ease',
              boxShadow: vote === 'B'
                ? `0 0 0 2px ${alpha(theme.palette.success.main, 0.25)}, 0 4px 20px ${alpha(theme.palette.success.main, 0.1)}`
                : 'none',
            }}
          >
            {/* Header Model B */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 2,
                py: 1,
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: alpha(theme.palette.secondary.main, 0.05),
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                <Chip
                  label="Model B"
                  size="small"
                  sx={{
                    height: 20,
                    fontWeight: 800,
                    fontSize: '0.65rem',
                    bgcolor: 'secondary.main',
                    color: '#fff',
                  }}
                />
                <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }} noWrap>
                  {modelB.name}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                {modelB.isStreaming ? (
                  <Chip
                    label="Generating…"
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '0.62rem',
                      fontWeight: 600,
                      bgcolor: alpha(theme.palette.warning.main, 0.15),
                      color: 'warning.main',
                    }}
                  />
                ) : modelB.metrics ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Chip
                      icon={<Zap size={11} style={{ marginLeft: 5 }} />}
                      label={`${modelB.metrics.tokPerSec} t/s`}
                      size="small"
                      sx={{ height: 18, fontSize: '0.62rem', fontWeight: 600 }}
                    />
                    <Chip
                      icon={<Clock size={11} style={{ marginLeft: 5 }} />}
                      label={`${modelB.metrics.duration}s`}
                      size="small"
                      sx={{ height: 18, fontSize: '0.62rem', fontWeight: 600 }}
                    />
                  </Box>
                ) : null}

                <Tooltip title={copiedB ? 'Copied!' : 'Copy Model B'}>
                  <IconButton size="small" onClick={() => handleCopy(modelB.content, 'B')} sx={{ p: 0.5 }}>
                    {copiedB ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {/* Content Model B */}
            <Box sx={{ p: 2, flex: 1, overflowY: 'auto' }}>
              {modelB.content ? (
                <MarkdownRenderer content={modelB.content} />
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  {modelB.isStreaming ? 'Streaming response from Model B…' : 'No response'}
                </Typography>
              )}
            </Box>

            {/* Footer Vote Model B */}
            <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: alpha(theme.palette.background.paper, 0.4) }}>
              <Button
                fullWidth
                size="small"
                variant={vote === 'B' ? 'contained' : 'outlined'}
                color={vote === 'B' ? 'success' : 'secondary'}
                startIcon={<Trophy size={14} />}
                onClick={() => onVote('B')}
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
              >
                {vote === 'B' ? 'Winner: Model B' : 'Vote Model B'}
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Tie Vote Button */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.5 }}>
        <Button
          size="small"
          variant={vote === 'tie' ? 'contained' : 'text'}
          color="inherit"
          startIcon={<Scale size={14} />}
          onClick={() => onVote('tie')}
          sx={{
            textTransform: 'none',
            fontSize: '0.8rem',
            color: vote === 'tie' ? 'text.primary' : 'text.secondary',
            bgcolor: vote === 'tie' ? alpha(theme.palette.text.primary, 0.1) : 'transparent',
            borderRadius: 2,
          }}
        >
          {vote === 'tie' ? 'Result: Both models tied' : 'Tie / Both equally good'}
        </Button>
      </Box>
    </Box>
  );
}
