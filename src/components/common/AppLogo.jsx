import { Box, Typography, alpha, useTheme } from '@mui/material';
import { DEVELOPER_NAME } from '../../constants/appConstants';

export default function AppLogo({
  size = 32,
  showText = true,
  showDeveloper = false,
  glowing = false,
  fontSize = '1.05rem',
  onClick,
}) {
  const theme = useTheme();

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1.25,
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
      }}
    >
      {/* Icon Squircle */}
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: Math.max(8, Math.round(size * 0.28)),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          boxShadow: glowing
            ? `0 0 24px ${alpha(theme.palette.primary.main, 0.5)}, 0 4px 12px ${alpha(theme.palette.secondary.main, 0.3)}`
            : `0 2px 8px ${alpha(theme.palette.primary.main, 0.25)}`,
          transition: 'all 0.3s ease',
          '&:hover': onClick
            ? {
                transform: 'scale(1.05)',
                boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.6)}`,
              }
            : {},
        }}
      >
        <svg
          width={Math.round(size * 0.62)}
          height={Math.round(size * 0.62)}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* LocalLLMMind Neural Cortex & Synapse Matrix */}
          <path
            d="M9.5 4C7.6 4 6.2 5.4 6 7.2C4.9 7.8 4 9.2 4 10.8C4 12.1 4.7 13.2 5.6 13.8C5.3 14.4 5 15.1 5 15.9C5 17.6 6.3 19 8 19C8.5 19 8.9 18.9 9.3 18.7C9.9 19.5 10.9 20 12 20C13.1 20 14.1 19.5 14.7 18.7C15.1 18.9 15.5 19 16 19C17.7 19 19 17.6 19 15.9C19 15.1 18.7 14.4 18.4 13.8C19.3 13.2 20 12.1 20 10.8C20 9.2 19.1 7.8 18 7.2C17.8 5.4 16.4 4 14.5 4C13.5 4 12.7 4.4 12 5.1C11.3 4.4 10.5 4 9.5 4Z"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="rgba(255,255,255,0.12)"
          />
          <path
            d="M12 5.5V18.5M8 8.5L12 12L16 8.5M7 14L12 12L17 14"
            stroke="white"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="2" fill="white" />
          <circle cx="8" cy="8.5" r="1.2" fill="white" />
          <circle cx="16" cy="8.5" r="1.2" fill="white" />
          <circle cx="7" cy="14" r="1.2" fill="white" />
          <circle cx="17" cy="14" r="1.2" fill="white" />
        </svg>
      </Box>

      {/* Brand Text */}
      {showText && (
        <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 800,
                fontSize,
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
                color: 'text.primary',
              }}
            >
              Local
            </Typography>
            <Typography
              component="span"
              sx={{
                fontWeight: 800,
                fontSize,
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Mind
            </Typography>
          </Box>
          {showDeveloper && (
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.68rem',
                color: 'text.secondary',
                letterSpacing: '0.04em',
                fontWeight: 500,
                mt: 0.25,
              }}
            >
              by {DEVELOPER_NAME}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}
