import { useState, memo } from 'react';
import { Box, IconButton, Tooltip, Typography, alpha, useTheme } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import MarkdownRenderer from '../common/MarkdownRenderer';
import { useSpeechSynthesis } from '../../hooks/useAudio';

const MessageBubble = memo(function MessageBubble({ message, isStreaming }) {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);
  const isUser = message.role === 'user';

  const { speak, stop, isSpeaking, isSupported: isTtsSupported } = useSpeechSynthesis();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (isSpeaking) {
      stop();
    } else {
      speak(message.content);
    }
  };

  return (
    <Box
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
          width: 34,
          height: 34,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          mt: 0.5,
          background: isUser
            ? `linear-gradient(135deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.dark})`
            : `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
        }}
      >
        {isUser ? (
          <PersonIcon sx={{ fontSize: 18, color: '#fff' }} />
        ) : (
          <SmartToyIcon sx={{ fontSize: 18, color: '#fff' }} />
        )}
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
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
              {message.content}
            </Typography>
          ) : (
            <>
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

        {/* Actions */}
        <Box
          sx={{
            display: 'flex',
            gap: 0.5,
            mt: 1,
            opacity: hovered || isSpeaking ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
        >
          <Tooltip title={copied ? 'Copied!' : 'Copy'}>
            <IconButton
              size="small"
              onClick={handleCopy}
              sx={{
                color: 'text.secondary',
                '&:hover': { color: 'primary.main' },
              }}
            >
              {copied ? (
                <CheckIcon sx={{ fontSize: 16 }} />
              ) : (
                <ContentCopyIcon sx={{ fontSize: 16 }} />
              )}
            </IconButton>
          </Tooltip>

          {isTtsSupported && !isUser && (
            <Tooltip title={isSpeaking ? 'Stop reading' : 'Read aloud'}>
              <IconButton
                size="small"
                onClick={handleSpeak}
                sx={{
                  color: isSpeaking ? 'primary.main' : 'text.secondary',
                  '&:hover': { color: 'primary.main' },
                  ...(isSpeaking && {
                    animation: 'soundwave 1.2s ease-in-out infinite alternate',
                    '@keyframes soundwave': {
                      '0%': { transform: 'scale(1)' },
                      '100%': { transform: 'scale(1.15)', color: theme.palette.primary.light },
                    },
                  }),
                }}
              >
                {isSpeaking ? (
                  <VolumeOffIcon sx={{ fontSize: 16 }} />
                ) : (
                  <VolumeUpIcon sx={{ fontSize: 16 }} />
                )}
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
    </Box>
  );
});

export default MessageBubble;
