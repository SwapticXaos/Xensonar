import { describeMelodicSamplePitchAnchor, type SavedMelodicSampleMeta } from '@/features/l3lab/canonicalForge/melodicSampleLibrary';
import { PARTICLE_PRESETS } from '@/features/xensonar/domain/instrumentData';

function labelWithOrigin(label: string, originLabel: string) {
  return label.includes(`· ${originLabel}`) ? label : `${label} · ${originLabel}`;
}

export type ParticleSoundMenuOption = {
  value: string;
  label: string;
  hint: string;
  originLabel: string;
};

function buildParticleSampleMenuOption(sample: SavedMelodicSampleMeta): ParticleSoundMenuOption {
  return {
    value: `sample:${sample.id}`,
    label: labelWithOrigin(sample.name, 'Samples'),
    hint: `Samplespeicher · ${describeMelodicSamplePitchAnchor(sample)}`,
    originLabel: 'Samples',
  };
}

const BUILT_IN_PARTICLE_SOUND_MENU_OPTIONS: ParticleSoundMenuOption[] = PARTICLE_PRESETS
  .map((entry) => ({
    value: entry.value,
    label: labelWithOrigin(entry.label, 'Partikel'),
    hint: 'Eingebautes Partikel-Preset',
    originLabel: 'Partikel',
  }))
  .sort((a, b) => a.label.localeCompare(b.label));

export function buildParticleSoundMenuOptions(samples: SavedMelodicSampleMeta[] = []): ParticleSoundMenuOption[] {
  return [...BUILT_IN_PARTICLE_SOUND_MENU_OPTIONS, ...samples.map(buildParticleSampleMenuOption)]
    .sort((a, b) => a.label.localeCompare(b.label));
}

export const PARTICLE_SOUND_MENU_OPTIONS: ParticleSoundMenuOption[] = buildParticleSoundMenuOptions();
export const PARTICLE_SOUND_MENU_VALUES = new Set(PARTICLE_SOUND_MENU_OPTIONS.map((entry) => entry.value));
