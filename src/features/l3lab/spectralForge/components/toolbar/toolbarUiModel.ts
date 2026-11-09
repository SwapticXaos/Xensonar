import type { StampCategory, StampPreset } from '../../audio/stampPresets';
import type { ToolType } from '../../state/store';

export type ToolbarToolDescriptor = {
  id: ToolType;
  icon: string;
  label: string;
  shortcut: string;
};

export const TOOLBAR_TOOLS: ToolbarToolDescriptor[] = [
  { id: 'brush', icon: '🖌️', label: 'Soft Brush', shortcut: 'B' },
  { id: 'hardBrush', icon: '✏️', label: 'Hard Brush', shortcut: 'H' },
  { id: 'line', icon: '📐', label: 'Linie', shortcut: 'L' },
  { id: 'harmonicBrush', icon: '🎵', label: 'Harmonic Brush', shortcut: 'A' },
  { id: 'noiseBrush', icon: '🌊', label: 'Noise Brush', shortcut: 'N' },
  { id: 'spray', icon: '💨', label: 'Spray', shortcut: 'S' },
  { id: 'formant', icon: '🗣️', label: 'Vokalband-Pinsel', shortcut: 'F' },
  { id: 'stamp', icon: '📋', label: 'Stempel', shortcut: 'T' },
  { id: 'morph', icon: '🌀', label: 'Verformen', shortcut: 'M' },
  { id: 'smudge', icon: '🫟', label: 'Wischfinger', shortcut: 'J' },
  { id: 'dodgeBurn', icon: '☀️', label: 'Nachbelichten / Abdunkeln', shortcut: 'D' },
  { id: 'blurSharpen', icon: '🪞', label: 'Blur / Sharpen', shortcut: 'K' },
  { id: 'delaySmear', icon: '⟿', label: 'Delay Smear', shortcut: 'Y' },
  { id: 'threshold', icon: '🚪', label: 'Threshold / Gate', shortcut: 'R' },
  { id: 'sourceTrace', icon: '🧬', label: 'Quellspur / Source Trace', shortcut: 'U' },
];

export function buildToolButtonTitle(tool: Pick<ToolbarToolDescriptor, 'label' | 'shortcut'>): string {
  return `${tool.label} (${tool.shortcut})`;
}

export function resolveToolButtonClass(activeTool: ToolType, toolId: ToolType): string {
  return [
    'w-9 h-9 flex items-center justify-center rounded text-lg',
    'transition-all duration-100',
    activeTool === toolId
      ? 'bg-purple-600 shadow-lg shadow-purple-500/30 scale-105'
      : 'bg-gray-800 hover:bg-gray-700',
  ].join(' ');
}

export function resolveEraseModeTitle(eraseMode: boolean): string {
  return `Radier-Modus (X) ${eraseMode ? 'AN' : 'AUS'}`;
}

export function resolveEraseModeLabel(eraseMode: boolean): string {
  return eraseMode ? '⊖' : '⊕';
}

export function resolveEraseModeClass(eraseMode: boolean): string {
  return [
    'w-9 h-9 flex items-center justify-center rounded text-sm font-bold',
    'transition-all duration-100',
    eraseMode
      ? 'bg-red-600 shadow-lg shadow-red-500/40 text-white animate-pulse'
      : 'bg-gray-800 hover:bg-gray-700 text-gray-400',
  ].join(' ');
}

export function resolveStampPresetCategories(presets: readonly StampPreset[]): StampCategory[] {
  return Array.from(new Set(presets.map((preset) => preset.category)));
}

export function resolveVisibleStampPresetCategories(
  presets: readonly StampPreset[],
  selectedCategory: 'all' | StampCategory,
): StampCategory[] {
  return resolveStampPresetCategories(presets).filter(
    (category) => selectedCategory === 'all' || selectedCategory === category,
  );
}

export function resolveStampPresetsByCategory(
  presets: readonly StampPreset[],
  category: StampCategory,
): StampPreset[] {
  return presets.filter((preset) => preset.category === category);
}

export function resolveStampCategoryFilterClass(
  category: 'all' | StampCategory,
  selectedCategory: 'all' | StampCategory,
): string {
  if (selectedCategory === category) return 'bg-cyan-700 text-white';
  if (category === 'legacy') return 'bg-amber-950/40 text-amber-300 hover:bg-amber-900/30';
  return 'bg-gray-800 text-gray-400 hover:bg-gray-700';
}

export function resolveStampCategoryHeaderLabel(category: StampCategory): string {
  return category === 'legacy' ? 'legacy bank' : `core · ${category}`;
}

export function resolveStampCategoryHeaderClass(category: StampCategory): string {
  return `text-[10px] uppercase tracking-wide px-1 ${category === 'legacy' ? 'text-amber-500' : 'text-gray-500'}`;
}

export function resolveStampPresetButtonClass(preset: Pick<StampPreset, 'legacy'>): string {
  return preset.legacy
    ? 'bg-amber-950/30 hover:bg-amber-900/30 border border-amber-800/40'
    : 'bg-gray-800 hover:bg-gray-700';
}

export function resolveStampPresetKindLabel(preset: Pick<StampPreset, 'legacy' | 'category'>): string {
  return preset.legacy ? 'legacy' : preset.category;
}

export function resolveStampPresetKindClass(preset: Pick<StampPreset, 'legacy'>): string {
  return preset.legacy ? 'text-amber-400/90' : 'text-cyan-400/80';
}
