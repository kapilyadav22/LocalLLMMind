import { useState, memo } from 'react';
import { Box, IconButton, Tooltip, Typography, Dialog, Chip, useTheme, alpha } from '@mui/material';
import {
  User,
  Bot,
  Copy,
  Check,
  Volume2,
  VolumeX,
  RotateCw,
  Edit3,
  ZoomIn,
  X,
  CornerUpLeft,
  GitFork,
  ChevronLeft,
  ChevronRight,
  Globe,
  ExternalLink,
  Brain,
  FileText,
  BookOpen,
  Hash,
} from 'lucide-react';
import MarkdownRenderer from '../common/MarkdownRenderer';
import GenerationStatsDialog from './GenerationStatsDialog';
import { addMemory } from '../../utils/memoryStorage';
import { appendContentToActiveNote } from '../../utils/notesStorage';
import { showToast } from '../../utils/toast';

const MessageBubble = memo(function MessageBubble({
  message,
  index,
  isStreaming,
  isLastAssistant,
  onRegenerate,
  onEdit,
  onReply,
  onFork,
  isSpeaking,
  onToggleSpeak,
  onSwitchVersion,
  searchQuery = '',
}: any) {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedCitation, setSelectedCitation] = useState<any | null>(null);
  const isUser = message.role === 'user';
  const isSearchMatch = Boolean(
    searchQuery.trim() &&
    message.content.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy message:', e);
    }
  };

  const [savedToMemory, setSavedToMemory] = useState(false);

  const handleSaveToMemory = () => {
    if (!message.content?.trim()) return;
    const added = addMemory(message.content.trim(), 'chat');
    if (added) {
      setSavedToMemory(true);
      showToast('Saved to Long-Term Memory', 'success');
      setTimeout(() => setSavedToMemory(false), 2000);
    } else {
      showToast('This item is already saved in Long-Term Memory', 'info');
    }
  };

  const [appendedToNotes, setAppendedToNotes] = useState(false);

  const handleAppendToNotes = () => {
    if (!message.content?.trim()) return;
    const sourceTitle = isUser ? 'User Prompt' : 'AI Assistant';
    appendContentToActiveNote(message.content.trim(), sourceTitle);
    setAppendedToNotes(true);
    showToast('Appended to Workspace Notes', 'success');
    setTimeout(() => setAppendedToNotes(false), 2000);
  };

  const [statsModalOpen, setStatsModalOpen] = useState(false);

  return (
    <Box
      id={`chat-turn-${index}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        display: 'flex',
        gap: 2,
        py: 2.5,
        px: { xs: 2, md: 3 },
        maxWidth: 820,
        mx: 'auto',
        width: '100%',
        borderRadius: isSearchMatch ? 3 : 0,
        bgcolor: isSearchMatch ? alpha(theme.palette.warning.main, 0.08) : 'transparent',
        border: isSearchMatch ? `1px solid ${alpha(theme.palette.warning.main, 0.4)}` : '1px solid transparent',
        transition: 'all 0.2s ease',
        animation: 'messageIn 0.3s ease-out',
        '@keyframes messageIn': {
          from: { opacity: 0, transform: 'translateY(8px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      {/* Avatar */}
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          mt: 0.25,
          bgcolor: isUser
            ? (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')
            : alpha(theme.palette.primary.main, 0.12),
          color: isUser
            ? 'text.primary'
            : 'primary.main',
          border: '1px solid',
          borderColor: isUser
            ? 'divider'
            : alpha(theme.palette.primary.main, 0.25),
        }}
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0, position: 'relative' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
            {isUser ? 'You' : 'Assistant'}
          </Typography>
        </Box>

        <Box
          sx={{
            '& > *:first-of-type': { mt: 0 },
            '& > *:last-child': { mb: 0 },
            wordBreak: 'break-word',
          }}
        >
          {isUser ? (
            <>
              {message.images && message.images.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 1.5 }}>
                  {message.images.map((img, idx) => {
                    const src =
                      typeof img === 'string'
                        ? (img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}`)
                        : (img.preview || (img.base64 ? `data:image/jpeg;base64,${img.base64}` : ''));
                    const imgName = typeof img === 'object' ? img.name : `Image ${idx + 1}`;
                    return (
                      <Box
                        key={img.id || idx}
                        onClick={() => setSelectedImage(src)}
                        sx={{
                          position: 'relative',
                          cursor: 'pointer',
                          borderRadius: 2,
                          overflow: 'hidden',
                          border: '1px solid',
                          borderColor: 'divider',
                          maxWidth: { xs: 180, sm: 240 },
                          maxHeight: 180,
                          boxShadow: (t) => `0 2px 8px ${alpha(t.palette.common.black, 0.1)}`,
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: (t) => `0 8px 24px ${alpha(t.palette.common.black, 0.25)}`,
                            '& .zoom-overlay': { opacity: 1 },
                          },
                        }}
                      >
                        <Box
                          component="img"
                          src={src}
                          alt={imgName}
                          sx={{
                            display: 'block',
                            width: '100%',
                            height: '100%',
                            maxHeight: 180,
                            objectFit: 'cover',
                          }}
                        />
                        <Box
                          className="zoom-overlay"
                          sx={{
                            position: 'absolute',
                            inset: 0,
                            bgcolor: 'rgba(0,0,0,0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0,
                            transition: 'opacity 0.2s ease',
                            color: '#fff',
                          }}
                        >
                          <ZoomIn size={22} />
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}
              {/* Knowledge Base Grounding Sources Banner */}
              {message.knowledgeCitations && message.knowledgeCitations.length > 0 && (
                <Box
                  sx={{
                    mb: 1.5,
                    p: 1.25,
                    borderRadius: 2.5,
                    bgcolor: alpha(theme.palette.secondary.main, 0.08),
                    border: '1px solid',
                    borderColor: alpha(theme.palette.secondary.main, 0.25),
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                    <BookOpen size={14} color={theme.palette.secondary.main} />
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        color: 'secondary.main',
                        letterSpacing: '0.04em',
                        fontSize: '0.72rem',
                        textTransform: 'uppercase',
                      }}
                    >
                      Knowledge Base Grounding ({message.knowledgeCitations.length} excerpts)
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {message.knowledgeCitations.map((cit, i) => (
                      <Chip
                        key={i}
                        clickable
                        onClick={() => setSelectedCitation(cit)}
                        size="small"
                        label={`#${cit.tag}: "${cit.documentTitle}" (chunk ${cit.chunkIndex + 1})`}
                        icon={<Hash size={11} />}
                        sx={{
                          maxWidth: 320,
                          fontSize: '0.72rem',
                          bgcolor: alpha(theme.palette.background.paper, 0.8),
                          borderRadius: 1.5,
                          border: '1px solid',
                          borderColor: alpha(theme.palette.secondary.main, 0.3),
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                {message.content}
              </Typography>
            </>
          ) : (
            <>
              {/* Web Grounding Sources Banner for Assistant Response */}
              {message.webSources && message.webSources.length > 0 && (
                <Box
                  sx={{
                    mb: 1.5,
                    p: 1.25,
                    borderRadius: 2.5,
                    bgcolor: alpha('#00e5ff', 0.06),
                    border: '1px solid',
                    borderColor: alpha('#00e5ff', 0.2),
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                    <Globe size={14} color={theme.palette.primary.main} />
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        color: 'primary.main',
                        letterSpacing: '0.04em',
                        fontSize: '0.72rem',
                        textTransform: 'uppercase',
                      }}
                    >
                      Grounded Web Sources ({message.webSources.length})
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {message.webSources.map((source, i) => (
                      <Chip
                        key={i}
                        component="a"
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        clickable
                        size="small"
                        label={`[${i + 1}] ${source.title}`}
                        icon={<ExternalLink size={11} />}
                        sx={{
                          maxWidth: 240,
                          fontSize: '0.72rem',
                          bgcolor: alpha(theme.palette.background.paper, 0.7),
                          borderRadius: 1.5,
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {/* Knowledge Base Grounding Sources Banner for Assistant Response */}
              {message.knowledgeCitations && message.knowledgeCitations.length > 0 && (
                <Box
                  sx={{
                    mb: 1.5,
                    p: 1.25,
                    borderRadius: 2.5,
                    bgcolor: alpha(theme.palette.secondary.main, 0.08),
                    border: '1px solid',
                    borderColor: alpha(theme.palette.secondary.main, 0.25),
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                    <BookOpen size={14} color={theme.palette.secondary.main} />
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        color: 'secondary.main',
                        letterSpacing: '0.04em',
                        fontSize: '0.72rem',
                        textTransform: 'uppercase',
                      }}
                    >
                      Knowledge Base Grounding ({message.knowledgeCitations.length} excerpts cited)
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {message.knowledgeCitations.map((cit, i) => (
                      <Chip
                        key={i}
                        clickable
                        onClick={() => setSelectedCitation(cit)}
                        size="small"
                        label={`#${cit.tag}: "${cit.documentTitle}" (chunk ${cit.chunkIndex + 1})`}
                        icon={<Hash size={11} />}
                        sx={{
                          maxWidth: 320,
                          fontSize: '0.72rem',
                          bgcolor: alpha(theme.palette.background.paper, 0.8),
                          borderRadius: 1.5,
                          border: '1px solid',
                          borderColor: alpha(theme.palette.secondary.main, 0.3),
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              <MarkdownRenderer content={message.content} />
              {isStreaming && (
                <Box
                  component="span"
                  sx={{
                    display: 'inline-block',
                    width: 7,
                    height: 18,
                    ml: 0.5,
                    bgcolor: 'primary.main',
                    borderRadius: 0.5,
                    animation: 'blink 1s step-end infinite',
                    verticalAlign: 'text-bottom',
                    '@keyframes blink': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0 },
                    },
                  }}
                />
              )}
            </>
          )}
        </Box>

        {/* Performance Metrics Badge & Inspector */}
        {!isUser && message.metrics && !isStreaming && (
          <Tooltip title="Click to view detailed token breakdown & latency inspector">
            <Box
              onClick={() => setStatsModalOpen(true)}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                mt: 1.25,
                mb: 0.25,
                px: 1.25,
                py: 0.4,
                borderRadius: 2,
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                border: '1px solid',
                borderColor: 'divider',
                fontSize: '0.72rem',
                color: 'text.secondary',
                fontFamily: 'monospace',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                '&:hover': {
                  borderColor: 'warning.main',
                  bgcolor: alpha(theme.palette.warning.main, 0.08),
                  color: 'text.primary',
                },
              }}
            >
              <Box component="span" sx={{ color: 'warning.main', fontSize: '0.8rem', lineHeight: 1 }}>
                ⚡
              </Box>
              <Typography variant="caption" sx={{ fontSize: '0.72rem', color: 'text.secondary', fontWeight: 600 }}>
                {message.metrics.tokPerSec} tok/s
              </Typography>
              <Typography variant="caption" sx={{ fontSize: '0.72rem', opacity: 0.4 }}>•</Typography>
              <Typography variant="caption" sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                {message.metrics.evalCount} tokens ({message.metrics.duration}s)
              </Typography>
              {message.metrics.model && (
                <>
                  <Typography variant="caption" sx={{ fontSize: '0.72rem', opacity: 0.4 }}>•</Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.72rem', color: 'primary.main', fontWeight: 500 }}>
                    {message.metrics.model}
                  </Typography>
                </>
              )}
            </Box>
          </Tooltip>
        )}

        {/* Actions */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            mt: 1,
            opacity: hovered || isSpeaking || (message.versions && message.versions.length > 1) ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
        >
          {/* Multi-turn version navigation switcher */}
          {!isUser && message.versions && message.versions.length > 1 && (
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.25,
                mr: 1,
                px: 0.75,
                py: 0.25,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.text.primary, 0.05),
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Tooltip title="Previous generation">
                <span>
                  <IconButton
                    size="small"
                    disabled={(message.activeVersionIndex ?? (message.versions.length - 1)) <= 0}
                    onClick={() =>
                      onSwitchVersion?.(
                        index,
                        (message.activeVersionIndex ?? (message.versions.length - 1)) - 1
                      )
                    }
                    sx={{ p: 0.25 }}
                  >
                    <ChevronLeft size={14} />
                  </IconButton>
                </span>
              </Tooltip>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  fontSize: '0.72rem',
                  px: 0.5,
                  color: 'text.secondary',
                  fontFamily: 'monospace',
                }}
              >
                {(message.activeVersionIndex ?? (message.versions.length - 1)) + 1} / {message.versions.length}
              </Typography>
              <Tooltip title="Next generation">
                <span>
                  <IconButton
                    size="small"
                    disabled={
                      (message.activeVersionIndex ?? (message.versions.length - 1)) >=
                      message.versions.length - 1
                    }
                    onClick={() =>
                      onSwitchVersion?.(
                        index,
                        (message.activeVersionIndex ?? (message.versions.length - 1)) + 1
                      )
                    }
                    sx={{ p: 0.25 }}
                  >
                    <ChevronRight size={14} />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          )}

          <Tooltip title={copied ? 'Copied!' : 'Copy'}>
            <IconButton
              size="small"
              onClick={handleCopy}
              sx={{
                color: 'text.secondary',
                '&:hover': { color: 'text.primary', bgcolor: alpha(theme.palette.text.primary, 0.06) },
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </IconButton>
          </Tooltip>

          {/* Save to Long-Term Memory */}
          <Tooltip title={savedToMemory ? 'Saved to Memory!' : 'Save to Long-Term Memory'}>
            <IconButton
              size="small"
              onClick={handleSaveToMemory}
              sx={{
                color: savedToMemory ? 'info.main' : 'text.secondary',
                '&:hover': { color: 'info.main', bgcolor: alpha(theme.palette.info.main, 0.1) },
              }}
            >
              {savedToMemory ? <Check size={14} /> : <Brain size={14} />}
            </IconButton>
          </Tooltip>

          {/* Append to Workspace Notes */}
          <Tooltip title={appendedToNotes ? 'Appended to Notes!' : 'Append to Workspace Notes'}>
            <IconButton
              size="small"
              onClick={handleAppendToNotes}
              sx={{
                color: appendedToNotes ? 'primary.main' : 'text.secondary',
                '&:hover': { color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.08) },
              }}
            >
              {appendedToNotes ? <Check size={14} /> : <FileText size={14} />}
            </IconButton>
          </Tooltip>

          {/* Reply on message */}
          {onReply && (
            <Tooltip title="Reply to message">
              <IconButton
                size="small"
                onClick={() => onReply(message)}
                sx={{
                  color: 'text.secondary',
                  '&:hover': { color: 'text.primary', bgcolor: alpha(theme.palette.text.primary, 0.06) },
                }}
              >
                <CornerUpLeft size={14} />
              </IconButton>
            </Tooltip>
          )}

          {/* Fork conversation from this point */}
          {onFork && (
            <Tooltip title="Fork chat from here">
              <IconButton
                size="small"
                onClick={() => onFork(index)}
                sx={{
                  color: 'text.secondary',
                  '&:hover': { color: 'text.primary', bgcolor: alpha(theme.palette.text.primary, 0.06) },
                }}
              >
                <GitFork size={14} />
              </IconButton>
            </Tooltip>
          )}

          {/* Edit user message */}
          {isUser && onEdit && (
            <Tooltip title="Edit and resend">
              <IconButton
                size="small"
                onClick={() => onEdit(index, message.content)}
                sx={{
                  color: 'text.secondary',
                  '&:hover': { color: 'text.primary', bgcolor: alpha(theme.palette.text.primary, 0.06) },
                }}
              >
                <Edit3 size={14} />
              </IconButton>
            </Tooltip>
          )}

          {/* Read aloud for assistant messages */}
          {!isUser && onToggleSpeak && (
            <Tooltip title={isSpeaking ? 'Stop reading' : 'Read aloud'}>
              <IconButton
                size="small"
                onClick={() => onToggleSpeak(index, message.content)}
                sx={{
                  color: isSpeaking ? 'primary.main' : 'text.secondary',
                  '&:hover': { color: 'text.primary', bgcolor: alpha(theme.palette.text.primary, 0.06) },
                }}
              >
                {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </IconButton>
            </Tooltip>
          )}

          {/* Regenerate assistant message */}
          {!isUser && onRegenerate && (isLastAssistant || !isStreaming) && (
            <Tooltip title="Regenerate response">
              <span>
                <IconButton
                  size="small"
                  onClick={() => onRegenerate(index)}
                  disabled={isStreaming}
                  sx={{
                    color: 'text.secondary',
                    '&:hover': { color: 'text.primary', bgcolor: alpha(theme.palette.text.primary, 0.06) },
                  }}
                >
                  <RotateCw size={14} />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Image Zoom Lightbox Modal */}
      <Dialog
        open={Boolean(selectedImage)}
        onClose={() => setSelectedImage(null)}
        maxWidth="lg"
        slotProps={{
          paper: {
            sx: {
              bgcolor: 'background.paper',
              p: 1.5,
              borderRadius: 3,
              position: 'relative',
              maxWidth: '92vw',
              maxHeight: '92vh',
              overflow: 'hidden',
              boxShadow: 24,
            },
          },
        }}
      >
        <IconButton
          onClick={() => setSelectedImage(null)}
          aria-label="Close image preview"
          sx={{
            position: 'absolute',
            right: 12,
            top: 12,
            bgcolor: 'rgba(0,0,0,0.6)',
            color: '#fff',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.85)' },
            zIndex: 2,
          }}
          size="small"
        >
          <X size={16} />
        </IconButton>
        {selectedImage && (
          <Box
            component="img"
            src={selectedImage}
            alt="Zoomed image preview"
            sx={{
              width: '100%',
              height: 'auto',
              maxHeight: '85vh',
              objectFit: 'contain',
              borderRadius: 2,
              display: 'block',
            }}
          />
        )}
      </Dialog>

      {/* Knowledge Base Citation Inspector Dialog */}
      {selectedCitation && (
        <Dialog
          open={Boolean(selectedCitation)}
          onClose={() => setSelectedCitation(null)}
          maxWidth="sm"
          fullWidth
          slotProps={{
            paper: {
              sx: {
                borderRadius: 3,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                p: 2,
              },
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={`#${selectedCitation.tag}`}
                color="secondary"
                size="small"
                sx={{ fontWeight: 700, fontFamily: 'monospace' }}
              />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {selectedCitation.documentTitle}
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setSelectedCitation(null)}>
              <X size={16} />
            </IconButton>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            Section {selectedCitation.chunkIndex + 1} • Retrieval Relevance Score: {selectedCitation.score ? selectedCitation.score.toFixed(1) : 'High'}
          </Typography>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.background.paper, 0.5),
              border: '1px solid',
              borderColor: 'divider',
              maxHeight: '50vh',
              overflowY: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              whiteSpace: 'pre-wrap',
            }}
          >
            {selectedCitation.text}
          </Box>
        </Dialog>
      )}
    </Box>
  );
});

export default MessageBubble;
