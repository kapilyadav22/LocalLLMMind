import { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Slider,
  Switch,
  TextField,
  Chip,
  CircularProgress,
  useTheme,
} from '@mui/material';
import {
  Download,
  Copy,
  Check,
  X,
  Camera,
  Sparkles,
  Layers,
  Sliders,
  Type,
} from 'lucide-react';
import { toPng, toSvg, toBlob } from 'html-to-image';
import { showToast } from '../../utils/toast';

const CANVAS_PRESETS = [
  { id: 'ocean', label: 'Ocean Breeze', bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { id: 'sunset', label: 'Sunset Glow', bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { id: 'cosmic', label: 'Cosmic Purple', bg: 'linear-gradient(135deg, #7F00FF 0%, #E100FF 100%)' },
  { id: 'aurora', label: 'Aurora Borealis', bg: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)' },
  { id: 'cyberpunk', label: 'Cyberpunk Neon', bg: 'linear-gradient(135deg, #f72585 0%, #7209b7 50%, #4cc9f0 100%)' },
  { id: 'emerald', label: 'Emerald Mint', bg: 'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)' },
  { id: 'amber', label: 'Amber Warmth', bg: 'linear-gradient(135deg, #f83600 0%, #f9d423 100%)' },
  { id: 'slate', label: 'Dark Slate', bg: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' },
  { id: 'obsidian', label: 'Obsidian Black', bg: '#0d1117' },
  { id: 'transparent', label: 'Transparent', bg: 'transparent' },
];

const PADDING_PRESETS = [0, 16, 24, 32, 48, 64, 80, 96, 128];

const SHADOW_PRESETS = [
  { id: 'none', label: 'None', shadow: 'none' },
  { id: 'subtle', label: 'Subtle', shadow: '0 8px 24px rgba(0, 0, 0, 0.25)' },
  { id: 'medium', label: 'Medium', shadow: '0 16px 48px rgba(0, 0, 0, 0.45)' },
  { id: 'dramatic', label: 'Dramatic 3D', shadow: '0 28px 75px rgba(0, 0, 0, 0.65)' },
  { id: 'neon', label: 'Neon Glow', shadow: '0 0 50px rgba(99, 102, 241, 0.45)' },
];

export default function CodeExportModal({
  open,
  onClose,
  file,
  selectedCode = '',
  settings,
  themeObj,
}) {
  const theme = useTheme();
  const cardRef = useRef(null);

  const [presetId, setPresetId] = useState('ocean');
  const [padding, setPadding] = useState(32);
  const [shadowId, setShadowId] = useState('dramatic');
  const [windowStyle, setWindowStyle] = useState('mac'); // 'mac' | 'monochrome' | 'none'
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [showWatermark, setShowWatermark] = useState(true);
  const [borderRadius, setBorderRadius] = useState(12);
  const [fontSize, setFontSize] = useState(13);
  const [customTitle, setCustomTitle] = useState('');
  const [exportScope, setExportScope] = useState(selectedCode ? 'selection' : 'full');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!file) return null;

  const currentPreset = CANVAS_PRESETS.find((p) => p.id === presetId) || CANVAS_PRESETS[0];
  const currentShadow = SHADOW_PRESETS.find((s) => s.id === shadowId) || SHADOW_PRESETS[3];
  const displayedCode = exportScope === 'selection' && selectedCode ? selectedCode : file.content;
  const fileName = file.path.split('/').pop();
  const effectiveTitle = customTitle.trim() || fileName;
  const codeLines = displayedCode.split('\n');

  async function handleDownloadPng() {
    if (!cardRef.current || busy) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
      const link = document.createElement('a');
      link.download = `${effectiveTitle.replace(/[^a-z0-9_-]/gi, '-')}-carbon.png`;
      link.href = dataUrl;
      link.click();
      showToast('Carbon code card downloaded as PNG!', 'success');
    } catch (err) {
      showToast(`Export failed: ${err.message}`, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleDownloadSvg() {
    if (!cardRef.current || busy) return;
    setBusy(true);
    try {
      const dataUrl = await toSvg(cardRef.current);
      const link = document.createElement('a');
      link.download = `${effectiveTitle.replace(/[^a-z0-9_-]/gi, '-')}-carbon.svg`;
      link.href = dataUrl;
      link.click();
      showToast('Carbon code card downloaded as SVG!', 'success');
    } catch (err) {
      showToast(`Export failed: ${err.message}`, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleCopyImage() {
    if (!cardRef.current || busy) return;
    setBusy(true);
    try {
      const blob = await toBlob(cardRef.current, { pixelRatio: 2 });
      if (!blob) throw new Error('Could not generate image blob.');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopied(true);
      showToast('Image copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      showToast(`Copy image failed: ${err.message}`, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Camera size={18} color={theme.palette.primary.main} />
          <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 700 }}>
            Carbon Code Snippet Studio
          </Typography>
        </Stack>
        <IconButton size="small" onClick={onClose} aria-label="Close export dialog">
          <X size={16} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2 }}>
        {/* Controls Toolbar */}
        <Stack spacing={2} sx={{ mb: 2.5 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: 'center' }}>
            {selectedCode && (
              <RadioGroup
                row
                value={exportScope}
                onChange={(e) => setExportScope(e.target.value)}
                sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.8rem' } }}
              >
                <FormControlLabel value="selection" control={<Radio size="small" />} label="Selected Snippet" />
                <FormControlLabel value="full" control={<Radio size="small" />} label="Full File" />
              </RadioGroup>
            )}

            <TextField
              size="small"
              label="Snippet Title"
              placeholder={fileName}
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              sx={{ minWidth: 160, flex: 1 }}
            />

            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Background</InputLabel>
              <Select
                value={presetId}
                label="Background"
                onChange={(e) => setPresetId(e.target.value)}
                sx={{ fontSize: '0.8rem' }}
              >
                {CANVAS_PRESETS.map((p) => (
                  <MenuItem key={p.id} value={p.id} sx={{ fontSize: '0.8rem' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: p.bg, border: '1px solid rgba(0,0,0,0.2)' }} />
                      {p.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Shadow</InputLabel>
              <Select
                value={shadowId}
                label="Shadow"
                onChange={(e) => setShadowId(e.target.value)}
                sx={{ fontSize: '0.8rem' }}
              >
                {SHADOW_PRESETS.map((s) => (
                  <MenuItem key={s.id} value={s.id} sx={{ fontSize: '0.8rem' }}>
                    {s.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Header Style</InputLabel>
              <Select
                value={windowStyle}
                label="Header Style"
                onChange={(e) => setWindowStyle(e.target.value)}
                sx={{ fontSize: '0.8rem' }}
              >
                <MenuItem value="mac" sx={{ fontSize: '0.8rem' }}>macOS Dots</MenuItem>
                <MenuItem value="monochrome" sx={{ fontSize: '0.8rem' }}>Monochrome</MenuItem>
                <MenuItem value="none" sx={{ fontSize: '0.8rem' }}>None</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          {/* Padding Presets & Slider */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'center' }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', minWidth: 60 }}>
              Padding: {padding}px
            </Typography>
            <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', flex: 1 }}>
              {PADDING_PRESETS.map((p) => (
                <Chip
                  key={p}
                  size="small"
                  label={`${p}px`}
                  color={padding === p ? 'primary' : 'default'}
                  variant={padding === p ? 'filled' : 'outlined'}
                  onClick={() => setPadding(p)}
                  sx={{ fontSize: '0.72rem', height: 22, cursor: 'pointer' }}
                />
              ))}
            </Stack>
            <Box sx={{ width: 140, display: { xs: 'none', md: 'block' } }}>
              <Slider
                size="small"
                value={padding}
                min={0}
                max={128}
                step={4}
                onChange={(_, v) => setPadding(Number(v))}
              />
            </Box>
          </Stack>

          {/* Additional toggles: Line numbers, Watermark, Font size */}
          <Stack direction="row" spacing={3} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControlLabel
              control={<Switch size="small" checked={showLineNumbers} onChange={(e) => setShowLineNumbers(e.target.checked)} />}
              label={<Typography variant="caption">Line Numbers</Typography>}
            />
            <FormControlLabel
              control={<Switch size="small" checked={showWatermark} onChange={(e) => setShowWatermark(e.target.checked)} />}
              label={<Typography variant="caption">Watermark</Typography>}
            />
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">Font Size:</Typography>
              {[12, 13, 14, 16].map((s) => (
                <Chip
                  key={s}
                  size="small"
                  label={`${s}px`}
                  color={fontSize === s ? 'primary' : 'default'}
                  onClick={() => setFontSize(s)}
                  sx={{ height: 20, fontSize: '0.68rem', cursor: 'pointer' }}
                />
              ))}
            </Stack>
          </Stack>
        </Stack>

        {/* Live Preview Container */}
        <Box
          sx={{
            overflow: 'auto',
            maxHeight: '54vh',
            bgcolor: 'action.hover',
            p: 3,
            borderRadius: 2,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {/* Card to be captured */}
          <Box
            ref={cardRef}
            sx={{
              background: currentPreset.bg,
              padding: `${padding}px`,
              borderRadius: `${borderRadius + 4}px`,
              display: 'inline-block',
              minWidth: 340,
              maxWidth: 820,
              boxSizing: 'border-box',
              transition: 'all 0.15s ease',
            }}
          >
            {/* macOS Window Card */}
            <Box
              sx={{
                bgcolor: themeObj?.bg || '#1e1e1e',
                color: themeObj?.fg || '#d4d4d4',
                borderRadius: `${borderRadius}px`,
                overflow: 'hidden',
                boxShadow: currentShadow.shadow,
                border: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              {/* Window Header */}
              {windowStyle !== 'none' && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 2,
                    py: 1.25,
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    bgcolor: 'rgba(0, 0, 0, 0.18)',
                  }}
                >
                  {windowStyle === 'mac' && (
                    <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                      <Box sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: '#ff5f56' }} />
                      <Box sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: '#ffbd2e' }} />
                      <Box sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: '#27c93f' }} />
                    </Stack>
                  )}
                  {windowStyle === 'monochrome' && (
                    <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                      <Box sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: 'rgba(255, 255, 255, 0.3)' }} />
                      <Box sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: 'rgba(255, 255, 255, 0.3)' }} />
                      <Box sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: 'rgba(255, 255, 255, 0.3)' }} />
                    </Stack>
                  )}

                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      opacity: 0.85,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {effectiveTitle}
                  </Typography>

                  <Box sx={{ width: 40 }} />
                </Box>
              )}

              {/* Code Surface */}
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 2.25,
                  fontSize: `${fontSize}px`,
                  lineHeight: 1.6,
                  fontFamily: settings?.fontFamily || 'Fira Code, monospace',
                  overflow: 'visible',
                  whiteSpace: 'pre',
                }}
              >
                {codeLines.map((line, i) => (
                  <Box key={i} sx={{ display: 'flex' }}>
                    {showLineNumbers && (
                      <Typography
                        component="span"
                        sx={{
                          display: 'inline-block',
                          width: 32,
                          textAlign: 'right',
                          mr: 2,
                          color: 'rgba(255, 255, 255, 0.25)',
                          userSelect: 'none',
                          fontSize: `${fontSize - 1}px`,
                          fontFamily: 'monospace',
                        }}
                      >
                        {i + 1}
                      </Typography>
                    )}
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                        whiteSpace: 'pre',
                      }}
                    >
                      {line || ' '}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Watermark / Branding Footer */}
              {showWatermark && (
                <Box
                  sx={{
                    px: 2,
                    py: 0.75,
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    bgcolor: 'rgba(0, 0, 0, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.5, fontFamily: 'monospace' }}>
                    {file.path}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.5, fontWeight: 600 }}>
                    LocalLLMMind Studio
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={copied ? <Check size={14} /> : <Copy size={14} />}
            onClick={handleCopyImage}
            disabled={busy}
            color={copied ? 'success' : 'primary'}
          >
            {copied ? 'Copied!' : 'Copy PNG'}
          </Button>

          <Button
            variant="outlined"
            startIcon={<Download size={14} />}
            onClick={handleDownloadSvg}
            disabled={busy}
          >
            SVG
          </Button>

          <Button
            variant="contained"
            startIcon={busy ? <CircularProgress size={14} color="inherit" /> : <Download size={14} />}
            onClick={handleDownloadPng}
            disabled={busy}
          >
            Download PNG
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
