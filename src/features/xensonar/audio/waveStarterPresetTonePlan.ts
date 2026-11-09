import type { WaveSoundPreset } from '../domain/instrumentData';
import manifest from './waveStarterSynthPresetManifest.json';

export type WaveStarterPresetToneSpec = {
  freqMul: number;
  delay: number;
  duration: number;
  waveform: OscillatorType;
  gainMul: number;
  resonance: number;
  cutoffHz: number;
  prominence: number;
};

type ManifestTone = Omit<WaveStarterPresetToneSpec, 'waveform'> & { waveform: string };
type ManifestShape = {
  version: string;
  presets: Record<WaveSoundPreset, ManifestTone[]>;
};

const SYNTH_PRESET_MANIFEST = manifest as ManifestShape;

export const WAVE_STARTER_SYNTH_PRESET_MANIFEST_VERSION = SYNTH_PRESET_MANIFEST.version;

/** Cold-derived admission metadata: available without constructing a TonePlan. */
const renderDemand = Object.fromEntries(Object.entries(SYNTH_PRESET_MANIFEST.presets)
  .map(([key, tones]) => [key, { voices: tones.length, units: tones.length * 2 }]));
export function getWaveStarterPresetRenderDemand(preset: string) {
  return renderDemand[preset];
}

export function buildWaveStarterPresetToneSpecs(
  preset: WaveSoundPreset,
  args: { isSector: boolean },
): WaveStarterPresetToneSpec[] {
  void args.isSector;
  return (SYNTH_PRESET_MANIFEST.presets[preset] ?? []).map((tone) => ({
    ...tone,
    waveform: tone.waveform as OscillatorType,
  }));
}
