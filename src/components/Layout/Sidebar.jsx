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
  Collapse,
  Chip,
  FormControlLabel,
  Checkbox,
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
import DownloadIcon from '@mui/icons-material/Download';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import FolderIcon from '@mui/icons-material/Folder';
import StorageIcon from '@mui/icons-material/Storage';
import ConnectionStatus from '../common/ConnectionStatus';
import AppLogo from '../common/AppLogo';
import DeveloperBadge from '../common/DeveloperBadge';
import ProjectDialog from './ProjectDialog';
import MoveToProjectDialog from './MoveToProjectDialog';
import { useChatStore } from '../../store/chatContext';
import { showToast } from '../../utils/toast';

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

export default function Sidebar({
  onOpenSettings,
  onOpenShortcuts,
  onOpenGlobalSearch,
  onOpenModelManager,
  onCloseMobile,
}) {
  const theme = useTheme();
  const { state, dispatch } = useChatStore();

  // Context menu for conversations
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuConvoId, setMenuConvoId] = useState(null);

  // Context menu for projects
  const [projectMenuAnchor, setProjectMenuAnchor] = useState(null);
  const [activeProjectMenuId, setActiveProjectMenuId] = useState(null);

  // Rename conversation state
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  // Project Dialog (create / edit)
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  // Move to Project Dialog
  const [moveToProjectDialogOpen, setMoveToProjectDialogOpen] = useState(false);
  const [convoToMove, setConvoToMove] = useState(null);

  // Delete Project Confirmation Dialog
  const [deleteProjectDialogOpen, setDeleteProjectDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [deleteWithChats, setDeleteWithChats] = useState(false);

  // Delete Conversation Confirmation Dialog
  const [deleteConvoDialogOpen, setDeleteConvoDialogOpen] = useState(false);
  const [convoToDelete, setConvoToDelete] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');

  const projects = useMemo(() => state.projects || [], [state.projects]);

  // Filter conversations by search
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return state.conversations;
    const query = searchQuery.toLowerCase();
    return state.conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(query) ||
        c.messages.some((m) => m.content.toLowerCase().includes(query))
    );
  }, [state.conversations, searchQuery]);

  // Map conversations to pinned, projects and general (unassigned)
  const { pinnedConversations, projectMap, generalConversations } = useMemo(() => {
    const validProjectIds = new Set(projects.map((p) => p.id));
    const pMap = {};
    projects.forEach((p) => {
      pMap[p.id] = [];
    });

    const pinned = [];
    const general = [];
    filteredConversations.forEach((c) => {
      if (c.isPinned) {
        pinned.push(c);
      } else if (c.projectId && validProjectIds.has(c.projectId)) {
        pMap[c.projectId].push(c);
      } else {
        general.push(c);
      }
    });

    return { pinnedConversations: pinned, projectMap: pMap, generalConversations: general };
  }, [projects, filteredConversations]);

  const groupedGeneralConversations = useMemo(
    () => groupByDate(generalConversations),
    [generalConversations]
  );

  const handleNewChat = () => {
    dispatch({ type: 'NEW_CONVERSATION' });
    onCloseMobile?.();
  };

  const handleNewChatInProject = (projectId) => {
    dispatch({ type: 'NEW_CONVERSATION', payload: { projectId } });
    onCloseMobile?.();
  };

  const handleSelectConvo = (id) => {
    dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: id });
    onCloseMobile?.();
  };

  const handleToggleProject = (projectId) => {
    dispatch({ type: 'TOGGLE_PROJECT_EXPAND', payload: { id: projectId } });
  };

  // Conversation menu handlers
  const handleMenuOpen = (e, id) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
    setMenuConvoId(id);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuConvoId(null);
  };

  const handleTogglePin = () => {
    if (menuConvoId) {
      const convo = state.conversations.find((c) => c.id === menuConvoId);
      dispatch({ type: 'TOGGLE_PIN_CONVERSATION', payload: menuConvoId });
      showToast(convo?.isPinned ? 'Chat unpinned' : 'Chat pinned to top', 'info');
    }
    handleMenuClose();
  };

  const handleDeleteConvoStart = () => {
    const convo = state.conversations.find((c) => c.id === menuConvoId);
    if (convo) {
      setConvoToDelete(convo);
      setDeleteConvoDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleConfirmDeleteConvo = () => {
    if (convoToDelete) {
      dispatch({ type: 'DELETE_CONVERSATION', payload: convoToDelete.id });
      showToast('Conversation deleted', 'info');
    }
    setDeleteConvoDialogOpen(false);
    setConvoToDelete(null);
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
      showToast('Conversation renamed', 'success');
    }
    setRenameOpen(false);
    setMenuConvoId(null);
  };

  const handleOpenMoveToProject = () => {
    const convo = state.conversations.find((c) => c.id === menuConvoId);
    if (convo) {
      setConvoToMove(convo);
      setMoveToProjectDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleAssignProject = (convoId, targetProjectId) => {
    dispatch({
      type: 'ASSIGN_TO_PROJECT',
      payload: { conversationId: convoId, projectId: targetProjectId },
    });
    const targetProj = projects.find((p) => p.id === targetProjectId);
    showToast(targetProj ? `Moved to "${targetProj.name}"` : 'Moved to General Chats', 'success');
  };

  // Project menu handlers
  const handleProjectMenuOpen = (e, id) => {
    e.stopPropagation();
    setProjectMenuAnchor(e.currentTarget);
    setActiveProjectMenuId(id);
  };

  const handleProjectMenuClose = () => {
    setProjectMenuAnchor(null);
    setActiveProjectMenuId(null);
  };

  const handleEditProjectStart = () => {
    const proj = projects.find((p) => p.id === activeProjectMenuId);
    if (proj) {
      setEditingProject(proj);
      setProjectDialogOpen(true);
    }
    handleProjectMenuClose();
  };

  const handleDeleteProjectStart = () => {
    const proj = projects.find((p) => p.id === activeProjectMenuId);
    if (proj) {
      setProjectToDelete(proj);
      setDeleteWithChats(false);
      setDeleteProjectDialogOpen(true);
    }
    handleProjectMenuClose();
  };

  const handleConfirmDeleteProject = () => {
    if (projectToDelete) {
      dispatch({
        type: 'DELETE_PROJECT',
        payload: { id: projectToDelete.id, deleteConversations: deleteWithChats },
      });
      showToast(`Project "${projectToDelete.name}" deleted`, 'info');
    }
    setDeleteProjectDialogOpen(false);
    setProjectToDelete(null);
  };

  const handleSaveProject = ({ name, color }) => {
    if (editingProject) {
      dispatch({
        type: 'UPDATE_PROJECT',
        payload: { id: editingProject.id, name, color },
      });
      showToast('Project updated', 'success');
    } else {
      dispatch({
        type: 'CREATE_PROJECT',
        payload: { name, color },
      });
      showToast(`Project "${name}" created`, 'success');
    }
    setEditingProject(null);
  };

  const handleExportMarkdown = () => {
    const convo = state.conversations.find((c) => c.id === menuConvoId);
    if (!convo || convo.messages.length === 0) {
      handleMenuClose();
      return;
    }
    let md = `# ${convo.title || 'Chat'}\n\n`;
    md += `*Exported on ${new Date().toLocaleString()} · Model: ${convo.model || 'Unknown'}*\n\n---\n\n`;
    convo.messages.forEach((m) => {
      const roleName = m.role === 'user' ? '👤 **You**' : '🤖 **Assistant**';
      md += `### ${roleName}\n\n${m.content}\n\n`;
      if (m.metrics) {
        md += `*⚡ ${m.metrics.tokPerSec} tok/s · ${m.metrics.evalCount} tokens (${m.metrics.duration}s)*\n\n`;
      }
      md += `---\n\n`;
    });
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(convo.title || 'chat').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Chat exported as Markdown', 'success');
    handleMenuClose();
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
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <AppLogo size={32} showDeveloper={true} />
        <Tooltip title="New chat (Cmd+K)">
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
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment: onOpenGlobalSearch ? (
                <InputAdornment position="end">
                  <Tooltip title="Full-text search across all chats (Cmd+Shift+F)">
                    <Chip
                      label="⌘⇧F"
                      size="small"
                      onClick={onOpenGlobalSearch}
                      sx={{
                        height: 20,
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        cursor: 'pointer',
                        bgcolor: alpha(theme.palette.text.primary, 0.06),
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.15),
                          color: 'primary.main',
                        },
                      }}
                    />
                  </Tooltip>
                </InputAdornment>
              ) : null,
            },
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

      {/* Main Scrollable Tree */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 1, py: 1 }}>
        {/* PINNED SECTION */}
        {pinnedConversations.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box
              sx={{
                px: 1.5,
                py: 0.75,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <PushPinIcon
                sx={{
                  fontSize: 14,
                  color: 'primary.main',
                  transform: 'rotate(45deg)',
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Pinned
              </Typography>
              <Chip
                label={pinnedConversations.length}
                size="small"
                sx={{ height: 16, fontSize: '0.65rem', fontWeight: 600, px: 0.2 }}
              />
            </Box>

            <List dense disablePadding>
              {pinnedConversations.map((convo) => {
                const convoProject = convo.projectId
                  ? projects.find((p) => p.id === convo.projectId)
                  : null;
                const isSelected = convo.id === state.activeConversationId;

                return (
                  <ListItemButton
                    key={convo.id}
                    selected={isSelected}
                    onClick={() => handleSelectConvo(convo.id)}
                    sx={{
                      borderRadius: 2,
                      mb: 0.25,
                      py: 0.75,
                      px: 1.25,
                      '&.Mui-selected': {
                        bgcolor: alpha(theme.palette.primary.main, 0.14),
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.2),
                        },
                      },
                      '&:hover': {
                        bgcolor: alpha(theme.palette.text.primary, 0.04),
                        '& .convo-menu-btn': { opacity: 1 },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 26 }}>
                      <PushPinIcon
                        sx={{
                          fontSize: 14,
                          color: isSelected ? 'primary.main' : 'text.secondary',
                          transform: 'rotate(45deg)',
                        }}
                      />
                    </ListItemIcon>
                    <ListItemText>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Typography
                          noWrap
                          variant="body2"
                          sx={{
                            fontSize: '0.84rem',
                            fontWeight: isSelected ? 600 : 500,
                          }}
                        >
                          {convo.title}
                        </Typography>
                        {convoProject && (
                          <Tooltip title={`Project: ${convoProject.name}`}>
                            <Box
                              sx={{
                                width: 7,
                                height: 7,
                                borderRadius: '50%',
                                bgcolor: convoProject.color || '#6366f1',
                                flexShrink: 0,
                              }}
                            />
                          </Tooltip>
                        )}
                      </Box>
                    </ListItemText>
                    <IconButton
                      className="convo-menu-btn"
                      size="small"
                      onClick={(e) => handleMenuOpen(e, convo.id)}
                      sx={{ ml: 0.5, p: 0.25, opacity: 0, transition: 'opacity 0.15s' }}
                    >
                      <MoreHorizIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </ListItemButton>
                );
              })}
            </List>
            <Divider sx={{ my: 1.5 }} />
          </Box>
        )}

        {/* PROJECTS SECTION */}
        <Box sx={{ mb: 2 }}>
          <Box
            sx={{
              px: 1.5,
              py: 0.75,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Projects
              </Typography>
              {projects.length > 0 && (
                <Chip
                  label={projects.length}
                  size="small"
                  sx={{ height: 16, fontSize: '0.65rem', fontWeight: 600, px: 0.2 }}
                />
              )}
            </Box>
            <Tooltip title="Create new project folder">
              <IconButton
                size="small"
                onClick={() => {
                  setEditingProject(null);
                  setProjectDialogOpen(true);
                }}
                sx={{
                  p: 0.5,
                  color: 'text.secondary',
                  '&:hover': { color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.1) },
                }}
              >
                <CreateNewFolderIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Project Folders List */}
          {projects.length === 0 ? (
            <Box
              onClick={() => {
                setEditingProject(null);
                setProjectDialogOpen(true);
              }}
              sx={{
                mx: 1,
                my: 0.5,
                p: 1.25,
                borderRadius: 2,
                border: '1px dashed',
                borderColor: 'divider',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                },
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 500 }}>
                + New Project Folder
              </Typography>
            </Box>
          ) : (
            projects.map((project) => {
              const convosInProject = projectMap[project.id] || [];
              const isExpanded = searchQuery ? true : project.isExpanded !== false;
              const hasActiveConvo = convosInProject.some((c) => c.id === state.activeConversationId);

              return (
                <Box key={project.id} sx={{ mb: 0.5 }}>
                  {/* Folder Header Item */}
                  <ListItemButton
                    onClick={() => handleToggleProject(project.id)}
                    sx={{
                      borderRadius: 2,
                      py: 0.75,
                      px: 1,
                      bgcolor: hasActiveConvo ? alpha(project.color || '#6366f1', 0.06) : 'transparent',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.text.primary, 0.04),
                        '& .project-actions': { opacity: 1 },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 24, mr: 0.75 }}>
                      {isExpanded ? (
                        <ExpandMoreIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                      ) : (
                        <ChevronRightIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                      )}
                    </ListItemIcon>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: project.color || '#6366f1',
                        mr: 1.25,
                        flexShrink: 0,
                      }}
                    />
                    <ListItemText
                      primary={
                        <Typography variant="body2" noWrap sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                          {project.name}
                        </Typography>
                      }
                    />
                    {convosInProject.length > 0 && (
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '0.7rem',
                          color: 'text.secondary',
                          fontWeight: 500,
                          mr: 0.5,
                        }}
                      >
                        {convosInProject.length}
                      </Typography>
                    )}
                    {/* Hover Actions: + (New Chat in project) and ... (Menu) */}
                    <Box className="project-actions" sx={{ display: 'flex', opacity: 0, transition: 'opacity 0.15s' }}>
                      <Tooltip title={`New chat in ${project.name}`}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNewChatInProject(project.id);
                          }}
                          sx={{ p: 0.25, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                        >
                          <AddIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      <IconButton
                        size="small"
                        onClick={(e) => handleProjectMenuOpen(e, project.id)}
                        sx={{ p: 0.25, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                      >
                        <MoreHorizIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  </ListItemButton>

                  {/* Project Conversations (Collapsed / Expanded) */}
                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <List dense disablePadding sx={{ pl: 2.5 }}>
                      {convosInProject.length === 0 ? (
                        <Typography
                          variant="caption"
                          sx={{
                            py: 0.75,
                            px: 1.5,
                            color: 'text.secondary',
                            fontStyle: 'italic',
                            display: 'block',
                            fontSize: '0.75rem',
                          }}
                        >
                          No chats yet. Click + to add.
                        </Typography>
                      ) : (
                        convosInProject.map((convo) => (
                          <ListItemButton
                            key={convo.id}
                            selected={convo.id === state.activeConversationId}
                            onClick={() => handleSelectConvo(convo.id)}
                            sx={{
                              borderRadius: 2,
                              mb: 0.25,
                              py: 0.75,
                              px: 1.25,
                              '&.Mui-selected': {
                                bgcolor: alpha(project.color || theme.palette.primary.main, 0.14),
                                '&:hover': {
                                  bgcolor: alpha(project.color || theme.palette.primary.main, 0.2),
                                },
                              },
                              '&:hover': {
                                bgcolor: alpha(theme.palette.text.primary, 0.04),
                                '& .convo-menu-btn': { opacity: 1 },
                              },
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 26 }}>
                              <ChatBubbleOutlineIcon
                                sx={{
                                  fontSize: 15,
                                  color: convo.id === state.activeConversationId ? (project.color || 'primary.main') : 'text.secondary',
                                }}
                              />
                            </ListItemIcon>
                            <ListItemText>
                              <Typography
                                noWrap
                                variant="body2"
                                sx={{
                                  fontSize: '0.82rem',
                                  fontWeight: convo.id === state.activeConversationId ? 600 : 400,
                                }}
                              >
                                {convo.title}
                              </Typography>
                            </ListItemText>
                            <IconButton
                              className="convo-menu-btn"
                              size="small"
                              onClick={(e) => handleMenuOpen(e, convo.id)}
                              sx={{ ml: 0.5, p: 0.25, opacity: 0, transition: 'opacity 0.15s' }}
                            >
                              <MoreHorizIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </ListItemButton>
                        ))
                      )}
                    </List>
                  </Collapse>
                </Box>
              );
            })
          )}
        </Box>

        <Divider sx={{ my: 1.5 }} />

        {/* GENERAL CHATS SECTION */}
        <Box>
          <Typography
            variant="caption"
            sx={{
              px: 1.5,
              py: 0.75,
              display: 'block',
              color: 'text.secondary',
              fontWeight: 700,
              fontSize: '0.7rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            General Chats
          </Typography>

          {groupedGeneralConversations.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 2.5, px: 2 }}>
              <Typography variant="caption" color="text.secondary">
                {projects.length > 0 ? 'No general chats' : 'No conversations yet'}
              </Typography>
            </Box>
          ) : (
            groupedGeneralConversations.map(([group, convos]) => (
              <Box key={group} sx={{ mb: 1 }}>
                <Typography
                  variant="caption"
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    display: 'block',
                    color: 'text.secondary',
                    fontWeight: 600,
                    fontSize: '0.68rem',
                    opacity: 0.8,
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
                        mb: 0.25,
                        py: 0.75,
                        px: 1.5,
                        '&.Mui-selected': {
                          bgcolor: alpha(theme.palette.primary.main, 0.12),
                          '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.18),
                          },
                        },
                        '&:hover': {
                          bgcolor: alpha(theme.palette.text.primary, 0.04),
                          '& .convo-menu-btn': { opacity: 1 },
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 28 }}>
                        <ChatBubbleOutlineIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      </ListItemIcon>
                      <ListItemText>
                        <Typography
                          noWrap
                          variant="body2"
                          sx={{
                            fontSize: '0.84rem',
                            fontWeight: convo.id === state.activeConversationId ? 600 : 400,
                          }}
                        >
                          {convo.title}
                        </Typography>
                      </ListItemText>
                      <IconButton
                        className="convo-menu-btn"
                        size="small"
                        onClick={(e) => handleMenuOpen(e, convo.id)}
                        sx={{ ml: 0.5, p: 0.25, opacity: 0, transition: 'opacity 0.15s' }}
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
      </Box>

      {/* Footer */}
      <Divider />
      <Box sx={{ p: 1.5, pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <ConnectionStatus />
          {state.settings?.memoryStorageMode === 'local_folder' && (
            <Tooltip
              title={`Memory Path: ${state.settings?.memoryDirectoryName || state.settings?.customMemoryPath || 'Local Folder'} · Click to configure`}
            >
              <Chip
                icon={<FolderIcon sx={{ fontSize: '13px !important', color: 'primary.main !important' }} />}
                label={state.settings?.memoryDirectoryName || state.settings?.customMemoryPath || 'Folder'}
                size="small"
                onClick={() => onOpenSettings?.(5)}
                sx={{
                  maxWidth: 95,
                  height: 22,
                  fontSize: '0.67rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  border: '1px solid',
                  borderColor: alpha(theme.palette.primary.main, 0.25),
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.16),
                  },
                }}
              />
            </Tooltip>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          {onOpenGlobalSearch && (
            <Tooltip title="Search All Chats (Cmd+Shift+F)">
              <IconButton
                onClick={onOpenGlobalSearch}
                size="small"
                sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
              >
                <SearchIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {onOpenModelManager && (
            <Tooltip title="Ollama Model Manager (Cmd+Shift+M)">
              <IconButton
                onClick={onOpenModelManager}
                size="small"
                sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
              >
                <StorageIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {onOpenShortcuts && (
            <Tooltip title="Keyboard shortcuts (Cmd+/)">
              <IconButton
                onClick={onOpenShortcuts}
                size="small"
                sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
              >
                <KeyboardIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Settings (Cmd+,)">
            <IconButton
              onClick={() => onOpenSettings?.(0)}
              size="small"
              sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Developer Watermark */}
      <Box sx={{ px: 2, pb: 1.5, display: 'flex', justifyContent: 'center' }}>
        <DeveloperBadge variant="watermark" />
      </Box>

      {/* Conversation Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2.5,
              minWidth: 170,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: 8,
            },
          },
        }}
      >
        {(() => {
          const currentMenuConvo = state.conversations.find((c) => c.id === menuConvoId);
          const isPinned = Boolean(currentMenuConvo?.isPinned);
          return (
            <MenuItem onClick={handleTogglePin}>
              {isPinned ? (
                <PushPinOutlinedIcon sx={{ fontSize: 17, mr: 1.5, color: 'text.secondary' }} />
              ) : (
                <PushPinIcon
                  sx={{
                    fontSize: 17,
                    mr: 1.5,
                    color: 'primary.main',
                    transform: 'rotate(45deg)',
                  }}
                />
              )}
              <Typography variant="body2">
                {isPinned ? 'Unpin from Top' : 'Pin to Top'}
              </Typography>
            </MenuItem>
          );
        })()}
        <MenuItem onClick={handleOpenMoveToProject}>
          <DriveFileMoveIcon sx={{ fontSize: 17, mr: 1.5, color: 'text.secondary' }} />
          <Typography variant="body2">Move to Project...</Typography>
        </MenuItem>
        <MenuItem onClick={handleRenameStart}>
          <EditIcon sx={{ fontSize: 17, mr: 1.5, color: 'text.secondary' }} />
          <Typography variant="body2">Rename</Typography>
        </MenuItem>
        <MenuItem onClick={handleExportMarkdown}>
          <DownloadIcon sx={{ fontSize: 17, mr: 1.5, color: 'text.secondary' }} />
          <Typography variant="body2">Export Markdown</Typography>
        </MenuItem>
        <MenuItem onClick={handleDeleteConvoStart} sx={{ color: 'error.main' }}>
          <DeleteOutlineIcon sx={{ fontSize: 17, mr: 1.5 }} />
          <Typography variant="body2">Delete Chat</Typography>
        </MenuItem>
      </Menu>

      {/* Project Context Menu */}
      <Menu
        anchorEl={projectMenuAnchor}
        open={Boolean(projectMenuAnchor)}
        onClose={handleProjectMenuClose}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2.5,
              minWidth: 180,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: 8,
            },
          },
        }}
      >
        <MenuItem
          onClick={() => {
            if (activeProjectMenuId) handleNewChatInProject(activeProjectMenuId);
            handleProjectMenuClose();
          }}
        >
          <AddIcon sx={{ fontSize: 17, mr: 1.5, color: 'text.secondary' }} />
          <Typography variant="body2">New Chat in Project</Typography>
        </MenuItem>
        <MenuItem onClick={handleEditProjectStart}>
          <EditIcon sx={{ fontSize: 17, mr: 1.5, color: 'text.secondary' }} />
          <Typography variant="body2">Edit Project</Typography>
        </MenuItem>
        <MenuItem onClick={handleDeleteProjectStart} sx={{ color: 'error.main' }}>
          <DeleteOutlineIcon sx={{ fontSize: 17, mr: 1.5 }} />
          <Typography variant="body2">Delete Project</Typography>
        </MenuItem>
      </Menu>

      {/* Rename Conversation Dialog */}
      <Dialog
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>Rename Conversation</DialogTitle>
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
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setRenameOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleRenameSave} variant="contained" disableElevation>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Project Creation / Edit Dialog */}
      <ProjectDialog
        open={projectDialogOpen}
        onClose={() => {
          setProjectDialogOpen(false);
          setEditingProject(null);
        }}
        project={editingProject}
        onSave={handleSaveProject}
      />

      {/* Move Conversation to Project Dialog */}
      <MoveToProjectDialog
        open={moveToProjectDialogOpen}
        onClose={() => {
          setMoveToProjectDialogOpen(false);
          setConvoToMove(null);
        }}
        conversation={convoToMove}
        projects={projects}
        onSelectProject={handleAssignProject}
        onCreateNewProject={() => {
          setEditingProject(null);
          setProjectDialogOpen(true);
        }}
      />

      {/* Delete Project Confirmation Dialog */}
      <Dialog
        open={deleteProjectDialogOpen}
        onClose={() => setDeleteProjectDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>
          Delete Project &ldquo;{projectToDelete?.name}&rdquo;?
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            What would you like to do with the conversations in this project?
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={deleteWithChats}
                onChange={(e) => setDeleteWithChats(e.target.checked)}
                color="error"
              />
            }
            label={
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Also delete all conversations in this project
              </Typography>
            }
          />
          {!deleteWithChats && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Conversations will be kept and moved to General Chats.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteProjectDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDeleteProject}
            variant="contained"
            color="error"
            disableElevation
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Conversation Confirmation Dialog */}
      <Dialog
        open={deleteConvoDialogOpen}
        onClose={() => setDeleteConvoDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>
          Delete Conversation?
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to delete &ldquo;<strong>{convoToDelete?.title || 'this conversation'}</strong>&rdquo;? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteConvoDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDeleteConvo}
            variant="contained"
            color="error"
            disableElevation
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

