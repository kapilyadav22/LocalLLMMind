import { useState, useMemo } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { darkTheme, lightTheme } from './theme';
import { ChatProvider } from './store/chatStore';
import { loadThemeMode, saveThemeMode } from './utils/storage';
import AppLayout from './components/Layout/AppLayout';

export default function App() {
  const [themeMode, setThemeMode] = useState(() => loadThemeMode());

  const theme = useMemo(
    () => (themeMode === 'dark' ? darkTheme : lightTheme),
    [themeMode]
  );

  const handleThemeToggle = () => {
    setThemeMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      saveThemeMode(next);
      return next;
    });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ChatProvider>
        <AppLayout themeMode={themeMode} onThemeToggle={handleThemeToggle} />
      </ChatProvider>
    </ThemeProvider>
  );
}
