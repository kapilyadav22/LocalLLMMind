import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  alpha,
  useTheme,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlined';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditIcon from '@mui/icons-material/Edit';
import SettingsIcon from '@mui/icons-material/Settings';
import SearchIcon from '@mui/icons-material/Search';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ConnectionStatus from '../common/ConnectionStatus';
import { useChatStore } from '../../store/chatStore';

function groupByDate(conversations) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const last7Days = new Date(today.getTime() - 7 * 86400000);
  const last30Days = new Date(today.getTime() - 30 * 86400000);

  const groups = {
    Today: [],
    Yesterday: [],
    'Previous 7 Days': [],
    'Previous 30 Days': [],
    Older: [],
  };

  conversations.forEach((c) => {
    const date = new Date(c.updatedAt || c.createdAt);
    if (date >= today) groups.Today.push(c);
    else if (date >= yesterday) groups.Yesterday.push(c);
    else if (date >= last7Days) groups['Previous 7 Days'].push(c);
    else if (date >= last30Days) groups['Previous 30 Days'].push(c);
    else groups.Older.push(c);
  });

  return Object.entries(groups).filter(([, items]) => items.length > 0);
}

export default function Sidebar({ onOpenSettings }) {
  const theme = useTheme();
  const { state, dispatch } = useChatStore();
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuConvoId, setMenuConvoId] = useState(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return state.conversations;
    const query = searchQuery.toLowerCase();
    return state.conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(query) ||
        c.messages.some((m) => m.content.toLowerCase().includes(query))
    );
  }, [state.conversations, searchQuery]);

  const groupedConversations = useMemo(
    () => groupByDate(filteredConversations),
    [filteredConversations]
  );

  const handleNewChat = () => {
    dispatch({ type: 'NEW_CONVERSATION' });
  };

  const handleSelectConvo = (id) => {
    dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: id });
  };

  const handleMenuOpen = (e, id) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
    setMenuConvoId(id);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuConvoId(null);
  };

  const handleDelete = () => {
    if (menuConvoId) {
      dispatch({ type: 'DELETE_CONVERSATION', payload: menuConvoId });
    }
    handleMenuClose();
  };

  const handleRenameStart = () => {
    const convo = state.conversations.find((c) => c.id === menuConvoId);
    if (convo) {
      setRenameValue(convo.title);
      setRenameOpen(true);
    }
    handleMenuClose();
  };

  const handleRenameSave = () => {
    if (menuConvoId && renameValue.trim()) {
      dispatch({
        type: 'RENAME_CONVERSATION',
        payload: { id: menuConvoId, title: renameValue.trim() },
      });
    }
    setRenameOpen(false);
    setMenuConvoId(null);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: alpha(theme.palette.background.paper, 0.6),
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          }}
        >
          <SmartToyIcon sx={{ fontSize: 18, color: '#fff' }} />
        </Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
          LLM Chat
        </Typography>
        <Tooltip title="New chat">
          <IconButton
            onClick={handleNewChat}
            size="small"
            sx={{
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: 'primary.main',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.2),
              },
            }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Search Bar */}
      <Box sx={{ px: 2, pb: 2 }}>
        <TextField
          size="small"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              bgcolor: alpha(theme.palette.background.default, 0.4),
              '& fieldset': {
                borderColor: 'divider',
              },
              '&:hover fieldset': {
                borderColor: 'primary.main',
              },
            },
            '& .MuiInputBase-input': {
              fontSize: '0.85rem',
            },
          }}
        />
      </Box>

      <Divider />

      {/* Chat list */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 1, py: 1 }}>
        {groupedConversations.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
            <ChatBubbleOutlineIcon sx={{ fontSize: 40, color: 'text.secondary', opacity: 0.3, mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No conversations yet
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Start a new chat to begin
            </Typography>
          </Box>
        ) : (
          groupedConversations.map(([group, convos]) => (
            <Box key={group}>
              <Typography
                variant="caption"
                sx={{
                  px: 1.5,
                  py: 1,
                  display: 'block',
                  color: 'text.secondary',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {group}
              </Typography>
              <List dense disablePadding>
                {convos.map((convo) => (
                  <ListItemButton
                    key={convo.id}
                    selected={convo.id === state.activeConversationId}
                    onClick={() => handleSelectConvo(convo.id)}
                    sx={{
                      borderRadius: 2,
                      mb: 0.5,
                      py: 1,
                      px: 1.5,
                      '&.Mui-selected': {
                        bgcolor: alpha(theme.palette.primary.main, 0.12),
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.18),
                        },
                      },
                      '&:hover': {
                        bgcolor: alpha(theme.palette.text.primary, 0.04),
                      },
                      '& .convo-menu-btn': {
                        opacity: 0,
                        transition: 'opacity 0.15s',
                      },
                      '&:hover .convo-menu-btn': {
                        opacity: 1,
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <ChatBubbleOutlineIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    </ListItemIcon>
                     <ListItemText>
                       <Typography
                         noWrap
                         variant="body2"
                         sx={{ fontWeight: convo.id === state.activeConversationId ? 600 : 400 }}
                       >
                         {convo.title}
                       </Typography>
                     </ListItemText>
                    <IconButton
                      className="convo-menu-btn"
                      size="small"
                      onClick={(e) => handleMenuOpen(e, convo.id)}
                      sx={{ ml: 0.5 }}
                    >
                      <MoreHorizIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </ListItemButton>
                ))}
              </List>
            </Box>
          ))
        )}
      </Box>

      {/* Footer */}
      <Divider />
      <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <ConnectionStatus />
        <Tooltip title="Settings">
          <IconButton
            onClick={onOpenSettings}
            size="small"
            sx={{ color: 'text.secondary' }}
          >
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Context menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            borderRadius: 2,
            minWidth: 150,
            border: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        <MenuItem onClick={handleRenameStart}>
          <EditIcon sx={{ fontSize: 16, mr: 1.5, color: 'text.secondary' }} />
          <Typography variant="body2">Rename</Typography>
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteOutlineIcon sx={{ fontSize: 16, mr: 1.5 }} />
          <Typography variant="body2">Delete</Typography>
        </MenuItem>
      </Menu>

      {/* Rename dialog */}
      <Dialog
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Rename Conversation</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRenameSave()}
            size="small"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleRenameSave} variant="contained" disableElevation>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
