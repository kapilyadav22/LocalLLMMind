import React, { useState, useEffect, useRef } from 'react';
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
  Tabs,
  Tab,
  Collapse,
  InputAdornment,
  Tooltip,
  Switch,
  FormControlLabel,
  alpha,
  useTheme,
  Fade,
  Divider,
} from '@mui/material';
import {
  X,
  Plus,
  Trash2,
  Edit3,
  Bot,
  Sparkles,
  Download,
  Upload,
  Copy,
  Check,
  Search,
  ChevronDown,
  ChevronUp,
  Settings2,
  MessageSquare,
  Zap,
  Star,
  StarOff,
  FileJson,
} from 'lucide-react';
import { loadCustomPersonas, saveCustomPersona, deleteCustomPersona } from '../../utils/personaStorage';
import { showCustomAlert, showCustomConfirm } from '../../utils/dialogService';
import { showToast } from '../../utils/toast';
import { useChatStore } from '../../store/chatContext';

// ── Default parameter values ────────────────────────────────
const DEFAULT_PARAMS = {
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  maxTokens: 0,
  contextWindow: 4096,
  repeatPenalty: 1.1,
  seed: -1,
  frequencyPenalty: 0,
  presencePenalty: 0,
};

const EMOJI_PALETTE = [
  '🤖', '🧠', '🦊', '🐺', '🦅', '🐉', '👨‍💻', '👩‍🔬', '🧙', '🎭',
  '🎯', '🔬', '💎', '🌊', '🔥', '⚡', '🌙', '🎨', '📚', '🛡️',
  '🏴‍☠️', '🧪', '🎪', '🪄', '🗡️', '🏛️', '🌿', '🦉', '🐋', '✨',
];

export default function PersonaDialog({ open, onClose, onSelectPersona }) {
  const theme = useTheme();
  const { state } = useChatStore();
  const [customPersonas, setCustomPersonas] = useState(() => loadCustomPersonas());
  const [isEditing, setIsEditing] = useState(false);
  const [activePersonaId, setActivePersonaId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Editor state ────────────────────────────────────────────
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🤖');
  const [desc, setDesc] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [greetingMessage, setGreetingMessage] = useState('');
  const [promptStarters, setPromptStarters] = useState<string[]>(['', '', '', '']);
  const [pinnedModel, setPinnedModel] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isFavourite, setIsFavourite] = useState(false);

  // Advanced parameters
  const [temperature, setTemperature] = useState(DEFAULT_PARAMS.temperature);
  const [topP, setTopP] = useState(DEFAULT_PARAMS.topP);
  const [topK, setTopK] = useState(DEFAULT_PARAMS.topK);
  const [maxTokens, setMaxTokens] = useState(DEFAULT_PARAMS.maxTokens);
  const [contextWindow, setContextWindow] = useState(DEFAULT_PARAMS.contextWindow);
  const [repeatPenalty, setRepeatPenalty] = useState(DEFAULT_PARAMS.repeatPenalty);
  const [seed, setSeed] = useState(DEFAULT_PARAMS.seed);
  const [frequencyPenalty, setFrequencyPenalty] = useState(DEFAULT_PARAMS.frequencyPenalty);
  const [presencePenalty, setPresencePenalty] = useState(DEFAULT_PARAMS.presencePenalty);

  const refreshList = () => {
    setCustomPersonas(loadCustomPersonas());
  };

  useEffect(() => {
    if (open) {
      refreshList();
      setIsEditing(false);
      setSearchQuery('');
    }
  }, [open]);

  // ── Reset editor to defaults ──────────────────────────────
  const resetEditor = () => {
    setName('');
    setIcon('🤖');
    setDesc('');
    setSystemPrompt('');
    setGreetingMessage('');
    setPromptStarters(['', '', '', '']);
    setPinnedModel('');
    setTags([]);
    setTagInput('');
    setIsFavourite(false);
    setTemperature(DEFAULT_PARAMS.temperature);
    setTopP(DEFAULT_PARAMS.topP);
    setTopK(DEFAULT_PARAMS.topK);
    setMaxTokens(DEFAULT_PARAMS.maxTokens);
    setContextWindow(DEFAULT_PARAMS.contextWindow);
    setRepeatPenalty(DEFAULT_PARAMS.repeatPenalty);
    setSeed(DEFAULT_PARAMS.seed);
    setFrequencyPenalty(DEFAULT_PARAMS.frequencyPenalty);
    setPresencePenalty(DEFAULT_PARAMS.presencePenalty);
    setShowAdvanced(false);
    setActiveTab(0);
  };

  const handleStartNew = () => {
    resetEditor();
    setActivePersonaId(null);
    setIsEditing(true);
  };

  const handleStartEdit = (persona) => {
    setName(persona.name);
    setIcon(persona.icon || '🤖');
    setDesc(persona.desc || '');
    setSystemPrompt(persona.systemPrompt || '');
    setGreetingMessage(persona.greetingMessage || '');
    setPromptStarters(persona.promptStarters || ['', '', '', '']);
    setPinnedModel(persona.pinnedModel || '');
    setTags(persona.tags || []);
    setIsFavourite(persona.isFavourite || false);
    setTemperature(persona.temperature ?? DEFAULT_PARAMS.temperature);
    setTopP(persona.topP ?? DEFAULT_PARAMS.topP);
    setTopK(persona.topK ?? DEFAULT_PARAMS.topK);
    setMaxTokens(persona.maxTokens ?? DEFAULT_PARAMS.maxTokens);
    setContextWindow(persona.contextWindow ?? DEFAULT_PARAMS.contextWindow);
    setRepeatPenalty(persona.repeatPenalty ?? DEFAULT_PARAMS.repeatPenalty);
    setSeed(persona.seed ?? DEFAULT_PARAMS.seed);
    setFrequencyPenalty(persona.frequencyPenalty ?? DEFAULT_PARAMS.frequencyPenalty);
    setPresencePenalty(persona.presencePenalty ?? DEFAULT_PARAMS.presencePenalty);
    setActivePersonaId(persona.id);
    setShowAdvanced(false);
    setActiveTab(0);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!name.trim()) {
      showCustomAlert({ title: 'Validation Error', message: 'Please provide a name.', type: 'warning' });
      return;
    }
    if (!systemPrompt.trim()) {
      showCustomAlert({ title: 'Validation Error', message: 'System instructions are required.', type: 'warning' });
      return;
    }

    const cleanStarters = promptStarters.filter((s) => s.trim());

    const saved = saveCustomPersona({
      id: activePersonaId,
      name: name.trim(),
      icon: icon.trim() || '🤖',
      desc: desc.trim(),
      systemPrompt: systemPrompt.trim(),
      greetingMessage: greetingMessage.trim(),
      promptStarters: cleanStarters,
      pinnedModel: pinnedModel.trim(),
      tags,
      isFavourite,
      temperature,
      topP,
      topK,
      maxTokens,
      contextWindow,
      repeatPenalty,
      seed,
      frequencyPenalty,
      presencePenalty,
    });

    if (saved) {
      showToast(`Modelfile "${saved.name}" saved!`, 'success');
      refreshList();
      setIsEditing(false);
      onSelectPersona?.(saved.id);
    }
  };

  const handleDelete = async (persona) => {
    const confirmed = await showCustomConfirm({
      title: 'Delete Modelfile?',
      message: `Permanently delete "${persona.name}"?`,
      type: 'error',
      confirmText: 'Delete',
      confirmColor: 'error',
    });
    if (confirmed) {
      deleteCustomPersona(persona.id);
      showToast(`Deleted "${persona.name}"`, 'info');
      refreshList();
      if (activePersonaId === persona.id) setIsEditing(false);
    }
  };

  // ── Tag handling ──────────────────────────────────────────
  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setTagInput('');
  };
  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  // ── Export a single modelfile ─────────────────────────────
  const handleExport = (persona) => {
    const exportData = {
      version: '1.0',
      type: 'localllmmind-modelfile',
      exportedAt: new Date().toISOString(),
      modelfile: persona,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `modelfile_${persona.name.toLowerCase().replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported "${persona.name}"`, 'success');
  };

  // ── Export ALL modelfiles ─────────────────────────────────
  const handleExportAll = () => {
    if (customPersonas.length === 0) {
      showToast('No modelfiles to export', 'info');
      return;
    }
    const exportData = {
      version: '1.0',
      type: 'localllmmind-modelfile-bundle',
      exportedAt: new Date().toISOString(),
      count: customPersonas.length,
      modelfiles: customPersonas,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `modelfiles_bundle_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${customPersonas.length} modelfiles`, 'success');
  };

  // ── Import modelfiles from JSON ──────────────────────────
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        let imported = 0;

        if (data.type === 'localllmmind-modelfile' && data.modelfile) {
          const p = data.modelfile;
          p.id = `imported_${Date.now()}`;
          saveCustomPersona(p);
          imported = 1;
        } else if (data.type === 'localllmmind-modelfile-bundle' && Array.isArray(data.modelfiles)) {
          data.modelfiles.forEach((p: any) => {
            p.id = `imported_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            saveCustomPersona(p);
          });
          imported = data.modelfiles.length;
        } else {
          showToast('Unrecognized file format', 'error');
          return;
        }

        refreshList();
        showToast(`Imported ${imported} modelfile${imported > 1 ? 's' : ''}!`, 'success');
      } catch (err) {
        showToast('Failed to parse JSON file', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ── Duplicate a modelfile ─────────────────────────────────
  const handleDuplicate = (persona) => {
    const clone = {
      ...persona,
      id: null,
      name: `${persona.name} (Copy)`,
    };
    saveCustomPersona(clone);
    refreshList();
    showToast(`Duplicated "${persona.name}"`, 'success');
  };

  // ── Toggle favourite ──────────────────────────────────────
  const handleToggleFav = (persona) => {
    saveCustomPersona({ ...persona, isFavourite: !persona.isFavourite });
    refreshList();
  };

  // ── Copy system prompt to clipboard ────────────────────────
  const handleCopyPrompt = (persona) => {
    navigator.clipboard.writeText(persona.systemPrompt || '');
    setCopiedId(persona.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // ── Filtered & sorted list ────────────────────────────────
  const filteredPersonas = customPersonas
    .filter((p) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.name?.toLowerCase().includes(q) ||
        p.desc?.toLowerCase().includes(q) ||
        p.tags?.some((t: string) => t.includes(q))
      );
    })
    .sort((a, b) => {
      if (a.isFavourite && !b.isFavourite) return -1;
      if (!a.isFavourite && b.isFavourite) return 1;
      return 0;
    });

  // ── Prompt starter helpers ────────────────────────────────
  const updateStarter = (idx: number, val: string) => {
    const updated = [...promptStarters];
    updated[idx] = val;
    setPromptStarters(updated);
  };
  const addStarter = () => {
    if (promptStarters.length < 8) {
      setPromptStarters([...promptStarters, '']);
    }
  };

  // ── Parameter slider helper ───────────────────────────────
  const ParamSlider = ({
    label,
    value,
    onChange,
    min,
    max,
    step,
    helperText,
  }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    min: number;
    max: number;
    step: number;
    helperText?: string;
  }) => (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.72rem' }}>
          {label}
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.72rem' }}>
          {value}
        </Typography>
      </Box>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(_, v) => onChange(v as number)}
        valueLabelDisplay="auto"
        size="small"
      />
      {helperText && (
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.62rem', mt: -0.5, display: 'block' }}>
          {helperText}
        </Typography>
      )}
    </Box>
  );

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
            maxHeight: '88vh',
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
              Modelfile &amp; Character Preset Studio
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Create shareable AI characters with custom instructions, parameters &amp; greeting prompts
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <X size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, minHeight: 420 }}>
        {isEditing ? (
          /* ═══════ EDITOR VIEW ═══════ */
          <Box sx={{ px: 3, py: 2.5 }}>
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              sx={{
                mb: 2.5,
                minHeight: 36,
                '& .MuiTab-root': { minHeight: 36, py: 0.5, fontSize: '0.78rem', fontWeight: 700, textTransform: 'none' },
                '& .MuiTabs-indicator': { borderRadius: 2, height: 3 },
              }}
            >
              <Tab label="Identity" />
              <Tab label="Behaviour" />
              <Tab label="Parameters" />
            </Tabs>

            {/* ── Tab 0: Identity ────────────────────── */}
            {activeTab === 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {/* Icon + Name */}
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block', fontSize: '0.7rem' }}>
                      Avatar
                    </Typography>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2.5,
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem',
                        border: '2px dashed',
                        borderColor: 'divider',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': { borderColor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.12) },
                      }}
                    >
                      {icon}
                    </Box>
                    {/* Emoji palette */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25, mt: 1, maxWidth: 180 }}>
                      {EMOJI_PALETTE.map((e) => (
                        <Box
                          key={e}
                          onClick={() => setIcon(e)}
                          sx={{
                            width: 26,
                            height: 26,
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 1,
                            cursor: 'pointer',
                            bgcolor: icon === e ? alpha(theme.palette.primary.main, 0.15) : 'transparent',
                            border: icon === e ? '1px solid' : '1px solid transparent',
                            borderColor: icon === e ? 'primary.main' : 'transparent',
                            '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.06) },
                            transition: 'all 0.15s',
                          }}
                        >
                          {e}
                        </Box>
                      ))}
                    </Box>
                  </Box>

                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      label="Character Name"
                      fullWidth
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      size="small"
                      placeholder="e.g. Senior Rust Engineer"
                      required
                    />
                    <TextField
                      label="Tagline / Description"
                      fullWidth
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                      size="small"
                      placeholder="e.g. Specializes in memory safety, concurrency, and async architecture."
                    />
                    {/* Pin to specific model */}
                    <TextField
                      label="Pinned Model (optional)"
                      fullWidth
                      value={pinnedModel}
                      onChange={(e) => setPinnedModel(e.target.value)}
                      size="small"
                      placeholder={state.models?.[0]?.name || 'e.g. llama3.1:8b'}
                      helperText="If set, this model is auto-selected when this character is activated"
                      slotProps={{
                        input: {
                          endAdornment: pinnedModel ? (
                            <InputAdornment position="end">
                              <Chip label="Pinned" size="small" sx={{ height: 18, fontSize: '0.6rem' }} color="primary" variant="outlined" />
                            </InputAdornment>
                          ) : undefined,
                        },
                      }}
                    />
                  </Box>
                </Box>

                {/* Tags */}
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.75, display: 'block', fontSize: '0.72rem' }}>
                    Tags / Categories
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                    {tags.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        onDelete={() => removeTag(tag)}
                        sx={{
                          height: 22,
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          bgcolor: alpha(theme.palette.primary.main, 0.08),
                        }}
                      />
                    ))}
                    <TextField
                      size="small"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Add tag…"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      onBlur={addTag}
                      sx={{
                        width: 120,
                        '& .MuiInputBase-root': { height: 26, fontSize: '0.72rem' },
                      }}
                    />
                  </Box>
                </Box>

                {/* Favourite toggle */}
                <FormControlLabel
                  control={
                    <Switch
                      checked={isFavourite}
                      onChange={(e) => setIsFavourite(e.target.checked)}
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.72rem' }}>
                      ⭐ Mark as favourite (pinned to top)
                    </Typography>
                  }
                />
              </Box>
            )}

            {/* ── Tab 1: Behaviour ───────────────────── */}
            {activeTab === 1 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <TextField
                  label="System Instructions / Prompt"
                  fullWidth
                  multiline
                  rows={7}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder={"You are an expert... When answering, provide clean, idiomatic code and explain safety guarantees..."}
                  required
                  helperText={`${systemPrompt.length} characters — sent at the start of every turn`}
                />

                <TextField
                  label="Greeting Message (optional)"
                  fullWidth
                  multiline
                  rows={3}
                  value={greetingMessage}
                  onChange={(e) => setGreetingMessage(e.target.value)}
                  placeholder="Hello! I'm your Senior Rust engineer. Ask me about memory safety, async patterns, or zero-cost abstractions."
                  helperText="Shown as the first assistant message when a new chat starts with this character"
                />

                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.72rem' }}>
                      Prompt Starters (optional)
                    </Typography>
                    {promptStarters.length < 8 && (
                      <Button
                        size="small"
                        startIcon={<Plus size={12} />}
                        onClick={addStarter}
                        sx={{ fontSize: '0.68rem', textTransform: 'none', py: 0 }}
                      >
                        Add
                      </Button>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {promptStarters.map((starter, idx) => (
                      <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <MessageSquare size={12} color={theme.palette.text.disabled} />
                        <TextField
                          fullWidth
                          size="small"
                          value={starter}
                          onChange={(e) => updateStarter(idx, e.target.value)}
                          placeholder={`e.g. "Explain ownership vs borrowing in Rust"`}
                          sx={{
                            '& .MuiInputBase-root': { fontSize: '0.78rem' },
                          }}
                        />
                        {promptStarters.length > 1 && (
                          <IconButton
                            size="small"
                            onClick={() => setPromptStarters(promptStarters.filter((_, i) => i !== idx))}
                            sx={{ p: 0.25 }}
                          >
                            <X size={12} />
                          </IconButton>
                        )}
                      </Box>
                    ))}
                  </Box>
                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem', mt: 0.5, display: 'block' }}>
                    Suggested prompts shown on the welcome screen when this character is active
                  </Typography>
                </Box>
              </Box>
            )}

            {/* ── Tab 2: Parameters ──────────────────── */}
            {activeTab === 2 && (
              <Box>
                <Box
                  sx={{
                    mb: 2,
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.info.main, 0.06),
                    border: '1px solid',
                    borderColor: alpha(theme.palette.info.main, 0.15),
                  }}
                >
                  <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'info.main' }}>
                    💡 These parameters override the global settings when this character is active. Leave defaults if unsure.
                  </Typography>
                </Box>

                <ParamSlider label="Temperature" value={temperature} onChange={setTemperature} min={0} max={2} step={0.05} helperText="Lower = more focused, Higher = more creative" />
                <ParamSlider label="Top P (Nucleus Sampling)" value={topP} onChange={setTopP} min={0} max={1} step={0.05} helperText="Cumulative probability threshold for token selection" />
                <ParamSlider label="Top K" value={topK} onChange={(v) => setTopK(v)} min={1} max={100} step={1} helperText="Number of top tokens to consider (Ollama)" />
                <ParamSlider label="Repeat Penalty" value={repeatPenalty} onChange={setRepeatPenalty} min={1} max={2} step={0.05} helperText="Penalizes repetition (1.0 = none)" />

                <Button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  endIcon={showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  size="small"
                  sx={{ textTransform: 'none', fontSize: '0.72rem', mb: 1, fontWeight: 600 }}
                >
                  {showAdvanced ? 'Hide' : 'Show'} Advanced
                </Button>

                <Collapse in={showAdvanced}>
                  <ParamSlider label="Max Tokens" value={maxTokens} onChange={setMaxTokens} min={0} max={32768} step={256} helperText="0 = unlimited output" />
                  <ParamSlider label="Context Window (num_ctx)" value={contextWindow} onChange={setContextWindow} min={512} max={131072} step={512} helperText="Total context tokens sent to the model" />
                  <ParamSlider label="Frequency Penalty" value={frequencyPenalty} onChange={setFrequencyPenalty} min={0} max={2} step={0.1} helperText="Penalizes frequently used tokens" />
                  <ParamSlider label="Presence Penalty" value={presencePenalty} onChange={setPresencePenalty} min={0} max={2} step={0.1} helperText="Penalizes already-used tokens" />

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.72rem', display: 'block', mb: 0.5 }}>
                      Seed
                    </Typography>
                    <TextField
                      size="small"
                      type="number"
                      value={seed}
                      onChange={(e) => setSeed(parseInt(e.target.value) || -1)}
                      fullWidth
                      helperText="-1 = random seed. Set a fixed value for reproducible outputs."
                      sx={{ '& .MuiInputBase-root': { fontSize: '0.8rem' } }}
                    />
                  </Box>
                </Collapse>
              </Box>
            )}

            {/* ── Editor action bar ──────────────────── */}
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button onClick={() => setIsEditing(false)} color="inherit" size="small" sx={{ textTransform: 'none' }}>
                Cancel
              </Button>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                {activeTab < 2 && (
                  <Button
                    onClick={() => setActiveTab(activeTab + 1)}
                    size="small"
                    sx={{ textTransform: 'none' }}
                  >
                    Next →
                  </Button>
                )}
                <Button
                  onClick={handleSave}
                  variant="contained"
                  disableElevation
                  startIcon={<Sparkles size={16} />}
                  size="small"
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                >
                  Save Modelfile
                </Button>
              </Box>
            </Box>
          </Box>
        ) : (
          /* ═══════ LIST VIEW ═══════ */
          <Box sx={{ px: 3, py: 2.5 }}>
            {/* Toolbar */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2.5, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField
                size="small"
                placeholder="Search modelfiles…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={14} color={theme.palette.text.disabled} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  flex: 1,
                  minWidth: 180,
                  '& .MuiInputBase-root': { fontSize: '0.8rem', borderRadius: 2 },
                }}
              />
              <Button
                variant="contained"
                size="small"
                startIcon={<Plus size={16} />}
                onClick={handleStartNew}
                disableElevation
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
              >
                Create
              </Button>
              <Tooltip title="Import modelfile from JSON">
                <IconButton
                  size="small"
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1.5,
                    p: '5px',
                  }}
                >
                  <Upload size={16} />
                </IconButton>
              </Tooltip>
              {customPersonas.length > 0 && (
                <Tooltip title="Export all modelfiles">
                  <IconButton
                    size="small"
                    onClick={handleExportAll}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1.5,
                      p: '5px',
                    }}
                  >
                    <Download size={16} />
                  </IconButton>
                </Tooltip>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                hidden
                onChange={handleImportFile}
              />
            </Box>

            {/* Stats */}
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
              <Chip
                label={`${customPersonas.length} Total`}
                size="small"
                sx={{ height: 22, fontSize: '0.65rem', fontWeight: 600 }}
              />
              {customPersonas.filter((p) => p.isFavourite).length > 0 && (
                <Chip
                  icon={<Star size={10} />}
                  label={`${customPersonas.filter((p) => p.isFavourite).length} Favourites`}
                  size="small"
                  sx={{ height: 22, fontSize: '0.65rem', fontWeight: 600, bgcolor: alpha('#f59e0b', 0.1), color: '#f59e0b' }}
                />
              )}
              {customPersonas.filter((p) => p.pinnedModel).length > 0 && (
                <Chip
                  icon={<Zap size={10} />}
                  label={`${customPersonas.filter((p) => p.pinnedModel).length} with Pinned Model`}
                  size="small"
                  sx={{ height: 22, fontSize: '0.65rem', fontWeight: 600, bgcolor: alpha(theme.palette.info.main, 0.08) }}
                />
              )}
            </Box>

            {filteredPersonas.length === 0 ? (
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
                  {searchQuery ? 'No matching modelfiles' : 'No Custom Modelfiles Yet'}
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 2 }}>
                  Create AI characters with custom instructions, parameter overrides, and greeting prompts.
                </Typography>
                {!searchQuery && (
                  <Button variant="outlined" size="small" startIcon={<Plus size={16} />} onClick={handleStartNew}>
                    Build Your First Modelfile
                  </Button>
                )}
              </Box>
            ) : (
              <List sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {filteredPersonas.map((persona) => (
                  <ListItem
                    key={persona.id}
                    sx={{
                      borderRadius: 2.5,
                      bgcolor: alpha(theme.palette.background.default, 0.6),
                      border: '1px solid',
                      borderColor: persona.isFavourite
                        ? alpha('#f59e0b', 0.25)
                        : 'divider',
                      p: 2,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, width: '100%' }}>
                      {/* Avatar */}
                      <Box sx={{ position: 'relative' }}>
                        <Typography sx={{ fontSize: '1.75rem', lineHeight: 1 }}>
                          {persona.icon || '🤖'}
                        </Typography>
                        {persona.isFavourite && (
                          <Star
                            size={10}
                            fill="#f59e0b"
                            color="#f59e0b"
                            style={{ position: 'absolute', top: -4, right: -6 }}
                          />
                        )}
                      </Box>

                      {/* Info */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {persona.name}
                          </Typography>
                          <Chip label="Custom" size="small" sx={{ height: 18, fontSize: '0.6rem' }} />
                          {persona.pinnedModel && (
                            <Chip
                              icon={<Zap size={8} />}
                              label={persona.pinnedModel}
                              size="small"
                              variant="outlined"
                              color="info"
                              sx={{ height: 18, fontSize: '0.58rem', fontWeight: 600, maxWidth: 160 }}
                            />
                          )}
                        </Box>
                        {persona.desc && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                            {persona.desc}
                          </Typography>
                        )}
                        {/* Tags */}
                        {persona.tags?.length > 0 && (
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.75 }}>
                            {persona.tags.map((tag: string) => (
                              <Chip
                                key={tag}
                                label={tag}
                                size="small"
                                sx={{ height: 16, fontSize: '0.58rem', bgcolor: alpha(theme.palette.text.primary, 0.06) }}
                              />
                            ))}
                          </Box>
                        )}
                        <Typography
                          variant="caption"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            fontFamily: 'monospace',
                            fontSize: '0.68rem',
                            color: 'text.secondary',
                            bgcolor: alpha(theme.palette.text.primary, 0.04),
                            p: 0.75,
                            borderRadius: 1.5,
                          }}
                        >
                          {persona.systemPrompt}
                        </Typography>
                        {/* Greeting preview */}
                        {persona.greetingMessage && (
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              mt: 0.5,
                              color: 'text.disabled',
                              fontStyle: 'italic',
                              fontSize: '0.65rem',
                            }}
                          >
                            💬 "{persona.greetingMessage.length > 80 ? persona.greetingMessage.slice(0, 77) + '…' : persona.greetingMessage}"
                          </Typography>
                        )}
                      </Box>

                      {/* Actions */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flexShrink: 0 }}>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title={persona.isFavourite ? 'Unfavourite' : 'Favourite'}>
                            <IconButton size="small" onClick={() => handleToggleFav(persona)}>
                              {persona.isFavourite ? (
                                <Star size={14} fill="#f59e0b" color="#f59e0b" />
                              ) : (
                                <StarOff size={14} />
                              )}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => handleStartEdit(persona)}>
                              <Edit3 size={14} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Copy system prompt">
                            <IconButton size="small" onClick={() => handleCopyPrompt(persona)}>
                              {copiedId === persona.id ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
                            </IconButton>
                          </Tooltip>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="Duplicate">
                            <IconButton size="small" onClick={() => handleDuplicate(persona)}>
                              <FileJson size={14} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Export JSON">
                            <IconButton size="small" onClick={() => handleExport(persona)}>
                              <Download size={14} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => handleDelete(persona)} color="error">
                              <Trash2 size={14} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            onSelectPersona?.(persona.id);
                            onClose();
                          }}
                          sx={{
                            mt: 0.5,
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '0.72rem',
                          }}
                        >
                          Activate
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
