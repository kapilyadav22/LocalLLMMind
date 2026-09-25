import { createTheme, alpha } from '@mui/material/styles';

const sharedTypography = {
  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  h1: { fontWeight: 700, letterSpacing: '-0.025em' },
  h2: { fontWeight: 700, letterSpacing: '-0.02em' },
  h3: { fontWeight: 600, letterSpacing: '-0.015em' },
  h4: { fontWeight: 600, letterSpacing: '-0.01em' },
  h5: { fontWeight: 600 },
  h6: { fontWeight: 600 },
  subtitle1: { fontWeight: 500, letterSpacing: '-0.01em' },
  body1: { fontSize: '0.925rem', lineHeight: 1.65 },
  body2: { fontSize: '0.84rem', lineHeight: 1.55 },
  caption: { fontSize: '0.75rem', lineHeight: 1.4 },
  button: { textTransform: 'none', fontWeight: 500, letterSpacing: '0.01em' },
};

const sharedComponents = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        padding: '6px 14px',
        fontSize: '0.84rem',
        boxShadow: 'none',
        '&:hover': {
          boxShadow: 'none',
        },
        transition: 'all 0.15s ease-in-out',
      },
      contained: {
        fontWeight: 600,
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
        boxShadow: 'none',
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 14,
        backgroundImage: 'none',
        boxShadow: '0 20px 40px -15px rgba(0,0,0,0.3)',
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: 8,
          fontSize: '0.875rem',
        },
      },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        borderRadius: 6,
        fontSize: '0.75rem',
        fontWeight: 500,
        padding: '4px 8px',
      },
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        transition: 'all 0.15s ease-in-out',
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 6,
        fontWeight: 500,
      },
    },
  },
};

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#3b82f6',
      light: '#60a5fa',
      dark: '#2563eb',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#71717a',
      light: '#a1a1aa',
      dark: '#52525b',
    },
    background: {
      default: '#09090b',
      paper: '#111215',
    },
    surface: {
      main: alpha('#ffffff', 0.04),
      light: alpha('#ffffff', 0.07),
      dark: alpha('#ffffff', 0.02),
    },
    text: {
      primary: '#f4f4f5',
      secondary: '#a1a1aa',
    },
    divider: 'rgba(255, 255, 255, 0.08)',
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
    },
    success: {
      main: '#22c55e',
      light: '#4ade80',
      dark: '#16a34a',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
  },
  typography: sharedTypography,
  shape: {
    borderRadius: 8,
  },
  components: {
    ...sharedComponents,
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#09090b',
          color: '#f4f4f5',
          scrollbarColor: '#27272a #09090b',
          '&::-webkit-scrollbar': { width: 5, height: 5 },
          '&::-webkit-scrollbar-track': { background: '#09090b' },
          '&::-webkit-scrollbar-thumb': {
            background: '#27272a',
            borderRadius: 3,
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#3f3f46',
          },
        },
      },
    },
  },
});

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2563eb',
      light: '#3b82f6',
      dark: '#1d4ed8',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#64748b',
      light: '#94a3b8',
      dark: '#475569',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    surface: {
      main: alpha('#000000', 0.03),
      light: alpha('#000000', 0.05),
      dark: alpha('#000000', 0.015),
    },
    text: {
      primary: '#09090b',
      secondary: '#64748b',
    },
    divider: 'rgba(0, 0, 0, 0.08)',
    error: {
      main: '#dc2626',
      light: '#ef4444',
      dark: '#b91c1c',
    },
    success: {
      main: '#16a34a',
      light: '#22c55e',
      dark: '#15803d',
    },
    warning: {
      main: '#d97706',
      light: '#f59e0b',
      dark: '#b45309',
    },
  },
  typography: sharedTypography,
  shape: {
    borderRadius: 8,
  },
  components: {
    ...sharedComponents,
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f8fafc',
          color: '#09090b',
          scrollbarColor: '#d4d4d8 #f8fafc',
          '&::-webkit-scrollbar': { width: 5, height: 5 },
          '&::-webkit-scrollbar-track': { background: '#f8fafc' },
          '&::-webkit-scrollbar-thumb': {
            background: '#d4d4d8',
            borderRadius: 3,
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#a1a1aa',
          },
        },
      },
    },
  },
});
