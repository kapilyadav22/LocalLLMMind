import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  IconButton,
  Chip,
  Switch,
  FormControlLabel,
  Stack,
  Card,
  CardContent,
  InputAdornment,
  Tooltip,
  Paper,
  Divider,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Brain,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  Sparkles,
  Info,
  Clock,
  RotateCcw,
} from 'lucide-react';
import {
  loadMemories,
  addMemory,
  updateMemory,
  deleteMemory,
  clearAllMemories,
  MemoryItem,
} from '../../utils/memoryStorage';
import { useChatStore } from '../../store/chatContext';
import { showToast } from '../../utils/toast';

const PRESET_SUGGESTIONS = [
  'Prefers concise, no-fluff technical answers',
  'Prefers TypeScript and modular component structure',
  'Primary development environment is macOS',
  'Always include test cases and verification steps',
  'Local dev server runs on port 2210',
  'Prefers modern React hooks and clean state separation',
];

export interface MemoryManagerDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function MemoryManagerDialog({ open, onClose }: MemoryManagerDialogProps) {
  const theme = useTheme();
  const { state, dispatch } = useChatStore();

  const [memories, setMemories] = useState<MemoryItem[]>(() => loadMemories());
  const [newMemoryText, setNewMemoryText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Sync memories when dialog opens or custom event fires
  useEffect(() => {
    if (open) {
      setMemories(loadMemories());
      setEditingId(null);
      setNewMemoryText('');
      setSearchQuery('');
    }
  }, [open]);

  useEffect(() => {
    const handleUpdate = () => setMemories(loadMemories());
    window.addEventListener('localllmmind-memories-updated', handleUpdate);
    return () => window.removeEventListener('localllmmind-memories-updated', handleUpdate);
  }, []);

  const memoryEnabled = state.settings.enableLongTermMemory !== false;
  const autoLearnEnabled = state.settings.autoExtractMemories !== false;

  const handleToggleMemory = (enabled: boolean) => {
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: { enableLongTermMemory: enabled },
    });
    showToast(enabled ? 'Long-term memory enabled' : 'Long-term memory disabled', 'info');
  };

  const handleToggleAutoLearn = (enabled: boolean) => {
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: { autoExtractMemories: enabled },
    });
    showToast(enabled ? 'Auto-learn facts enabled' : 'Auto-learn facts disabled', 'info');
  };

  const handleAdd = (contentToAdd?: string) => {
    const text = (contentToAdd || newMemoryText).trim();
    if (!text) return;

    const added = addMemory(text, 'manual');
    if (added) {
      setMemories(loadMemories());
      setNewMemoryText('');
      showToast('Memory added successfully', 'success');
    } else {
      showToast('This memory already exists', 'warning');
    }
  };

  const handleStartEdit = (item: MemoryItem) => {
    setEditingId(item.id);
    setEditingText(item.content);
  };

  const handleSaveEdit = (id: string) => {
    if (!editingText.trim()) return;
    updateMemory(id, editingText.trim());
    setMemories(loadMemories());
    setEditingId(null);
    showToast('Memory updated', 'success');
  };

  const handleDelete = (id: string) => {
    deleteMemory(id);
    setMemories(loadMemories());
    showToast('Memory removed', 'info');
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all stored memories?')) {
      clearAllMemories();
      setMemories([]);
      showToast('All memories cleared', 'info');
    }
  };

  const filteredMemories = useMemo(() => {
    if (!searchQuery.trim()) return memories;
    const q = searchQuery.toLowerCase().trim();
    return memories.filter((m) => m.content.toLowerCase().includes(q));
  }, [memories, searchQuery]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            bgcolor: theme.palette.mode === 'dark' ? '#111827' : '#ffffff',
            backgroundImage: 'none',
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
            maxHeight: '88vh',
          },
        },
      }}
    >
      {/* Title */}
      <DialogTitle
        sx={{
          p: 2.5,
          pb: 1.5,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(theme.palette.primary.main, 0.14),
              color: 'primary.main',
            }}
          >
            <Brain size={20} />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.08rem' }}>
                Persistent Long-Term Memory
              </Typography>
              <Chip
                label={`${memories.length} remembered`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  color: 'primary.main',
                }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              Facts, preferences, and instructions the AI carries across conversations
            </Typography>
          </Box>
        </Box>

        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <X size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Memory Toggles */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 2.5,
            border: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
            bgcolor: alpha(theme.palette.background.paper, 0.6),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Enable Cross-Chat Memory
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Inject active memories into the system prompt of every conversation
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={memoryEnabled}
                  onChange={(e) => handleToggleMemory(e.target.checked)}
                  color="primary"
                />
              }
              label={memoryEnabled ? 'Active' : 'Disabled'}
            />
            <Divider orientation="vertical" flexItem />
            <FormControlLabel
              control={
                <Switch
                  checked={autoLearnEnabled}
                  disabled={!memoryEnabled}
                  onChange={(e) => handleToggleAutoLearn(e.target.checked)}
                  color="primary"
                />
              }
              label="Auto-Learn"
            />
          </Box>
        </Paper>

        {/* Add Memory Input */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Plus size={16} />
            Add New Fact or Preference
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="e.g. User prefers Python and FastAPI for backend development"
              value={newMemoryText}
              onChange={(e) => setNewMemoryText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <Button
              variant="contained"
              onClick={() => handleAdd()}
              disabled={!newMemoryText.trim()}
              sx={{ textTransform: 'none', borderRadius: 2, px: 2.5, whiteSpace: 'nowrap' }}
            >
              Add Memory
            </Button>
          </Box>

          {/* Quick Presets */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mt: 1.25 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              Suggestions:
            </Typography>
            {PRESET_SUGGESTIONS.map((suggestion) => (
              <Chip
                key={suggestion}
                label={suggestion}
                size="small"
                clickable
                onClick={() => handleAdd(suggestion)}
                icon={<Sparkles size={11} />}
                sx={{
                  height: 22,
                  fontSize: '0.68rem',
                  bgcolor: 'action.hover',
                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.12) },
                }}
              />
            ))}
          </Box>
        </Box>

        <Divider />

        {/* Search & List */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Stored Memories ({filteredMemories.length})
            </Typography>

            {memories.length > 3 && (
              <TextField
                size="small"
                placeholder="Search memories…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={14} color="text.secondary" />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ width: 220, '& .MuiOutlinedInput-root': { borderRadius: 2, height: 32, fontSize: '0.8rem' } }}
              />
            )}
          </Box>

          {filteredMemories.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 4,
                textAlign: 'center',
                borderRadius: 2.5,
                bgcolor: alpha(theme.palette.background.paper, 0.4),
                border: `1px dashed ${alpha(theme.palette.divider, 0.8)}`,
              }}
            >
              <Brain size={32} color={theme.palette.text.secondary} style={{ opacity: 0.4, marginBottom: 8 }} />
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                {searchQuery ? 'No memories match your search' : 'No memories saved yet'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Add facts above or click the brain icon on messages in chat to remember context.
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={1}>
              {filteredMemories.map((item) => {
                const isEditing = editingId === item.id;
                return (
                  <Card
                    key={item.id}
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      bgcolor: alpha(theme.palette.background.paper, 0.5),
                      borderColor: alpha(theme.palette.divider, 0.7),
                      transition: 'border-color 0.15s ease',
                      '&:hover': {
                        borderColor: alpha(theme.palette.primary.main, 0.4),
                      },
                    }}
                  >
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      {isEditing ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TextField
                            size="small"
                            fullWidth
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(item.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            autoFocus
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                          />
                          <IconButton size="small" color="primary" onClick={() => handleSaveEdit(item.id)}>
                            <Check size={16} />
                          </IconButton>
                          <IconButton size="small" onClick={() => setEditingId(null)}>
                            <X size={16} />
                          </IconButton>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
                            <Box
                              sx={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                bgcolor: item.source === 'learned' ? '#ec4899' : 'primary.main',
                                flexShrink: 0,
                              }}
                            />
                            <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.86rem' }}>
                              {item.content}
                            </Typography>
                          </Box>

                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                            {item.source && (
                              <Chip
                                label={item.source}
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: '0.62rem',
                                  textTransform: 'uppercase',
                                  bgcolor: 'action.hover',
                                  fontWeight: 600,
                                }}
                              />
                            )}
                            <IconButton size="small" onClick={() => handleStartEdit(item)}>
                              <Edit2 size={13} />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDelete(item.id)}>
                              <Trash2 size={13} />
                            </IconButton>
                          </Box>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          )}
        </Box>
      </DialogContent>

      {/* Footer */}
      <DialogActions
        sx={{
          p: 2,
          px: 2.5,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {memories.length > 0 ? (
          <Button
            size="small"
            color="error"
            onClick={handleClearAll}
            sx={{ textTransform: 'none', fontSize: '0.78rem' }}
          >
            Clear All Memories
          </Button>
        ) : (
          <Box />
        )}

        <Button onClick={onClose} variant="contained" sx={{ textTransform: 'none', borderRadius: 2 }}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
