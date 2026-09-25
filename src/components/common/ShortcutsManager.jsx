import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  RotateCcw,
  Keyboard,
  CheckCircle2,
  X,
} from 'lucide-react';

import { useChatStore } from '../../store/chatContext';
import { showCustomConfirm } from '../../utils/dialogService';
import {
  DEFAULT_SHORTCUTS,
  SHORTCUT_ACTION_TYPES,
  PROMPT_TEMPLATES,
  formatShortcutDisplay,
} from '../../constants/appConstants';

// Helper to determine if a key is a standalone modifier
function isModifierKey(key) {
  return ['Meta', 'Control', 'Shift', 'Alt', 'Command'].includes(key);
}

// Convert a KeyboardEvent into shortcut modifier array and clean key name
function parseKeyEvent(e) {
  const isCmdOrCtrl = e.metaKey || e.ctrlKey;
  const modifiers = [];
  if (isCmdOrCtrl) modifiers.push('ctrlOrCmd');
  if (e.shiftKey) modifiers.push('shift');
  if (e.altKey) modifiers.push('alt');

  let key = e.key;
  if (key === ' ') key = 'Space';
  else if (key.length === 1) key = key.toLowerCase();

  return { modifiers, key };
}

export default function ShortcutsManager() {
  const theme = useTheme();
  const { state, dispatch } = useChatStore();
  const shortcuts = state.shortcuts || DEFAULT_SHORTCUTS;

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [editingId, setEditingId] = useState(null);
  const [recordedKeys, setRecordedKeys] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // New shortcut form state
  const [newName, setNewName] = useState('');
  const [newActionType, setNewActionType] = useState('insert_template');
  const [newTemplateType, setNewTemplateType] = useState('custom');
  const [newPayload, setNewPayload] = useState('');
  const [newShortcutKeys, setNewShortcutKeys] = useState(null);
  const [isRecordingNew, setIsRecordingNew] = useState(false);
  const [conflictWarning, setConflictWarning] = useState(null);

  // Filter shortcuts
  const categories = useMemo(() => {
    const set = new Set(shortcuts.map((s) => s.category || 'General'));
    return ['All', ...Array.from(set)];
  }, [shortcuts]);

  const filteredShortcuts = useMemo(() => {
    return shortcuts.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.description.toLowerCase().includes(search.toLowerCase()) ||
        formatShortcutDisplay(s).toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === 'All' || s.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [shortcuts, search, activeCategory]);

  // Check for shortcut collision
  const checkCollision = useCallback(
    (mod, key, ignoreId = null) => {
      return shortcuts.find((s) => {
        if (ignoreId && s.id === ignoreId) return false;
        const sameKey = s.key?.toLowerCase() === key?.toLowerCase();
        const mod1 = s.modifiers || [];
        const mod2 = mod || [];
        const sameMods =
          mod1.length === mod2.length && mod1.every((m) => mod2.includes(m));
        return sameKey && sameMods;
      });
    },
    [shortcuts]
  );

  // Keyboard capture for inline editing
  useEffect(() => {
    if (!editingId) return;

    const handleKeyDown = (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        setEditingId(null);
        setRecordedKeys(null);
        return;
      }

      if (isModifierKey(e.key)) return;

      const { modifiers, key } = parseKeyEvent(e);
      if (!modifiers.length && key.length === 1) {
        // Require at least one modifier for standard letter keys
        return;
      }

      const collision = checkCollision(modifiers, key, editingId);
      if (collision) {
        setConflictWarning(`Conflicts with "${collision.name}". Overwrite?`);
      } else {
        setConflictWarning(null);
      }

      setRecordedKeys({ modifiers, key });
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [editingId, checkCollision]);

  // Keyboard capture for modal new shortcut
  useEffect(() => {
    if (!isRecordingNew) return;

    const handleKeyDown = (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        setIsRecordingNew(false);
        return;
      }

      if (isModifierKey(e.key)) return;

      const { modifiers, key } = parseKeyEvent(e);
      if (!modifiers.length && key.length === 1) return;

      const collision = checkCollision(modifiers, key);
      if (collision) {
        setConflictWarning(`Conflicts with "${collision.name}".`);
      } else {
        setConflictWarning(null);
      }

      setNewShortcutKeys({ modifiers, key });
      setIsRecordingNew(false);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isRecordingNew, checkCollision]);

  const handleSaveInline = (id) => {
    if (recordedKeys) {
      dispatch({
        type: 'UPDATE_SHORTCUT',
        payload: {
          id,
          key: recordedKeys.key,
          modifiers: recordedKeys.modifiers,
        },
      });
    }
    setEditingId(null);
    setRecordedKeys(null);
    setConflictWarning(null);
  };

  const handleResetSingle = (id) => {
    const defaultS = DEFAULT_SHORTCUTS.find((d) => d.id === id);
    if (defaultS) {
      dispatch({
        type: 'UPDATE_SHORTCUT',
        payload: {
          id,
          key: defaultS.key,
          modifiers: defaultS.modifiers,
        },
      });
    }
  };

  const handleResetAll = async () => {
    const confirmed = await showCustomConfirm({
      title: 'Reset All Shortcuts?',
      message: 'Reset all keyboard shortcuts to factory defaults? Any custom shortcut assignments will be removed.',
      type: 'warning',
      confirmText: 'Reset Defaults',
      confirmColor: 'warning',
    });
    if (confirmed) {
      dispatch({ type: 'RESET_SHORTCUTS' });
    }
  };

  const handleDeleteCustom = (id) => {
    dispatch({ type: 'DELETE_CUSTOM_SHORTCUT', payload: id });
  };

  const handleCreateSubmit = () => {
    if (!newName.trim() || !newShortcutKeys) return;

    let payload = newPayload;
    if (newActionType === 'insert_template' && newTemplateType !== 'custom') {
      const tmpl = PROMPT_TEMPLATES.find((t) => t.command === newTemplateType);
      payload = tmpl?.text || newPayload;
    }

    dispatch({
      type: 'ADD_CUSTOM_SHORTCUT',
      payload: {
        name: newName.trim(),
        description:
          newActionType === 'insert_template'
            ? `Insert template: ${newName.trim()}`
            : `Custom action`,
        key: newShortcutKeys.key,
        modifiers: newShortcutKeys.modifiers,
        actionType: newActionType,
        payload,
      },
    });

    // Reset & close
    setCreateDialogOpen(false);
    setNewName('');
    setNewPayload('');
    setNewShortcutKeys(null);
    setConflictWarning(null);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Top Controls: Search & Category Chips */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', justifyContent: 'space-between' }}>
        <TextField
          size="small"
          placeholder="Filter shortcuts (e.g. settings, cmd+k)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: <Search size={16} color={theme.palette.text.secondary} style={{ marginRight: 8 }} />,
            },
          }}
          sx={{ minWidth: 260, flex: 1 }}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<Plus size={15} />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ fontWeight: 600, textTransform: 'none' }}
          >
            Create Shortcut
          </Button>

          <Tooltip title="Reset all standard shortcuts to factory defaults">
            <Button
              variant="outlined"
              size="small"
              color="inherit"
              startIcon={<RotateCcw size={15} />}
              onClick={handleResetAll}
              sx={{ textTransform: 'none' }}
            >
              Reset All
            </Button>
          </Tooltip>
        </Box>
      </Box>

      {/* Category Pills */}
      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
        {categories.map((cat) => (
          <Chip
            key={cat}
            label={cat}
            size="small"
            clickable
            color={activeCategory === cat ? 'primary' : 'default'}
            onClick={() => setActiveCategory(cat)}
            variant={activeCategory === cat ? 'filled' : 'outlined'}
            sx={{ fontSize: '0.75rem', fontWeight: 600 }}
          />
        ))}
      </Box>

      {/* Shortcuts List */}
      <Box
        sx={{
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
          bgcolor: alpha(theme.palette.background.paper, 0.4),
        }}
      >
        {filteredShortcuts.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No shortcuts found matching your criteria.
            </Typography>
          </Box>
        ) : (
          filteredShortcuts.map((item, idx) => {
            const isEditing = editingId === item.id;
            const isCustom = item.category === 'Custom' || item.custom;
            const currentDisplay = isEditing && recordedKeys
              ? formatShortcutDisplay(recordedKeys)
              : formatShortcutDisplay(item);

            return (
              <Box
                key={item.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.75,
                  gap: 2,
                  borderBottom: idx === filteredShortcuts.length - 1 ? 'none' : '1px solid',
                  borderColor: alpha(theme.palette.divider, 0.5),
                  bgcolor: isEditing ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
                  transition: 'background-color 0.2s ease',
                  '&:hover': {
                    bgcolor: isEditing
                      ? alpha(theme.palette.primary.main, 0.08)
                      : alpha(theme.palette.action.hover, 0.04),
                  },
                }}
              >
                {/* Left: Info */}
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      {item.name}
                    </Typography>
                    {isCustom && (
                      <Chip
                        label="Custom"
                        size="small"
                        color="secondary"
                        sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                      />
                    )}
                  </Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                    {item.description}
                  </Typography>
                </Box>

                {/* Right: Key Combo & Controls */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {isEditing ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 1.5,
                          border: '2px solid',
                          borderColor: 'primary.main',
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.75,
                        }}
                      >
                        <Box
                          component="span"
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: 'error.main',
                            animation: 'pulse 1.5s infinite',
                            '@keyframes pulse': {
                              '0%': { opacity: 0.3 },
                              '50%': { opacity: 1 },
                              '100%': { opacity: 0.3 },
                            },
                          }}
                        />
                        <Typography variant="caption" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                          {currentDisplay || 'Press Keys...'}
                        </Typography>
                      </Box>
                      <IconButton size="small" color="primary" onClick={() => handleSaveInline(item.id)}>
                        <CheckCircle2 size={16} />
                      </IconButton>
                      <IconButton size="small" onClick={() => { setEditingId(null); setRecordedKeys(null); }}>
                        <X size={16} />
                      </IconButton>
                    </Box>
                  ) : (
                    <Box
                      component="kbd"
                      sx={{
                        px: 1.25,
                        py: 0.5,
                        borderRadius: 1.5,
                        bgcolor: alpha(theme.palette.text.primary, 0.07),
                        border: '1px solid',
                        borderColor: 'divider',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        color: 'text.primary',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      }}
                    >
                      {currentDisplay}
                    </Box>
                  )}

                  {/* Edit action */}
                  {item.customizable !== false && !isEditing && (
                    <Tooltip title="Rebind shortcut keys">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingId(item.id);
                          setRecordedKeys(null);
                        }}
                        sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                      >
                        <Edit3 size={15} />
                      </IconButton>
                    </Tooltip>
                  )}

                  {/* Reset single default shortcut */}
                  {!isCustom && item.customizable !== false && !isEditing && (
                    <Tooltip title="Reset to default">
                      <IconButton
                        size="small"
                        onClick={() => handleResetSingle(item.id)}
                        sx={{ color: 'text.secondary', '&:hover': { color: 'info.main' } }}
                      >
                        <RotateCcw size={15} />
                      </IconButton>
                    </Tooltip>
                  )}

                  {/* Delete custom shortcut */}
                  {isCustom && !isEditing && (
                    <Tooltip title="Delete custom shortcut">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteCustom(item.id)}
                        sx={{ color: 'error.main' }}
                      >
                        <Trash2 size={15} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>
            );
          })
        )}
      </Box>

      {/* Conflict Warning banner */}
      {conflictWarning && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          {conflictWarning}
        </Alert>
      )}

      {/* Create Custom Shortcut Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
            },
          },
        }}
      >
        <DialogTitle component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Keyboard size={20} color={theme.palette.primary.main} />
          <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
            Create Custom Shortcut
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
          <TextField
            label="Shortcut Name"
            fullWidth
            size="small"
            placeholder="e.g., Quick Summarize, Explain Code"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />

          <FormControl fullWidth size="small">
            <InputLabel>Action Type</InputLabel>
            <Select
              value={newActionType}
              label="Action Type"
              onChange={(e) => setNewActionType(e.target.value)}
            >
              {SHORTCUT_ACTION_TYPES.map((act) => (
                <MenuItem key={act.id} value={act.id}>
                  {act.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Template Details when action is insert_template */}
          {newActionType === 'insert_template' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Choose Template Source</InputLabel>
                <Select
                  value={newTemplateType}
                  label="Choose Template Source"
                  onChange={(e) => setNewTemplateType(e.target.value)}
                >
                  <MenuItem value="custom">Freeform Custom Text / Prompt</MenuItem>
                  {PROMPT_TEMPLATES.map((tmpl) => (
                    <MenuItem key={tmpl.command} value={tmpl.command}>
                      {tmpl.label} ({tmpl.command})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {newTemplateType === 'custom' && (
                <TextField
                  label="Text / Prompt to Insert"
                  multiline
                  rows={3}
                  fullWidth
                  size="small"
                  placeholder="Type the exact text or prompt to insert into chat..."
                  value={newPayload}
                  onChange={(e) => setNewPayload(e.target.value)}
                />
              )}
            </Box>
          )}

          {/* Key Recorder Box */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Keyboard Combination
            </Typography>
            <Box
              onClick={() => setIsRecordingNew(true)}
              sx={{
                p: 2,
                borderRadius: 2,
                border: '2px dashed',
                borderColor: isRecordingNew ? 'primary.main' : 'divider',
                bgcolor: isRecordingNew
                  ? alpha(theme.palette.primary.main, 0.08)
                  : alpha(theme.palette.background.default, 0.6),
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                },
              }}
            >
              {isRecordingNew ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <Box
                    component="span"
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'error.main',
                      animation: 'pulse 1.5s infinite',
                      '@keyframes pulse': {
                        '0%': { opacity: 0.3 },
                        '50%': { opacity: 1 },
                        '100%': { opacity: 0.3 },
                      },
                    }}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                    Press your key combination on the keyboard... (Esc to cancel)
                  </Typography>
                </Box>
              ) : newShortcutKeys ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Selected Combination:
                  </Typography>
                  <Box
                    component="kbd"
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1.5,
                      bgcolor: alpha(theme.palette.text.primary, 0.1),
                      border: '1px solid',
                      borderColor: 'divider',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                    }}
                  >
                    {formatShortcutDisplay(newShortcutKeys)}
                  </Box>
                  <Typography variant="caption" sx={{ color: 'primary.main', ml: 1, textDecoration: 'underline' }}>
                    Click to change
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Click here and press the keys you want to bind (e.g. Cmd+Shift+S, Alt+R)
                </Typography>
              )}
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setCreateDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleCreateSubmit}
            variant="contained"
            disabled={!newName.trim() || !newShortcutKeys}
            sx={{ fontWeight: 600, px: 2.5 }}
          >
            Create Shortcut
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
