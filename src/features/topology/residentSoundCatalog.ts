import type { ParticlePreset } from "../xensonar/domain/instrumentData";
import type { BuiltInInstallationResidentSoundPreset, InstallationResidentSoundPreset } from "./installationFieldConfig";

export type ResidentSamplePlaybackPreset = `resident-sample:${string}` | `resident-elastic-sample:${string}`;

export type ResidentCollisionVoice = {
  preset: ParticlePreset | ResidentSamplePlaybackPreset;
  ampMul: number;
  freqMul: number;
};

export type ResidentSoundDefinition = {
  value: InstallationResidentSoundPreset;
  label: string;
  collision: ResidentCollisionVoice;
};

export const RESIDENT_SOUND_OPTIONS: ResidentSoundDefinition[] = [
  { value: "glass_needle", label: "Glasnadel", collision: { preset: "fm_bell", ampMul: 0.84, freqMul: 1.02 } },
  { value: "wire_bow", label: "Drahtbogen", collision: { preset: "reed_tap", ampMul: 0.82, freqMul: 0.99 } },
  { value: "hollow_wood", label: "Hohlholz", collision: { preset: "woodblock", ampMul: 0.9, freqMul: 0.96 } },
  { value: "star_chime", label: "Sternenglocke", collision: { preset: "chime", ampMul: 0.8, freqMul: 1.12 } },
  { value: "resonance_pipe", label: "Resonanzrohr", collision: { preset: "gong", ampMul: 0.86, freqMul: 0.92 } },
  { value: "signal_splitter", label: "Signalsplitter", collision: { preset: "blip", ampMul: 0.72, freqMul: 1.18 } },
];

const DEFAULT_SAMPLE_FALLBACK_PRESET: ParticlePreset = "fm_bell";
const RESIDENT_SOUND_MAP = Object.fromEntries(RESIDENT_SOUND_OPTIONS.map((entry) => [entry.value, entry])) as Record<BuiltInInstallationResidentSoundPreset, ResidentSoundDefinition>;

export function isResidentSampleSelection(preset: InstallationResidentSoundPreset | string | undefined): preset is `sample:${string}` {
  return typeof preset === 'string' && preset.startsWith('sample:');
}

export function toResidentSamplePlaybackPreset(sampleId: string, elasticPitch = false): ResidentSamplePlaybackPreset {
  return elasticPitch ? `resident-elastic-sample:${sampleId}` : `resident-sample:${sampleId}`;
}

export function resolveResidentSoundDefinition(preset: InstallationResidentSoundPreset, options?: { elasticPitch?: boolean }): ResidentSoundDefinition {
  if (isResidentSampleSelection(preset)) {
    const sampleId = preset.slice('sample:'.length);
    return {
      value: preset,
      label: 'Resident Sample',
      collision: {
        preset: toResidentSamplePlaybackPreset(sampleId, !!options?.elasticPitch),
        ampMul: 1,
        freqMul: 1,
      },
    };
  }
  return RESIDENT_SOUND_MAP[preset as BuiltInInstallationResidentSoundPreset] ?? RESIDENT_SOUND_OPTIONS[0];
}

export function getResidentSampleFallbackPreset(): ParticlePreset {
  return DEFAULT_SAMPLE_FALLBACK_PRESET;
}
