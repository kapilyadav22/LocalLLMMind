import { Box, IconButton, Tooltip, Typography, alpha, useTheme } from '@mui/material';
import { FileCode, X, Plus } from 'lucide-react';

export default function CodeTabBar({
  openPaths = [],
  activePath = '',
  onSelect,
  onClose,
  onNewFile,
  accentColor = '#3b82f6',
}) {
  const theme = useTheme();

  if (!openPaths.length) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        minHeight: 38,
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
        {openPaths.map((filePath) => {
          const isActive = filePath === activePath;
          const fileName = filePath.split('/').pop();
          const parentDir = filePath.includes('/') ? filePath.slice(0, filePath.lastIndexOf('/') + 1) : '';

          return (
            <Box
              key={filePath}
              onClick={() => onSelect(filePath)}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1.5,
                py: 0.8,
                cursor: 'pointer',
                userSelect: 'none',
                minWidth: 0,
                maxWidth: 200,
                borderRight: '1px solid',
                borderColor: 'divider',
                borderTop: isActive ? `2px solid ${accentColor}` : '2px solid transparent',
                bgcolor: isActive
                  ? alpha(theme.palette.background.default, 0.7)
                  : 'transparent',
                transition: 'all 0.15s ease',
                '&:hover': {
                  bgcolor: isActive
                    ? alpha(theme.palette.background.default, 0.9)
                    : alpha(theme.palette.action.hover, 0.6),
                  '& .tab-close-btn': { opacity: 0.85 },
                },
              }}
            >
              <FileCode
                size={14}
                color={isActive ? accentColor : theme.palette.text.secondary}
                style={{ flexShrink: 0 }}
              />

              <Box sx={{ display: 'flex', alignItems: 'baseline', minWidth: 0, overflow: 'hidden' }}>
                {parentDir && (
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '0.68rem',
                      color: 'text.secondary',
                      opacity: 0.6,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {parentDir}
                  </Typography>
                )}
                <Typography
                  variant="body2"
                  noWrap
                  sx={{
                    fontSize: '0.78rem',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'text.primary' : 'text.secondary',
                    fontFamily: 'monospace',
                  }}
                >
                  {fileName}
                </Typography>
              </Box>

              <IconButton
                className="tab-close-btn"
                size="small"
                aria-label={`Close ${fileName}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(filePath);
                }}
                sx={{
                  p: 0.25,
                  ml: 'auto',
                  opacity: isActive ? 0.7 : 0,
                  transition: 'opacity 0.15s ease',
                  '&:hover': {
                    opacity: 1,
                    bgcolor: alpha(theme.palette.text.primary, 0.1),
                  },
                }}
              >
                <X size={12} />
              </IconButton>
            </Box>
          );
        })}
      </Box>

      {onNewFile && (
        <Tooltip title="New file">
          <IconButton
            size="small"
            onClick={onNewFile}
            sx={{ mx: 0.75, p: 0.5, color: 'text.secondary' }}
          >
            <Plus size={14} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}
