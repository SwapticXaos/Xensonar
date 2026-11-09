/**
 * Agent/particle tone plan data — preset → base tone events and sector direction profiles.
 * Extracted from resonanceAgentTones for data/logic separation (STRUCTURE simplify with each operation).
 */

import type { ParticlePreset } from "./config/types";

export type NexusAgentToneDirection = "left" | "right" | "up" | "down";

export type NexusAgentTonePlanEvent = {
  freqMul: number;
  offsetSeconds: number;
  durationSeconds: number;
  type: OscillatorType;
  volumeMul: number;
  q: number;
  cutoff: number;
};

export type SectorDirectionProfile = {
  leadType: OscillatorType;
  accentFreqMul: number;
  offsetMul: number;
  durationMul: number;
  volumeMul: number;
  cutoffLift: number;
};

export const BASE_TONE_PLANS: Record<ParticlePreset, NexusAgentTonePlanEvent[]> = {
  glass_ping: [
    { freqMul: 1, offsetSeconds: 0, durationSeconds: 0.6, type: "triangle", volumeMul: 1, q: 2, cutoff: 1800 },
    { freqMul: 2, offsetSeconds: 0.02, durationSeconds: 0.28, type: "sine", volumeMul: 0.45, q: 1, cutoff: 2400 },
  ],
  marimba: [
    { freqMul: 1, offsetSeconds: 0, durationSeconds: 0.28, type: "sine", volumeMul: 1.1, q: 1, cutoff: 1200 },
    { freqMul: 4.02, offsetSeconds: 0, durationSeconds: 0.1, type: "triangle", volumeMul: 0.34, q: 1, cutoff: 3000 },
  ],
  soft_pluck: [
    { freqMul: 1, offsetSeconds: 0, durationSeconds: 0.6, type: "sawtooth", volumeMul: 0.7, q: 4, cutoff: 800 },
  ],
  fm_bell: [
    { freqMul: 1, offsetSeconds: 0, durationSeconds: 0.82, type: "sine", volumeMul: 1, q: 1, cutoff: 2000 },
    { freqMul: 1.414, offsetSeconds: 0, durationSeconds: 0.52, type: "sine", volumeMul: 0.5, q: 1, cutoff: 2000 },
    { freqMul: 2.828, offsetSeconds: 0, durationSeconds: 0.26, type: "triangle", volumeMul: 0.24, q: 1, cutoff: 3000 },
  ],
  pizzicato: [
    { freqMul: 1, offsetSeconds: 0, durationSeconds: 0.14, type: "sawtooth", volumeMul: 0.84, q: 1, cutoff: 2500 },
    { freqMul: 1, offsetSeconds: 0.01, durationSeconds: 0.09, type: "square", volumeMul: 0.34, q: 3, cutoff: 1200 },
  ],
  steel_pan: [
    { freqMul: 1, offsetSeconds: 0, durationSeconds: 0.52, type: "triangle", volumeMul: 0.86, q: 1, cutoff: 1500 },
    { freqMul: 1.18, offsetSeconds: 0.02, durationSeconds: 0.42, type: "sine", volumeMul: 0.48, q: 1, cutoff: 2500 },
    { freqMul: 2.5, offsetSeconds: 0.05, durationSeconds: 0.28, type: "sine", volumeMul: 0.22, q: 1, cutoff: 3000 },
  ],
  crystal_bowl: [
    { freqMul: 1, offsetSeconds: 0, durationSeconds: 1.5, type: "sine", volumeMul: 1, q: 1, cutoff: 1000 },
    { freqMul: 1.0034, offsetSeconds: 0.1, durationSeconds: 1.5, type: "sine", volumeMul: 1, q: 1, cutoff: 1000 },
  ],
  woodblock: [
    { freqMul: 1, offsetSeconds: 0, durationSeconds: 0.08, type: "square", volumeMul: 0.8, q: 1, cutoff: 1200 },
    { freqMul: 0.5, offsetSeconds: 0, durationSeconds: 0.06, type: "triangle", volumeMul: 1.1, q: 1, cutoff: 800 },
  ],
  kalimba: [
    { freqMul: 1, offsetSeconds: 0, durationSeconds: 0.42, type: "sine", volumeMul: 1, q: 1, cutoff: 1400 },
    { freqMul: 2.5, offsetSeconds: 0.01, durationSeconds: 0.18, type: "triangle", volumeMul: 0.38, q: 1, cutoff: 2200 },
    { freqMul: 4, offsetSeconds: 0.03, durationSeconds: 0.1, type: "sine", volumeMul: 0.18, q: 1, cutoff: 2800 },
  ],
  gong: [
    { freqMul: 1, offsetSeconds: 0, durationSeconds: 1.2, type: "sine", volumeMul: 1, q: 0.8, cutoff: 600 },
    { freqMul: 1.5, offsetSeconds: 0.04, durationSeconds: 0.9, type: "triangle", volumeMul: 0.52, q: 1, cutoff: 1200 },
    { freqMul: 2.25, offsetSeconds: 0.08, durationSeconds: 0.6, type: "sine", volumeMul: 0.28, q: 1, cutoff: 1800 },
    { freqMul: 3, offsetSeconds: 0.12, durationSeconds: 0.35, type: "triangle", volumeMul: 0.14, q: 1, cutoff: 2400 },
  ],
  chime: [
    { freqMul: 1, offsetSeconds: 0, durationSeconds: 0.48, type: "sine", volumeMul: 1, q: 1.2, cutoff: 2200 },
    { freqMul: 2.5, offsetSeconds: 0.01, durationSeconds: 0.32, type: "triangle", volumeMul: 0.42, q: 1, cutoff: 2800 },
    { freqMul: 3.5, offsetSeconds: 0.02, durationSeconds: 0.18, type: "sine", volumeMul: 0.22, q: 1, cutoff: 3200 },
  ],
  tine: [
    { freqMul: 1, offsetSeconds: 0, durationSeconds: 0.22, type: "sine", volumeMul: 1, q: 1.4, cutoff: 2600 },
    { freqMul: 2.25, offsetSeconds: 0.005, durationSeconds: 0.14, type: "triangle", volumeMul: 0.48, q: 1, cutoff: 3200 },
    { freqMul: 4.5, offsetSeconds: 0.01, durationSeconds: 0.08, type: "sine", volumeMul: 0.2, q: 1, cutoff: 3400 },
  ],
  reed_tap: [
    { freqMul: 1, offsetSeconds: 0, durationSeconds: 0.16, type: "sine", volumeMul: 1, q: 1.2, cutoff: 1400 },
    { freqMul: 1.5, offsetSeconds: 0.008, durationSeconds: 0.1, type: "triangle", volumeMul: 0.44, q: 1, cutoff: 2000 },
    { freqMul: 2.25, offsetSeconds: 0.014, durationSeconds: 0.06, type: "sine", volumeMul: 0.2, q: 1, cutoff: 2400 },
  ],
  blip: [
    { freqMul: 1, offsetSeconds: 0, durationSeconds: 0.08, type: "sine", volumeMul: 1, q: 1.2, cutoff: 2000 },
    { freqMul: 2, offsetSeconds: 0.004, durationSeconds: 0.04, type: "triangle", volumeMul: 0.5, q: 1, cutoff: 2800 },
  ],
  spark: [
    { freqMul: 1, offsetSeconds: 0, durationSeconds: 0.06, type: "sine", volumeMul: 1, q: 1.4, cutoff: 2600 },
    { freqMul: 2.5, offsetSeconds: 0.002, durationSeconds: 0.04, type: "triangle", volumeMul: 0.6, q: 1, cutoff: 3200 },
  ],
  shimmer: [
    { freqMul: 1, offsetSeconds: 0, durationSeconds: 0.32, type: "sine", volumeMul: 1, q: 1.2, cutoff: 2000 },
    { freqMul: 1.26, offsetSeconds: 0.02, durationSeconds: 0.24, type: "sine", volumeMul: 0.5, q: 1, cutoff: 2400 },
    { freqMul: 2, offsetSeconds: 0.04, durationSeconds: 0.16, type: "triangle", volumeMul: 0.35, q: 1, cutoff: 2800 },
    { freqMul: 2.5, offsetSeconds: 0.06, durationSeconds: 0.1, type: "sine", volumeMul: 0.18, q: 1, cutoff: 3200 },
  ],
  dust: [
    { freqMul: 1, offsetSeconds: 0, durationSeconds: 0.18, type: "sine", volumeMul: 0.9, q: 1, cutoff: 1600 },
    { freqMul: 1.5, offsetSeconds: 0.008, durationSeconds: 0.1, type: "triangle", volumeMul: 0.35, q: 1, cutoff: 2200 },
  ],
  pebble: [
    { freqMul: 1, offsetSeconds: 0, durationSeconds: 0.12, type: "sine", volumeMul: 0.85, q: 1.2, cutoff: 1400 },
    { freqMul: 1.33, offsetSeconds: 0.006, durationSeconds: 0.08, type: "triangle", volumeMul: 0.4, q: 1, cutoff: 2000 },
  ],
};

export const SECTOR_DIRECTION_PROFILES: Record<NexusAgentToneDirection, SectorDirectionProfile> = {
  right: {
    leadType: "triangle",
    accentFreqMul: 2.02,
    offsetMul: 0.56,
    durationMul: 0.58,
    volumeMul: 0.74,
    cutoffLift: 720,
  },
  left: {
    leadType: "sine",
    accentFreqMul: 1.5,
    offsetMul: 0.76,
    durationMul: 0.72,
    volumeMul: 0.62,
    cutoffLift: 360,
  },
  up: {
    leadType: "triangle",
    accentFreqMul: 2.5,
    offsetMul: 0.44,
    durationMul: 0.5,
    volumeMul: 0.68,
    cutoffLift: 940,
  },
  down: {
    leadType: "sine",
    accentFreqMul: 1.25,
    offsetMul: 0.82,
    durationMul: 0.84,
    volumeMul: 0.6,
    cutoffLift: 220,
  },
};
