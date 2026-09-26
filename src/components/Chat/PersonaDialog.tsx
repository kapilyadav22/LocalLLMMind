import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Chip,
  Slider,
  List,
  ListItem,
  alpha,
  useTheme,
} from '@mui/material';
import {
  X,
  Plus,
  Trash2,
  Edit3,
  Bot,
  Sparkles,
} from 'lucide-react';
import { loadCustomPersonas, saveCustomPersona, deleteCustomPersona } from '../../utils/personaStorage';
import { showCustomAlert, showCustomConfirm } from '../../utils/dialogService';
import { showToast } from '../../utils/toast';

export default function PersonaDialog({ open, onClose, onSelectPersona }) {
  const theme = useTheme();
  const [customPersonas, setCustomPersonas] = useState(() => loadCustomPersonas());
  const [isEditing, setIsEditing] = useState(false);
  const [activePersonaId, setActivePersonaId] = useState(null);

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🤖');
  const [desc, setDesc] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);

  const refreshList = () => {
    setCustomPersonas(loadCustomPersonas());
  };

  useEffect(() => {
    if (open) {
      refreshList();
      setIsEditing(false);
    }
  }, [open]);

  const handleStartNew = () => {
    setName('');
    setIcon('🤖');
    setDesc('');
    setSystemPrompt('');
    setTemperature(0.7);
    setActivePersonaId(null);
    setIsEditing(true);
  };

  const handleStartEdit = (persona) => {
    setName(persona.name);
    setIcon(persona.icon || '🤖');
    setDesc(persona.desc || '');
    setSystemPrompt(persona.systemPrompt || '');
    setTemperature(persona.temperature ?? 0.7);
    setActivePersonaId(persona.id);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!name.trim()) {
      showCustomAlert({
        title: 'Validation Error',
        message: 'Please provide a name for the AI persona.',
        type: 'warning',
      });
      return;
    }

    if (!systemPrompt.trim()) {
      showCustomAlert({
        title: 'Validation Error',
        message: 'Please enter system prompt instructions defining how this persona behaves.',
        type: 'warning',
      });
      return;
    }

    const saved = saveCustomPersona({
      id: activePersonaId,
      name: name.trim(),
      icon: icon.trim() || '🤖',
      desc: desc.trim(),
      systemPrompt: systemPrompt.trim(),
      temperature,
    });

    if (saved) {
      showToast(`Persona "${saved.name}" saved successfully!`, 'success');
      refreshList();
      setIsEditing(false);
      onSelectPersona?.(saved.id);
    }
  };

  const handleDelete = async (persona) => {
    const confirmed = await showCustomConfirm({
      title: 'Delete Persona?',
      message: `Are you sure you want to permanently delete the custom persona "${persona.name}"?`,
      type: 'error',
      confirmText: 'Delete Persona',
      confirmColor: 'error',
    });

    if (confirmed) {
      deleteCustomPersona(persona.id);
      showToast(`Deleted persona "${persona.name}"`, 'info');
      refreshList();
      if (activePersonaId === persona.id) {
        setIsEditing(false);
      }
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3.5,
            bgcolor: 'background.paper',
            backgroundImage: 'none',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            overflow: 'hidden',
          },
        },
      }}
    >
      <DialogTitle
        component="div"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          pt: 2.5,
          pb: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2.5,
              bgcolor: alpha(theme.palette.primary.main, 0.12),
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Bot size={18} />
          </Box>
          <Box>
            <Typography variant="h6" component="span" sx={{ fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.2 }}>
              Custom AI Personas & Agents
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Create custom system personalities, instruction prompts, and parameters
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <X size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, minHeight: 420 }}>
        {isEditing ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                label="Icon (Emoji)"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                size="small"
                sx={{ width: 110 }}
                placeholder="🤖"
              />
              <TextField
                label="Persona Name"
                fullWidth
                value={name}
                onChange={(e) => setName(e.target.value)}
                size="small"
                placeholder="e.g. Senior Rust Engineer"
                required
              />
            </Box>

            <TextField
              label="Short Tagline / Description"
              fullWidth
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              size="small"
              placeholder="e.g. Specializes in memory safety, concurrency, and async architecture."
            />

            <TextField
              label="System Instructions / Prompt"
              fullWidth
              multiline
              rows={6}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are an expert... When answering, provide clean, idiomatic code and explain safety guarantees..."
              required
              helperText="These instructions are sent to Ollama at the start of every message turn."
            />

            <Box sx={{ px: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  Creativity / Temperature
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {temperature}
                </Typography>
              </Box>
              <Slider
                value={temperature}
                min={0.0}
                max={1.5}
                step={0.05}
                onChange={(_, v) => setTemperature(v)}
                valueLabelDisplay="auto"
                size="small"
              />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, pt: 1 }}>
              <Button onClick={() => setIsEditing(false)} color="inherit">
                Cancel
              </Button>
              <Button onClick={handleSave} variant="contained" disableElevation startIcon={<Sparkles size={16} />}>
                Save Persona
              </Button>
            </Box>
          </Box>
        ) : (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Your Custom Personas ({customPersonas.length})
              </Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<Plus size={16} />}
                onClick={handleStartNew}
                disableElevation
                sx={{ borderRadius: 2 }}
              >
                Create Persona
              </Button>
            </Box>

            {customPersonas.length === 0 ? (
              <Box
                sx={{
                  py: 6,
                  textAlign: 'center',
                  bgcolor: alpha(theme.palette.text.primary, 0.02),
                  borderRadius: 3,
                  border: '1px dashed',
                  borderColor: 'divider',
                }}
              >
                <Bot size={40} color={theme.palette.text.disabled} style={{ marginBottom: 8 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  No Custom Personas Yet
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 2 }}>
                  Create dedicated system agents tailored to specific engineering, writing, or analysis workflows.
                </Typography>
                <Button variant="outlined" size="small" startIcon={<Plus size={16} />} onClick={handleStartNew}>
                  Build Your First Persona
                </Button>
              </Box>
            ) : (
              <List sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {customPersonas.map((persona) => (
                  <ListItem
                    key={persona.id}
                    sx={{
                      borderRadius: 2.5,
                      bgcolor: alpha(theme.palette.background.default, 0.6),
                      border: '1px solid',
                      borderColor: 'divider',
                      p: 2,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, width: '100%' }}>
                      <Typography sx={{ fontSize: '1.75rem', lineHeight: 1 }}>
                        {persona.icon || '🤖'}
                      </Typography>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {persona.name}
                          </Typography>
                          <Chip label="Custom" size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                        </Box>
                        {persona.desc && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            {persona.desc}
                          </Typography>
                        )}
                        <Typography
                          variant="caption"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            fontFamily: 'monospace',
                            fontSize: '0.72rem',
                            color: 'text.secondary',
                            bgcolor: alpha(theme.palette.text.primary, 0.04),
                            p: 0.75,
                            borderRadius: 1.5,
                          }}
                        >
                          {persona.systemPrompt}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                        <IconButton size="small" onClick={() => handleStartEdit(persona)} title="Edit Persona">
                          <Edit3 size={15} />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDelete(persona)} color="error" title="Delete Persona">
                          <Trash2 size={15} />
                        </IconButton>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            onSelectPersona?.(persona.id);
                            onClose();
                          }}
                          sx={{ ml: 1, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                        >
                          Use
                        </Button>
                      </Box>
                    </Box>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
