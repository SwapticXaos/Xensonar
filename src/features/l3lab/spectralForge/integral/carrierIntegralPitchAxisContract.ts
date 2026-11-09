import type { SpectralData } from '../audio/SpectralData';
import { yToFrequency } from '../audio/SpectralData';

export type CarrierIntegralPitchAxisContract = {
  readonly kind: 'spectralforge-mode-specific-pitch-axis';
  readonly minHz: 20;
  readonly maxHz: 20000;
  readonly scale: 'log';
  readonly primaryPitchTruth: 'mode-specific-visible-or-root-relative';
  readonly visibleAxisModes: readonly ['harmonic-xplore-direct-carrier', 'spektral-synthese-body'];
  readonly rootRelativePolytraceModes: readonly ['branch-a-line-traffic', 'branch-b573-synth-window', 'branch-c-interval-body'];
  readonly rootRelativePitchBendOctaves: 3;
};

export const CARRIER_INTEGRAL_ROOT_RELATIVE_POLYTRACE_PITCH_BEND_OCTAVES = 3 as const;

export const CARRIER_INTEGRAL_PITCH_AXIS_CONTRACT: CarrierIntegralPitchAxisContract = {
  kind: 'spectralforge-mode-specific-pitch-axis',
  minHz: 20,
  maxHz: 20000,
  scale: 'log',
  primaryPitchTruth: 'mode-specific-visible-or-root-relative',
  visibleAxisModes: ['harmonic-xplore-direct-carrier', 'spektral-synthese-body'],
  rootRelativePolytraceModes: ['branch-a-line-traffic', 'branch-b573-synth-window', 'branch-c-interval-body'],
  rootRelativePitchBendOctaves: CARRIER_INTEGRAL_ROOT_RELATIVE_POLYTRACE_PITCH_BEND_OCTAVES,
};

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return value < min ? min : value > max ? max : value;
}

export function carrierIntegralDisplayHzFromY(y: number, height: number): number {
  return yToFrequency(clamp(y, 0, Math.max(1, height) - 1), Math.max(1, height));
}

export function carrierIntegralDisplayLogHzFromY(y: number, height: number, pitchRatio: number = 1): number {
  const shiftedHz = carrierIntegralDisplayHzFromY(y, height) * clamp(pitchRatio, 0.0625, 16);
  return Math.log2(clamp(shiftedHz, 16, 20000));
}

export function carrierIntegralRootRelativePolytraceLogHzFromY(
  y: number,
  height: number,
  anchorRootHz: number,
): number {
  const normalizedY = 1.0 - (clamp(y, 0, Math.max(1, height) - 1) / Math.max(1, height - 1));
  const pitchBendOctaves = (normalizedY - 0.5) * CARRIER_INTEGRAL_ROOT_RELATIVE_POLYTRACE_PITCH_BEND_OCTAVES;
  return Math.log2(clamp(anchorRootHz, 16, 20000)) + pitchBendOctaves;
}

export function resolveCarrierIntegralDisplayAxisAnchorHz(
  spectralData: SpectralData | null | undefined,
  pitchRatio: number = 1,
): number {
  if (!spectralData || spectralData.width < 1 || spectralData.height < 1) return 110 * clamp(pitchRatio, 0.0625, 16);
  const stepX = Math.max(1, Math.floor(spectralData.width / 32));
  const stepY = Math.max(1, Math.floor(spectralData.height / 96));
  let weightedLogHz = 0;
  let weight = 0;
  for (let x = 0; x < spectralData.width; x += stepX) {
    for (let y = 0; y < spectralData.height; y += stepY) {
      const value = clamp(spectralData.get(x, y), 0, 1);
      if (value <= 0.01) continue;
      const emphasis = value * value;
      weightedLogHz += Math.log2(carrierIntegralDisplayHzFromY(y, spectralData.height)) * emphasis;
      weight += emphasis;
    }
  }
  if (weight <= 1e-9) return 110 * clamp(pitchRatio, 0.0625, 16);
  return clamp(Math.pow(2, weightedLogHz / weight) * clamp(pitchRatio, 0.0625, 16), 16, 20000);
}
