/**
 * Editor Constants
 * Presets, defaults, stacks, prompts, and export configurations for Code Workspace.
 */

export const STACK_PRESETS = [
  'Python',
  'TypeScript',
  'React',
  'Go',
  'Rust',
  'C++',
  'Node.js',
  'HTML/CSS',
];

export const INSPIRATION_PROMPTS = [
  '+ Add Unit Tests',
  '+ Refactor Code',
  '+ Fix Bugs',
  '+ Add Type Hints',
  '+ Document Functions',
  '+ Optimize Performance',
];

export const EXPORT_PADDING_OPTIONS = [
  { value: 0, label: '0px' },
  { value: 16, label: '16px' },
  { value: 24, label: '24px' },
  { value: 32, label: '32px' },
  { value: 48, label: '48px' },
  { value: 64, label: '64px' },
  { value: 80, label: '80px' },
  { value: 96, label: '96px' },
  { value: 128, label: '128px' },
];

export const EXPORT_GRADIENT_PRESETS = [
  { id: 'ocean', label: 'Ocean Breeze', bg: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 50%, #6366f1 100%)' },
  { id: 'sunset', label: 'Sunset Glow', bg: 'linear-gradient(135deg, #f43f5e 0%, #fb923c 50%, #facc15 100%)' },
  { id: 'cosmic', label: 'Cosmic Purple', bg: 'linear-gradient(135deg, #7c3aed 0%, #c026d3 50%, #f43f5e 100%)' },
  { id: 'aurora', label: 'Aurora Borealis', bg: 'linear-gradient(135deg, #059669 0%, #10b981 30%, #06b6d4 100%)' },
  { id: 'cyberpunk', label: 'Cyberpunk Neon', bg: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #06b6d4 100%)' },
  { id: 'mint', label: 'Emerald Mint', bg: 'linear-gradient(135deg, #10b981 0%, #34d399 50%, #6ee7b7 100%)' },
  { id: 'amber', label: 'Amber Warmth', bg: 'linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%)' },
  { id: 'slate', label: 'Dark Slate', bg: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' },
  { id: 'obsidian', label: 'Obsidian Black', bg: 'linear-gradient(135deg, #121212 0%, #1c1c1c 100%)' },
  { id: 'transparent', label: 'Transparent', bg: 'transparent' },
];

export const EXPORT_SHADOW_PRESETS = [
  { id: 'none', label: 'None', shadow: 'none' },
  { id: 'subtle', label: 'Subtle', shadow: '0 4px 20px rgba(0, 0, 0, 0.25)' },
  { id: 'medium', label: 'Medium', shadow: '0 12px 36px rgba(0, 0, 0, 0.45)' },
  { id: 'deep', label: 'Deep Glow', shadow: '0 24px 60px rgba(0, 0, 0, 0.65)' },
];

export const WINDOW_FRAME_STYLES = [
  { id: 'mac', label: 'macOS Traffic Lights' },
  { id: 'windows', label: 'Windows Controls' },
  { id: 'minimal', label: 'Minimalist Dot' },
  { id: 'none', label: 'Borderless' },
];
