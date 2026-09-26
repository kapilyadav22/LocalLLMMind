import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  IconButton,
  TextField,
  Tooltip,
  Typography,
  Chip,
  alpha,
  useTheme,
  Fade,
  Alert,
} from '@mui/material';
import {
  Send,
  Square,
  Mic,
  MicOff,
  Image,
  FileText,
  CornerUpLeft,
  X,
  Sparkles,
  Globe,
  ListPlus,
  Clock,
  BookOpen,
  Hash,
  Phone,
} from 'lucide-react';
import ModelSelector from '../common/ModelSelector';
import { PROVIDERS, resolveModelProvider } from '../../constants/apiProviders';
import SlashCommandPopover from './SlashCommandPopover';
import PromptLibraryDialog from './PromptLibraryDialog';
import KnowledgeTagPopover from './KnowledgeTagPopover';
import KnowledgeBaseDialog from '../Knowledge/KnowledgeBaseDialog';
import { useChatStore } from '../../store/chatContext';
import { useVoiceInput } from '../../hooks/useAudio';
import { DEVELOPER_NAME, APP_SHORT_NAME } from '../../constants/appConstants';
import { loadAllPrompts } from '../../utils/promptStorage';
import { loadKnowledgeDocuments, KnowledgeDocument } from '../../utils/knowledgeStorage';
import { processImageFile, formatImageSize } from '../../utils/imageUtils';
import { isDocumentFile, readDocumentFile, formatDocumentsForPrompt } from '../../utils/documentUtils';
import { showToast } from '../../utils/toast';

export default function MessageInput({
  onSend,
  onStop,
  disabled,
  replyTo = null,
  onCancelReply = null,
  onOpenSettings = null,
  queuedCount = 0,
  onOpenVoiceMode = null,
}: any) {
  const [input, setInput] = useState('');
  const [interimText, setInterimText] = useState('');
  const inputRef = useRef(null);
  const theme = useTheme();
  const { state, getActiveConversation, dispatch } = useChatStore();
  const activeConvo = getActiveConversation();
  const currentModel = activeConvo?.model || state.settings.selectedModel || (state.models[0]?.name ?? '') || 'gpt-6-astra';

  // Prompt library and slash command popover state
  const [allPrompts, setAllPrompts] = useState(() => loadAllPrompts());
  const [slashPopoverOpen, setSlashPopoverOpen] = useState(false);
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
  const [promptLibraryOpen, setPromptLibraryOpen] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);

  // Local RAG Knowledge base state
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDocument[]>(() => loadKnowledgeDocuments());
  const [knowledgePopoverOpen, setKnowledgePopoverOpen] = useState(false);
  const [knowledgeSelectedIndex, setKnowledgeSelectedIndex] = useState(0);
  const [knowledgeDialogOpen, setKnowledgeDialogOpen] = useState(false);
  const [attachedKnowledgeTags, setAttachedKnowledgeTags] = useState<string[]>([]);

  // Sync prompts on change/import
  useEffect(() => {
    const handlePromptsUpdated = () => {
      setAllPrompts(loadAllPrompts());
    };
    const handleKnowledgeUpdated = () => {
      setKnowledgeDocs(loadKnowledgeDocuments());
    };
    window.addEventListener('localllmmind-prompts-updated', handlePromptsUpdated);
    window.addEventListener('localllmmind-knowledge-updated', handleKnowledgeUpdated);
    return () => {
      window.removeEventListener('localllmmind-prompts-updated', handlePromptsUpdated);
      window.removeEventListener('localllmmind-knowledge-updated', handleKnowledgeUpdated);
    };
  }, []);

  // Voice input
  const {
    isListening,
    isSupported: isMicSupported,
    error: micError,
    toggleListening,
  } = useVoiceInput({
    onResult: (transcript) => {
      setInput((prev) => {
        const separator = prev && !prev.endsWith(' ') ? ' ' : '';
        return prev + separator + transcript;
      });
      setInterimText('');
    },
    onInterim: (transcript) => {
      setInterimText(transcript);
    },
    continuous: true,
  });
  const [showMicError, setShowMicError] = useState(false);
  const [attachedImages, setAttachedImages] = useState([]);
  const [attachedDocuments, setAttachedDocuments] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (micError) {
      setShowMicError(true);
    }
  }, [micError]);

  // Handle files selection from file picker (images & documents)
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const imageFiles = files.filter((f: any) => f.type?.startsWith('image/'));
    const docFiles = files.filter((f: any) => isDocumentFile(f));

    if (imageFiles.length > 0) {
      try {
        const processed = await Promise.all(imageFiles.map(processImageFile));
        setAttachedImages((prev) => [...prev, ...processed]);
      } catch (err) {
        console.error('Failed to process image:', err);
      }
    }

    if (docFiles.length > 0) {
      try {
        const processedDocs = await Promise.all(docFiles.map(readDocumentFile));
        setAttachedDocuments((prev) => [...prev, ...processedDocs]);
        showToast(`Attached ${processedDocs.length} document(s)`, 'info');
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
    e.target.value = '';
  };

  // Handle clipboard paste of images (e.g. Cmd+V screenshot)
  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      try {
        const processed = await Promise.all(imageFiles.map(processImageFile));
        setAttachedImages((prev) => [...prev, ...processed]);
      } catch (err) {
        console.error('Failed to process pasted image:', err);
      }
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer?.files || []);
    const imageFiles = files.filter((f: any) => f.type?.startsWith('image/'));
    const docFiles = files.filter((f: any) => isDocumentFile(f));

    if (imageFiles.length > 0) {
      try {
        const processed = await Promise.all(imageFiles.map(processImageFile));
        setAttachedImages((prev) => [...prev, ...processed]);
      } catch (err) {
        console.error('Failed to process dropped image:', err);
      }
    }

    if (docFiles.length > 0) {
      try {
        const processedDocs = await Promise.all(docFiles.map(readDocumentFile));
        setAttachedDocuments((prev) => [...prev, ...processedDocs]);
        showToast(`Attached ${processedDocs.length} document(s)`, 'info');
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  };

  const handleRemoveImage = (id) => {
    setAttachedImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleRemoveDocument = (id) => {
    setAttachedDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  // Listen for template insertion triggered by keyboard shortcuts
  useEffect(() => {
    const handleInsert = (e) => {
      if (e.detail?.text) {
        setInput((prev) => (prev ? prev + '\n' + e.detail.text : e.detail.text));
        setTimeout(() => {
          const textarea = document.getElementById('chat-message-input');
          textarea?.focus();
        }, 50);
      }
    };
    window.addEventListener('llm-insert-text', handleInsert);
    return () => window.removeEventListener('llm-insert-text', handleInsert);
  }, []);

  // Match slash command at typing cursor: either beginning of input or line, e.g. "/ref"
  const slashMatch = useMemo(() => {
    const match = input.match(/(?:^|\n)\/([a-zA-Z0-9_-]*)$/);
    if (!match) return null;
    return {
      query: match[1].toLowerCase(),
      fullMatch: match[0],
    };
  }, [input]);

  const slashMatchingPrompts = useMemo(() => {
    if (!slashMatch) return [];
    const q = slashMatch.query;
    if (!q) return allPrompts;
    return allPrompts.filter(
      (p) =>
        p.command.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }, [slashMatch, allPrompts]);

  // Keep slash popover open when typing a slash command
  useEffect(() => {
    if (slashMatch && slashMatchingPrompts.length > 0) {
      setSlashPopoverOpen(true);
      setSlashSelectedIndex(0);
    } else {
      setSlashPopoverOpen(false);
    }
  }, [slashMatch, slashMatchingPrompts.length]);

  // Match knowledge tag at typing cursor: e.g. "#" or "#api"
  const knowledgeMatch = useMemo(() => {
    const match = input.match(/(?:^|\s)#([a-zA-Z0-9_-]*)$/);
    if (!match) return null;
    return {
      query: match[1].toLowerCase(),
      fullMatch: match[0],
    };
  }, [input]);

  const matchingKnowledgeDocs = useMemo(() => {
    if (!knowledgeMatch) return [];
    const q = knowledgeMatch.query;
    if (!q) return knowledgeDocs;
    return knowledgeDocs.filter(
      (d) =>
        d.tag.toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q)
    );
  }, [knowledgeMatch, knowledgeDocs]);

  useEffect(() => {
    if (knowledgeMatch && matchingKnowledgeDocs.length > 0) {
      setKnowledgePopoverOpen(true);
      setKnowledgeSelectedIndex(0);
    } else {
      setKnowledgePopoverOpen(false);
    }
  }, [knowledgeMatch, matchingKnowledgeDocs.length]);

  const handleSelectKnowledgeDoc = (doc: KnowledgeDocument) => {
    if (!doc) return;
    if (knowledgeMatch) {
      const replaced = input.replace(/(?:^|\s)#([a-zA-Z0-9_-]*)$/, (m) => {
        const prefix = m.startsWith(' ') ? ' ' : '';
        return `${prefix}#${doc.tag} `;
      });
      setInput(replaced);
    } else {
      setInput((prev) => (prev ? `${prev} #${doc.tag} ` : `#${doc.tag} `));
    }
    setAttachedKnowledgeTags((prev) => Array.from(new Set([...prev, doc.tag])));
    setKnowledgePopoverOpen(false);

    setTimeout(() => {
      if (inputRef.current) {
        const textarea = (inputRef.current as HTMLElement).querySelector('textarea');
        if (textarea) {
          textarea.focus();
          textarea.selectionStart = textarea.value.length;
          textarea.selectionEnd = textarea.value.length;
        }
      }
    }, 50);
  };

  const handleSelectPrompt = (prompt) => {
    if (!prompt) return;
    if (slashMatch) {
      const replaced = input.replace(/(?:^|\n)\/([a-zA-Z0-9_-]*)$/, (m) => {
        return m.startsWith('\n') ? '\n' + prompt.template : prompt.template;
      });
      setInput(replaced);
    } else {
      setInput((prev) => (prev ? prev + '\n\n' + prompt.template : prompt.template));
    }
    setSlashPopoverOpen(false);
    setPromptLibraryOpen(false);

    // Focus input and move cursor to end
    setTimeout(() => {
      if (inputRef.current) {
        const textarea = (inputRef.current as HTMLElement).querySelector('textarea');
        if (textarea) {
          textarea.focus();
          textarea.selectionStart = textarea.value.length;
          textarea.selectionEnd = textarea.value.length;
        }
      }
    }, 50);
  };

  const { provider } = resolveModelProvider(currentModel, state.models || []);
  const isOllamaModel = provider === PROVIDERS.OLLAMA;

  const getPlaceholder = () => {
    if (isListening) return 'Listening… speak now';
    if (isOllamaModel) {
      if (!state.connectionChecked) return 'Connecting to Ollama…';
      if (!state.isConnected) return '⚠ Ollama is not connected — start Ollama or switch to a cloud model below';
      if (state.models.length === 0) return '⚠ No local models found — pull a model or switch to a cloud model below';
    }
    if (!currentModel) return 'Select a model to start chatting…';
    if (state.isStreaming) return 'Type a prompt to queue (Enter to queue)…';
    if (attachedDocuments.length > 0) return 'Ask a question about the attached document(s)…';
    if (attachedImages.length > 0) return 'Ask a question about the attached image(s)…';
    return 'Send a message (type / for commands, or drop images & files)…';
  };

  // Chat is enabled whenever:
  // 1) A cloud model is selected (OpenAI, Claude, Gemini, Grok, Jev, Custom) — independent of Ollama
  // 2) Or Ollama is connected with models available
  const isInputDisabled = Boolean(isOllamaModel && (!state.isConnected || state.models.length === 0));
  const isSendDisabled = Boolean(disabled || !currentModel || isInputDisabled);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text && attachedImages.length === 0 && attachedDocuments.length === 0) return;
    if (disabled && !state.isStreaming) return;

    if (isOllamaModel && !state.isConnected) {
      showToast('Ollama is not connected. Please start Ollama or switch to a cloud model below.', 'warning');
      return;
    }
    if (isOllamaModel && state.models.length === 0) {
      showToast('No local models found in Ollama. Please pull a model or switch to a cloud model below.', 'warning');
      return;
    }
    if (isSendDisabled) return;

    // Stop listening if active
    if (isListening) toggleListening();
    setInterimText('');

    let promptPayload = text;
    if (replyTo) {
      const quoteSnippet = (replyTo.content || '').substring(0, 150).replace(/\n+/g, ' ');
      promptPayload = `> Replying to ${replyTo.role === 'user' ? 'User' : 'Assistant'}: "${quoteSnippet}..."\n\n${promptPayload}`;
    }

    if (attachedDocuments.length > 0) {
      promptPayload = promptPayload + formatDocumentsForPrompt(attachedDocuments);
    }

    onSend(promptPayload, currentModel, attachedImages, {
      webSearch: webSearchEnabled,
      knowledgeTags: attachedKnowledgeTags,
    });
    setInput('');
    setAttachedImages([]);
    setAttachedDocuments([]);
    setAttachedKnowledgeTags([]);
    onCancelReply?.();

    // Reset textarea height
    if (inputRef.current) {
      const textarea = (inputRef.current as HTMLElement).querySelector('textarea');
      if (textarea) textarea.style.height = 'auto';
    }
  }, [input, attachedImages, attachedDocuments, attachedKnowledgeTags, disabled, isSendDisabled, isOllamaModel, isListening, toggleListening, onSend, currentModel, replyTo, onCancelReply, webSearchEnabled, state.isConnected, state.models.length]);

  const handleKeyDown = (e) => {
    // Handle keyboard navigation inside the knowledge tag popover
    if (knowledgePopoverOpen && matchingKnowledgeDocs.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setKnowledgeSelectedIndex((prev) => (prev + 1) % matchingKnowledgeDocs.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setKnowledgeSelectedIndex((prev) => (prev - 1 + matchingKnowledgeDocs.length) % matchingKnowledgeDocs.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = matchingKnowledgeDocs[knowledgeSelectedIndex] || matchingKnowledgeDocs[0];
        if (selected) {
          handleSelectKnowledgeDoc(selected);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setKnowledgePopoverOpen(false);
        return;
      }
    }

    // Handle keyboard navigation inside the slash command popover
    if (slashPopoverOpen && slashMatchingPrompts.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashSelectedIndex((prev) => (prev + 1) % slashMatchingPrompts.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashSelectedIndex((prev) => (prev - 1 + slashMatchingPrompts.length) % slashMatchingPrompts.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = slashMatchingPrompts[slashSelectedIndex] || slashMatchingPrompts[0];
        if (selected) {
          handleSelectPrompt(selected);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSlashPopoverOpen(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent?.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleModelChange = (model) => {
    if (activeConvo) {
      dispatch({ type: 'SET_CONVERSATION_MODEL', payload: { id: activeConvo.id, model } });
    }
    dispatch({ type: 'UPDATE_SETTINGS', payload: { selectedModel: model } });
  };

  return (
    <Box
      sx={{
        px: { xs: 1.5, md: 3 },
        pb: { xs: 1.5, md: 2 },
        pt: 1,
        maxWidth: 820,
        mx: 'auto',
        width: '100%',
      }}
    >
      {/* Microphone Error Alert */}
      {showMicError && micError && (
        <Alert
          severity="error"
          onClose={() => setShowMicError(false)}
          sx={{ mb: 1.5, borderRadius: 3 }}
        >
          {micError}
        </Alert>
      )}

      {/* Voice recording indicator */}
      <Fade in={isListening}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            mb: 1,
            py: 0.75,
            px: 2,
            borderRadius: 3,
            bgcolor: alpha(theme.palette.error.main, 0.08),
            border: '1px solid',
            borderColor: alpha(theme.palette.error.main, 0.2),
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'error.main',
              animation: 'pulse 1.5s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                '50%': { opacity: 0.4, transform: 'scale(0.8)' },
              },
            }}
          />
          <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 500 }}>
            Listening…
          </Typography>
          {interimText && (
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontStyle: 'italic',
                maxWidth: 300,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {interimText}
            </Typography>
          )}
        </Box>
      </Fade>

      <Box
        ref={inputRef}
        onPaste={handlePaste}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        sx={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 4,
          border: '1px solid',
          borderColor: isDragging
            ? 'primary.main'
            : isListening
              ? alpha(theme.palette.error.main, 0.4)
              : isInputDisabled
                ? alpha(theme.palette.error.main, 0.2)
                : 'divider',
          bgcolor: isDragging
            ? alpha(theme.palette.primary.main, 0.05)
            : alpha(theme.palette.background.paper, 0.6),
          backdropFilter: 'blur(10px)',
          transition: 'all 0.2s ease',
          opacity: isInputDisabled ? 0.7 : 1,
          '&:focus-within': {
            borderColor: isInputDisabled
              ? alpha(theme.palette.error.main, 0.2)
              : 'primary.main',
            boxShadow: isInputDisabled
              ? 'none'
              : `0 0 0 2px ${alpha(theme.palette.primary.main, 0.15)}`,
          },
          ...(isListening && {
            boxShadow: `0 0 0 2px ${alpha(theme.palette.error.main, 0.2)}`,
          }),
        }}
      >
        {/* Slash Command Autocomplete Popover */}
        <SlashCommandPopover
          open={slashPopoverOpen}
          prompts={slashMatchingPrompts}
          selectedIndex={slashSelectedIndex}
          onSelect={handleSelectPrompt}
        />

        {/* Knowledge Tag Popover (#tag) */}
        <KnowledgeTagPopover
          open={knowledgePopoverOpen}
          documents={matchingKnowledgeDocs}
          selectedIndex={knowledgeSelectedIndex}
          onSelect={handleSelectKnowledgeDoc}
          onOpenKnowledgeStudio={() => {
            setKnowledgePopoverOpen(false);
            setKnowledgeDialogOpen(true);
          }}
          query={knowledgeMatch?.query || ''}
        />
        {/* Drag & Drop Visual Overlay */}
        {isDragging && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              borderRadius: 4,
              border: '2px dashed',
              borderColor: 'primary.main',
              bgcolor: alpha(theme.palette.primary.main, 0.12),
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.5,
              zIndex: 10,
              pointerEvents: 'none',
            }}
          >
            <Image size={24} color={theme.palette.primary.main} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
              Drop images or code documents here to attach
            </Typography>
          </Box>
        )}

        {/* Quote-Reply Preview Banner */}
        {replyTo && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
              mx: 2,
              mt: 1.5,
              mb: 0.5,
              px: 1.5,
              py: 0.75,
              borderRadius: 2.5,
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              borderLeft: '3px solid',
              borderColor: 'primary.main',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
              <CornerUpLeft size={14} color={theme.palette.primary.main} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', display: 'block' }}>
                  Replying to {replyTo.role === 'user' ? 'You' : 'Assistant'}
                </Typography>
                <Typography
                  variant="caption"
                  noWrap
                  sx={{ color: 'text.secondary', display: 'block', maxWidth: { xs: 220, sm: 460 } }}
                >
                  {(replyTo.content || '').replace(/\n+/g, ' ').substring(0, 100)}
                </Typography>
              </Box>
            </Box>
            <IconButton size="small" onClick={onCancelReply} sx={{ p: 0.5, color: 'text.secondary' }}>
              <X size={13} />
            </IconButton>
          </Box>
        )}

        {/* Attached Knowledge Tags Strip */}
        {attachedKnowledgeTags.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              px: 2,
              pt: 1.5,
              pb: 0.5,
            }}
          >
            {attachedKnowledgeTags.map((tag) => (
              <Chip
                key={tag}
                icon={<BookOpen size={13} style={{ marginLeft: 6 }} />}
                label={`#${tag}`}
                onDelete={() => setAttachedKnowledgeTags((prev) => prev.filter((t) => t !== tag))}
                size="small"
                color="secondary"
                sx={{
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.secondary.main, 0.12),
                  border: '1px solid',
                  borderColor: alpha(theme.palette.secondary.main, 0.35),
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                }}
              />
            ))}
          </Box>
        )}

        {/* Attached Documents Chip Strip */}
        {attachedDocuments.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              px: 2,
              pt: 1.5,
              pb: 0.5,
            }}
          >
            {attachedDocuments.map((doc) => (
              <Chip
                key={doc.id}
                icon={<FileText size={13} color={theme.palette.primary.main} />}
                label={`${doc.name} (${doc.formattedSize})`}
                onDelete={() => handleRemoveDocument(doc.id)}
                size="small"
                sx={{
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  border: '1px solid',
                  borderColor: alpha(theme.palette.primary.main, 0.25),
                  fontWeight: 600,
                  fontSize: '0.75rem',
                }}
              />
            ))}
          </Box>
        )}

        {/* Attached Images Thumbnail Strip */}
        {attachedImages.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              gap: 1.5,
              px: 2,
              pt: 1.75,
              pb: 0.5,
              overflowX: 'auto',
              '&::-webkit-scrollbar': { height: 4 },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 2 },
            }}
          >
            {attachedImages.map((img) => (
              <Box
                key={img.id}
                sx={{
                  position: 'relative',
                  width: 64,
                  height: 64,
                  borderRadius: 2.5,
                  overflow: 'hidden',
                  flexShrink: 0,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                  transition: 'transform 0.15s ease',
                  '&:hover': { transform: 'scale(1.03)' },
                }}
              >
                <Box
                  component="img"
                  src={img.preview}
                  alt={img.name}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <IconButton
                  size="small"
                  onClick={() => handleRemoveImage(img.id)}
                  sx={{
                    position: 'absolute',
                    top: 3,
                    right: 3,
                    width: 18,
                    height: 18,
                    p: 0,
                    bgcolor: 'rgba(0,0,0,0.7)',
                    color: '#fff',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.9)' },
                  }}
                >
                  <X size={11} />
                </IconButton>
                {img.size && (
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      bgcolor: 'rgba(0,0,0,0.65)',
                      color: '#fff',
                      fontSize: '0.58rem',
                      fontFamily: 'monospace',
                      textAlign: 'center',
                      py: 0.2,
                    }}
                  >
                    {formatImageSize(img.size)}
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        )}

        <TextField
          multiline
          maxRows={8}
          placeholder={getPlaceholder()}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          fullWidth
          variant="standard"
          slotProps={{
            input: {
              id: 'chat-message-input',
              disableUnderline: true,
            },
          }}
          sx={{
            px: 2,
            pt: 1.5,
            pb: 0.5,
            '& .MuiInputBase-input': {
              fontSize: '0.938rem',
              lineHeight: 1.6,
              '&::placeholder': {
                color: isListening
                  ? 'error.main'
                  : isInputDisabled
                    ? 'error.main'
                    : 'text.secondary',
                opacity: isInputDisabled ? 0.8 : 0.7,
              },
            },
          }}
        />

        {/* Bottom bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 1.5,
            pb: 1,
            pt: 0.5,
          }}
        >
          <ModelSelector
            value={currentModel}
            onChange={handleModelChange}
            variant="chip"
            onOpenSettings={onOpenSettings}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {/* Live Web Search Grounding button */}
            <Tooltip
              title={
                webSearchEnabled
                  ? 'Live Web Search: ACTIVE (Queries web for real-time citations)'
                  : 'Enable Live Web Search Grounding'
              }
            >
              <IconButton
                size="small"
                onClick={() => setWebSearchEnabled((prev) => !prev)}
                sx={{
                  color: webSearchEnabled ? 'primary.main' : 'text.secondary',
                  bgcolor: webSearchEnabled ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                  border: webSearchEnabled ? `1px solid ${alpha(theme.palette.primary.main, 0.3)}` : '1px solid transparent',
                  p: '6px',
                  '&:hover': {
                    color: 'primary.main',
                    bgcolor: alpha(theme.palette.primary.main, 0.15),
                  },
                  transition: 'all 0.15s ease',
                }}
              >
                <Globe size={16} />
              </IconButton>
            </Tooltip>

            {/* Prompt Library & Slash Commands button */}
            <Tooltip title="Prompt Library & Templates (/)">
              <IconButton
                size="small"
                onClick={() => setPromptLibraryOpen(true)}
                sx={{
                  color: promptLibraryOpen ? 'primary.main' : 'text.secondary',
                  bgcolor: promptLibraryOpen ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                  p: '6px',
                  '&:hover': {
                    color: 'primary.main',
                    bgcolor: alpha(theme.palette.primary.main, 0.15),
                  },
                  transition: 'all 0.15s ease',
                }}
              >
                <Sparkles size={16} />
              </IconButton>
            </Tooltip>

            {/* Local RAG & Document Knowledge Base Grounding button */}
            <Tooltip
              title={
                attachedKnowledgeTags.length > 0
                  ? `Knowledge Base Grounding: ACTIVE (#${attachedKnowledgeTags.join(', #')})`
                  : 'Knowledge Base & Document Grounding (#tag)'
              }
            >
              <IconButton
                size="small"
                onClick={() => setKnowledgeDialogOpen(true)}
                sx={{
                  color: attachedKnowledgeTags.length > 0 ? 'secondary.main' : 'text.secondary',
                  bgcolor: attachedKnowledgeTags.length > 0 ? alpha(theme.palette.secondary.main, 0.12) : 'transparent',
                  border: attachedKnowledgeTags.length > 0 ? `1px solid ${alpha(theme.palette.secondary.main, 0.35)}` : '1px solid transparent',
                  p: '6px',
                  '&:hover': {
                    color: 'secondary.main',
                    bgcolor: alpha(theme.palette.secondary.main, 0.15),
                  },
                  transition: 'all 0.15s ease',
                }}
              >
                <BookOpen size={16} />
              </IconButton>
            </Tooltip>

            {/* Attach Image or Document button */}
            <Tooltip title="Attach images or documents (code, data, text)">
              <span>
                <IconButton
                  component="label"
                  size="small"
                  disabled={disabled || (isOllamaModel && !state.isConnected)}
                  sx={{
                    color: (attachedImages.length > 0 || attachedDocuments.length > 0) ? 'primary.main' : 'text.secondary',
                    bgcolor: (attachedImages.length > 0 || attachedDocuments.length > 0) ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                    p: '6px',
                    '&:hover': {
                      color: 'primary.main',
                      bgcolor: alpha(theme.palette.primary.main, 0.15),
                    },
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Image size={16} />
                  <input
                    type="file"
                    accept="image/*,.txt,.md,.markdown,.json,.csv,.sql,.py,.js,.jsx,.ts,.tsx,.html,.css,.sh,.yml,.yaml,.xml,.env,.rs,.go,.java,.c,.cpp"
                    multiple
                    hidden
                    onChange={handleFileSelect}
                  />
                </IconButton>
              </span>
            </Tooltip>

            {/* Microphone button */}
            {isMicSupported && (
              <Tooltip title={isListening ? 'Stop listening' : 'Voice input'}>
                <span>
                  <IconButton
                    onClick={toggleListening}
                    disabled={disabled || (isOllamaModel && !state.isConnected)}
                    sx={{
                      color: isListening ? '#fff' : 'text.secondary',
                      bgcolor: isListening
                        ? 'error.main'
                        : 'transparent',
                      p: '6px',
                      '&:hover': {
                        bgcolor: isListening
                          ? 'error.dark'
                          : alpha(theme.palette.text.primary, 0.08),
                      },
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                  </IconButton>
                </span>
              </Tooltip>
            )}

            {/* Voice Mode (Hands-Free Duplex) */}
            {isMicSupported && onOpenVoiceMode && (
              <Tooltip title="Voice Mode — Hands-free duplex conversation">
                <span>
                  <IconButton
                    onClick={onOpenVoiceMode}
                    disabled={disabled || (isOllamaModel && !state.isConnected)}
                    sx={{
                      color: 'text.secondary',
                      p: '6px',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.12),
                        color: 'primary.main',
                      },
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Phone size={16} />
                  </IconButton>
                </span>
              </Tooltip>
            )}

            {/* Send / Queue / Stop buttons */}
            {state.isStreaming ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                {(input.trim() || attachedImages.length > 0 || attachedDocuments.length > 0) && (
                  <Tooltip title="Queue message (Enter) — Will send automatically when current response finishes">
                    <IconButton
                      onClick={handleSend}
                      size="small"
                      sx={{
                        color: '#fff',
                        bgcolor: 'primary.main',
                        p: '7px',
                        '&:hover': {
                          bgcolor: 'primary.dark',
                        },
                      }}
                    >
                      <ListPlus size={15} />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Stop generating (Esc)">
                  <IconButton
                    onClick={onStop}
                    size="small"
                    sx={{
                      color: '#fff',
                      bgcolor: 'error.main',
                      p: '7px',
                      '&:hover': {
                        bgcolor: 'error.dark',
                      },
                    }}
                  >
                    <Square size={14} />
                  </IconButton>
                </Tooltip>
              </Box>
            ) : (
              <Tooltip title={isOllamaModel && !state.isConnected ? 'Connect to Ollama or select a cloud model' : 'Send message (Enter)'}>
                <span>
                  <IconButton
                    onClick={handleSend}
                    disabled={(!input.trim() && attachedImages.length === 0 && attachedDocuments.length === 0) || disabled || isSendDisabled}
                    size="small"
                    sx={{
                      color: (input.trim() || attachedImages.length > 0 || attachedDocuments.length > 0) && !isSendDisabled ? '#fff' : 'text.secondary',
                      bgcolor: (input.trim() || attachedImages.length > 0 || attachedDocuments.length > 0) && !isSendDisabled
                        ? 'primary.main'
                        : 'transparent',
                      p: '7px',
                      '&:hover': {
                        bgcolor: (input.trim() || attachedImages.length > 0 || attachedDocuments.length > 0) && !isInputDisabled
                          ? 'primary.dark'
                          : alpha(theme.palette.primary.main, 0.1),
                      },
                      '&.Mui-disabled': {
                        color: 'text.secondary',
                        bgcolor: 'transparent',
                      },
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Send size={15} />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Box>
        </Box>
      </Box>

      {/* Prompt Library Modal */}
      <PromptLibraryDialog
        open={promptLibraryOpen}
        onClose={() => setPromptLibraryOpen(false)}
        prompts={allPrompts}
        onSelectPrompt={handleSelectPrompt}
      />

      {/* Knowledge Base Dialog */}
      {knowledgeDialogOpen && (
        <KnowledgeBaseDialog
          open={knowledgeDialogOpen}
          onClose={() => setKnowledgeDialogOpen(false)}
          onSelectTag={(tag) => {
            setAttachedKnowledgeTags((prev) => Array.from(new Set([...prev, tag])));
            setInput((prev) => (prev ? `${prev} #${tag} ` : `#${tag} `));
          }}
        />
      )}

      <Box sx={{ textAlign: 'center', mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', opacity: 0.65 }}>
          LLM responses can be inaccurate. Verify important information.
        </Typography>
        <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', opacity: 0.4 }}>
          •
        </Typography>
        <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', opacity: 0.75, fontWeight: 500 }}>
          {APP_SHORT_NAME} by {DEVELOPER_NAME}
        </Typography>
      </Box>
    </Box>
  );
}
