import { describeMelodicSamplePitchAnchor, type SavedMelodicSampleMeta } from '@/features/l3lab/canonicalForge/melodicSampleLibrary';
import { RESIDENT_SOUND_OPTIONS } from './residentSoundCatalog';

function labelWithOrigin(label: string, originLabel: string) {
  return label.includes(`· ${originLabel}`) ? label : `${label} · ${originLabel}`;
}

export type ResidentSoundMenuOption = {
  value: string;
  label: string;
  hint: string;
  originLabel: string;
};

export type ResidentSoundMenuGroup = {
  id: 'resident_builtins' | 'samples';
  label: string;
  options: ResidentSoundMenuOption[];
};

function buildResidentSampleMenuOption(sample: SavedMelodicSampleMeta): ResidentSoundMenuOption {
  return {
    value: `sample:${sample.id}`,
    label: labelWithOrigin(sample.name, 'Samples'),
    hint: `Samplespeicher · ${describeMelodicSamplePitchAnchor(sample)}`,
    originLabel: 'Samples',
  };
}

const BUILT_IN_RESIDENT_SOUND_MENU_OPTIONS: ResidentSoundMenuOption[] = RESIDENT_SOUND_OPTIONS
  .map((entry) => ({
    value: entry.value,
    label: labelWithOrigin(entry.label, 'Residents'),
    hint: 'Eingebaute Resident-Klangfarbe',
    originLabel: 'Residents',
  }))
  .sort((a, b) => a.label.localeCompare(b.label));

export function buildResidentSoundMenuGroups(samples: SavedMelodicSampleMeta[] = []): ResidentSoundMenuGroup[] {
  const groups: ResidentSoundMenuGroup[] = [
    { id: 'resident_builtins', label: 'Resident-Klangfarben', options: BUILT_IN_RESIDENT_SOUND_MENU_OPTIONS },
  ];
  if (samples.length > 0) {
    groups.push({
      id: 'samples',
      label: 'Samplespeicher',
      options: samples.map(buildResidentSampleMenuOption).sort((a, b) => a.label.localeCompare(b.label)),
    });
  }
  return groups;
}
