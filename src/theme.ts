import { createTheme, alpha } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import type { ThemeConfig, ThemePreset, ThemePresetId } from './types';

// Augment MUI Theme Palette for custom properties
declare module '@mui/material/styles' {
  interface Palette {
    surface: {
      main: string;
      light: string;
      dark: string;
    };
    accentGlow: string;
  }
  interface PaletteOptions {
    surface?: {
      main?: string;
      light?: string;
      dark?: string;
    };
    accentGlow?: string;
  }
}

export const ACCENT_COLOR_PRESETS = [
  { name: 'Electric Blue', hex: '#3b82f6', glow: 'rgba(59, 130, 246, 0.25)' },
  { name: 'Emerald Mint', hex: '#10b981', glow: 'rgba(16, 185, 129, 0.25)' },
  { name: 'Neon Violet', hex: '#a855f7', glow: 'rgba(168, 85, 247, 0.25)' },
  { name: 'Sunset Amber', hex: '#f97316', glow: 'rgba(249, 115, 22, 0.25)' },
  { name: 'Crimson Rose', hex: '#f43f5e', glow: 'rgba(244, 63, 94, 0.25)' },
  { name: 'Aqua Cyan', hex: '#00e5ff', glow: 'rgba(0, 229, 255, 0.25)' },
  { name: 'Royal Indigo', hex: '#6366f1', glow: 'rgba(99, 102, 241, 0.25)' },
  { name: 'Vivid Gold', hex: '#eab308', glow: 'rgba(234, 179, 8, 0.25)' },
];

export const THEME_PRESETS: Record<ThemePresetId, ThemePreset> = {
  cyber_dark: {
    id: 'cyber_dark',
    name: 'Cyber Dark',
    mode: 'dark',
    description: 'Deep obsidian space canvas with electric blue neon highlights',
    icon: '🌌',
    primary: '#3b82f6',
    primaryLight: '#60a5fa',
    primaryDark: '#2563eb',
    secondary: '#71717a',
    backgroundDefault: '#09090b',
    backgroundPaper: '#111215',
    surface: 'rgba(255, 255, 255, 0.04)',
    textPrimary: '#f4f4f5',
    textSecondary: '#a1a1aa',
    divider: 'rgba(255, 255, 255, 0.08)',
    accentGlow: 'rgba(59, 130, 246, 0.22)',
    scrollbarThumb: '#27272a',
    swatches: ['#09090b', '#111215', '#3b82f6', '#f4f4f5'],
  },
  clean_light: {
    id: 'clean_light',
    name: 'Clean Light',
    mode: 'light',
    description: 'Crisp editorial white canvas with vibrant cobalt blue accents',
    icon: '☀️',
    primary: '#2563eb',
    primaryLight: '#3b82f6',
    primaryDark: '#1d4ed8',
    secondary: '#64748b',
    backgroundDefault: '#f8fafc',
    backgroundPaper: '#ffffff',
    surface: 'rgba(0, 0, 0, 0.03)',
    textPrimary: '#09090b',
    textSecondary: '#64748b',
    divider: 'rgba(0, 0, 0, 0.08)',
    accentGlow: 'rgba(37, 99, 235, 0.12)',
    scrollbarThumb: '#d4d4d8',
    swatches: ['#f8fafc', '#ffffff', '#2563eb', '#09090b'],
  },
  oled_black: {
    id: 'oled_black',
    name: 'OLED Pure Black',
    mode: 'dark',
    description: 'Absolute true zero pitch black with radiant cyan luminescence',
    icon: '🖤',
    primary: '#06b6d4',
    primaryLight: '#22d3ee',
    primaryDark: '#0891b2',
    secondary: '#71717a',
    backgroundDefault: '#000000',
    backgroundPaper: '#09090c',
    surface: 'rgba(255, 255, 255, 0.03)',
    textPrimary: '#ffffff',
    textSecondary: '#9ca3af',
    divider: 'rgba(255, 255, 255, 0.07)',
    accentGlow: 'rgba(6, 182, 212, 0.24)',
    scrollbarThumb: '#1c1c20',
    swatches: ['#000000', '#09090c', '#06b6d4', '#ffffff'],
  },
  synthwave: {
    id: 'synthwave',
    name: 'Neon Cyberpunk',
    mode: 'dark',
    description: 'Midnight retro-future violet with glowing magenta and electric purple',
    icon: '🟣',
    primary: '#a855f7',
    primaryLight: '#c084fc',
    primaryDark: '#9333ea',
    secondary: '#ec4899',
    backgroundDefault: '#0c0618',
    backgroundPaper: '#140a2b',
    surface: 'rgba(168, 85, 247, 0.06)',
    textPrimary: '#f5f3ff',
    textSecondary: '#c084fc',
    divider: 'rgba(168, 85, 247, 0.16)',
    accentGlow: 'rgba(168, 85, 247, 0.25)',
    scrollbarThumb: '#2d184d',
    swatches: ['#0c0618', '#140a2b', '#a855f7', '#ec4899'],
  },
  nordic_pine: {
    id: 'nordic_pine',
    name: 'Nordic Forest',
    mode: 'dark',
    description: 'Muted boreal slate canvas paired with lush mint emerald accents',
    icon: '🌲',
    primary: '#10b981',
    primaryLight: '#34d399',
    primaryDark: '#059669',
    secondary: '#6ee7b7',
    backgroundDefault: '#091314',
    backgroundPaper: '#0f1f21',
    surface: 'rgba(16, 185, 129, 0.05)',
    textPrimary: '#f0fdf4',
    textSecondary: '#6ee7b7',
    divider: 'rgba(16, 185, 129, 0.15)',
    accentGlow: 'rgba(16, 185, 129, 0.22)',
    scrollbarThumb: '#1b3438',
    swatches: ['#091314', '#0f1f21', '#10b981', '#f0fdf4'],
  },
  tokyo_sunset: {
    id: 'tokyo_sunset',
    name: 'Tokyo Sunset',
    mode: 'dark',
    description: 'Warm charcoal evening dusk bathed in vibrant sunset amber',
    icon: '🌅',
    primary: '#f97316',
    primaryLight: '#fb923c',
    primaryDark: '#ea580c',
    secondary: '#fdba74',
    backgroundDefault: '#130e12',
    backgroundPaper: '#1c141a',
    surface: 'rgba(249, 115, 22, 0.05)',
    textPrimary: '#fff7ed',
    textSecondary: '#fdba74',
    divider: 'rgba(249, 115, 22, 0.15)',
    accentGlow: 'rgba(249, 115, 22, 0.22)',
    scrollbarThumb: '#35212a',
    swatches: ['#130e12', '#1c141a', '#f97316', '#fff7ed'],
  },
  ocean_abyss: {
    id: 'ocean_abyss',
    name: 'Ocean Abyss',
    mode: 'dark',
    description: 'Deep oceanic trench navy with bioluminescent aqua cyan light',
    icon: '🌊',
    primary: '#00e5ff',
    primaryLight: '#38bdf8',
    primaryDark: '#0284c7',
    secondary: '#7dd3fc',
    backgroundDefault: '#040d1a',
    backgroundPaper: '#0a182e',
    surface: 'rgba(0, 229, 255, 0.05)',
    textPrimary: '#f0f9ff',
    textSecondary: '#7dd3fc',
    divider: 'rgba(0, 229, 255, 0.15)',
    accentGlow: 'rgba(0, 229, 255, 0.25)',
    scrollbarThumb: '#122e54',
    swatches: ['#040d1a', '#0a182e', '#00e5ff', '#f0f9ff'],
  },
  midnight_rose: {
    id: 'midnight_rose',
    name: 'Midnight Rose',
    mode: 'dark',
    description: 'Luxurious velvet dark tone illuminated by radiant crimson rose',
    icon: '🌹',
    primary: '#f43f5e',
    primaryLight: '#fb7185',
    primaryDark: '#e11d48',
    secondary: '#fda4af',
    backgroundDefault: '#13080e',
    backgroundPaper: '#1f0e18',
    surface: 'rgba(244, 63, 94, 0.05)',
    textPrimary: '#fff1f2',
    textSecondary: '#fda4af',
    divider: 'rgba(244, 63, 94, 0.15)',
    accentGlow: 'rgba(244, 63, 94, 0.24)',
    scrollbarThumb: '#3b162c',
    swatches: ['#13080e', '#1f0e18', '#f43f5e', '#fff1f2'],
  },
};

// Helper: build typography with customized font family and scale
function getScaledTypography(fontFamilyOption: string, scale: number = 1.0) {
  const fontFamilies: Record<string, string> = {
    system: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", monospace',
    serif: '"Newsreader", "Merriweather", Georgia, serif',
  };
  const fontFamily = fontFamilies[fontFamilyOption] || fontFamilies.system;

  const baseRem = (val: number) => `${(val * scale).toFixed(3)}rem`;

  return {
    fontFamily,
    h1: { fontWeight: 700, letterSpacing: '-0.025em', fontSize: baseRem(2.25) },
    h2: { fontWeight: 700, letterSpacing: '-0.02em', fontSize: baseRem(1.85) },
    h3: { fontWeight: 600, letterSpacing: '-0.015em', fontSize: baseRem(1.5) },
    h4: { fontWeight: 600, letterSpacing: '-0.01em', fontSize: baseRem(1.25) },
    h5: { fontWeight: 600, fontSize: baseRem(1.1) },
    h6: { fontWeight: 600, fontSize: baseRem(1.0) },
    subtitle1: { fontWeight: 500, letterSpacing: '-0.01em', fontSize: baseRem(0.95) },
    subtitle2: { fontWeight: 600, fontSize: baseRem(0.85) },
    body1: { fontSize: baseRem(0.925), lineHeight: 1.65 },
    body2: { fontSize: baseRem(0.84), lineHeight: 1.55 },
    caption: { fontSize: baseRem(0.75), lineHeight: 1.4 },
    button: { textTransform: 'none' as const, fontWeight: 500, letterSpacing: '0.01em', fontSize: baseRem(0.84) },
  };
}

export function createCustomTheme(config: Partial<ThemeConfig> = {}): Theme {
  const presetId = (config.preset && THEME_PRESETS[config.preset]) ? config.preset : 'cyber_dark';
  const preset = THEME_PRESETS[presetId];
  const mode = config.mode || preset.mode || 'dark';

  // Custom Primary Color Override
  const hasCustomPrimary = Boolean(config.customPrimaryColor && /^#[0-9A-Fa-f]{6}$/.test(config.customPrimaryColor));
  const primaryMain = hasCustomPrimary ? config.customPrimaryColor! : preset.primary;
  const primaryLight = hasCustomPrimary ? alpha(primaryMain, 0.8) : preset.primaryLight;
  const primaryDark = hasCustomPrimary ? alpha(primaryMain, 0.9) : preset.primaryDark;
  const accentGlow = hasCustomPrimary ? alpha(primaryMain, 0.25) : preset.accentGlow;

  // Bubble style & radius
  const bubbleStyle = config.bubbleStyle || 'rounded';
  const baseBorderRadius = bubbleStyle === 'minimal' ? 4 : bubbleStyle === 'sleek' ? 8 : 12;

  // Typography scale & family
  const typography = getScaledTypography(config.fontFamily || 'system', config.fontSizeScale || 1.0);

  return createTheme({
    palette: {
      mode,
      primary: {
        main: primaryMain,
        light: primaryLight,
        dark: primaryDark,
        contrastText: '#ffffff',
      },
      secondary: {
        main: preset.secondary,
        light: alpha(preset.secondary, 0.8),
        dark: alpha(preset.secondary, 0.9),
      },
      background: {
        default: preset.backgroundDefault,
        paper: preset.backgroundPaper,
      },
      surface: {
        main: preset.surface,
        light: alpha(preset.surface, 0.8),
        dark: alpha(preset.surface, 0.4),
      },
      accentGlow,
      text: {
        primary: preset.textPrimary,
        secondary: preset.textSecondary,
      },
      divider: preset.divider,
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
      info: {
        main: primaryMain,
        light: primaryLight,
        dark: primaryDark,
      },
    },
    typography,
    shape: {
      borderRadius: baseBorderRadius,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: baseBorderRadius,
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
            borderRadius: baseBorderRadius + 4,
            backgroundImage: 'none',
            boxShadow: mode === 'dark' ? '0 20px 45px -10px rgba(0,0,0,0.6)' : '0 20px 40px -15px rgba(0,0,0,0.15)',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: baseBorderRadius,
              fontSize: '0.875rem',
            },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: Math.max(4, baseBorderRadius - 2),
            fontSize: '0.75rem',
            fontWeight: 500,
            padding: '4px 8px',
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: baseBorderRadius,
            transition: 'all 0.15s ease-in-out',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: Math.max(4, baseBorderRadius - 2),
            fontWeight: 500,
          },
        },
      },
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: preset.backgroundDefault,
            color: preset.textPrimary,
            scrollbarColor: `${preset.scrollbarThumb} ${preset.backgroundDefault}`,
            '&::-webkit-scrollbar': { width: 5, height: 5 },
            '&::-webkit-scrollbar-track': { background: preset.backgroundDefault },
            '&::-webkit-scrollbar-thumb': {
              background: preset.scrollbarThumb,
              borderRadius: 3,
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: alpha(preset.textSecondary, 0.4),
            },
          },
        },
      },
    },
  });
}

// Static default instances for backwards compatibility
export const darkTheme = createCustomTheme({ preset: 'cyber_dark', mode: 'dark' });
export const lightTheme = createCustomTheme({ preset: 'clean_light', mode: 'light' });

// Applies dynamic CSS variables and classes to HTML document
export function applyThemeCssVariables(config: ThemeConfig, theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const body = document.body;

  // Brand and accent colors
  root.style.setProperty('--app-accent', theme.palette.primary.main);
  root.style.setProperty('--app-accent-light', theme.palette.primary.light);
  root.style.setProperty('--app-accent-dark', theme.palette.primary.dark);
  root.style.setProperty('--app-accent-glow', theme.palette.accentGlow || 'rgba(59, 130, 246, 0.2)');
  root.style.setProperty('--app-bg-default', theme.palette.background.default);
  root.style.setProperty('--app-bg-paper', theme.palette.background.paper);
  root.style.setProperty('--app-text-primary', theme.palette.text.primary);
  root.style.setProperty('--app-text-secondary', theme.palette.text.secondary);
  root.style.setProperty('--app-divider', theme.palette.divider);

  // Bubble radius
  const radiusMap: Record<string, string> = {
    rounded: '18px',
    sleek: '10px',
    minimal: '4px',
  };
  root.style.setProperty('--app-bubble-radius', radiusMap[config.bubbleStyle] || '18px');

  // Font family
  const fontMap: Record<string, string> = {
    system: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", monospace',
    serif: '"Newsreader", "Merriweather", Georgia, serif',
  };
  root.style.setProperty('--app-font-family', fontMap[config.fontFamily] || fontMap.system);

  // Font scale
  root.style.setProperty('--app-font-scale', `${config.fontSizeScale || 1.0}`);
  root.style.fontSize = `${(config.fontSizeScale || 1.0) * 100}%`;

  // Ambient glow body class
  if (config.ambientGlow && config.mode === 'dark') {
    body.classList.add('ambient-glow');
  } else {
    body.classList.remove('ambient-glow');
  }

  // Update theme-color meta tag
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme.palette.background.default);
  }
}
