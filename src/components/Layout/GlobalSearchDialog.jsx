/**
 * Global Conversation Search Dialog for LocalLLMMind
 * Full-screen search across all conversations with highlighted snippets.
 * Cmd+Shift+F opens this dialog.
 * Engineered by Kapil Kumar Yadav
 */
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  TextField,
  InputAdornment,
  Chip,
  List,
  ListItemButton,
  alpha,
  useTheme,
} from '@mui/material';
import {
  X,
  Search,
  Bot,
  User,
  MessageSquare,
} from 'lucide-react';
import { useChatStore } from '../../store/chatContext';

function highlightMatch(text, query) {
  if (!query || !text) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <Box
        component="mark"
        sx={{
          bgcolor: 'warning.light',
          color: 'warning.contrastText',
          borderRadius: 0.5,
          px: 0.25,
          fontWeight: 700,
        }}
      >
        {text.slice(idx, idx + query.length)}
      </Box>
      {text.slice(idx + query.length)}
    </>
  );
}

function getSnippet(content, query, contextChars = 80) {
  if (!query || !content) return content?.slice(0, 160) || '';
  const idx = content.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return content.slice(0, 160);
  const start = Math.max(0, idx - contextChars);
  const end = Math.min(content.length, idx + query.length + contextChars);
  let snippet = content.slice(start, end);
  if (start > 0) snippet = '…' + snippet;
  if (end < content.length) snippet += '…';
  return snippet;
}

export default function GlobalSearchDialog({ open, onClose }) {
  const theme = useTheme();
  const { state, dispatch } = useChatStore();
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      setQuery('');
    }
  }, [open]);

  // Search results: grouped by conversation
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q || q.length < 2) return [];

    const matches = [];
    for (const convo of state.conversations) {
      const convoMatches = [];

      // Check title match
      const titleMatch = convo.title?.toLowerCase().includes(q);

      // Check message matches
      for (let i = 0; i < convo.messages.length; i++) {
        const msg = convo.messages[i];
        if (msg.content?.toLowerCase().includes(q)) {
          convoMatches.push({
            messageIndex: i,
            role: msg.role,
            snippet: getSnippet(msg.content, q),
            timestamp: msg.timestamp,
          });
        }
      }

      if (titleMatch || convoMatches.length > 0) {
        matches.push({
          conversation: convo,
          titleMatch,
          messages: convoMatches,
          totalMatches: convoMatches.length + (titleMatch ? 1 : 0),
        });
      }
    }

    // Sort by most matches first
    matches.sort((a, b) => b.totalMatches - a.totalMatches);
    return matches;
  }, [query, state.conversations]);

  const totalMatchCount = results.reduce((acc, r) => acc + r.totalMatches, 0);

  const handleSelectResult = useCallback(
    (conversationId, messageIndex) => {
      dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: conversationId });
      onClose();

      // Scroll to the matched message after a brief delay for render
      if (messageIndex !== undefined) {
        setTimeout(() => {
          const el = document.getElementById(`chat-turn-${messageIndex}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Flash highlight
            el.style.transition = 'background 0.3s ease';
            el.style.background = alpha(theme.palette.warning.main, 0.15);
            setTimeout(() => {
              el.style.background = 'transparent';
            }, 2000);
          }
        }, 300);
      }
    },
    [dispatch, onClose, theme]
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
            borderRadius: 4,
            maxHeight: '80vh',
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
          pb: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'primary.main',
              color: '#fff',
            }}
          >
            <Search size={18} />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              Search All Conversations
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {state.conversations.length} conversations · {totalMatchCount > 0 ? `${totalMatchCount} matches found` : 'Type to search'}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Chip label="⌘⇧F" size="small" sx={{ fontSize: '0.68rem', fontWeight: 700, fontFamily: 'monospace', height: 22 }} />
          <IconButton size="small" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </Box>
      </DialogTitle>

      <Box sx={{ px: 3, pb: 2 }}>
        <TextField
          inputRef={inputRef}
          fullWidth
          size="small"
          placeholder="Search across all conversations, messages, and titles..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} color={theme.palette.text.secondary} />
                </InputAdornment>
              ),
              endAdornment: query && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setQuery('')}>
                    <X size={15} />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              fontSize: '0.95rem',
            },
          }}
        />
      </Box>

      <DialogContent sx={{ pt: 0, px: 3, pb: 3 }}>
        {query.length < 2 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Search size={40} color={theme.palette.text.disabled} style={{ marginBottom: 8 }} />
            <Typography color="text.secondary">
              Type at least 2 characters to search
            </Typography>
          </Box>
        ) : results.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography color="text.secondary">
              No results found for "<strong>{query}</strong>"
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {results.map((result) => (
              <Box
                key={result.conversation.id}
                sx={{
                  mb: 2,
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  overflow: 'hidden',
                }}
              >
                {/* Conversation Header */}
                <ListItemButton
                  onClick={() => handleSelectResult(result.conversation.id)}
                  sx={{
                    px: 2,
                    py: 1.25,
                    bgcolor: alpha(theme.palette.primary.main, 0.03),
                    borderBottom: result.messages.length > 0 ? '1px solid' : 'none',
                    borderColor: 'divider',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                    },
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                      <MessageSquare size={14} color={theme.palette.primary.main} />
                      <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.88rem' }} noWrap>
                        {result.titleMatch
                          ? highlightMatch(result.conversation.title, query)
                          : result.conversation.title}
                      </Typography>
                      <Chip
                        label={`${result.totalMatches} match${result.totalMatches > 1 ? 'es' : ''}`}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: 'primary.main',
                        }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {result.conversation.model && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          {result.conversation.model}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
                        · {result.conversation.messages.length} messages
                      </Typography>
                    </Box>
                  </Box>
                </ListItemButton>

                {/* Message Matches */}
                {result.messages.slice(0, 5).map((match, i) => (
                  <ListItemButton
                    key={i}
                    onClick={() =>
                      handleSelectResult(result.conversation.id, match.messageIndex)
                    }
                    sx={{
                      px: 2,
                      py: 1,
                      borderBottom:
                        i < Math.min(result.messages.length, 5) - 1
                          ? '1px solid'
                          : 'none',
                      borderColor: alpha(theme.palette.divider, 0.5),
                      '&:hover': {
                        bgcolor: alpha(theme.palette.warning.main, 0.04),
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', gap: 1.5, width: '100%', minWidth: 0 }}>
                      <Box sx={{ mt: 0.25, flexShrink: 0 }}>
                        {match.role === 'user' ? (
                          <User size={15} color={theme.palette.secondary.main} />
                        ) : (
                          <Bot size={15} color={theme.palette.primary.main} />
                        )}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'text.secondary',
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {match.role === 'user' ? 'You' : 'Assistant'} · msg #{match.messageIndex + 1}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: '0.82rem',
                            lineHeight: 1.5,
                            color: 'text.primary',
                            mt: 0.25,
                            wordBreak: 'break-word',
                          }}
                        >
                          {highlightMatch(match.snippet, query)}
                        </Typography>
                      </Box>
                    </Box>
                  </ListItemButton>
                ))}

                {result.messages.length > 5 && (
                  <Box
                    sx={{
                      px: 2,
                      py: 0.75,
                      bgcolor: alpha(theme.palette.text.primary, 0.02),
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      +{result.messages.length - 5} more match{result.messages.length - 5 > 1 ? 'es' : ''} in this conversation
                    </Typography>
                  </Box>
                )}
              </Box>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}
