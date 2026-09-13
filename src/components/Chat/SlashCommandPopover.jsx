import { useRef, useEffect } from 'react';
import {
  Paper,
  Box,
  Typography,
  Chip,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  alpha,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

export default function SlashCommandPopover({
  open,
  prompts = [],
  selectedIndex = 0,
  onSelect,
}) {
  const theme = useTheme();
  const listRef = useRef(null);

  // Auto-scroll to selected item in list
  useEffect(() => {
    if (!open || !listRef.current) return;
    const selectedItem = listRef.current.children[selectedIndex];
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex, open]);

  if (!open || prompts.length === 0) return null;

  return (
    <Paper
      elevation={12}
      sx={{
        position: 'absolute',
        bottom: 'calc(100% + 8px)',
        left: 0,
        right: 0,
        maxHeight: 280,
        overflow: 'hidden',
        borderRadius: 3,
        border: '1px solid',
        borderColor: alpha(theme.palette.primary.main, 0.3),
        bgcolor: alpha(theme.palette.background.paper, 0.96),
        backdropFilter: 'blur(16px)',
        zIndex: 1300,
        boxShadow: `0 -10px 30px ${alpha(theme.palette.common.black, 0.2)}, 0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`,
      }}
    >
      {/* Header bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 0.75,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: alpha(theme.palette.primary.main, 0.04),
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon sx={{ fontSize: 14, color: 'primary.main' }} />
          <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: '0.68rem', color: 'primary.main' }}>
            Slash Commands ({prompts.length})
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
          <kbd>↑</kbd> <kbd>↓</kbd> navigate • <kbd>Tab</kbd> / <kbd>Enter</kbd> insert • <kbd>Esc</kbd> dismiss
        </Typography>
      </Box>

      {/* Prompts list */}
      <List
        ref={listRef}
        sx={{
          py: 0.5,
          maxHeight: 235,
          overflowY: 'auto',
          scrollbarWidth: 'thin',
        }}
      >
        {prompts.map((p, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <ListItemButton
              key={p.id || p.command}
              onClick={() => onSelect(p)}
              selected={isSelected}
              sx={{
                px: 2,
                py: 0.85,
                gap: 1.5,
                borderRadius: 1.5,
                mx: 0.5,
                transition: 'all 0.15s ease',
                '&.Mui-selected': {
                  bgcolor: alpha(theme.palette.primary.main, 0.14),
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.2),
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 28, fontSize: '1.2rem', display: 'flex', justifyContent: 'center' }}>
                {p.icon || '⚡'}
              </ListItemIcon>

              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: isSelected ? 'primary.main' : 'text.primary',
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                      }}
                    >
                      {p.command}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
                      {p.title}
                    </Typography>
                    {p.isCustom && (
                      <Chip
                        label="Custom"
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          bgcolor: alpha(theme.palette.secondary.main, 0.15),
                          color: 'secondary.main',
                        }}
                      />
                    )}
                  </Box>
                }
                secondary={
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    noWrap
                    sx={{ display: 'block', maxWidth: { xs: 260, sm: 460, md: 600 } }}
                  >
                    {p.description}
                  </Typography>
                }
              />

              <Chip
                label={p.category || 'General'}
                size="small"
                variant="outlined"
                sx={{
                  height: 20,
                  fontSize: '0.68rem',
                  borderColor: 'divider',
                  display: { xs: 'none', sm: 'inline-flex' },
                }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Paper>
  );
}
