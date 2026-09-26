import { memo } from 'react';
import { Box, Typography, Chip, Tooltip, alpha, useTheme, SxProps, Theme } from '@mui/material';
import { Code2, CheckCircle2, Sparkles } from 'lucide-react';
import {
  DEVELOPER_NAME,
  DEVELOPER_TITLE,
  APP_VERSION,
} from '../../constants/appConstants';
import BrandText from './BrandText';

export interface DeveloperBadgeProps {
  variant?: 'watermark' | 'card' | 'compact';
  onClick?: (e?: React.MouseEvent) => void;
  sx?: SxProps<Theme>;
}

function DeveloperBadgeComponent({ variant = 'watermark', onClick, sx = {} }: DeveloperBadgeProps) {
  const theme = useTheme();

  const handleClick = (e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    if (onClick) {
      onClick(e);
    } else {
      window.dispatchEvent(new CustomEvent('open-about-me'));
    }
  };

  if (variant === 'watermark') {
    return (
      <Tooltip title={`Crafted by ${DEVELOPER_NAME} · Click to view profile & about me`} arrow>
        <Box
          onClick={handleClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClick();
            }
          }}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1.35,
            py: 0.45,
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            cursor: 'pointer',
            userSelect: 'none',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              transform: 'translateY(-1px)',
              boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`,
              '& .dev-name': {
                color: 'primary.main',
              },
            },
            '&:active': {
              transform: 'scale(0.98)',
            },
            ...sx,
          }}
        >
          <Code2 size={13} color={theme.palette.primary.main} />
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.73rem',
              fontWeight: 600,
              letterSpacing: '0.02em',
              color: 'text.secondary',
            }}
          >
            Crafted by{' '}
            <Box
              component="span"
              className="dev-name"
              sx={{
                color: 'text.primary',
                fontWeight: 700,
                transition: 'color 0.15s ease',
              }}
            >
              {DEVELOPER_NAME}
            </Box>
          </Typography>
        </Box>
      </Tooltip>
    );
  }

  if (variant === 'card') {
    return (
      <Box
        onClick={handleClick}
        sx={{
          p: 2.5,
          borderRadius: 2.5,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: 'primary.main',
            boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.12)}`,
            transform: 'translateY(-2px)',
          },
          ...sx,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
          {/* Avatar with Initials */}
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'primary.main',
              color: '#fff',
              fontWeight: 800,
              fontSize: '1rem',
            }}
          >
            KY
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {DEVELOPER_NAME}
              </Typography>
              <CheckCircle2 size={16} color={theme.palette.primary.main} />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
              {DEVELOPER_TITLE}
            </Typography>
          </Box>

          <Chip
            label={`v${APP_VERSION}`}
            size="small"
            variant="outlined"
            sx={{
              height: 22,
              fontSize: '0.7rem',
              fontWeight: 600,
              borderColor: alpha(theme.palette.primary.main, 0.3),
              color: 'primary.main',
            }}
          />
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem', lineHeight: 1.6, mb: 2 }}>
          <BrandText fontWeight={700} /> is engineered for private, ultra-fast, and distraction-free interaction with local Ollama models and cloud frontier models.
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
            Click to view profile & social links →
          </Typography>
          <Sparkles size={14} color={theme.palette.primary.main} />
        </Box>
      </Box>
    );
  }

  // Compact fallback
  return (
    <Box
      onClick={handleClick}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        cursor: 'pointer',
        userSelect: 'none',
        ...sx,
      }}
    >
      <Code2 size={12} color={theme.palette.primary.main} />
      <Typography variant="caption" sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
        {DEVELOPER_NAME}
      </Typography>
    </Box>
  );
}

const DeveloperBadge = memo(DeveloperBadgeComponent);
export default DeveloperBadge;
