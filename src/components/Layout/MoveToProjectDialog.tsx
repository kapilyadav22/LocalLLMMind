import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  alpha,
} from '@mui/material';
import {
  X,
  Folder,
  MessageSquare,
  Check,
  Plus,
} from 'lucide-react';

export default function MoveToProjectDialog({
  open,
  onClose,
  conversation,
  projects = [],
  onSelectProject,
  onCreateNewProject,
}) {
  if (!conversation) return null;

  const currentProjectId = conversation.projectId || null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3.5,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            p: 0.5,
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
          pb: 1,
          fontWeight: 700,
          fontSize: '1.05rem',
        }}
      >
        <Box>
          <Typography variant="h6" component="span" sx={{ fontWeight: 700, fontSize: '1.05rem', display: 'block' }}>
            Move to Project
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 280 }}>
            {conversation.title}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Close dialog">
          <X size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1, pb: 2, px: 2 }}>
        <List dense disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {/* Option: General Chats (No Project) */}
          <ListItemButton
            onClick={() => {
              onSelectProject(conversation.id, null);
              onClose();
            }}
            sx={{
              borderRadius: 2.5,
              py: 1,
              px: 1.5,
              bgcolor: currentProjectId === null ? (theme) => alpha(theme.palette.primary.main, 0.1) : 'transparent',
              border: '1px solid',
              borderColor: currentProjectId === null ? 'primary.main' : 'transparent',
            }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              <MessageSquare size={16} color="var(--mui-palette-text-secondary, #71717a)" />
            </ListItemIcon>
            <ListItemText
              primary="General (No Project)"
              slotProps={{
                primary: {
                  variant: 'body2',
                  sx: { fontWeight: currentProjectId === null ? 600 : 400 },
                },
              }}
            />
            {currentProjectId === null && <Check size={16} color="var(--mui-palette-primary-main, #3b82f6)" />}
          </ListItemButton>

          {/* Project options */}
          {projects.map((project) => {
            const isSelected = currentProjectId === project.id;
            return (
              <ListItemButton
                key={project.id}
                onClick={() => {
                  onSelectProject(conversation.id, project.id);
                  onClose();
                }}
                sx={{
                  borderRadius: 2.5,
                  py: 1,
                  px: 1.5,
                  bgcolor: isSelected ? alpha(project.color || '#6366f1', 0.12) : 'transparent',
                  border: '1px solid',
                  borderColor: isSelected ? (project.color || '#6366f1') : 'transparent',
                  '&:hover': {
                    bgcolor: alpha(project.color || '#6366f1', 0.08),
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Folder size={16} color={project.color || 'var(--mui-palette-primary-main, #3b82f6)'} />
                </ListItemIcon>
                <ListItemText
                  primary={project.name}
                  slotProps={{
                    primary: {
                      variant: 'body2',
                      sx: { fontWeight: isSelected ? 600 : 400 },
                    },
                  }}
                />
                {isSelected && <Check size={16} color={project.color || 'var(--mui-palette-primary-main, #3b82f6)'} />}
              </ListItemButton>
            );
          })}
        </List>

        {/* Create new project shortcut */}
        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            fullWidth
            startIcon={<Plus size={16} />}
            onClick={() => {
              onClose();
              onCreateNewProject?.();
            }}
            sx={{
              borderRadius: 2.5,
              textTransform: 'none',
              justifyContent: 'flex-start',
              color: 'primary.main',
            }}
          >
            Create New Project...
          </Button>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, pb: 2 }}>
        <Button onClick={onClose} color="inherit" sx={{ borderRadius: 2 }}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}
