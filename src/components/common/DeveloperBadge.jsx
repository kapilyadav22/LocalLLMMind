import { Box, Typography, Chip, Tooltip, alpha, useTheme } from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import VerifiedIcon from '@mui/icons-material/Verified';
import PersonIcon from '@mui/icons-material/Person';
import { DEVELOPER_NAME, DEVELOPER_TITLE, APP_NAME, APP_VERSION } from '../../constants/appConstants';

export default function DeveloperBadge({ variant = 'watermark', sx = {} }) {
  const theme = useTheme();

  if (variant === 'watermark') {
    return (
      <Tooltip title={`Developed & Maintained by ${DEVELOPER_NAME} · v${APP_VERSION}`} arrow>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1.25,
            py: 0.4,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.background.paper, 0.6),
            border: '1px solid',
            borderColor: 'divider',
            backdropFilter: 'blur(8px)',
            cursor: 'default',
            userSelect: 'none',
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: alpha(theme.palette.primary.main, 0.4),
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              transform: 'translateY(-1px)',
            },
            ...sx,
          }}
        >
          <CodeIcon sx={{ fontSize: 13, color: 'primary.main' }} />
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.72rem',
              fontWeight: 600,
              letterSpacing: '0.02em',
              color: 'text.secondary',
            }}
          >
            Crafted by{' '}
            <Box
              component="span"
              sx={{
                color: 'text.primary',
                fontWeight: 700,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
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
        sx={{
          p: 2.5,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: alpha(theme.palette.background.paper, 0.5),
          position: 'relative',
          overflow: 'hidden',
          ...sx,
        }}
      >
        {/* Background gradient blur */}
        <Box
          sx={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.15)} 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
          {/* Avatar with Initials */}
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              color: '#fff',
              fontWeight: 800,
              fontSize: '1.1rem',
              boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.35)}`,
            }}
          >
            KY
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {DEVELOPER_NAME}
              </Typography>
              <VerifiedIcon sx={{ fontSize: 16, color: 'primary.main' }} />
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
          {APP_NAME} is designed for private, ultra-fast, and distraction-free interaction with local Ollama models, featuring token throughput metrics, reasoning model support, and seamless chat backups.
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {['React 19', 'Vite', 'Material UI 9', 'Ollama API', 'DeepSeek-R1 Ready'].map((tech) => (
            <Chip
              key={tech}
              label={tech}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.68rem',
                bgcolor: alpha(theme.palette.text.primary, 0.04),
              }}
            />
          ))}
        </Box>
      </Box>
    );
  }

  // Default compact
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, ...sx }}>
      <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
        {DEVELOPER_NAME}
      </Typography>
    </Box>
  );
}
