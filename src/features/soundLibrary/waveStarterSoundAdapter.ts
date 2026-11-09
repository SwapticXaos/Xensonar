import type { WaveSoundPreset } from '@/features/xensonar/domain/instrumentData';
import { WAVE_SOUND_PRESETS } from '@/features/xensonar/domain/instrumentData';
import { resolveSharedSoundEntry } from './sharedSoundCatalog';

const DEFAULT_WAVE_STARTER_PRESET: WaveSoundPreset = 'tape_halo';
const RAW_WAVE_PRESET_VALUES = new Set<string>(WAVE_SOUND_PRESETS.map((entry) => entry.value));

export type WaveStarterPlaybackSelection =
  | { kind: 'preset'; presetId: WaveSoundPreset }
  | { kind: 'sample'; sampleId: string };

export function resolveWaveStarterPlaybackSelection(selectionId: string | undefined): WaveStarterPlaybackSelection {
  if (!selectionId) return { kind: 'preset', presetId: DEFAULT_WAVE_STARTER_PRESET };
  if (selectionId.startsWith('sample:')) {
    return { kind: 'sample', sampleId: selectionId.slice('sample:'.length) };
  }
  if (RAW_WAVE_PRESET_VALUES.has(selectionId)) return { kind: 'preset', presetId: selectionId as WaveSoundPreset };
  return {
    kind: 'preset',
    presetId: resolveSharedSoundEntry(selectionId)?.waveStarterPresetId ?? DEFAULT_WAVE_STARTER_PRESET,
  };
}

export function resolveWaveStarterPlaybackPresetId(selectionId: string | undefined): WaveSoundPreset {
  const selection = resolveWaveStarterPlaybackSelection(selectionId);
  return selection.kind === 'preset' ? selection.presetId : DEFAULT_WAVE_STARTER_PRESET;
}
