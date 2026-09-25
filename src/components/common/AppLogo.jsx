import { Box, Typography, alpha, useTheme } from '@mui/material';
import { DEVELOPER_NAME } from '../../constants/appConstants';

export default function AppLogo({
  size = 32,
  showText = true,
  showDeveloper = false,
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
          borderRadius: Math.max(7, Math.round(size * 0.26)),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          bgcolor: 'primary.main',
          color: '#ffffff',
          border: '1px solid',
          borderColor: alpha('#ffffff', 0.15),
          boxShadow: `0 1px 3px ${alpha(theme.palette.common.black, 0.1)}`,
          transition: 'all 0.2s ease',
          '&:hover': onClick
            ? {
                transform: 'scale(1.03)',
                bgcolor: 'primary.dark',
              }
            : {},
        }}
      >
        <svg
          width={Math.round(size * 0.58)}
          height={Math.round(size * 0.58)}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* LocalLLMMind Neural Cortex */}
          <path
            d="M9.5 4C7.6 4 6.2 5.4 6 7.2C4.9 7.8 4 9.2 4 10.8C4 12.1 4.7 13.2 5.6 13.8C5.3 14.4 5 15.1 5 15.9C5 17.6 6.3 19 8 19C8.5 19 8.9 18.9 9.3 18.7C9.9 19.5 10.9 20 12 20C13.1 20 14.1 19.5 14.7 18.7C15.1 18.9 15.5 19 16 19C17.7 19 19 17.6 19 15.9C19 15.1 18.7 14.4 18.4 13.8C19.3 13.2 20 12.1 20 10.8C20 9.2 19.1 7.8 18 7.2C17.8 5.4 16.4 4 14.5 4C13.5 4 12.7 4.4 12 5.1C11.3 4.4 10.5 4 9.5 4Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 5.5V18.5M8 8.5L12 12L16 8.5M7 14L12 12L17 14"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="1.8" fill="currentColor" />
          <circle cx="8" cy="8.5" r="1" fill="currentColor" />
          <circle cx="16" cy="8.5" r="1" fill="currentColor" />
          <circle cx="7" cy="14" r="1" fill="currentColor" />
          <circle cx="17" cy="14" r="1" fill="currentColor" />
        </svg>
      </Box>

      {/* Brand Text */}
      {showText && (
        <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <Typography
              variant="subtitle1"
              component="span"
              sx={{
                fontWeight: 700,
                fontSize,
                lineHeight: 1.2,
                letterSpacing: '-0.025em',
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
                letterSpacing: '-0.025em',
                color: 'primary.main',
              }}
            >
              LLM
            </Typography>
            <Typography
              component="span"
              sx={{
                fontWeight: 700,
                fontSize,
                lineHeight: 1.2,
                letterSpacing: '-0.025em',
                color: 'text.primary',
              }}
            >
              Mind
            </Typography>
          </Box>
          {showDeveloper && (
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.675rem',
                color: 'text.secondary',
                letterSpacing: '0.01em',
                fontWeight: 500,
                mt: 0.1,
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
