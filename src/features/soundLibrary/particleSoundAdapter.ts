import type { ParticlePreset } from '@/features/xensonar/domain/instrumentData';
import { PARTICLE_PRESETS } from '@/features/xensonar/domain/instrumentData';
import { resolveSharedSoundEntry } from './sharedSoundCatalog';

const DEFAULT_PARTICLE_PRESET: ParticlePreset = 'dust_chime';
const DEFAULT_RESIDENT_SAMPLE_FALLBACK_PRESET: ParticlePreset = 'fm_bell';
const RAW_PARTICLE_PRESET_VALUES = new Set<string>(PARTICLE_PRESETS.map((entry) => entry.value));

export type ParticlePlaybackSelection =
  | { kind: 'preset'; presetId: ParticlePreset; selectionId: string }
  | { kind: 'sample'; sampleId: string; fallbackPresetId: ParticlePreset; selectionId: string; elasticPitchStable?: boolean };

export function resolveParticlePlaybackSelection(selectionId: string | undefined): ParticlePlaybackSelection {
  if (!selectionId) return { kind: 'preset', presetId: DEFAULT_PARTICLE_PRESET, selectionId: DEFAULT_PARTICLE_PRESET };
  if (selectionId.startsWith('resident-elastic-sample:')) {
    return {
      kind: 'sample',
      sampleId: selectionId.slice('resident-elastic-sample:'.length),
      fallbackPresetId: DEFAULT_RESIDENT_SAMPLE_FALLBACK_PRESET,
      selectionId,
      elasticPitchStable: true,
    };
  }
  if (selectionId.startsWith('resident-sample:')) {
    return {
      kind: 'sample',
      sampleId: selectionId.slice('resident-sample:'.length),
      fallbackPresetId: DEFAULT_RESIDENT_SAMPLE_FALLBACK_PRESET,
      selectionId,
      elasticPitchStable: false,
    };
  }
  if (selectionId.startsWith('sample:')) {
    return {
      kind: 'sample',
      sampleId: selectionId.slice('sample:'.length),
      fallbackPresetId: DEFAULT_PARTICLE_PRESET,
      selectionId,
      elasticPitchStable: false,
    };
  }
  if (RAW_PARTICLE_PRESET_VALUES.has(selectionId)) {
    return { kind: 'preset', presetId: selectionId as ParticlePreset, selectionId };
  }
  const shared = resolveSharedSoundEntry(selectionId);
  if (shared?.particlePresetId) {
    return {
      kind: 'preset',
      presetId: shared.particlePresetId,
      selectionId,
    };
  }
  return { kind: 'preset', presetId: DEFAULT_PARTICLE_PRESET, selectionId: DEFAULT_PARTICLE_PRESET };
}

export function resolveParticlePlaybackPresetId(selectionId: string | undefined): ParticlePreset {
  const selection = resolveParticlePlaybackSelection(selectionId);
  return selection.kind === 'preset' ? selection.presetId : selection.fallbackPresetId;
}
