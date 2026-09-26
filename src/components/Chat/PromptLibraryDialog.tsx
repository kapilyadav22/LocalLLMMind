import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Grid,
  Card,
  CardContent,
  CardActions,
  Tabs,
  Tab,
  Tooltip,
  MenuItem,
  useTheme,
  alpha,
} from '@mui/material';
import {
  X,
  Search,
  Plus,
  Copy,
  Edit3,
  Trash2,
  Download,
  Upload,
  Check,
  Play,
  Sparkles,
} from 'lucide-react';
import { PROMPT_CATEGORIES } from '../../constants/promptLibrary';
import {
  addCustomPrompt,
  updateCustomPrompt,
  deleteCustomPrompt,
  exportPromptsAsJson,
  importPromptsFromJson,
} from '../../utils/promptStorage';
import { showToast } from '../../utils/toast';

export default function PromptLibraryDialog({
  open,
  onClose,
  prompts = [],
  onSelectPrompt,
}) {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [copiedId, setCopiedId] = useState(null);

  // Create / Edit sub-modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [formData, setFormData] = useState({
    command: '',
    title: '',
    description: '',
    category: 'Coding',
    icon: '⚡',
    template: '',
  });

  // Filtered prompts
  const filteredPrompts = useMemo(() => {
    return prompts.filter((p) => {
      const matchesCategory =
        selectedCategory === 'All'
          ? true
          : selectedCategory === 'Custom'
          ? Boolean(p.isCustom)
          : p.category === selectedCategory;

      if (!matchesCategory) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return (
        p.command?.toLowerCase().includes(q) ||
        p.title?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    });
  }, [prompts, selectedCategory, search]);

  const handleOpenCreate = () => {
    setEditingPrompt(null);
    setFormData({
      command: '/',
      title: '',
      description: '',
      category: 'Coding',
      icon: '⚡',
      template: '',
    });
    setFormOpen(true);
  };

  const handleOpenEdit = (prompt) => {
    setEditingPrompt(prompt);
    setFormData({
      command: prompt.command,
      title: prompt.title,
      description: prompt.description || '',
      category: prompt.category || 'Custom',
      icon: prompt.icon || '✨',
      template: prompt.template || '',
    });
    setFormOpen(true);
  };

  const handleSavePrompt = () => {
    if (!formData.title.trim() || !formData.template.trim()) {
      showToast('Title and Template are required', 'warning');
      return;
    }

    if (editingPrompt) {
      updateCustomPrompt(editingPrompt.id, formData);
      showToast(`Updated prompt "${formData.title}"`, 'success');
    } else {
      addCustomPrompt(formData);
      showToast(`Created slash command "${formData.command}"`, 'success');
    }
    setFormOpen(false);
  };

  const handleDeletePrompt = (id, title) => {
    deleteCustomPrompt(id);
    showToast(`Deleted "${title}"`, 'info');
  };

  const handleCopyTemplate = async (prompt) => {
    try {
      await navigator.clipboard.writeText(prompt.template);
      setCopiedId(prompt.id);
      showToast('Prompt template copied to clipboard', 'success');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const count = await importPromptsFromJson(file);
      showToast(`Successfully imported ${count} custom prompt(s)!`, 'success');
    } catch {
      showToast('Failed to import prompts JSON file', 'error');
    }
    e.target.value = '';
  };

  return (
    <>
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
              boxShadow: 24,
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
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
                width: 40,
                height: 40,
                borderRadius: 2.5,
                bgcolor: alpha(theme.palette.primary.main, 0.12),
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={18} />
            </Box>
            <Box>
              <Typography variant="h6" component="span" sx={{ fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.2 }}>
                Prompt Library & Slash Commands
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Type <kbd>/</kbd> in chat or click &quot;Use&quot; to inject curated workflows
              </Typography>
            </Box>
          </Box>

          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
            <X size={18} />
          </IconButton>
        </DialogTitle>

        {/* Search & Actions Bar */}
        <Box sx={{ px: 3, pt: 2, pb: 1, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search prompts by command or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={16} color={theme.palette.text.secondary} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ flex: 1, minWidth: 200 }}
          />

          <Button
            variant="contained"
            size="small"
            startIcon={<Plus size={15} />}
            onClick={handleOpenCreate}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Create Prompt
          </Button>

          <Tooltip title="Export custom prompts as JSON">
            <IconButton size="small" onClick={exportPromptsAsJson} sx={{ color: 'text.secondary' }}>
              <Download size={16} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Import prompts JSON">
            <IconButton component="label" size="small" sx={{ color: 'text.secondary' }}>
              <Upload size={16} />
              <input type="file" hidden accept=".json" onChange={handleImportFile} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Categories Bar */}
        <Box sx={{ px: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tabs
            value={selectedCategory}
            onChange={(_, val) => setSelectedCategory(val)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 40,
              '& .MuiTab-root': {
                minHeight: 40,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8rem',
                px: 1.5,
              },
            }}
          >
            {PROMPT_CATEGORIES.map((cat) => (
              <Tab key={cat} label={cat} value={cat} />
            ))}
          </Tabs>
        </Box>

        {/* Content List Area */}
        <DialogContent sx={{ px: 3, py: 2, flex: 1, overflowY: 'auto' }}>
          {filteredPrompts.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="body2" color="text.secondary">
                No prompt templates match your search.
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {filteredPrompts.map((p) => (
                <Grid size={{ xs: 12, sm: 6 } as any} key={p.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      borderRadius: 2.5,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: 'primary.main',
                        boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.1)}`,
                      },
                    }}
                  >
                    <CardContent sx={{ flex: 1, p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ fontSize: '1.2rem' }}>{p.icon || '⚡'}</Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {p.title}
                          </Typography>
                        </Box>
                        <Chip
                          label={p.category || 'General'}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                            color: 'primary.main',
                          }}
                        />
                      </Box>

                      <Typography
                        variant="caption"
                        sx={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          color: 'primary.main',
                          display: 'block',
                          mb: 1,
                        }}
                      >
                        {p.command}
                      </Typography>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.4,
                          height: 34,
                        }}
                      >
                        {p.description}
                      </Typography>
                    </CardContent>

                    <CardActions sx={{ px: 2, pb: 1.5, pt: 0, justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Copy prompt template">
                          <IconButton size="small" onClick={() => handleCopyTemplate(p)} sx={{ color: 'text.secondary' }}>
                            {copiedId === p.id ? <Check size={16} color={theme.palette.success.main} /> : <Copy size={16} />}
                          </IconButton>
                        </Tooltip>

                        {p.isCustom && (
                          <>
                            <Tooltip title="Edit prompt">
                              <IconButton size="small" onClick={() => handleOpenEdit(p)} sx={{ color: 'text.secondary' }}>
                                <Edit3 size={15} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete prompt">
                              <IconButton size="small" onClick={() => handleDeletePrompt(p.id, p.title)} sx={{ color: 'error.main' }}>
                                <Trash2 size={15} />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Box>

                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Play size={14} />}
                        onClick={() => {
                          onSelectPrompt(p);
                          onClose();
                        }}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          height: 28,
                          borderRadius: 2,
                        }}
                      >
                        Use
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={onClose} color="inherit">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create / Edit Prompt Sub-Dialog */}
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.05rem', pb: 1 }}>
          {editingPrompt ? 'Edit Custom Prompt' : 'Create Custom Slash Command'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField
              label="Icon (Emoji)"
              size="small"
              value={formData.icon}
              onChange={(e) => setFormData((prev) => ({ ...prev, icon: e.target.value }))}
              sx={{ width: 110 }}
            />
            <TextField
              label="Command Trigger"
              size="small"
              placeholder="/mycommand"
              value={formData.command}
              onChange={(e) => setFormData((prev) => ({ ...prev, command: e.target.value }))}
              helperText="Auto-prefixed with '/'"
              sx={{ flex: 1 }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField
              label="Title"
              size="small"
              placeholder="e.g. Clean Architecture Review"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              fullWidth
            />
            <TextField
              select
              label="Category"
              size="small"
              value={formData.category}
              onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
              sx={{ minWidth: 140 }}
            >
              {PROMPT_CATEGORIES.filter((c) => c !== 'All').map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <TextField
            label="Short Description"
            size="small"
            placeholder="One-line summary of what this command does"
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            fullWidth
          />

          <TextField
            label="Prompt Template"
            multiline
            rows={6}
            placeholder="Write your prompt instruction template here..."
            value={formData.template}
            onChange={(e) => setFormData((prev) => ({ ...prev, template: e.target.value }))}
            fullWidth
            helperText="Tip: You can use [Paste code here] or {{input}} placeholders"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setFormOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleSavePrompt} variant="contained" disableElevation>
            {editingPrompt ? 'Save Changes' : 'Create Command'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
