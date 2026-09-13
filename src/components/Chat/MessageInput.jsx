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
import SendIcon from '@mui/icons-material/Send';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ReplyIcon from '@mui/icons-material/Reply';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LanguageIcon from '@mui/icons-material/Language';
import ModelSelector from '../common/ModelSelector';
import SlashCommandPopover from './SlashCommandPopover';
import PromptLibraryDialog from './PromptLibraryDialog';
import { useChatStore } from '../../store/chatContext';
import { useVoiceInput } from '../../hooks/useAudio';
import { DEVELOPER_NAME, APP_SHORT_NAME } from '../../constants/appConstants';
import { loadAllPrompts } from '../../utils/promptStorage';
import { processImageFile, formatImageSize } from '../../utils/imageUtils';
import { isDocumentFile, readDocumentFile, formatDocumentsForPrompt } from '../../utils/documentUtils';
import { showToast } from '../../utils/toast';

export default function MessageInput({ onSend, onStop, disabled, replyTo = null, onCancelReply = null }) {
  const [input, setInput] = useState('');
  const [interimText, setInterimText] = useState('');
  const inputRef = useRef(null);
  const theme = useTheme();
  const { state, getActiveConversation, dispatch } = useChatStore();
  const activeConvo = getActiveConversation();
  const currentModel = activeConvo?.model || state.settings.selectedModel || (state.models[0]?.name ?? '');

  // Prompt library and slash command popover state
  const [allPrompts, setAllPrompts] = useState(() => loadAllPrompts());
  const [slashPopoverOpen, setSlashPopoverOpen] = useState(false);
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
  const [promptLibraryOpen, setPromptLibraryOpen] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);

  // Sync prompts on change/import
  useEffect(() => {
    const handlePromptsUpdated = () => {
      setAllPrompts(loadAllPrompts());
    };
    window.addEventListener('localllmmind-prompts-updated', handlePromptsUpdated);
    return () => window.removeEventListener('localllmmind-prompts-updated', handlePromptsUpdated);
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
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    const docFiles = files.filter((f) => isDocumentFile(f));

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
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    const docFiles = files.filter((f) => isDocumentFile(f));

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
        const textarea = inputRef.current.querySelector('textarea');
        if (textarea) {
          textarea.focus();
          textarea.selectionStart = textarea.value.length;
          textarea.selectionEnd = textarea.value.length;
        }
      }
    }, 50);
  };

  const getPlaceholder = () => {
    if (isListening) return 'Listening… speak now';
    if (!state.connectionChecked) return 'Connecting to Ollama…';
    if (!state.isConnected) return '⚠ Ollama is not connected — check Settings';
    if (state.models.length === 0) return '⚠ No models found — pull a model first';
    if (!currentModel) return 'Select a model to start chatting…';
    if (attachedDocuments.length > 0) return 'Ask a question about the attached document(s)…';
    if (attachedImages.length > 0) return 'Ask a question about the attached image(s)…';
    return 'Send a message (type / for commands, or drop images & files)…';
  };

  const isInputDisabled = !state.isConnected || state.models.length === 0 || !currentModel;

  const handleSend = useCallback(() => {
    const text = input.trim();
    if ((!text && attachedImages.length === 0 && attachedDocuments.length === 0) || disabled || isInputDisabled) return;
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

    onSend(promptPayload, currentModel, attachedImages, { webSearch: webSearchEnabled });
    setInput('');
    setAttachedImages([]);
    setAttachedDocuments([]);
    onCancelReply?.();

    // Reset textarea height
    if (inputRef.current) {
      const textarea = inputRef.current.querySelector('textarea');
      if (textarea) textarea.style.height = 'auto';
    }
  }, [input, attachedImages, attachedDocuments, disabled, isInputDisabled, isListening, toggleListening, onSend, currentModel, replyTo, onCancelReply, webSearchEnabled]);

  const handleKeyDown = (e) => {
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
            <AddPhotoAlternateIcon sx={{ fontSize: 26, color: 'primary.main' }} />
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
              <ReplyIcon sx={{ fontSize: 16, color: 'primary.main', transform: 'scaleX(-1)' }} />
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
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
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
                icon={<InsertDriveFileIcon sx={{ fontSize: '15px !important', color: 'primary.main !important' }} />}
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
                  <CloseIcon sx={{ fontSize: 12 }} />
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
          disabled={isInputDisabled}
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
                  color: webSearchEnabled ? '#00e5ff' : 'text.secondary',
                  bgcolor: webSearchEnabled ? alpha('#00e5ff', 0.14) : 'transparent',
                  border: webSearchEnabled ? `1px solid ${alpha('#00e5ff', 0.45)}` : '1px solid transparent',
                  '&:hover': {
                    color: '#00e5ff',
                    bgcolor: alpha('#00e5ff', 0.22),
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <LanguageIcon sx={{ fontSize: 20 }} />
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
                  '&:hover': {
                    color: 'primary.main',
                    bgcolor: alpha(theme.palette.primary.main, 0.15),
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <AutoAwesomeIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>

            {/* Attach Image or Document button */}
            <Tooltip title="Attach images or documents (code, data, text)">
              <span>
                <IconButton
                  component="label"
                  size="small"
                  disabled={isInputDisabled}
                  sx={{
                    color: (attachedImages.length > 0 || attachedDocuments.length > 0) ? 'primary.main' : 'text.secondary',
                    bgcolor: (attachedImages.length > 0 || attachedDocuments.length > 0) ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                    '&:hover': {
                      color: 'primary.main',
                      bgcolor: alpha(theme.palette.primary.main, 0.15),
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  <AddPhotoAlternateIcon sx={{ fontSize: 20 }} />
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
                    disabled={isInputDisabled}
                    sx={{
                      color: isListening ? '#fff' : 'text.secondary',
                      bgcolor: isListening
                        ? 'error.main'
                        : 'transparent',
                      '&:hover': {
                        bgcolor: isListening
                          ? 'error.dark'
                          : alpha(theme.palette.text.primary, 0.08),
                      },
                      transition: 'all 0.2s ease',
                      ...(isListening && {
                        animation: 'micPulse 2s ease-in-out infinite',
                        '@keyframes micPulse': {
                          '0%, 100%': { boxShadow: `0 0 0 0 ${alpha(theme.palette.error.main, 0.4)}` },
                          '50%': { boxShadow: `0 0 0 8px ${alpha(theme.palette.error.main, 0)}` },
                        },
                      }),
                    }}
                  >
                    {isListening ? <MicOffIcon sx={{ fontSize: 20 }} /> : <MicIcon sx={{ fontSize: 20 }} />}
                  </IconButton>
                </span>
              </Tooltip>
            )}

            {/* Send / Stop button */}
            {state.isStreaming ? (
              <Tooltip title="Stop generating">
                <IconButton
                  onClick={onStop}
                  sx={{
                    color: 'error.main',
                    bgcolor: alpha(theme.palette.error.main, 0.1),
                    '&:hover': {
                      bgcolor: alpha(theme.palette.error.main, 0.2),
                    },
                  }}
                >
                  <StopCircleIcon />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title={isInputDisabled ? 'Connect to Ollama first' : 'Send message (Enter)'}>
                <span>
                  <IconButton
                    onClick={handleSend}
                    disabled={(!input.trim() && attachedImages.length === 0) || disabled || isInputDisabled}
                    sx={{
                      color: (input.trim() || attachedImages.length > 0) && !isInputDisabled ? '#fff' : 'text.secondary',
                      bgcolor: (input.trim() || attachedImages.length > 0) && !isInputDisabled
                        ? 'primary.main'
                        : 'transparent',
                      '&:hover': {
                        bgcolor: (input.trim() || attachedImages.length > 0) && !isInputDisabled
                          ? 'primary.dark'
                          : alpha(theme.palette.primary.main, 0.1),
                      },
                      '&.Mui-disabled': {
                        color: 'text.secondary',
                        bgcolor: 'transparent',
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <SendIcon sx={{ fontSize: 20 }} />
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
