import { useState, useMemo, lazy, Suspense } from 'react';
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
import {
  Plus,
  PanelLeftClose,
  X,
  MessageSquare,
  MoreHorizontal,
  Trash2,
  Edit3,
  Settings as SettingsIconLucide,
  Search,
  Download,
  Keyboard,
  ChevronRight,
  ChevronDown,
  FolderPlus,
  FolderInput,
  Pin,
  PinOff,
  Folder,
  HardDrive,
  User,
} from 'lucide-react';
import ConnectionStatus from '../common/ConnectionStatus';
import AppLogo from '../common/AppLogo';
import DeveloperBadge from '../common/DeveloperBadge';
const ProjectDialog = lazy(() => import('./ProjectDialog'));
const MoveToProjectDialog = lazy(() => import('./MoveToProjectDialog'));
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
  onNavigateChat,
  onOpenSettings,
  onOpenShortcuts,
  onOpenGlobalSearch,
  onOpenModelManager,
  onOpenAboutMe,
  onCloseMobile,
  onToggleSidebar,
  isMobile = false,
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
    onNavigateChat?.();
    dispatch({ type: 'NEW_CONVERSATION' });
    onCloseMobile?.();
  };

  const handleNewChatInProject = (projectId) => {
    onNavigateChat?.();
    dispatch({ type: 'NEW_CONVERSATION', payload: { projectId } });
    onCloseMobile?.();
  };

  const handleSelectConvo = (id) => {
    onNavigateChat?.();
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
        bgcolor: 'background.paper',
        borderRight: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, pb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <AppLogo size={30} showDeveloper={true} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title="New chat (Cmd+K)">
            <IconButton
              onClick={handleNewChat}
              size="small"
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                color: 'primary.main',
                p: '6px',
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.16),
                },
              }}
            >
              <Plus size={15} />
            </IconButton>
          </Tooltip>
          <Tooltip title={isMobile ? 'Close sidebar' : 'Hide sidebar (Cmd+B)'}>
            <IconButton
              onClick={onToggleSidebar || onCloseMobile}
              size="small"
              aria-label={isMobile ? 'Close sidebar' : 'Hide sidebar'}
              sx={{
                color: 'text.secondary',
                bgcolor: alpha(theme.palette.text.primary, 0.04),
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1.5,
                p: '6px',
                '&:hover': {
                  color: 'text.primary',
                  bgcolor: alpha(theme.palette.text.primary, 0.08),
                },
              }}
            >
              {isMobile ? <X size={15} /> : <PanelLeftClose size={15} />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Search Bar */}
      <Box sx={{ px: 2, pb: 1.5 }}>
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
                  <Search size={15} color={theme.palette.text.secondary} />
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
                        fontWeight: 600,
                        fontFamily: 'monospace',
                        cursor: 'pointer',
                        bgcolor: alpha(theme.palette.text.primary, 0.06),
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.12),
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
              <Pin size={13} style={{ transform: 'rotate(45deg)', color: theme.palette.primary.main }} />
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 600,
                  fontSize: '0.68rem',
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
                      borderRadius: 1.5,
                      mb: 0.25,
                      py: 0.6,
                      px: 1,
                      '&.Mui-selected': {
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.16),
                        },
                      },
                      '&:hover': {
                        bgcolor: alpha(theme.palette.text.primary, 0.04),
                        '& .convo-menu-btn': { opacity: 1 },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 24 }}>
                      <Pin size={12} style={{ transform: 'rotate(45deg)', color: isSelected ? theme.palette.primary.main : theme.palette.text.secondary }} />
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
                      <MoreHorizontal size={14} />
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
                  '&:hover': { color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.08) },
                }}
              >
                <FolderPlus size={15} />
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
                borderRadius: 1.5,
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
                      borderRadius: 1.5,
                      py: 0.6,
                      px: 1,
                      bgcolor: hasActiveConvo ? alpha(project.color || theme.palette.primary.main, 0.05) : 'transparent',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.text.primary, 0.04),
                        '& .project-actions': { opacity: 1 },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 22, mr: 0.5 }}>
                      {isExpanded ? (
                        <ChevronDown size={14} color={theme.palette.text.secondary} />
                      ) : (
                        <ChevronRight size={14} color={theme.palette.text.secondary} />
                      )}
                    </ListItemIcon>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: project.color || theme.palette.primary.main,
                        mr: 1,
                        flexShrink: 0,
                      }}
                    />
                    <ListItemText
                      primary={
                        <Typography variant="body2" noWrap sx={{ fontWeight: 600, fontSize: '0.84rem' }}>
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
                          <Plus size={14} />
                        </IconButton>
                      </Tooltip>
                      <IconButton
                        size="small"
                        onClick={(e) => handleProjectMenuOpen(e, project.id)}
                        sx={{ p: 0.25, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                      >
                        <MoreHorizontal size={14} />
                      </IconButton>
                    </Box>
                  </ListItemButton>

                  {/* Project Conversations (Collapsed / Expanded) */}
                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <List dense disablePadding sx={{ pl: 2 }}>
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
                              borderRadius: 1.5,
                              mb: 0.25,
                              py: 0.6,
                              px: 1,
                              '&.Mui-selected': {
                                bgcolor: alpha(project.color || theme.palette.primary.main, 0.1),
                                '&:hover': {
                                  bgcolor: alpha(project.color || theme.palette.primary.main, 0.16),
                                },
                              },
                              '&:hover': {
                                bgcolor: alpha(theme.palette.text.primary, 0.04),
                                '& .convo-menu-btn': { opacity: 1 },
                              },
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 22 }}>
                              <MessageSquare
                                size={13}
                                color={convo.id === state.activeConversationId ? (project.color || theme.palette.primary.main) : theme.palette.text.secondary}
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
                              <MoreHorizontal size={14} />
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
                        borderRadius: 1.5,
                        mb: 0.25,
                        py: 0.6,
                        px: 1,
                        '&.Mui-selected': {
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.16),
                          },
                        },
                        '&:hover': {
                          bgcolor: alpha(theme.palette.text.primary, 0.04),
                          '& .convo-menu-btn': { opacity: 1 },
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 24 }}>
                        <MessageSquare size={13} color={convo.id === state.activeConversationId ? theme.palette.primary.main : theme.palette.text.secondary} />
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
                        <MoreHorizontal size={14} />
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
      <Box sx={{ p: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <ConnectionStatus />
          {state.settings?.memoryStorageMode === 'local_folder' && (
            <Tooltip
              title={`Memory Path: ${state.settings?.memoryDirectoryName || state.settings?.customMemoryPath || 'Local Folder'} · Click to configure`}
            >
              <Chip
                icon={<Folder size={11} color={theme.palette.primary.main} />}
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
          {onOpenGlobalSearch && (
            <Tooltip title="Search All Chats (Cmd+Shift+F)">
              <IconButton
                onClick={onOpenGlobalSearch}
                size="small"
                sx={{ color: 'text.secondary', p: '6px', '&:hover': { color: 'text.primary', bgcolor: alpha(theme.palette.text.primary, 0.06) } }}
              >
                <Search size={15} />
              </IconButton>
            </Tooltip>
          )}
          {onOpenModelManager && (
            <Tooltip title="Ollama Model Manager (Cmd+Shift+M)">
              <IconButton
                onClick={onOpenModelManager}
                size="small"
                sx={{ color: 'text.secondary', p: '6px', '&:hover': { color: 'text.primary', bgcolor: alpha(theme.palette.text.primary, 0.06) } }}
              >
                <HardDrive size={15} />
              </IconButton>
            </Tooltip>
          )}
          {onOpenShortcuts && (
            <Tooltip title="Keyboard shortcuts (Cmd+/)">
              <IconButton
                onClick={onOpenShortcuts}
                size="small"
                sx={{ color: 'text.secondary', p: '6px', '&:hover': { color: 'text.primary', bgcolor: alpha(theme.palette.text.primary, 0.06) } }}
              >
                <Keyboard size={15} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="About Me & Creator Profile">
            <IconButton
              onClick={() => (onOpenAboutMe ? onOpenAboutMe() : window.dispatchEvent(new CustomEvent('open-about-me')))}
              size="small"
              sx={{ color: 'text.secondary', p: '6px', '&:hover': { color: 'text.primary', bgcolor: alpha(theme.palette.text.primary, 0.06) } }}
            >
              <User size={15} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Settings (Cmd+,)">
            <IconButton
              onClick={() => onOpenSettings?.(0)}
              size="small"
              sx={{ color: 'text.secondary', p: '6px', '&:hover': { color: 'text.primary', bgcolor: alpha(theme.palette.text.primary, 0.06) } }}
            >
              <SettingsIconLucide size={15} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Developer Watermark */}
      <Box sx={{ px: 2, pb: 1, display: 'flex', justifyContent: 'center' }}>
        <DeveloperBadge variant="watermark" onClick={onOpenAboutMe} />
      </Box>

      {/* Conversation Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
              minWidth: 170,
              border: '1px solid',
              borderColor: 'divider',
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
                <PinOff size={15} style={{ marginRight: 10, color: theme.palette.text.secondary }} />
              ) : (
                <Pin
                  size={15}
                  style={{
                    marginRight: 10,
                    color: theme.palette.primary.main,
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
          <FolderInput size={15} style={{ marginRight: 10, color: theme.palette.text.secondary }} />
          <Typography variant="body2">Move to Project...</Typography>
        </MenuItem>
        <MenuItem onClick={handleRenameStart}>
          <Edit3 size={15} style={{ marginRight: 10, color: theme.palette.text.secondary }} />
          <Typography variant="body2">Rename</Typography>
        </MenuItem>
        <MenuItem onClick={handleExportMarkdown}>
          <Download size={15} style={{ marginRight: 10, color: theme.palette.text.secondary }} />
          <Typography variant="body2">Export Markdown</Typography>
        </MenuItem>
        <MenuItem onClick={handleDeleteConvoStart} sx={{ color: 'error.main' }}>
          <Trash2 size={15} style={{ marginRight: 10 }} />
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
              borderRadius: 2,
              minWidth: 180,
              border: '1px solid',
              borderColor: 'divider',
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
          <Plus size={15} style={{ marginRight: 10, color: theme.palette.text.secondary }} />
          <Typography variant="body2">New Chat in Project</Typography>
        </MenuItem>
        <MenuItem onClick={handleEditProjectStart}>
          <Edit3 size={15} style={{ marginRight: 10, color: theme.palette.text.secondary }} />
          <Typography variant="body2">Edit Project</Typography>
        </MenuItem>
        <MenuItem onClick={handleDeleteProjectStart} sx={{ color: 'error.main' }}>
          <Trash2 size={15} style={{ marginRight: 10 }} />
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
      {projectDialogOpen && (
        <Suspense fallback={null}>
          <ProjectDialog
            open={projectDialogOpen}
            onClose={() => {
              setProjectDialogOpen(false);
              setEditingProject(null);
            }}
            project={editingProject}
            onSave={handleSaveProject}
          />
        </Suspense>
      )}

      {/* Move Conversation to Project Dialog */}
      {moveToProjectDialogOpen && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

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

