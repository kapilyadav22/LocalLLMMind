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
} from 'lucide-react';
import MarkdownRenderer from '../common/MarkdownRenderer';

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
              {/* Web Grounding Sources Banner */}
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

        {/* Performance Metrics Badge */}
        {!isUser && message.metrics && !isStreaming && (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              mt: 1.25,
              mb: 0.25,
              px: 1.25,
              py: 0.35,
              borderRadius: 2,
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
              border: '1px solid',
              borderColor: 'divider',
              fontSize: '0.72rem',
              color: 'text.secondary',
              fontFamily: 'monospace',
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
    </Box>
  );
});

export default MessageBubble;
