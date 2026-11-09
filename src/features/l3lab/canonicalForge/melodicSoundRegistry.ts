import { describeMelodicSamplePitchAnchor, type SavedMelodicSampleMeta } from './melodicSampleLibrary';
import {
  SHARED_SOUND_GROUPS,
  getSharedSoundMenuEntriesForSurface,
  resolveSharedSoundEntry,
  type SharedSoundEntry,
  type SharedSoundGroup,
  type SharedSoundGroupId,
} from '@/features/soundLibrary/sharedSoundCatalog';

export type LoopTrackInstrumentPreset = string;
export type MelodicSoundGroupId = SharedSoundGroupId;
export type MelodicSoundEntry = SharedSoundEntry & {
  sampleId?: string;
  baseHz?: number | null;
};
export type MelodicSoundGroup = SharedSoundGroup;

export type MelodicSoundOptionGroup = MelodicSoundGroup & {
  options: Array<Pick<MelodicSoundEntry, 'id' | 'label' | 'hint' | 'originLabel' | 'baseHz'>>;
};

export const MELODIC_SOUND_GROUPS: MelodicSoundGroup[] = SHARED_SOUND_GROUPS;
export const BUILT_IN_MELODIC_SOUNDS: MelodicSoundEntry[] = getSharedSoundMenuEntriesForSurface('melodic_loop');
export const BUILT_IN_MELODIC_SOUND_MAP: Record<string, MelodicSoundEntry> = Object.fromEntries(BUILT_IN_MELODIC_SOUNDS.map((entry) => [entry.id, entry]));

export function toSampleInstrumentPresetId(sampleId: string) {
  return `sample:${sampleId}`;
}

export function buildSampleMelodicSoundEntry(sample: SavedMelodicSampleMeta): MelodicSoundEntry {
  return {
    id: toSampleInstrumentPresetId(sample.id),
    label: sample.name,
    groupId: 'samples',
    family: 'sample',
    originLabel: 'Samples',
    hint: describeMelodicSamplePitchAnchor(sample),
    adapterPresetId: null,
    waveStarterPresetId: null,
    sourceKind: 'sample',
    surfaceSupport: {
      melodic_loop: 'full',
      wave_starter: 'experimental',
      particle: 'hidden',
      drone: 'hidden',
    },
    sampleId: sample.id,
    baseHz: sample.baseHz,
  };
}

export function resolveMelodicSoundEntry(presetId: string | undefined, samples: SavedMelodicSampleMeta[] = []): MelodicSoundEntry | null {
  if (!presetId) return null;
  if (presetId.startsWith('sample:')) {
    const sampleId = presetId.slice('sample:'.length);
    const sample = samples.find((entry) => entry.id === sampleId);
    return sample ? buildSampleMelodicSoundEntry(sample) : null;
  }
  return resolveSharedSoundEntry(presetId);
}

export function getMelodicSoundDisplayLabel(presetId: string | undefined, samples: SavedMelodicSampleMeta[] = []) {
  return resolveMelodicSoundEntry(presetId, samples)?.label ?? presetId ?? 'Klang';
}

function labelWithOrigin(label: string, originLabel: string) {
  return label.includes(`· ${originLabel}`) ? label : `${label} · ${originLabel}`;
}

export function buildMelodicInstrumentOptionGroups(samples: SavedMelodicSampleMeta[] = []): MelodicSoundOptionGroup[] {
  const combinedEntries: MelodicSoundEntry[] = [...BUILT_IN_MELODIC_SOUNDS, ...samples.map(buildSampleMelodicSoundEntry)];
  return MELODIC_SOUND_GROUPS.map((group) => ({
    ...group,
    options: combinedEntries
      .filter((entry) => entry.groupId === group.id)
      .sort((a, b) => a.label.localeCompare(b.label))
      .map((entry) => ({ id: entry.id, label: labelWithOrigin(entry.label, entry.originLabel), hint: entry.hint, originLabel: entry.originLabel, baseHz: entry.baseHz })),
  })).filter((group) => group.options.length > 0);
}

export const LOOP_TRACK_INSTRUMENTS = BUILT_IN_MELODIC_SOUNDS.map((entry) => ({ id: entry.id, label: entry.label, hint: entry.hint }));
