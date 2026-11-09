import { getWaveBodyExciterProfile, type Room3ExciterProfile } from '../../resonance/modalBody';
import type { WaveSoundPreset } from '../domain/instrumentData';

export type WaveStarterBodyExciterPlan = {
  profile: Room3ExciterProfile;
  freq: number;
  gain: number;
  voiceBudget: number;
  bodyScale: number;
};

export function estimateWaveStarterBodySourceDemand(preset: WaveSoundPreset): number {
  const profile = getWaveBodyExciterProfile(preset);
  return Math.min(4, profile.voices.length) + (profile.noiseGain > 0 ? 1 : 0);
}

export type ResolveWaveStarterBodyExciterPlanArgs = {
  preset: WaveSoundPreset;
  freq: number;
  volume: number;
  isSector: boolean;
  transientBodyScale: number;
  gradientAmount: number;
};

export function resolveWaveStarterBodyExciterPlan({
  preset,
  freq,
  volume,
  isSector,
  transientBodyScale,
  gradientAmount,
}: ResolveWaveStarterBodyExciterPlanArgs): WaveStarterBodyExciterPlan {
  return {
    profile: getWaveBodyExciterProfile(preset),
    freq,
    gain: volume * (isSector ? 2.4 : 1.9),
    voiceBudget: transientBodyScale >= 0.84 ? 4 : transientBodyScale >= 0.56 ? 2 : 1,
    bodyScale: transientBodyScale * (gradientAmount > 0.1 ? 0.9 : 1),
  };
}
