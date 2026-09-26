import { useState, useMemo, useCallback, useEffect } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { createCustomTheme, applyThemeCssVariables } from './theme';
import { ChatProvider } from './store/chatStore';
import { loadThemeConfig, saveThemeConfig } from './utils/storage';
import AppLayout from './components/Layout/AppLayout';
import type { ThemeConfig, ThemeMode, ThemePresetId } from './types';

export default function App() {
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(() => loadThemeConfig());

  const theme = useMemo(
    () => createCustomTheme(themeConfig),
    [themeConfig]
  );

  useEffect(() => {
    applyThemeCssVariables(themeConfig, theme);
  }, [themeConfig, theme]);

  const handleThemeToggle = useCallback(() => {
    setThemeConfig((prev) => {
      const nextMode: ThemeMode = prev.mode === 'dark' ? 'light' : 'dark';
      const nextPreset: ThemePresetId = nextMode === 'light' ? 'clean_light' : (prev.preset === 'clean_light' ? 'cyber_dark' : prev.preset);
      const next: ThemeConfig = {
        ...prev,
        mode: nextMode,
        preset: nextPreset,
      };
      saveThemeConfig(next);
      return next;
    });
  }, []);

  const handleUpdateThemeConfig = useCallback((updater: Partial<ThemeConfig> | ((prev: ThemeConfig) => ThemeConfig)) => {
    setThemeConfig((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      saveThemeConfig(next);
      return next;
    });
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ChatProvider>
        <AppLayout
          themeMode={themeConfig.mode}
          onThemeToggle={handleThemeToggle}
          themeConfig={themeConfig}
          onUpdateThemeConfig={handleUpdateThemeConfig}
        />
      </ChatProvider>
    </ThemeProvider>
  );
}
