import { useState, useMemo, useCallback } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { darkTheme, lightTheme } from './theme';
import { ChatProvider } from './store/chatStore';
import { loadThemeMode, saveThemeMode } from './utils/storage';
import AppLayout from './components/Layout/AppLayout';
import type { ThemeMode } from './types';

export default function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => (loadThemeMode() as ThemeMode) || "dark");

  const theme = useMemo(
    () => (themeMode === 'dark' ? darkTheme : lightTheme),
    [themeMode]
  );

  const handleThemeToggle = useCallback(() => {
    setThemeMode((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      saveThemeMode(next);
      return next;
    });
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ChatProvider>
        <AppLayout themeMode={themeMode} onThemeToggle={handleThemeToggle} />
      </ChatProvider>
    </ThemeProvider>
  );
}
