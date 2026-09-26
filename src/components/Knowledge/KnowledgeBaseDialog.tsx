import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Paper,
  Tabs,
  Tab,
  Divider,
  InputAdornment,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme,
  alpha,
  Alert,
} from '@mui/material';
import {
  BookOpen,
  X,
  Plus,
  Trash2,
  Search,
  Upload,
  FileText,
  Hash,
  Layers,
  Sparkles,
  Download,
  FolderOpen,
  ChevronDown,
  CheckCircle2,
  Zap,
  Info,
} from 'lucide-react';
import {
  loadKnowledgeDocuments,
  saveKnowledgeDocument,
  deleteKnowledgeDocument,
  searchKnowledge,
  KnowledgeDocument,
  KnowledgeSearchResult,
  formatFileSize,
} from '../../utils/knowledgeStorage';
import { isDocumentFile, readDocumentFile } from '../../utils/documentUtils';
import { showToast } from '../../utils/toast';
import { showCustomConfirm } from '../../utils/dialogService';

export interface KnowledgeBaseDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectTag?: (tag: string) => void;
}

export default function KnowledgeBaseDialog({
  open,
  onClose,
  onSelectTag,
}: KnowledgeBaseDialogProps) {
  const theme = useTheme();
  const [tab, setTab] = useState(0); // 0: Documents & Chunks, 1: Add/Upload, 2: RAG Retrieval Test
  const [documents, setDocuments] = useState<KnowledgeDocument[]>(() => loadKnowledgeDocuments());
  const [searchFilter, setSearchFilter] = useState('');

  // Add Document State
  const [newTitle, setNewTitle] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newFileType, setNewFileType] = useState('md');
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Retrieval Test Sandbox State
  const [testQuery, setTestQuery] = useState('');
  const [testTagFilter, setTestTagFilter] = useState('*');
  const [testResults, setTestResults] = useState<KnowledgeSearchResult[]>([]);

  const refreshDocs = () => {
    setDocuments(loadKnowledgeDocuments());
  };

  useEffect(() => {
    if (open) {
      refreshDocs();
    }
  }, [open]);

  // Statistics
  const totalChunks = useMemo(
    () => documents.reduce((acc, d) => acc + (d.chunks?.length || 0), 0),
    [documents]
  );
  const totalBytes = useMemo(
    () => documents.reduce((acc, d) => acc + (d.sizeBytes || 0), 0),
    [documents]
  );

  // Filtered documents
  const filteredDocs = useMemo(() => {
    const q = searchFilter.toLowerCase().trim();
    if (!q) return documents;
    return documents.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.tag.toLowerCase().includes(q) ||
        d.content.toLowerCase().includes(q)
    );
  }, [documents, searchFilter]);

  // Handle file drop / upload
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setUploadError('');

    try {
      if (!isDocumentFile(file)) {
        setUploadError(`Unsupported file format. Please upload text, markdown, CSV, JSON, or code files.`);
        return;
      }

      const text = await readDocumentFile(file);
      const inferredTitle = file.name.replace(/\.[^/.]+$/, '');
      const inferredTag = inferredTitle.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 24);

      setNewTitle(inferredTitle);
      setNewTag(inferredTag);
      setNewContent(text);
      setNewFileType(file.name.split('.').pop() || 'txt');
      showToast(`Loaded ${file.name} (${formatFileSize(file.size)})`, 'info');
    } catch (err: any) {
      setUploadError(err.message || 'Failed to read document');
    }
  };

  // Save new document
  const handleSaveDocument = () => {
    if (!newTitle.trim()) {
      showToast('Document title is required', 'warning');
      return;
    }
    if (!newContent.trim()) {
      showToast('Document content cannot be empty', 'warning');
      return;
    }

    const saved = saveKnowledgeDocument({
      title: newTitle,
      tag: newTag || newTitle.slice(0, 16),
      content: newContent,
      fileType: newFileType,
    });

    showToast(`Indexed "${saved.title}" (#${saved.tag}) into ${saved.chunks.length} chunks`, 'success');
    refreshDocs();
    setNewTitle('');
    setNewTag('');
    setNewContent('');
    setTab(0);
  };

  // Delete document
  const handleDeleteDocument = async (doc: KnowledgeDocument) => {
    const confirmed = await showCustomConfirm({
      title: `Delete Knowledge Document?`,
      message: `Are you sure you want to delete "${doc.title}" (#${doc.tag})? This will remove all ${doc.chunks?.length || 0} indexed chunks from the local RAG engine.`,
      confirmText: 'Delete Document',
      confirmColor: 'error',
    });

    if (confirmed) {
      deleteKnowledgeDocument(doc.id);
      refreshDocs();
      showToast(`Deleted "${doc.title}"`, 'info');
    }
  };

  // Run Retrieval Test
  const handleRunTest = () => {
    if (!testQuery.trim()) {
      setTestResults([]);
      return;
    }
    const results = searchKnowledge(
      testQuery,
      testTagFilter === '*' ? undefined : testTagFilter,
      5
    );
    setTestResults(results);
  };

  // Export JSON
  const handleExportJson = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(documents, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `localllmmind-knowledge-base-${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Knowledge Base exported as JSON', 'success');
    } catch {
      showToast('Failed to export Knowledge Base', 'error');
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
            boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
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
              width: 40,
              height: 40,
              borderRadius: 2.5,
              bgcolor: alpha(theme.palette.secondary.main, 0.12),
              color: 'secondary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BookOpen size={20} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.2 }}>
              Local RAG & Knowledge Base
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Semantic document grounding with in-chat <kbd>#tag</kbd> retrieval
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Export Knowledge Base as JSON">
            <IconButton size="small" onClick={handleExportJson}>
              <Download size={16} />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* Tabs */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 3, bgcolor: alpha(theme.palette.background.paper, 0.4) }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          textColor="secondary"
          indicatorColor="secondary"
          sx={{ minHeight: 44 }}
        >
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <BookOpen size={15} />
                <span>Documents ({documents.length})</span>
              </Box>
            }
            sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.82rem', minHeight: 44 }}
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Plus size={15} />
                <span>Add / Upload</span>
              </Box>
            }
            sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.82rem', minHeight: 44 }}
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Zap size={15} />
                <span>RAG Test Sandbox</span>
              </Box>
            }
            sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.82rem', minHeight: 44 }}
          />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 3, minHeight: 420, maxHeight: '65vh', overflowY: 'auto' }}>
        {/* TAB 0: DOCUMENTS & CHUNKS */}
        {tab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Top metric chips & Search */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  icon={<Layers size={13} style={{ marginLeft: 6 }} />}
                  label={`${totalChunks} Indexed Chunks`}
                  size="small"
                  color="secondary"
                  sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                />
                <Chip
                  label={`${documents.length} Documents`}
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 600, fontSize: '0.72rem' }}
                />
              </Box>

              <TextField
                size="small"
                placeholder="Search title, #tag, or text…"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={14} color={theme.palette.text.secondary} />
                      </InputAdornment>
                    ),
                    sx: { fontSize: '0.82rem', borderRadius: 2, width: { xs: '100%', sm: 260 } },
                  },
                }}
              />
            </Box>

            {/* Document Accordion List */}
            {filteredDocs.length === 0 ? (
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
                <BookOpen size={36} color={theme.palette.text.secondary} style={{ opacity: 0.5, marginBottom: 8 }} />
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {searchFilter ? 'No documents match your search.' : 'No documents in knowledge base yet.'}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  color="secondary"
                  startIcon={<Plus size={14} />}
                  onClick={() => setTab(1)}
                  sx={{ mt: 1.5, textTransform: 'none', borderRadius: 2 }}
                >
                  Add Your First Document
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {filteredDocs.map((doc) => (
                  <Accordion
                    key={doc.id}
                    elevation={0}
                    sx={{
                      borderRadius: 2.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:before': { display: 'none' },
                      overflow: 'hidden',
                      bgcolor: alpha(theme.palette.background.paper, 0.6),
                    }}
                  >
                    <AccordionSummary expandIcon={<ChevronDown size={16} />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                          <Chip
                            label={`#${doc.tag}`}
                            size="small"
                            color="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectTag?.(doc.tag);
                              onClose();
                            }}
                            sx={{
                              fontWeight: 700,
                              fontFamily: 'monospace',
                              fontSize: '0.72rem',
                              height: 22,
                              cursor: 'pointer',
                            }}
                          />
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
                            {doc.title}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            {doc.chunks?.length || 0} chunks • {doc.fileType.toUpperCase()}
                          </Typography>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDocument(doc);
                            }}
                            sx={{ p: 0.5 }}
                          >
                            <Trash2 size={14} />
                          </IconButton>
                        </Box>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0, pb: 2, px: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontStyle: 'italic' }}>
                        Chunks preview (chunked for vector & hybrid semantic retrieval):
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {doc.chunks?.map((chunk, cIdx) => (
                          <Paper
                            key={chunk.id}
                            elevation={0}
                            sx={{
                              p: 1.5,
                              borderRadius: 2,
                              bgcolor: alpha(theme.palette.background.paper, 0.4),
                              border: '1px solid',
                              borderColor: 'divider',
                              fontSize: '0.78rem',
                              fontFamily: 'monospace',
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                                Chunk {cIdx + 1}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ~{chunk.tokenEstimate} tokens
                              </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ fontSize: '0.76rem', whiteSpace: 'pre-wrap', color: 'text.secondary' }}>
                              {chunk.text}
                            </Typography>
                          </Paper>
                        ))}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* TAB 1: ADD / UPLOAD DOCUMENT */}
        {tab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* File dropzone */}
            <Box
              onClick={() => fileInputRef.current?.click()}
              sx={{
                p: 3,
                border: '2px dashed',
                borderColor: alpha(theme.palette.secondary.main, 0.4),
                borderRadius: 3,
                bgcolor: alpha(theme.palette.secondary.main, 0.04),
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'secondary.main',
                  bgcolor: alpha(theme.palette.secondary.main, 0.08),
                },
              }}
            >
              <Upload size={28} color={theme.palette.secondary.main} style={{ marginBottom: 8 }} />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Click to browse or drop document (.txt, .md, .csv, .json, code files)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Files are chunked client-side and saved into your private browser knowledge base
              </Typography>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.markdown,.json,.csv,.ts,.tsx,.js,.jsx,.py,.sql"
                style={{ display: 'none' }}
                onChange={(e) => handleFileSelect(e.target.files)}
              />
            </Box>

            {uploadError && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {uploadError}
              </Alert>
            )}

            {/* Manual Form Inputs */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                fullWidth
                label="Document Title"
                placeholder="e.g., API Specification v2"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                size="small"
                sx={{ flex: 1, minWidth: 240 }}
              />
              <TextField
                label="In-Chat Tag"
                placeholder="e.g., api-docs"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                size="small"
                sx={{ width: 180 }}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">#</InputAdornment>,
                  },
                }}
                helperText="Invoked with #tag in chat"
              />
            </Box>

            <TextField
              fullWidth
              multiline
              rows={8}
              label="Document Content"
              placeholder="Paste markdown, documentation text, code, or structured notes here…"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              slotProps={{
                input: {
                  sx: { fontFamily: 'monospace', fontSize: '0.82rem' },
                },
              }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
              <Button variant="text" onClick={() => setTab(0)}>
                Cancel
              </Button>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<Plus size={16} />}
                onClick={handleSaveDocument}
                disabled={!newTitle.trim() || !newContent.trim()}
                sx={{ fontWeight: 700, borderRadius: 2 }}
              >
                Index & Save Document
              </Button>
            </Box>
          </Box>
        )}

        {/* TAB 2: RAG TEST SANDBOX */}
        {tab === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info" icon={<Sparkles size={16} />} sx={{ borderRadius: 2 }}>
              Test your knowledge base retrieval! Type a query to see which document chunks are retrieved and scored in real-time.
            </Alert>

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Enter sample question (e.g. How does local memory work?)"
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRunTest()}
              />
              <Button
                variant="contained"
                color="secondary"
                onClick={handleRunTest}
                startIcon={<Zap size={15} />}
                sx={{ fontWeight: 700, textTransform: 'none', px: 2.5, borderRadius: 2 }}
              >
                Search
              </Button>
            </Box>

            {/* Results */}
            {testResults.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'secondary.main', textTransform: 'uppercase' }}>
                  Retrieved {testResults.length} Chunks (Ranked by Relevance):
                </Typography>
                {testResults.map((res, idx) => (
                  <Paper
                    key={res.chunk.id}
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 2.5,
                      border: '1.5px solid',
                      borderColor: idx === 0 ? 'secondary.main' : 'divider',
                      bgcolor: alpha(theme.palette.background.paper, 0.7),
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={`Rank #${idx + 1}`}
                          size="small"
                          color={idx === 0 ? 'secondary' : 'default'}
                          sx={{ fontWeight: 800, fontSize: '0.65rem', height: 20 }}
                        />
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          #{res.tag} — {res.documentTitle}
                        </Typography>
                      </Box>
                      <Chip
                        label={`Score: ${res.score.toFixed(1)}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 700, fontSize: '0.68rem', height: 20 }}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap', color: 'text.secondary' }}>
                      {res.chunk.text}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            ) : testQuery ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No chunks matched your query. Try different keywords.
              </Typography>
            ) : null}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
