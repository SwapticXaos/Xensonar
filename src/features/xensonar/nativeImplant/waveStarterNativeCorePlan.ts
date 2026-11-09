import type { WaveSoundPreset } from "../domain/instrumentData";
import {
  buildWaveStarterPresetToneSpecs,
  WAVE_STARTER_SYNTH_PRESET_MANIFEST_VERSION,
} from "../audio/waveStarterPresetTonePlan";

export type ResolvedWaveStarterNativeCoreTone = {
  frequencyHz: number;
  gain: number;
  delaySec: number;
  durationSec: number;
  waveform: OscillatorType;
  resonance: number;
  cutoffHz: number;
  prominence: number;
};

export type ResolvedWaveStarterNativeCorePlan = {
  version: 1;
  kind: "xensonar-wave-starter-core-tone-plan";
  semanticSource: "wave-starter-synth-preset-v1";
  manifestVersion: string;
  parity: "parameter-plan-parity-core-v1";
  presetId: WaveSoundPreset;
  playbackFreqHz: number;
  peak: number;
  tones: readonly ResolvedWaveStarterNativeCoreTone[];
  excludedFromParity: readonly [
    "gradient-modulation",
    "extra-overtone-layer",
    "body-exciter",
    "swell-reinforcement",
    "sample-presets",
    "entrophon",
    "hold-worklet-special-path",
  ];
};

/**
 * Pure product-side semantic compiler. It is deliberately incapable of making
 * sound. The Xensonar manifest decides the timbral partial plan; Native only
 * receives already-resolved frequencies/gains/timing/filter parameters.
 */
export function buildResolvedWaveStarterNativeCorePlan(args: {
  presetId: WaveSoundPreset;
  playbackFreqHz: number;
  peak: number;
  isSector: boolean;
}): ResolvedWaveStarterNativeCorePlan {
  const tones = buildWaveStarterPresetToneSpecs(args.presetId, { isSector: args.isSector }).map((tone) => ({
    frequencyHz: args.playbackFreqHz * tone.freqMul,
    gain: args.peak * tone.gainMul,
    delaySec: tone.delay,
    durationSec: tone.duration,
    waveform: tone.waveform,
    resonance: tone.resonance,
    cutoffHz: tone.cutoffHz,
    prominence: tone.prominence,
  }));
  return {
    version: 1,
    kind: "xensonar-wave-starter-core-tone-plan",
    semanticSource: "wave-starter-synth-preset-v1",
    manifestVersion: WAVE_STARTER_SYNTH_PRESET_MANIFEST_VERSION,
    parity: "parameter-plan-parity-core-v1",
    presetId: args.presetId,
    playbackFreqHz: args.playbackFreqHz,
    peak: args.peak,
    tones,
    excludedFromParity: [
      "gradient-modulation",
      "extra-overtone-layer",
      "body-exciter",
      "swell-reinforcement",
      "sample-presets",
      "entrophon",
      "hold-worklet-special-path",
    ],
  };
}
