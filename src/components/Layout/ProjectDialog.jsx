import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  IconButton,
  alpha,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FolderIcon from '@mui/icons-material/Folder';
import CheckIcon from '@mui/icons-material/Check';

const PROJECT_COLORS = [
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Violet', hex: '#8b5cf6' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Sky', hex: '#0ea5e9' },
];

export default function ProjectDialog({ open, onClose, project = null, onSave }) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [color, setColor] = useState(PROJECT_COLORS[0].hex);
  const isEditing = Boolean(project);

  useEffect(() => {
    if (open) {
      if (project) {
        setName(project.name || '');
        setColor(project.color || PROJECT_COLORS[0].hex);
      } else {
        setName('');
        setColor(PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)].hex);
      }
    }
  }, [open, project]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      color,
    });
    onClose();
  };

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
      <form onSubmit={handleSubmit}>
        <DialogTitle
          component="div"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 1,
            fontWeight: 700,
            fontSize: '1.1rem',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 2,
                bgcolor: alpha(color, 0.15),
                color: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
            >
              <FolderIcon sx={{ fontSize: 18 }} />
            </Box>
            <Typography variant="h6" component="span" sx={{ fontWeight: 700, fontSize: '1.05rem' }}>
              {isEditing ? 'Edit Project' : 'New Project'}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} aria-label="Close dialog">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 1.5, pb: 2 }}>
          {/* Project Name */}
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.75 }}>
            Project Name
          </Typography>
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder="e.g. Frontend Architecture, Research, Marketing"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{
              mb: 2.5,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2.5,
              },
            }}
          />

          {/* Color Selection */}
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 1 }}>
            Project Color
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, mb: 2 }}>
            {PROJECT_COLORS.map((c) => {
              const isSelected = color === c.hex;
              return (
                <Box
                  key={c.hex}
                  onClick={() => setColor(c.hex)}
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    bgcolor: c.hex,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    boxShadow: isSelected ? `0 0 0 3px ${theme.palette.background.paper}, 0 0 0 5px ${c.hex}` : 'none',
                    transform: isSelected ? 'scale(1.12)' : 'scale(1)',
                    '&:hover': {
                      transform: 'scale(1.15)',
                    },
                  }}
                  title={c.name}
                >
                  {isSelected && <CheckIcon sx={{ fontSize: 18 }} />}
                </Box>
              );
            })}
          </Box>

          {/* Live Preview */}
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2.5,
              bgcolor: alpha(color, 0.08),
              border: '1px dashed',
              borderColor: alpha(color, 0.35),
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
            }}
          >
            <FolderIcon sx={{ color, fontSize: 20 }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {name.trim() || 'Project Preview'}
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={onClose} color="inherit" sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!name.trim()}
            disableElevation
            sx={{
              borderRadius: 2,
              px: 2.5,
              bgcolor: color,
              '&:hover': {
                bgcolor: alpha(color, 0.85),
              },
            }}
          >
            {isEditing ? 'Save Changes' : 'Create Project'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
