import { createTheme, alpha } from '@mui/material/styles';

const sharedTypography = {
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  h1: { fontWeight: 700, letterSpacing: '-0.02em' },
  h2: { fontWeight: 700, letterSpacing: '-0.01em' },
  h3: { fontWeight: 600 },
  h4: { fontWeight: 600 },
  h5: { fontWeight: 600 },
  h6: { fontWeight: 600 },
  subtitle1: { fontWeight: 500, letterSpacing: '0.01em' },
  body1: { fontSize: '0.938rem', lineHeight: 1.7 },
  body2: { fontSize: '0.85rem', lineHeight: 1.6 },
  button: { textTransform: 'none', fontWeight: 600 },
};

const sharedComponents = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 12,
        padding: '8px 20px',
        transition: 'all 0.2s ease-in-out',
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 20,
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: 14,
        },
      },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        borderRadius: 8,
        fontSize: '0.8rem',
        fontWeight: 500,
      },
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: {
        transition: 'all 0.2s ease-in-out',
      },
    },
  },
};

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#06b6d4',
      light: '#22d3ee',
      dark: '#0891b2',
    },
    secondary: {
      main: '#8b5cf6',
      light: '#a78bfa',
      dark: '#7c3aed',
    },
    background: {
      default: '#0a0a0f',
      paper: '#12121a',
    },
    surface: {
      main: alpha('#ffffff', 0.05),
      light: alpha('#ffffff', 0.08),
      dark: alpha('#ffffff', 0.03),
    },
    text: {
      primary: '#e4e4e7',
      secondary: '#a1a1aa',
    },
    divider: alpha('#ffffff', 0.08),
    error: {
      main: '#ef4444',
    },
    success: {
      main: '#22c55e',
    },
    warning: {
      main: '#f59e0b',
    },
  },
  typography: sharedTypography,
  shape: {
    borderRadius: 12,
  },
  components: {
    ...sharedComponents,
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: '#27272a #12121a',
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-track': { background: '#12121a' },
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
      main: '#0891b2',
      light: '#06b6d4',
      dark: '#0e7490',
    },
    secondary: {
      main: '#7c3aed',
      light: '#8b5cf6',
      dark: '#6d28d9',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    surface: {
      main: alpha('#000000', 0.04),
      light: alpha('#000000', 0.06),
      dark: alpha('#000000', 0.02),
    },
    text: {
      primary: '#18181b',
      secondary: '#52525b',
    },
    divider: alpha('#000000', 0.08),
    error: {
      main: '#dc2626',
    },
    success: {
      main: '#16a34a',
    },
    warning: {
      main: '#d97706',
    },
  },
  typography: sharedTypography,
  shape: {
    borderRadius: 12,
  },
  components: {
    ...sharedComponents,
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: '#d4d4d8 #f8fafc',
          '&::-webkit-scrollbar': { width: 6 },
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
