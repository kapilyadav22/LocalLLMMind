import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Chip,
  LinearProgress,
  Tooltip,
  Paper,
  Divider,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Zap,
  Clock,
  Cpu,
  Layers,
  Copy,
  Check,
  X,
  Gauge,
  Timer,
  Hash,
  Activity,
  HardDrive,
} from 'lucide-react';
import { showToast } from '../../utils/toast';

export interface GenerationMetricsData {
  tokPerSec?: string | number;
  evalCount?: number;
  evalDuration?: number;
  duration?: string | number;
  promptTokens?: number;
  promptDuration?: string | number;
  totalDuration?: string | number;
  loadDuration?: string | number;
  ttftMs?: number;
  model?: string;
  createdAt?: string;
}

export interface GenerationStatsDialogProps {
  open: boolean;
  onClose: () => void;
  metrics: GenerationMetricsData | null;
  modelName?: string;
}

export default function GenerationStatsDialog({
  open,
  onClose,
  metrics,
  modelName,
}: GenerationStatsDialogProps) {
  const theme = useTheme();
  const [copiedFormat, setCopiedFormat] = useState<'md' | 'json' | null>(null);

  if (!metrics) return null;

  const tokPerSecNum = parseFloat(String(metrics.tokPerSec || '0')) || 0;
  const evalCount = metrics.evalCount || 0;
  const promptTokens = metrics.promptTokens || 0;
  const totalTokens = promptTokens + evalCount;
  const durationSec = parseFloat(String(metrics.duration || '0')) || 0;
  const totalDurationSec = parseFloat(String(metrics.totalDuration || metrics.duration || '0')) || durationSec;
  const ttftMs = metrics.ttftMs || (metrics.promptDuration ? Math.round(parseFloat(String(metrics.promptDuration)) * 1000) : null);
  const activeModel = metrics.model || modelName || 'Unknown Model';

  // Speed evaluation classification
  let speedCategory = { label: 'Moderate', color: theme.palette.warning.main, icon: '⏱️' };
  if (tokPerSecNum >= 50) {
    speedCategory = { label: 'Blazing Fast', color: theme.palette.success.main, icon: '🚀' };
  } else if (tokPerSecNum >= 25) {
    speedCategory = { label: 'High Speed', color: theme.palette.info.main, icon: '⚡' };
  } else if (tokPerSecNum > 0 && tokPerSecNum < 12) {
    speedCategory = { label: 'Heavy Compute / Local', color: theme.palette.text.secondary, icon: '🐢' };
  }

  // Token ratio percentage
  const promptRatio = totalTokens > 0 ? (promptTokens / totalTokens) * 100 : 0;
  const completionRatio = totalTokens > 0 ? (evalCount / totalTokens) * 100 : 100;

  // Copy Markdown benchmark report
  const handleCopyMarkdown = async () => {
    const report = [
      `### 📊 LLM Generation Performance Report`,
      `- **Model**: \`${activeModel}\``,
      `- **Speed**: \`${tokPerSecNum} tok/s\` (${speedCategory.label})`,
      `- **Output (Completion)**: \`${evalCount} tokens\` in \`${durationSec}s\``,
      promptTokens ? `- **Input (Prompt)**: \`${promptTokens} tokens\` in \`${metrics.promptDuration || '—'}s\`` : null,
      ttftMs ? `- **Time to First Token (TTFT)**: \`${ttftMs} ms\`` : null,
      `- **Total Latency**: \`${totalDurationSec}s\``,
      metrics.loadDuration ? `- **Model Load Overhead**: \`${metrics.loadDuration}s\`` : null,
      metrics.createdAt ? `- **Generated At**: ${new Date(metrics.createdAt).toLocaleString()}` : null,
    ].filter(Boolean).join('\n');

    try {
      await navigator.clipboard.writeText(report);
      setCopiedFormat('md');
      showToast('Performance benchmark copied as Markdown', 'success');
      setTimeout(() => setCopiedFormat(null), 2000);
    } catch {
      showToast('Failed to copy stats', 'error');
    }
  };

  // Copy JSON
  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(metrics, null, 2));
      setCopiedFormat('json');
      showToast('Raw metrics copied as JSON', 'success');
      setTimeout(() => setCopiedFormat(null), 2000);
    } catch {
      showToast('Failed to copy JSON', 'error');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3.5,
            p: 1,
            bgcolor: 'background.paper',
            backgroundImage: 'none',
            border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
            boxShadow: theme.palette.mode === 'dark' ? '0 16px 48px rgba(0,0,0,0.5)' : '0 16px 48px rgba(0,0,0,0.12)',
          },
        },
      }}
    >
      {/* Dialog Header */}
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1.5,
          pt: 1.5,
          px: 2.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.warning.main, 0.12),
              color: 'warning.main',
              display: 'flex',
            }}
          >
            <Gauge size={20} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.2 }}>
              Generation Stats & Token Inspector
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Turn Performance & Inference Telemetry
            </Typography>
          </Box>
        </Box>

        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            color: 'text.secondary',
            '&:hover': { color: 'text.primary', bgcolor: alpha(theme.palette.text.primary, 0.06) },
          }}
        >
          <X size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, py: 1 }}>
        {/* Speed Hero Banner */}
        <Paper
          elevation={0}
          sx={{
            p: 2.25,
            borderRadius: 3,
            mb: 2.5,
            border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
            background:
              theme.palette.mode === 'dark'
                ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.background.paper, 0.6)} 100%)`
                : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.04)} 0%, ${alpha(theme.palette.background.paper, 0.9)} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Inference Evaluation Speed
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.25 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'monospace', color: 'text.primary', lineHeight: 1 }}>
                {tokPerSecNum}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                tokens / sec
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'flex-start', sm: 'flex-end' }, gap: 0.5 }}>
            <Chip
              label={`${speedCategory.icon} ${speedCategory.label}`}
              size="small"
              sx={{
                fontWeight: 700,
                fontSize: '0.75rem',
                bgcolor: alpha(speedCategory.color, 0.12),
                color: speedCategory.color,
                border: `1px solid ${alpha(speedCategory.color, 0.3)}`,
              }}
            />
            <Chip
              label={activeModel}
              size="small"
              variant="outlined"
              sx={{
                height: 20,
                fontSize: '0.68rem',
                fontFamily: 'monospace',
                maxWidth: 220,
              }}
            />
          </Box>
        </Paper>

        {/* 2x3 Grid of Metric Breakdown Cards */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 1.5,
            mb: 2.5,
          }}
        >
          {/* Card 1: Completion Output */}
          <Paper
            elevation={0}
            sx={{
              p: 1.75,
              borderRadius: 2.5,
              border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
              bgcolor: alpha(theme.palette.background.default, 0.4),
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
              <Layers size={15} color={theme.palette.primary.main} />
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                Completion Output
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '1.05rem', lineHeight: 1.2 }}>
              {evalCount} <Typography component="span" variant="caption" color="text.secondary">tokens</Typography>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Generated in {durationSec}s
            </Typography>
          </Paper>

          {/* Card 2: Prompt Input */}
          <Paper
            elevation={0}
            sx={{
              p: 1.75,
              borderRadius: 2.5,
              border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
              bgcolor: alpha(theme.palette.background.default, 0.4),
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
              <Hash size={15} color={theme.palette.info.main} />
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                Prompt Input
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '1.05rem', lineHeight: 1.2 }}>
              {promptTokens > 0 ? promptTokens : 'N/A'} <Typography component="span" variant="caption" color="text.secondary">tokens</Typography>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {metrics.promptDuration ? `Evaluated in ${metrics.promptDuration}s` : 'Context history & attachments'}
            </Typography>
          </Paper>

          {/* Card 3: Time To First Token (TTFT) */}
          <Paper
            elevation={0}
            sx={{
              p: 1.75,
              borderRadius: 2.5,
              border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
              bgcolor: alpha(theme.palette.background.default, 0.4),
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
              <Timer size={15} color={theme.palette.warning.main} />
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                Time to First Token (TTFT)
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '1.05rem', lineHeight: 1.2 }}>
              {ttftMs ? `${ttftMs} ms` : '—'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Initial prompt latency
            </Typography>
          </Paper>

          {/* Card 4: Total Round-Trip Time */}
          <Paper
            elevation={0}
            sx={{
              p: 1.75,
              borderRadius: 2.5,
              border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
              bgcolor: alpha(theme.palette.background.default, 0.4),
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
              <Clock size={15} color={theme.palette.success.main} />
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                Total Response Time
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '1.05rem', lineHeight: 1.2 }}>
              {totalDurationSec}s
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Full turn stream duration
            </Typography>
          </Paper>
        </Box>

        {/* Token Ratio Visualization */}
        {totalTokens > 0 && (
          <Box sx={{ mb: 2, p: 2, borderRadius: 2.5, bgcolor: alpha(theme.palette.background.default, 0.3), border: `1px solid ${alpha(theme.palette.divider, 0.4)}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                Prompt vs Completion Token Distribution
              </Typography>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                Total: {totalTokens} tokens
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', bgcolor: alpha(theme.palette.divider, 0.3), mb: 1 }}>
              <Box sx={{ width: `${promptRatio}%`, bgcolor: 'info.main', transition: 'width 0.3s ease' }} />
              <Box sx={{ width: `${completionRatio}%`, bgcolor: 'primary.main', transition: 'width 0.3s ease' }} />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'info.main' }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                  Prompt ({promptRatio.toFixed(0)}%)
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                  Completion ({completionRatio.toFixed(0)}%)
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>

      {/* Dialog Footer Actions */}
      <DialogActions
        sx={{
          px: 2.5,
          py: 1.5,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={copiedFormat === 'md' ? <Check size={14} color={theme.palette.success.main} /> : <Copy size={14} />}
            onClick={handleCopyMarkdown}
            sx={{ textTransform: 'none', borderRadius: 2, fontSize: '0.78rem' }}
          >
            {copiedFormat === 'md' ? 'Copied Markdown' : 'Copy Markdown'}
          </Button>

          <Button
            size="small"
            variant="text"
            startIcon={copiedFormat === 'json' ? <Check size={14} color={theme.palette.success.main} /> : <Cpu size={14} />}
            onClick={handleCopyJson}
            sx={{ textTransform: 'none', borderRadius: 2, fontSize: '0.78rem', color: 'text.secondary' }}
          >
            {copiedFormat === 'json' ? 'Copied JSON' : 'Copy JSON'}
          </Button>
        </Box>

        <Button onClick={onClose} variant="contained" sx={{ textTransform: 'none', borderRadius: 2, px: 2.5 }}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
