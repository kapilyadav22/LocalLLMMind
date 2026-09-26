import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Tooltip,
  TextField,
  Button,
  Menu,
  MenuItem,
  Chip,
  Divider,
  Stack,
  alpha,
  useTheme,
  Paper,
} from '@mui/material';
import {
  X,
  Plus,
  Trash2,
  Download,
  Copy,
  Check,
  Eye,
  Edit3,
  Send,
  FileText,
  Pin,
  Sparkles,
  Clock,
  MoreVertical,
} from 'lucide-react';
import MarkdownRenderer from '../common/MarkdownRenderer';
import {
  loadNotes,
  getActiveNoteId,
  setActiveNoteId,
  createNote,
  updateNote,
  deleteNote,
  NoteItem,
} from '../../utils/notesStorage';
import { showToast } from '../../utils/toast';
import { showCustomConfirm } from '../../utils/dialogService';

export interface NotesDrawerProps {
  open: boolean;
  onClose: () => void;
  onSendToChat?: (content: string) => void;
}

const TEMPLATES = [
  {
    name: 'Research & Summary',
    content: `# 🔍 Topic Research & Summary\n\n### Objective\n- [Define the core question or goal]\n\n### Key Findings\n- Point 1\n- Point 2\n\n### Open Questions\n- Question 1\n\n### Next Steps\n- [ ] Action item 1\n`,
  },
  {
    name: 'Tech Architecture',
    content: `# 🏗️ Technical Architecture Spec\n\n### System Overview\nHigh-level description of components.\n\n### Data Flow & Protocols\n1. Client -> Gateway\n2. Local Model Inference\n\n### API Interface\n\`\`\`json\n{\n  "endpoint": "/v1/chat/completions",\n  "method": "POST"\n}\n\`\`\`\n\n### Tradeoffs & Alternatives\n- Option A vs Option B\n`,
  },
  {
    name: 'Todo Checklist',
    content: `# ✅ Project Checklist\n\n### Immediate Priorities\n- [ ] Task 1\n- [ ] Task 2\n\n### In Review\n- [x] Initial design\n\n### Backlog\n- Future enhancement\n`,
  },
];

export default function NotesDrawer({ open, onClose, onSendToChat }: NotesDrawerProps) {
  const theme = useTheme();

  const [notes, setNotes] = useState<NoteItem[]>(() => loadNotes());
  const [activeId, setActiveId] = useState<string>(() => getActiveNoteId());
  const [isPreview, setIsPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [templateMenuAnchor, setTemplateMenuAnchor] = useState<null | HTMLElement>(null);

  // Sync notes from storage when drawer opens or events fire
  useEffect(() => {
    if (open) {
      setNotes(loadNotes());
      setActiveId(getActiveNoteId());
    }
  }, [open]);

  useEffect(() => {
    const handleNotesUpdated = (e: any) => {
      const updatedNotes = Array.isArray(e.detail) ? e.detail : loadNotes();
      setNotes(updatedNotes);
    };

    const handleActiveChanged = (e: any) => {
      if (e.detail) setActiveId(e.detail);
    };

    window.addEventListener('localllmmind-notes-updated', handleNotesUpdated);
    window.addEventListener('localllmmind-active-note-changed', handleActiveChanged);
    return () => {
      window.removeEventListener('localllmmind-notes-updated', handleNotesUpdated);
      window.removeEventListener('localllmmind-active-note-changed', handleActiveChanged);
    };
  }, []);

  const activeNote = useMemo(() => {
    return notes.find((n) => n.id === activeId) || notes[0] || null;
  }, [notes, activeId]);

  // Handle note switching
  const handleSelectNote = (id: string) => {
    setActiveId(id);
    setActiveNoteId(id);
  };

  // Create new note
  const handleCreateNew = () => {
    const newNote = createNote('Untitled Note', '');
    setActiveId(newNote.id);
    setIsPreview(false);
    showToast('New note created', 'success');
  };

  // Update active note title
  const handleTitleChange = (newTitle: string) => {
    if (!activeNote) return;
    const updated = updateNote(activeNote.id, { title: newTitle });
    if (updated) {
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    }
  };

  // Update active note content
  const handleContentChange = (newContent: string) => {
    if (!activeNote) return;
    const updated = updateNote(activeNote.id, { content: newContent });
    if (updated) {
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    }
  };

  // Delete note
  const handleDeleteNote = async () => {
    if (!activeNote) return;
    const confirmed = await showCustomConfirm({
      title: 'Delete Note?',
      message: `Delete "${activeNote.title || 'this note'}"? This action cannot be undone.`,
      confirmText: 'Delete',
      confirmColor: 'error',
    });
    if (!confirmed) return;

    deleteNote(activeNote.id);
    showToast('Note deleted', 'info');
  };

  // Toggle pin
  const handleTogglePin = () => {
    if (!activeNote) return;
    const updated = updateNote(activeNote.id, { isPinned: !activeNote.isPinned });
    if (updated) {
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    }
  };

  // Send content to prompt input
  const handleSendToPrompt = () => {
    if (!activeNote || !activeNote.content.trim()) {
      showToast('Note is empty', 'warning');
      return;
    }
    if (onSendToChat) {
      onSendToChat(activeNote.content.trim());
      showToast('Note inserted into chat prompt', 'success');
    }
  };

  // Copy Markdown
  const handleCopyMarkdown = async () => {
    if (!activeNote) return;
    try {
      await navigator.clipboard.writeText(activeNote.content);
      setCopied(true);
      showToast('Note copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Failed to copy', 'error');
    }
    setExportMenuAnchor(null);
  };

  // Download Markdown file
  const handleDownloadFile = (ext: 'md' | 'txt') => {
    if (!activeNote) return;
    const blob = new Blob([activeNote.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = (activeNote.title || 'note').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
    link.href = url;
    link.download = `${safeName}.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded as .${ext}`, 'success');
    setExportMenuAnchor(null);
  };

  // Insert template
  const handleApplyTemplate = (tmplContent: string) => {
    if (!activeNote) return;
    const newContent = activeNote.content.trim()
      ? `${activeNote.content}\n\n${tmplContent}`
      : tmplContent;
    handleContentChange(newContent);
    setTemplateMenuAnchor(null);
    showToast('Template appended to note', 'success');
  };

  // Stats calculation
  const stats = useMemo(() => {
    if (!activeNote) return { words: 0, chars: 0 };
    const text = activeNote.content.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const chars = text.length;
    return { words, chars };
  }, [activeNote?.content]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: 480, md: 540 },
            bgcolor: 'background.paper',
            borderLeft: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
            display: 'flex',
            flexDirection: 'column',
            backgroundImage: 'none',
          },
        },
      }}
    >
      {/* Top Header Bar */}
      <Box
        sx={{
          p: 1.75,
          px: 2.25,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: alpha(theme.palette.background.default, 0.5),
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              p: 0.75,
              borderRadius: 1.75,
              bgcolor: alpha(theme.palette.primary.main, 0.12),
              color: 'primary.main',
              display: 'flex',
            }}
          >
            <FileText size={18} />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.92rem', lineHeight: 1.2 }}>
              Workspace Notes
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Scratchpad & Research Notebook
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {/* Send to chat button */}
          <Tooltip title="Send note content to chat prompt">
            <IconButton
              size="small"
              onClick={handleSendToPrompt}
              sx={{
                color: 'primary.main',
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.16) },
              }}
            >
              <Send size={15} />
            </IconButton>
          </Tooltip>

          {/* Toggle Edit vs Markdown Preview */}
          <Tooltip title={isPreview ? 'Switch to Editor' : 'Live Markdown Preview'}>
            <IconButton
              size="small"
              onClick={() => setIsPreview((prev) => !prev)}
              sx={{
                color: isPreview ? 'info.main' : 'text.secondary',
                bgcolor: isPreview ? alpha(theme.palette.info.main, 0.12) : 'transparent',
                '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.06) },
              }}
            >
              {isPreview ? <Edit3 size={15} /> : <Eye size={15} />}
            </IconButton>
          </Tooltip>

          {/* New Note */}
          <Tooltip title="Create new note">
            <IconButton
              size="small"
              onClick={handleCreateNew}
              sx={{
                color: 'text.secondary',
                '&:hover': { color: 'text.primary', bgcolor: alpha(theme.palette.text.primary, 0.06) },
              }}
            >
              <Plus size={16} />
            </IconButton>
          </Tooltip>

          {/* Export & Actions Menu */}
          <Tooltip title="Export & Options">
            <IconButton
              size="small"
              onClick={(e) => setExportMenuAnchor(e.currentTarget)}
              sx={{
                color: 'text.secondary',
                '&:hover': { color: 'text.primary', bgcolor: alpha(theme.palette.text.primary, 0.06) },
              }}
            >
              <MoreVertical size={16} />
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={exportMenuAnchor}
            open={Boolean(exportMenuAnchor)}
            onClose={() => setExportMenuAnchor(null)}
            slotProps={{ paper: { sx: { minWidth: 180, borderRadius: 2.5 } } }}
          >
            <MenuItem onClick={handleCopyMarkdown} sx={{ gap: 1.25, fontSize: '0.85rem' }}>
              {copied ? <Check size={14} color={theme.palette.success.main} /> : <Copy size={14} />}
              Copy Markdown
            </MenuItem>
            <MenuItem onClick={() => handleDownloadFile('md')} sx={{ gap: 1.25, fontSize: '0.85rem' }}>
              <Download size={14} /> Download (.md)
            </MenuItem>
            <MenuItem onClick={() => handleDownloadFile('txt')} sx={{ gap: 1.25, fontSize: '0.85rem' }}>
              <Download size={14} /> Download Text (.txt)
            </MenuItem>
            <Divider sx={{ my: 0.5 }} />
            <MenuItem onClick={handleTogglePin} sx={{ gap: 1.25, fontSize: '0.85rem' }}>
              <Pin size={14} /> {activeNote?.isPinned ? 'Unpin Note' : 'Pin Note to Top'}
            </MenuItem>
            <MenuItem
              onClick={() => {
                setExportMenuAnchor(null);
                handleDeleteNote();
              }}
              sx={{ gap: 1.25, fontSize: '0.85rem', color: 'error.main' }}
            >
              <Trash2 size={14} /> Delete Note
            </MenuItem>
          </Menu>

          {/* Close Drawer */}
          <Tooltip title="Close notes (Cmd+Shift+N)">
            <IconButton
              size="small"
              onClick={onClose}
              sx={{
                color: 'text.secondary',
                '&:hover': { color: 'text.primary', bgcolor: alpha(theme.palette.text.primary, 0.06) },
              }}
            >
              <X size={17} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Note Tabs / Switcher Bar */}
      <Box
        sx={{
          px: 2,
          py: 1,
          display: 'flex',
          gap: 0.75,
          overflowX: 'auto',
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
          bgcolor: alpha(theme.palette.background.default, 0.2),
          '&::-webkit-scrollbar': { height: 4 },
        }}
      >
        {notes.map((note) => {
          const isSelected = note.id === activeId;
          return (
            <Chip
              key={note.id}
              label={note.title || 'Untitled'}
              size="small"
              onClick={() => handleSelectNote(note.id)}
              variant={isSelected ? 'filled' : 'outlined'}
              icon={note.isPinned ? <Pin size={10} style={{ marginLeft: 6 }} /> : undefined}
              sx={{
                maxWidth: 160,
                height: 26,
                fontSize: '0.74rem',
                fontWeight: isSelected ? 600 : 400,
                cursor: 'pointer',
                bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.14) : 'transparent',
                color: isSelected ? 'primary.main' : 'text.secondary',
                borderColor: isSelected ? 'primary.main' : alpha(theme.palette.divider, 0.8),
                '&:hover': {
                  bgcolor: isSelected
                    ? alpha(theme.palette.primary.main, 0.2)
                    : alpha(theme.palette.text.primary, 0.05),
                },
              }}
            />
          );
        })}
      </Box>

      {/* Note Title Input & Fast Templates */}
      <Box sx={{ px: 2.5, pt: 2, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <TextField
            variant="standard"
            placeholder="Note Title..."
            value={activeNote?.title || ''}
            onChange={(e) => handleTitleChange(e.target.value)}
            fullWidth
            slotProps={{
              input: {
                disableUnderline: true,
                sx: {
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: 'text.primary',
                },
              },
            }}
          />

          {/* Quick Template Button */}
          <Tooltip title="Insert template">
            <Button
              size="small"
              variant="text"
              startIcon={<Sparkles size={13} />}
              onClick={(e) => setTemplateMenuAnchor(e.currentTarget)}
              sx={{
                textTransform: 'none',
                fontSize: '0.75rem',
                color: 'text.secondary',
                flexShrink: 0,
                '&:hover': { color: 'primary.main' },
              }}
            >
              Templates
            </Button>
          </Tooltip>

          <Menu
            anchorEl={templateMenuAnchor}
            open={Boolean(templateMenuAnchor)}
            onClose={() => setTemplateMenuAnchor(null)}
            slotProps={{ paper: { sx: { minWidth: 200, borderRadius: 2.5 } } }}
          >
            {TEMPLATES.map((tmpl) => (
              <MenuItem
                key={tmpl.name}
                onClick={() => handleApplyTemplate(tmpl.content)}
                sx={{ fontSize: '0.84rem' }}
              >
                {tmpl.name}
              </MenuItem>
            ))}
          </Menu>
        </Box>
      </Box>

      {/* Note Editor or Markdown Preview */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', px: 2.5, pb: 1, minHeight: 0 }}>
        {isPreview ? (
          <Paper
            elevation={0}
            sx={{
              flex: 1,
              overflowY: 'auto',
              p: 2,
              borderRadius: 2.5,
              border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
              bgcolor: alpha(theme.palette.background.default, 0.4),
            }}
          >
            {activeNote?.content?.trim() ? (
              <MarkdownRenderer content={activeNote.content} />
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                Note is empty. Switch to editor to begin writing.
              </Typography>
            )}
          </Paper>
        ) : (
          <TextField
            multiline
            fullWidth
            placeholder="Type your notes in Markdown here... (e.g. ## Heading, - List, ```code```)"
            value={activeNote?.content || ''}
            onChange={(e) => handleContentChange(e.target.value)}
            variant="outlined"
            slotProps={{
              input: {
                sx: {
                  height: '100%',
                  alignItems: 'flex-start',
                  fontFamily: 'monospace, -apple-system, BlinkMacSystemFont',
                  fontSize: '0.88rem',
                  lineHeight: 1.6,
                  bgcolor: alpha(theme.palette.background.default, 0.3),
                  borderRadius: 2.5,
                  '& textarea': {
                    height: '100% !important',
                    overflowY: 'auto !important',
                  },
                },
              },
            }}
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              '& .MuiInputBase-root': { flex: 1 },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: alpha(theme.palette.divider, 0.7),
              },
            }}
          />
        )}
      </Box>

      {/* Footer Info Bar */}
      <Box
        sx={{
          p: 1.25,
          px: 2.5,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: alpha(theme.palette.background.default, 0.4),
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
            {stats.words} words · {stats.chars} chars
          </Typography>
          <Box
            sx={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              bgcolor: 'success.main',
              display: 'inline-block',
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
            Auto-saved locally
          </Typography>
        </Box>

        {activeNote?.updatedAt && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
            <Clock size={11} />
            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
              {new Date(activeNote.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Typography>
          </Box>
        )}
      </Box>
    </Drawer>
  );
}
