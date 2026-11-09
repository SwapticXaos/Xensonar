import type { ResonanceHotkeyMode } from '../rooms/materialLoopPanel/materialLoopPanelTypes';

export type ResonanceHotkeyModeStatusLabel =
  | 'Materialspur'
  | 'Root-Follow-Loop'
  | 'Partikel Mute Pattern';

export const RESONANCE_HOTKEY_MODE_STATUS_PROBE = {
  cleanupKind: 'resonance-hotkey-mode-status-label',
  ownsRuntime: false,
  ownsEffects: false,
  ownsAudioGraph: false,
  onlyMovesExistingStatusLabelDerivation: true,
  explicitlyNotMoved: [
    'hotkey routing',
    'material/root-follow loop selection',
    'particle classic hotkey behavior',
  ] as const,
} as const;

export function formatResonanceHotkeyModeStatusLabel(
  mode: ResonanceHotkeyMode,
): ResonanceHotkeyModeStatusLabel {
  if (mode === 'root-follow') return 'Root-Follow-Loop';
  if (mode === 'particle-classic') return 'Partikel Mute Pattern';
  return 'Materialspur';
}
