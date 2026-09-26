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
  Button,
} from '@mui/material';
import { BookOpen, Hash, Layers, FileText, ExternalLink } from 'lucide-react';
import { KnowledgeDocument } from '../../utils/knowledgeStorage';

export interface KnowledgeTagPopoverProps {
  open: boolean;
  documents: KnowledgeDocument[];
  selectedIndex: number;
  onSelect: (doc: KnowledgeDocument) => void;
  onOpenKnowledgeStudio?: () => void;
  query?: string;
}

export default function KnowledgeTagPopover({
  open,
  documents = [],
  selectedIndex = 0,
  onSelect,
  onOpenKnowledgeStudio,
  query = '',
}: KnowledgeTagPopoverProps) {
  const theme = useTheme();
  const listRef = useRef<HTMLUListElement | null>(null);

  // Auto-scroll to selected item in list
  useEffect(() => {
    if (!open || !listRef.current) return;
    const selectedItem = listRef.current.children[selectedIndex] as HTMLElement;
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex, open]);

  if (!open || documents.length === 0) return null;

  return (
    <Paper
      elevation={12}
      sx={{
        position: 'absolute',
        bottom: 'calc(100% + 8px)',
        left: 0,
        right: 0,
        maxHeight: 310,
        overflow: 'hidden',
        borderRadius: 3,
        border: '1px solid',
        borderColor: alpha(theme.palette.secondary.main, 0.35),
        bgcolor: alpha(theme.palette.background.paper, 0.96),
        backdropFilter: 'blur(16px)',
        zIndex: 1300,
        boxShadow: `0 -10px 30px ${alpha(theme.palette.common.black, 0.25)}, 0 4px 14px ${alpha(theme.palette.secondary.main, 0.15)}`,
      }}
    >
      {/* Header bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 0.85,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: alpha(theme.palette.secondary.main, 0.06),
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BookOpen size={14} color={theme.palette.secondary.main} />
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              fontSize: '0.68rem',
              color: 'secondary.main',
            }}
          >
            Knowledge Base Grounding ({documents.length})
          </Typography>
          {query && (
            <Chip
              label={`#${query}`}
              size="small"
              sx={{
                height: 18,
                fontSize: '0.65rem',
                fontWeight: 600,
                bgcolor: alpha(theme.palette.secondary.main, 0.15),
              }}
            />
          )}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
          <kbd>↑</kbd> <kbd>↓</kbd> navigate • <kbd>Tab</kbd> / <kbd>Enter</kbd> attach • <kbd>Esc</kbd> dismiss
        </Typography>
      </Box>

      {/* Documents list */}
      <List
        ref={listRef}
        sx={{
          py: 0.5,
          maxHeight: 220,
          overflowY: 'auto',
          scrollbarWidth: 'thin',
        }}
      >
        {documents.map((doc, idx) => {
          const isSelected = idx === selectedIndex;
          const snippet = doc.content ? doc.content.slice(0, 100).replace(/[\n\r]+/g, ' ') : '';
          return (
            <ListItemButton
              key={doc.id}
              onClick={() => onSelect(doc)}
              selected={isSelected}
              sx={{
                px: 2,
                py: 0.85,
                gap: 1.5,
                borderRadius: 1.5,
                mx: 0.5,
                my: 0.25,
                transition: 'background-color 0.15s',
                '&.Mui-selected': {
                  bgcolor: alpha(theme.palette.secondary.main, 0.12),
                  '&:hover': {
                    bgcolor: alpha(theme.palette.secondary.main, 0.18),
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 28, color: isSelected ? 'secondary.main' : 'text.secondary' }}>
                <Hash size={16} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: isSelected ? 700 : 600,
                        fontFamily: 'monospace',
                        color: isSelected ? 'secondary.main' : 'text.primary',
                        fontSize: '0.82rem',
                      }}
                    >
                      #{doc.tag}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 500,
                        color: 'text.secondary',
                        fontSize: '0.8rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      — {doc.title}
                    </Typography>
                  </Box>
                }
                secondary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.25 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        fontSize: '0.7rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 380,
                      }}
                    >
                      {snippet}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto', flexShrink: 0 }}>
                      <Layers size={11} color={theme.palette.text.secondary} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
                        {doc.chunks?.length || 1} chunks
                      </Typography>
                    </Box>
                  </Box>
                }
              />
            </ListItemButton>
          );
        })}
      </List>

      {/* Footer studio link */}
      {onOpenKnowledgeStudio && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 0.6,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: alpha(theme.palette.background.paper, 0.8),
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
            Tag document to ground responses with authoritatively retrieved excerpts.
          </Typography>
          <Button
            size="small"
            variant="text"
            color="secondary"
            onClick={onOpenKnowledgeStudio}
            startIcon={<ExternalLink size={12} />}
            sx={{ textTransform: 'none', fontSize: '0.72rem', py: 0.2, fontWeight: 600 }}
          >
            Manage Knowledge Base
          </Button>
        </Box>
      )}
    </Paper>
  );
}
