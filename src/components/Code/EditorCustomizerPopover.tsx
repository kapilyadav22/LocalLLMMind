import {
  Popover,
  Box,
  Typography,
  IconButton,
  Divider,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Tooltip,
  Button,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Sliders,
  X,
  Palette,
  Type,
  Maximize2,
  RotateCcw,
  Check,
} from 'lucide-react';
import {
  EDITOR_THEMES,
  EDITOR_FONTS,
  WINDOW_CONTROLS_OPTIONS,
  TAB_SIZES,
  DEFAULT_EDITOR_SETTINGS,
} from '../../constants/editorThemes';

export default function EditorCustomizerPopover({
  anchorEl,
  open,
  onClose,
  settings,
  onChange,
  onReset,
}) {
  const theme = useTheme();

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{
        paper: {
          sx: {
            width: 320,
            p: 2,
            borderRadius: 2.5,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            boxShadow: theme.shadows[8],
          },
        },
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Sliders size={16} color={theme.palette.primary.main} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.88rem' }}>
            Editor Styling &amp; Customization
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary', p: 0.5 }}>
          <X size={15} />
        </IconButton>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Carbon-inspired code presentation and editor preferences
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* 1. THEMES SWATCHES */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
            <Palette size={14} color={theme.palette.text.secondary} />
            <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Syntax Theme
            </Typography>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
            {EDITOR_THEMES.map((th) => {
              const isSelected = settings.themeId === th.id;
              return (
                <Box
                  key={th.id}
                  onClick={() => onChange({ themeId: th.id })}
                  sx={{
                    p: 1,
                    borderRadius: 1.5,
                    border: '1.5px solid',
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    bgcolor: alpha(th.bg, 0.85),
                    color: th.fg,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s',
                    '&:hover': {
                      borderColor: isSelected ? 'primary.main' : 'text.secondary',
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: th.accent,
                        flexShrink: 0,
                        border: '1px solid rgba(255,255,255,0.2)',
                      }}
                    />
                    <Typography variant="caption" noWrap sx={{ fontWeight: 600, fontSize: '0.72rem', color: th.fg }}>
                      {th.name}
                    </Typography>
                  </Box>
                  {isSelected && <Check size={12} color={th.accent} />}
                </Box>
              );
            })}
          </Box>
        </Box>

        <Divider />

        {/* 2. FONT FAMILY */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
            <Type size={14} color={theme.palette.text.secondary} />
            <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Font Family
            </Typography>
          </Box>
          <FormControl size="small" fullWidth>
            <Select
              value={settings.fontFamily}
              onChange={(e) => onChange({ fontFamily: e.target.value })}
              sx={{ fontSize: '0.8rem', borderRadius: 1.5 }}
            >
              {EDITOR_FONTS.map((font) => (
                <MenuItem key={font.id} value={font.id} sx={{ fontFamily: font.family, fontSize: '0.82rem' }}>
                  {font.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* 3. FONT SIZE SLIDER */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Font Size: {settings.fontSize}px
            </Typography>
          </Box>
          <Slider
            size="small"
            value={settings.fontSize}
            min={11}
            max={18}
            step={1}
            marks
            onChange={(_, val) => onChange({ fontSize: val })}
            sx={{ py: 0.5 }}
          />
        </Box>

        <Divider />

        {/* 4. WINDOW CONTROLS STYLE */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
            <Maximize2 size={14} color={theme.palette.text.secondary} />
            <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Window Frame Header
            </Typography>
          </Box>
          <FormControl size="small" fullWidth>
            <Select
              value={settings.windowControls}
              onChange={(e) => onChange({ windowControls: e.target.value })}
              sx={{ fontSize: '0.8rem', borderRadius: 1.5 }}
            >
              {WINDOW_CONTROLS_OPTIONS.map((opt) => (
                <MenuItem key={opt.id} value={opt.id} sx={{ fontSize: '0.8rem' }}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* 5. TOGGLES: Line Numbers & Line Wrapping */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
              Show Line Numbers
            </Typography>
            <Switch
              size="small"
              checked={settings.lineNumbers}
              onChange={(e) => onChange({ lineNumbers: e.target.checked })}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
              Line Wrapping
            </Typography>
            <Switch
              size="small"
              checked={settings.lineWrapping}
              onChange={(e) => onChange({ lineWrapping: e.target.checked })}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
              Highlight Active Line
            </Typography>
            <Switch
              size="small"
              checked={settings.highlightActiveLine}
              onChange={(e) => onChange({ highlightActiveLine: e.target.checked })}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
              Tab Indent Size
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {TAB_SIZES.map((size) => (
                <Button
                  key={size}
                  size="small"
                  variant={settings.tabSize === size ? 'contained' : 'outlined'}
                  onClick={() => onChange({ tabSize: size })}
                  sx={{ minWidth: 32, p: '2px 8px', fontSize: '0.72rem' }}
                >
                  {size}
                </Button>
              ))}
            </Box>
          </Box>
        </Box>

        <Divider />

        {/* Footer actions */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            size="small"
            color="inherit"
            startIcon={<RotateCcw size={12} />}
            onClick={() => {
              onReset?.();
              onChange(DEFAULT_EDITOR_SETTINGS);
            }}
            sx={{ fontSize: '0.72rem', textTransform: 'none', color: 'text.secondary' }}
          >
            Reset to Defaults
          </Button>
        </Box>
      </Box>
    </Popover>
  );
}
