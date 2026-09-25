import { useMemo, memo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Stack,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import { X, GitCompare, FileCode, Check, Undo2 } from 'lucide-react';
import { computeUnifiedDiff } from '../../utils/gitService';
import { GIT_STATUS_TYPES } from '../../constants/gitConstants';

function GitDiffViewerComponent({
  filePath,
  oldContent = '',
  newContent = '',
  status = GIT_STATUS_TYPES.MODIFIED,
  onClose,
  onOpenInEditor,
  onDiscard,
}) {
  const theme = useTheme();

  const diffLines = useMemo(() => {
    return computeUnifiedDiff(oldContent, newContent, filePath);
  }, [oldContent, newContent, filePath]);

  const stats = useMemo(() => {
    let additions = 0;
    let deletions = 0;
    for (const line of diffLines) {
      if (line.type === 'add') additions++;
      else if (line.type === 'remove') deletions++;
    }
    return { additions, deletions };
  }, [diffLines]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#0d1117', color: '#c9d1d9', overflow: 'hidden' }}>
      {/* Diff Header Bar */}
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between',
          px: 2,
          py: 1,
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          bgcolor: '#161b22',
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
          <GitCompare size={16} color="#58a6ff" />
          <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.85rem' }} noWrap>
            {filePath}
          </Typography>
          <Chip
            size="small"
            label={`+${stats.additions}`}
            sx={{ height: 18, fontSize: '0.68rem', fontWeight: 700, bgcolor: 'rgba(63, 185, 80, 0.2)', color: '#3fb950' }}
          />
          <Chip
            size="small"
            label={`-${stats.deletions}`}
            sx={{ height: 18, fontSize: '0.68rem', fontWeight: 700, bgcolor: 'rgba(248, 81, 73, 0.2)', color: '#f85149' }}
          />
        </Stack>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {onDiscard && (
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              onClick={onDiscard}
              startIcon={<Undo2 size={13} />}
              sx={{ fontSize: '0.75rem', textTransform: 'none', borderColor: 'rgba(255, 255, 255, 0.2)' }}
            >
              Discard Changes
            </Button>
          )}
          {onOpenInEditor && (
            <Button
              size="small"
              variant="contained"
              onClick={onOpenInEditor}
              startIcon={<FileCode size={13} />}
              sx={{ fontSize: '0.75rem', textTransform: 'none' }}
            >
              Open in Editor
            </Button>
          )}
          <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
            <X size={16} />
          </IconButton>
        </Stack>
      </Stack>

      {/* Diff Code Container */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1, fontFamily: 'Consolas, Monaco, "Courier New", monospace', fontSize: '12.5px' }}>
        {diffLines.map((line, idx) => {
          let lineBg = 'transparent';
          let textColor = '#c9d1d9';
          let prefix = ' ';

          if (line.type === 'add') {
            lineBg = 'rgba(46, 160, 67, 0.18)';
            textColor = '#7ee787';
            prefix = '+';
          } else if (line.type === 'remove') {
            lineBg = 'rgba(248, 81, 73, 0.18)';
            textColor = '#ffa198';
            prefix = '-';
          } else if (line.type === 'header') {
            lineBg = 'rgba(88, 166, 255, 0.1)';
            textColor = '#79c0ff';
            prefix = '';
          }

          return (
            <Box
              key={idx}
              sx={{
                display: 'flex',
                bgcolor: lineBg,
                color: textColor,
                px: 1,
                py: '1.5px',
                lineHeight: 1.45,
                borderRadius: '2px',
                whiteSpace: 'pre',
                '&:hover': {
                  bgcolor: line.type === 'context' ? 'rgba(255, 255, 255, 0.04)' : lineBg,
                },
              }}
            >
              {/* Old Line Number */}
              <Box
                sx={{
                  width: 36,
                  textAlign: 'right',
                  pr: 1.5,
                  userSelect: 'none',
                  color: 'rgba(255, 255, 255, 0.3)',
                  flexShrink: 0,
                }}
              >
                {line.oldNum ?? ''}
              </Box>

              {/* New Line Number */}
              <Box
                sx={{
                  width: 36,
                  textAlign: 'right',
                  pr: 1.5,
                  userSelect: 'none',
                  color: 'rgba(255, 255, 255, 0.3)',
                  borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                  mr: 1.5,
                  flexShrink: 0,
                }}
              >
                {line.newNum ?? ''}
              </Box>

              {/* Marker (+, -, ' ') */}
              <Box sx={{ width: 14, userSelect: 'none', fontWeight: 700, flexShrink: 0 }}>
                {prefix}
              </Box>

              {/* Line Text Content */}
              <Box sx={{ flex: 1, overflowX: 'visible' }}>
                {line.text}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

const GitDiffViewer = memo(GitDiffViewerComponent);
export default GitDiffViewer;
