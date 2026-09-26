import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_THEME_CONFIG,
  loadThemeConfig,
  saveThemeConfig,
  loadThemeMode,
  saveThemeMode,
} from '../src/utils/storage.js';
import { THEME_PRESETS, ACCENT_COLOR_PRESETS, createCustomTheme } from '../src/theme.ts';

// Mock localStorage for node test runner
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

test('DEFAULT_THEME_CONFIG has all required properties and defaults', () => {
  assert.equal(DEFAULT_THEME_CONFIG.preset, 'cyber_dark');
  assert.equal(DEFAULT_THEME_CONFIG.mode, 'dark');
  assert.equal(DEFAULT_THEME_CONFIG.fontSizeScale, 1.0);
  assert.equal(DEFAULT_THEME_CONFIG.bubbleStyle, 'rounded');
  assert.equal(DEFAULT_THEME_CONFIG.fontFamily, 'system');
  assert.equal(DEFAULT_THEME_CONFIG.ambientGlow, true);
  assert.equal(DEFAULT_THEME_CONFIG.codeThemeSync, true);
});

test('THEME_PRESETS contains all 8 curated designer themes with valid palettes', () => {
  const expectedPresets = [
    'cyber_dark',
    'clean_light',
    'oled_black',
    'synthwave',
    'nordic_pine',
    'tokyo_sunset',
    'ocean_abyss',
    'midnight_rose',
  ];

  for (const presetId of expectedPresets) {
    const p = THEME_PRESETS[presetId];
    assert.ok(p, `Preset ${presetId} must exist`);
    assert.equal(p.id, presetId);
    assert.ok(p.name && p.name.length > 0);
    assert.ok(['dark', 'light'].includes(p.mode));
    assert.ok(p.primary.startsWith('#'));
    assert.ok(p.backgroundDefault.startsWith('#'));
    assert.ok(p.backgroundPaper.startsWith('#'));
    assert.ok(Array.isArray(p.swatches) && p.swatches.length === 4);
  }
});

test('ACCENT_COLOR_PRESETS contains 8 quick-pick colors with valid hex', () => {
  assert.equal(ACCENT_COLOR_PRESETS.length, 8);
  for (const accent of ACCENT_COLOR_PRESETS) {
    assert.ok(accent.name && accent.name.length > 0);
    assert.match(accent.hex, /^#[0-9A-Fa-f]{6}$/);
    assert.ok(accent.glow.startsWith('rgba'));
  }
});

test('loadThemeConfig and saveThemeConfig persist configuration and sync legacy theme mode', (t) => {
  const originalLocalStorage = globalThis.localStorage;
  globalThis.localStorage = new MockLocalStorage();
  t.after(() => {
    globalThis.localStorage = originalLocalStorage;
  });

  // Default when empty
  const initial = loadThemeConfig();
  assert.equal(initial.preset, 'cyber_dark');
  assert.equal(initial.mode, 'dark');

  // Save new theme config
  saveThemeConfig({
    preset: 'synthwave',
    mode: 'dark',
    customPrimaryColor: '#ec4899',
    fontSizeScale: 1.15,
    bubbleStyle: 'sleek',
    fontFamily: 'mono',
    ambientGlow: false,
    codeThemeSync: true,
  });

  const loaded = loadThemeConfig();
  assert.equal(loaded.preset, 'synthwave');
  assert.equal(loaded.customPrimaryColor, '#ec4899');
  assert.equal(loaded.fontSizeScale, 1.15);
  assert.equal(loaded.bubbleStyle, 'sleek');
  assert.equal(loaded.fontFamily, 'mono');
  assert.equal(loaded.ambientGlow, false);

  // Syncs legacy theme mode key
  assert.equal(loadThemeMode(), 'dark');

  // Toggle theme mode to light
  saveThemeMode('light');
  assert.equal(loadThemeMode(), 'light');
  const afterModeToggle = loadThemeConfig();
  assert.equal(afterModeToggle.mode, 'light');
  assert.equal(afterModeToggle.preset, 'clean_light');
});

test('createCustomTheme creates theme with custom accent, bubble shape, and scaled typography', () => {
  // Test OLED preset
  const oledTheme = createCustomTheme({
    preset: 'oled_black',
    mode: 'dark',
    bubbleStyle: 'minimal',
    fontFamily: 'mono',
    fontSizeScale: 0.85,
  });

  assert.equal(oledTheme.palette.mode, 'dark');
  assert.equal(oledTheme.palette.background.default, '#000000');
  assert.equal(oledTheme.shape.borderRadius, 4);
  assert.ok(oledTheme.typography.fontFamily.includes('JetBrains Mono'));

  // Test custom primary color override
  const customTheme = createCustomTheme({
    preset: 'cyber_dark',
    mode: 'dark',
    customPrimaryColor: '#ff0055',
    bubbleStyle: 'rounded',
    fontFamily: 'serif',
    fontSizeScale: 1.0,
  });

  assert.equal(customTheme.palette.primary.main, '#ff0055');
  assert.equal(customTheme.shape.borderRadius, 12);
  assert.ok(customTheme.typography.fontFamily.includes('Newsreader'));
});
