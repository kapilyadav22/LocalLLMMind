/**
 * Model Manager Dialog for LocalLLMMind
 * Pull, delete, inspect, and manage Ollama models from the UI.
 * Engineered by Kapil Kumar Yadav
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Button,
  TextField,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tabs,
  Tab,
  Divider,
  Collapse,
  InputAdornment,
  alpha,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import SearchIcon from '@mui/icons-material/Search';
import StorageIcon from '@mui/icons-material/Storage';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { fetchModels, pullModel, deleteModel, showModel } from '../../services/ollamaService';
import { showToast } from '../../utils/toast';
import { showCustomConfirm } from '../../utils/dialogService';

function formatBytes(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ModelManagerDialog({ open, onClose, ollamaUrl, onModelsChanged }) {
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedModel, setExpandedModel] = useState(null);
  const [modelDetails, setModelDetails] = useState({});

  // Pull model state
  const [pullName, setPullName] = useState('');
  const [pulling, setPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState(null);
  const [pullError, setPullError] = useState('');
  const pullAbortRef = useRef(null);

  const loadModels = useCallback(async () => {
    setLoading(true);
    try {
      const fetched = await fetchModels(ollamaUrl);
      setModels(fetched);
    } catch (err) {
      console.error('[ModelManager] Failed to load models:', err);
    } finally {
      setLoading(false);
    }
  }, [ollamaUrl]);

  useEffect(() => {
    if (open) {
      loadModels();
    }
  }, [open, loadModels]);

  const filteredModels = search.trim()
    ? models.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    : models;

  const handleShowDetails = async (modelName) => {
    if (expandedModel === modelName) {
      setExpandedModel(null);
      return;
    }
    setExpandedModel(modelName);
    if (!modelDetails[modelName]) {
      try {
        const details = await showModel({ model: modelName, ollamaUrl });
        setModelDetails((prev) => ({ ...prev, [modelName]: details }));
      } catch (err) {
        setModelDetails((prev) => ({
          ...prev,
          [modelName]: { error: err.message },
        }));
      }
    }
  };

  const handleDelete = async (modelName) => {
    const confirmed = await showCustomConfirm(
      `Are you sure you want to delete "${modelName}"? This action cannot be undone.`,
      'Delete Model'
    );
    if (!confirmed) return;

    try {
      await deleteModel({ model: modelName, ollamaUrl });
      showToast(`Model "${modelName}" deleted successfully`, 'success');
      await loadModels();
      onModelsChanged?.();
    } catch (err) {
      showToast(`Failed to delete model: ${err.message}`, 'error');
    }
  };

  const handlePull = async () => {
    const name = pullName.trim();
    if (!name) return;

    setPulling(true);
    setPullError('');
    setPullProgress({ status: 'Starting pull...', percent: 0 });

    const abortController = new AbortController();
    pullAbortRef.current = abortController;

    try {
      await pullModel({
        model: name,
        ollamaUrl,
        onProgress: (progress) => {
          setPullProgress(progress);
        },
        signal: abortController.signal,
      });
      showToast(`Model "${name}" pulled successfully!`, 'success');
      setPullName('');
      setPullProgress(null);
      await loadModels();
      onModelsChanged?.();
    } catch (err) {
      if (err.name === 'AbortError') {
        showToast('Model pull cancelled', 'info');
      } else {
        setPullError(err.message);
        showToast(`Failed to pull model: ${err.message}`, 'error');
      }
    } finally {
      setPulling(false);
      pullAbortRef.current = null;
    }
  };

  const handleCancelPull = () => {
    pullAbortRef.current?.abort();
  };

  const totalSize = models.reduce((acc, m) => acc + (m.size || 0), 0);

  return (
    <Dialog
      open={open}
      onClose={pulling ? undefined : onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 4,
            maxHeight: '85vh',
            boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
            border: '1px solid',
            borderColor: 'divider',
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, #7c4dff)`,
            }}
          >
            <StorageIcon sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              Ollama Model Manager
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {models.length} model{models.length !== 1 ? 's' : ''} installed · {formatBytes(totalSize)} total
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton size="small" onClick={loadModels} disabled={loading} title="Refresh models">
            <RefreshIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={onClose} disabled={pulling}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      {loading && <LinearProgress sx={{ mx: 3 }} />}

      <Box sx={{ px: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            minHeight: 36,
            '& .MuiTab-root': { minHeight: 36, textTransform: 'none', fontWeight: 600, fontSize: '0.85rem' },
          }}
        >
          <Tab label="Installed Models" />
          <Tab label="Pull New Model" />
        </Tabs>
      </Box>

      <DialogContent sx={{ pt: 2, px: 3, pb: 3 }}>
        {/* Tab 0: Installed Models */}
        {tab === 0 && (
          <Box>
            <TextField
              fullWidth
              size="small"
              placeholder="Filter models..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ mb: 2 }}
            />

            {filteredModels.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <SmartToyIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary">
                  {search ? 'No models match your filter' : 'No models installed'}
                </Typography>
                <Button
                  size="small"
                  onClick={() => setTab(1)}
                  sx={{ mt: 1, textTransform: 'none' }}
                >
                  Pull a model →
                </Button>
              </Box>
            ) : (
              <List disablePadding>
                {filteredModels.map((model) => {
                  const isExpanded = expandedModel === model.name;
                  const details = modelDetails[model.name];
                  return (
                    <Box key={model.name}>
                      <ListItem
                        sx={{
                          borderRadius: 2.5,
                          mb: 0.75,
                          border: '1px solid',
                          borderColor: isExpanded
                            ? alpha(theme.palette.primary.main, 0.3)
                            : 'divider',
                          bgcolor: isExpanded
                            ? alpha(theme.palette.primary.main, 0.04)
                            : 'transparent',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.06),
                          },
                          px: 2,
                          py: 1.25,
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {model.name}
                              </Typography>
                              <Chip
                                label={formatBytes(model.size)}
                                size="small"
                                sx={{
                                  height: 20,
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  fontFamily: 'monospace',
                                }}
                              />
                            </Box>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                              Modified: {formatDate(model.modified_at)} · Family: {model.details?.family || '—'} · Params: {model.details?.parameter_size || '—'} · Quant: {model.details?.quantization_level || '—'}
                            </Typography>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleShowDetails(model.name)}
                              title="Model details"
                              sx={{ color: isExpanded ? 'primary.main' : 'text.secondary' }}
                            >
                              {isExpanded ? (
                                <ExpandLessIcon fontSize="small" />
                              ) : (
                                <InfoIcon fontSize="small" />
                              )}
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(model.name)}
                              title="Delete model"
                              sx={{
                                color: 'text.secondary',
                                '&:hover': { color: 'error.main' },
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>

                      {/* Expanded Model Details */}
                      <Collapse in={isExpanded}>
                        <Box
                          sx={{
                            ml: 2,
                            mr: 2,
                            mb: 1.5,
                            p: 2,
                            borderRadius: 2,
                            bgcolor: alpha(theme.palette.background.default, 0.6),
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          {details?.error ? (
                            <Typography variant="caption" color="error">
                              {details.error}
                            </Typography>
                          ) : !details ? (
                            <LinearProgress sx={{ borderRadius: 2 }} />
                          ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              {details.license && (
                                <Box>
                                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                    License
                                  </Typography>
                                  <Typography variant="caption" sx={{ display: 'block', whiteSpace: 'pre-wrap', maxHeight: 80, overflow: 'auto' }}>
                                    {details.license.slice(0, 300)}{details.license.length > 300 ? '…' : ''}
                                  </Typography>
                                </Box>
                              )}
                              {details.modelfile && (
                                <Box>
                                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                    Modelfile Template
                                  </Typography>
                                  <Box
                                    component="pre"
                                    sx={{
                                      mt: 0.5,
                                      p: 1.5,
                                      borderRadius: 1.5,
                                      bgcolor: alpha(theme.palette.common.black, 0.3),
                                      color: 'text.primary',
                                      fontSize: '0.72rem',
                                      fontFamily: 'monospace',
                                      overflow: 'auto',
                                      maxHeight: 120,
                                      whiteSpace: 'pre-wrap',
                                      wordBreak: 'break-all',
                                    }}
                                  >
                                    {details.modelfile.slice(0, 600)}{details.modelfile.length > 600 ? '\n…' : ''}
                                  </Box>
                                </Box>
                              )}
                              {details.parameters && (
                                <Box>
                                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                    Parameters
                                  </Typography>
                                  <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', fontSize: '0.72rem' }}>
                                    {details.parameters}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          )}
                        </Box>
                      </Collapse>
                    </Box>
                  );
                })}
              </List>
            )}
          </Box>
        )}

        {/* Tab 1: Pull New Model */}
        {tab === 1 && (
          <Box>
            <Box
              sx={{
                p: 2.5,
                borderRadius: 3,
                bgcolor: alpha(theme.palette.primary.main, 0.04),
                border: '1px solid',
                borderColor: alpha(theme.palette.primary.main, 0.15),
                mb: 3,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Pull a model from the Ollama library
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, lineHeight: 1.5 }}>
                Enter a model name like <code>llama3.2</code>, <code>deepseek-r1:8b</code>, <code>gemma3:4b</code>, <code>phi4</code>,
                or <code>qwen3:8b</code>. Browse available models at{' '}
                <Box
                  component="a"
                  href="https://ollama.com/library"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                >
                  ollama.com/library
                </Box>
              </Typography>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="e.g. llama3.2, deepseek-r1:8b, gemma3:4b"
                  value={pullName}
                  onChange={(e) => setPullName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !pulling) handlePull();
                  }}
                  disabled={pulling}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <DownloadIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                {pulling ? (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleCancelPull}
                    sx={{ textTransform: 'none', fontWeight: 600, minWidth: 100 }}
                  >
                    Cancel
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={handlePull}
                    disabled={!pullName.trim()}
                    disableElevation
                    sx={{ textTransform: 'none', fontWeight: 600, minWidth: 100 }}
                  >
                    Pull Model
                  </Button>
                )}
              </Box>
            </Box>

            {/* Pull Progress */}
            {pullProgress && (
              <Box
                sx={{
                  p: 2,
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.info.main, 0.04),
                  border: '1px solid',
                  borderColor: alpha(theme.palette.info.main, 0.2),
                  mb: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {pullProgress.percent >= 100 ? (
                      <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
                    ) : (
                      <DownloadIcon sx={{ fontSize: 18, color: 'info.main' }} />
                    )}
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {pullProgress.status || 'Downloading...'}
                    </Typography>
                  </Box>
                  {pullProgress.percent > 0 && (
                    <Chip
                      label={`${pullProgress.percent}%`}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        bgcolor: alpha(theme.palette.info.main, 0.12),
                        color: 'info.main',
                      }}
                    />
                  )}
                </Box>
                <LinearProgress
                  variant={pullProgress.percent > 0 ? 'determinate' : 'indeterminate'}
                  value={pullProgress.percent}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: alpha(theme.palette.info.main, 0.1),
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 3,
                      bgcolor: pullProgress.percent >= 100 ? 'success.main' : 'info.main',
                    },
                  }}
                />
                {pullProgress.total > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
                    {formatBytes(pullProgress.completed)} / {formatBytes(pullProgress.total)}
                  </Typography>
                )}
              </Box>
            )}

            {pullError && (
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.error.main, 0.06),
                  border: '1px solid',
                  borderColor: alpha(theme.palette.error.main, 0.2),
                  mb: 2,
                }}
              >
                <Typography variant="caption" color="error" sx={{ fontWeight: 600 }}>
                  {pullError}
                </Typography>
              </Box>
            )}

            {/* Suggested Models */}
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
              Popular Models
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {[
                { name: 'llama3.2', desc: 'Meta Llama 3.2 3B' },
                { name: 'deepseek-r1:8b', desc: 'DeepSeek R1 8B' },
                { name: 'gemma3:4b', desc: 'Google Gemma 3 4B' },
                { name: 'phi4', desc: 'Microsoft Phi-4' },
                { name: 'qwen3:8b', desc: 'Alibaba Qwen 3 8B' },
                { name: 'mistral', desc: 'Mistral 7B' },
                { name: 'codellama', desc: 'Code Llama 7B' },
                { name: 'nomic-embed-text', desc: 'Nomic Embed v1.5' },
              ].map((suggested) => {
                const alreadyInstalled = models.some((m) => m.name.startsWith(suggested.name));
                return (
                  <Chip
                    key={suggested.name}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {alreadyInstalled && <CheckCircleIcon sx={{ fontSize: 12, color: 'success.main' }} />}
                        <span>{suggested.name}</span>
                      </Box>
                    }
                    onClick={() => {
                      if (!pulling && !alreadyInstalled) {
                        setPullName(suggested.name);
                      }
                    }}
                    variant={alreadyInstalled ? 'filled' : 'outlined'}
                    disabled={pulling}
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      cursor: alreadyInstalled ? 'default' : 'pointer',
                      opacity: alreadyInstalled ? 0.6 : 1,
                    }}
                  />
                );
              })}
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
