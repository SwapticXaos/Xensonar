import { describeMelodicSamplePitchAnchor, type SavedMelodicSampleMeta } from '@/features/l3lab/canonicalForge/melodicSampleLibrary';
import { getSharedSoundMenuEntriesForSurface, type SharedSoundGroupId } from './sharedSoundCatalog';

function labelWithOrigin(label: string, originLabel: string) {
  return label.includes(`· ${originLabel}`) ? label : `${label} · ${originLabel}`;
}

export type WaveStarterSoundMenuOption = {
  value: string;
  label: string;
  groupId: SharedSoundGroupId;
  hint: string;
  originLabel: string;
};

function buildWaveStarterSampleMenuOption(sample: SavedMelodicSampleMeta): WaveStarterSoundMenuOption {
  return {
    value: `sample:${sample.id}`,
    label: sample.name,
    groupId: 'samples',
    hint: `Samplespeicher · ${describeMelodicSamplePitchAnchor(sample)}`,
    originLabel: 'Samples',
  };
}

const normalizeWaveMenuValue = (entry: { id: string; sourceKind: string }) => entry.sourceKind === 'wave' && entry.id.startsWith('wave:')
  ? entry.id.slice('wave:'.length)
  : entry.id;

const BUILT_IN_WAVE_STARTER_SOUND_MENU_OPTIONS: WaveStarterSoundMenuOption[] = getSharedSoundMenuEntriesForSurface('wave_starter')
  .filter((entry) => entry.waveStarterPresetId)
  .map((entry) => ({
    value: normalizeWaveMenuValue(entry),
    label: entry.sourceKind === 'wave'
      ? labelWithOrigin(entry.label.replace(/ · Wellenstarter$/, ''), entry.originLabel)
      : labelWithOrigin(entry.label, entry.originLabel),
    groupId: entry.groupId,
    hint: entry.hint,
    originLabel: entry.originLabel,
  }))
  .sort((a, b) => a.label.localeCompare(b.label));

export function buildWaveStarterSoundMenuOptions(samples: SavedMelodicSampleMeta[] = []): WaveStarterSoundMenuOption[] {
  const builtIns = [...BUILT_IN_WAVE_STARTER_SOUND_MENU_OPTIONS]
    .sort((a, b) => a.label.localeCompare(b.label));
  const sampleOptions = samples.map(buildWaveStarterSampleMenuOption)
    .sort((a, b) => a.label.localeCompare(b.label));
  return [...builtIns, ...sampleOptions];
}

export const WAVE_STARTER_SOUND_MENU_OPTIONS: WaveStarterSoundMenuOption[] = buildWaveStarterSoundMenuOptions();
export const WAVE_STARTER_SOUND_MENU_VALUES = new Set(WAVE_STARTER_SOUND_MENU_OPTIONS.map((entry) => entry.value));
