import type { WaveSoundPreset } from '../domain/instrumentData';

export type WaveStarterSwellReinforcementTone = {
  toneFreq: number;
  delay: number;
  duration: number;
  waveform: OscillatorType;
  gain: number;
  resonance: number;
  cutoffHz: number;
  prominence: number;
};

export type ResolveWaveStarterSwellReinforcementPlanArgs = {
  baseFreq: number;
  runtimeVolume: number;
  isSector: boolean;
  preset: WaveSoundPreset;
  swellBlend: number;
};

export function resolveWaveStarterSwellReinforcementPlan({
  baseFreq,
  runtimeVolume,
  isSector,
  preset,
  swellBlend,
}: ResolveWaveStarterSwellReinforcementPlanArgs): WaveStarterSwellReinforcementTone | null {
  if (swellBlend <= 0.02) return null;

  const reinforcementWave: OscillatorType = preset === 'clean_pluck' || preset === 'reed_sigh'
    ? 'triangle'
    : preset === 'spark_chime' || preset === 'vibrato_glass'
      ? 'triangle'
      : 'sine';

  return {
    toneFreq: baseFreq * 2,
    delay: 0,
    duration: 0.2 + swellBlend * 0.14,
    waveform: reinforcementWave,
    gain: runtimeVolume * (0.12 + swellBlend * 0.3) * (isSector ? 1.08 : 1),
    resonance: 1.2 + swellBlend * 1.1,
    cutoffHz: 1600 + swellBlend * 1800,
    prominence: 0.44 + swellBlend * 0.18,
  };
}
