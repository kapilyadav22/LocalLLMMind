import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  useTheme,
  alpha,
  Zoom,
} from '@mui/material';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  HelpCircle,
} from 'lucide-react';

export default function CustomAlertDialog() {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [dialogConfig, setDialogConfig] = useState(null);

  useEffect(() => {
    const handleCustomDialog = (e) => {
      if (e.detail) {
        setDialogConfig(e.detail);
        setOpen(true);
      }
    };
    window.addEventListener('localllmmind-custom-dialog', handleCustomDialog);
    return () => window.removeEventListener('localllmmind-custom-dialog', handleCustomDialog);
  }, []);

  const handleClose = useCallback(
    (confirmed = false) => {
      setOpen(false);
      if (dialogConfig) {
        if (confirmed && typeof dialogConfig.onConfirm === 'function') {
          dialogConfig.onConfirm();
        } else if (!confirmed && typeof dialogConfig.onCancel === 'function') {
          dialogConfig.onCancel();
        }
      }
    },
    [dialogConfig]
  );

  if (!dialogConfig) return null;

  const {
    title,
    message,
    type = 'info',
    confirmText = 'OK',
    cancelText = 'Cancel',
    confirmColor = 'primary',
    isConfirm = false,
  } = dialogConfig;

  // Icon and theme config based on dialog type
  const getTypeDetails = () => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 size={32} color={theme.palette.success.main} />,
          color: theme.palette.success.main,
          defaultBtnColor: 'success',
        };
      case 'error':
        return {
          icon: <AlertCircle size={32} color={theme.palette.error.main} />,
          color: theme.palette.error.main,
          defaultBtnColor: 'error',
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={32} color={theme.palette.warning.main} />,
          color: theme.palette.warning.main,
          defaultBtnColor: 'warning',
        };
      default:
        return {
          icon: isConfirm ? (
            <HelpCircle size={32} color={theme.palette.primary.main} />
          ) : (
            <Info size={32} color={theme.palette.primary.main} />
          ),
          color: theme.palette.primary.main,
          defaultBtnColor: 'primary',
        };
    }
  };

  const details = getTypeDetails();
  const effectiveButtonColor = confirmColor || details.defaultBtnColor;

  return (
    <Dialog
      open={open}
      onClose={() => handleClose(false)}
      slots={{ transition: Zoom as any }}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 4,
            p: 1,
            bgcolor: alpha(theme.palette.background.paper, 0.98),
            backdropFilter: 'blur(16px)',
            border: '1px solid',
            borderColor: alpha(details.color, 0.3),
            boxShadow: `0 16px 40px ${alpha(theme.palette.common.black, 0.25)}, 0 0 0 1px ${alpha(details.color, 0.1)}`,
          },
        },
      }}
    >
      <DialogTitle component="div" sx={{ pb: 1, pt: 2, px: 2.5, display: 'flex', alignItems: 'center', gap: 1.75 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(details.color, 0.12),
            flexShrink: 0,
          }}
        >
          {details.icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" component="span" sx={{ fontWeight: 700, lineHeight: 1.25, fontSize: '1.05rem', display: 'block' }}>
            {title}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, py: 1 }}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            lineHeight: 1.6,
            fontSize: '0.88rem',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {message}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, pb: 2, pt: 1.5, gap: 1 }}>
        {isConfirm && (
          <Button
            onClick={() => handleClose(false)}
            variant="outlined"
            color="inherit"
            sx={{
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 600,
              px: 2,
              borderColor: 'divider',
            }}
          >
            {cancelText}
          </Button>
        )}

        <Button
          onClick={() => handleClose(true)}
          variant="contained"
          color={effectiveButtonColor}
          autoFocus
          sx={{
            borderRadius: 2.5,
            textTransform: 'none',
            fontWeight: 700,
            px: 2.5,
            boxShadow: 'none',
          }}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
