import { generateRhythmForgePattern } from '../resonance/rhythmforge/patterns';
import type { GrooveDescriptorVector } from '../resonance/rhythmforge/types';
import type { DrumPattern } from './domain/instrumentData';

export type DrumLaneId = 'kick' | 'snare' | 'hatClosed' | 'hatOpen' | 'clap' | 'perc';
export type DrumTriggerTiming = 'exact' | 'early' | 'late';

export type DrumStepTrigger = {
  laneId: DrumLaneId;
  intensity: number;
  timing?: DrumTriggerTiming;
  levelMultiplier?: number;
};

export type DrumPatternMatrix = {
  pattern: DrumPattern;
  bars: number;
  stepCount: number;
  laneOrder: DrumLaneId[];
  laneSteps: Record<DrumLaneId, number[]>;
  sourceKind: 'static' | 'rhythmforge';
};

export const DRUM_LANE_ORDER: DrumLaneId[] = ['kick', 'snare', 'hatClosed', 'hatOpen', 'clap', 'perc'];

export const DEFAULT_RHYTHMFORGE_DRUM_DESCRIPTORS: GrooveDescriptorVector = {
  pressure: 0.54,
  turbulence: 0.44,
  fracture: 0.34,
  crystallization: 0.5,
  orbitality: 0.46,
  cohesion: 0.52,
  recurrence: 0.5,
};

export function isRhythmForgeDrumPattern(pattern: DrumPattern | string): pattern is DrumPattern {
  return pattern === 'forge_rooted' || pattern === 'forge_braided' || pattern === 'forge_fractured';
}

export function getRhythmForgeDrumFlavor(pattern: DrumPattern | string): 'rooted' | 'braided' | 'fractured' {
  if (pattern === 'forge_braided') return 'braided';
  if (pattern === 'forge_fractured') return 'fractured';
  return 'rooted';
}

export function createEmptyDrumPatternMatrix(pattern: DrumPattern, bars: number): DrumPatternMatrix {
  const safeBars = Math.max(1, Math.round(bars));
  const stepCount = safeBars * 16;
  return {
    pattern,
    bars: safeBars,
    stepCount,
    laneOrder: [...DRUM_LANE_ORDER],
    laneSteps: Object.fromEntries(DRUM_LANE_ORDER.map((laneId) => [laneId, Array.from({ length: stepCount }, () => 0)])) as Record<DrumLaneId, number[]>,
    sourceKind: isRhythmForgeDrumPattern(pattern) ? 'rhythmforge' : 'static',
  };
}

function applyTrigger(matrix: DrumPatternMatrix, stepIndex: number, trigger: DrumStepTrigger) {
  const lane = matrix.laneSteps[trigger.laneId] ?? [];
  lane[stepIndex] = Math.max(lane[stepIndex] ?? 0, trigger.intensity);
  matrix.laneSteps[trigger.laneId] = lane;
}

const makeTrigger = (laneId: DrumLaneId, intensity: number, timing: DrumTriggerTiming = 'exact', levelMultiplier = 1): DrumStepTrigger => ({ laneId, intensity, timing, levelMultiplier });

export function getStaticDrumStepTriggers(pattern: DrumPattern, step: number): DrumStepTrigger[] {
  if (pattern === 'trip_hop') {
    return [
      ...(step === 0 || step === 10 ? [makeTrigger('kick', 1, 'exact', 1)] : []),
      ...(step === 4 || step === 12 ? [makeTrigger('snare', 0.92, 'exact', 0.96)] : []),
      ...(step % 2 === 0 ? [makeTrigger('hatClosed', 0.62, 'exact', 0.26)] : []),
      ...(step === 7 || step === 15 ? [makeTrigger('hatOpen', 0.72, 'late', 0.3)] : []),
      ...(step === 3 || step === 11 ? [makeTrigger('perc', 0.72, 'early', 0.18)] : []),
    ];
  }
  if (pattern === 'four_on_floor') {
    return [
      ...(step % 4 === 0 ? [makeTrigger('kick', 1, 'exact', 1)] : []),
      ...(step === 4 || step === 12 ? [makeTrigger('snare', 0.8, 'exact', 0.62)] : []),
      ...(step % 2 === 0 ? [makeTrigger('hatClosed', 0.66, 'late', 0.3)] : []),
      ...(step === 7 || step === 15 ? [makeTrigger('hatOpen', 0.6, 'late', 0.28)] : []),
    ];
  }
  if (pattern === 'breakbeat') {
    return [
      ...([0, 5, 8, 13].includes(step) ? [makeTrigger('kick', step === 13 ? 0.86 : 1, step === 5 ? 'early' : 'exact', step === 13 ? 0.82 : 1)] : []),
      ...(step === 4 || step === 12 ? [makeTrigger('snare', 0.96, 'exact', 1)] : []),
      ...(step === 11 ? [makeTrigger('clap', 0.72, 'late', 0.26)] : []),
      ...(step % 2 !== 0 ? [makeTrigger('hatClosed', 0.6, 'late', 0.28)] : []),
      ...(step === 15 ? [makeTrigger('hatOpen', 0.58, 'late', 0.22)] : []),
    ];
  }
  if (pattern === 'idm') {
    return [
      ...([0, 7, 9, 14].includes(step) ? [makeTrigger('kick', step === 9 ? 0.84 : 1, 'exact', step === 9 ? 0.86 : 1)] : []),
      ...(step === 4 || step === 11 ? [makeTrigger('snare', 0.9, 'exact', 0.9)] : []),
      makeTrigger(step % 3 === 0 ? 'hatClosed' : 'perc', step % 3 === 0 ? 0.62 : 0.48, 'late', 0.28),
      ...(step === 6 || step === 15 ? [makeTrigger('clap', 0.66, 'late', 0.18)] : []),
    ];
  }
  if (pattern === 'minimal_techno') {
    return [
      ...(step % 2 === 0 ? [makeTrigger('hatClosed', 0.64, 'late', 0.32)] : []),
      ...(step === 7 || step === 15 ? [makeTrigger('hatOpen', 0.56, 'late', 0.18)] : []),
    ];
  }
  if (pattern === 'duststep') {
    return [
      ...([0, 7, 10].includes(step) ? [makeTrigger('kick', step === 10 ? 0.84 : 1, step === 7 ? 'early' : 'exact', step === 10 ? 0.88 : 1)] : []),
      ...(step === 4 || step === 12 ? [makeTrigger('snare', 0.94, 'exact', 0.92)] : []),
      ...([2, 6, 8, 11, 14].includes(step) ? [makeTrigger('hatClosed', 0.68, 'late', 0.36)] : []),
      ...(step === 15 ? [makeTrigger('hatOpen', 0.58, 'late', 0.22)] : []),
      ...(step === 3 || step === 9 ? [makeTrigger('perc', 0.68, 'early', 0.22)] : []),
    ];
  }
  if (pattern === 'broken_lilt') {
    return [
      ...([0, 6, 11, 14].includes(step) ? [makeTrigger('kick', step === 14 ? 0.76 : 1, step === 6 ? 'early' : 'exact', step === 14 ? 0.72 : 1)] : []),
      ...(step === 4 || step === 13 ? [makeTrigger('snare', 0.88, step === 13 ? 'late' : 'exact', 0.86)] : []),
      ...([1, 3, 7, 9, 12, 15].includes(step) ? [makeTrigger('hatClosed', 0.66, 'late', 0.34)] : []),
      ...(step === 8 ? [makeTrigger('clap', 0.68, 'late', 0.24)] : []),
      ...(step === 10 ? [makeTrigger('perc', 0.7, 'early', 0.24)] : []),
    ];
  }
  return [];
}

export function buildStaticDrumPatternMatrix(pattern: DrumPattern, bars: number): DrumPatternMatrix {
  const matrix = createEmptyDrumPatternMatrix(pattern, bars);
  matrix.sourceKind = 'static';
  for (let bar = 0; bar < matrix.bars; bar += 1) {
    const offset = bar * 16;
    for (let step = 0; step < 16; step += 1) {
      const triggers = getStaticDrumStepTriggers(pattern, step);
      triggers.forEach((trigger) => applyTrigger(matrix, offset + step, trigger));
    }
  }
  return matrix;
}

function applyRhythmForgeStep(matrix: DrumPatternMatrix, stepIndex: number, trigger: DrumStepTrigger) {
  applyTrigger(matrix, stepIndex, trigger);
}

export function freezeRhythmForgeDrumPatternMatrix(args: {
  pattern: DrumPattern;
  bars: number;
  seed?: number;
  rootHz?: number;
  baseSwing?: number;
  descriptors?: GrooveDescriptorVector;
}): DrumPatternMatrix {
  const { pattern, bars } = args;
  const matrix = createEmptyDrumPatternMatrix(pattern, bars);
  matrix.sourceKind = 'rhythmforge';
  const safeBars = Math.max(1, Math.round(bars));
  const seedBase = Number.isFinite(args.seed) ? Math.floor(args.seed as number) : 74123;
  const rootHz = Number.isFinite(args.rootHz) ? (args.rootHz as number) : 55;
  const baseSwing = Number.isFinite(args.baseSwing) ? (args.baseSwing as number) : 0.38;
  const descriptors = args.descriptors ?? DEFAULT_RHYTHMFORGE_DRUM_DESCRIPTORS;
  const flavor = getRhythmForgeDrumFlavor(pattern);

  for (let barIndex = 0; barIndex < safeBars; barIndex += 1) {
    const generated = generateRhythmForgePattern({
      barIndex,
      seed: seedBase,
      rootHz,
      baseSwing,
      descriptors,
      flavor,
    });
    const offset = barIndex * 16;
    generated.kick.forEach((step, localStep) => {
      if (!step.active) return;
      applyRhythmForgeStep(matrix, offset + localStep, { laneId: 'kick', intensity: Math.max(0.54, Math.min(1, step.accent || 0.8)) });
    });
    generated.snare.forEach((step, localStep) => {
      if (!step.active) return;
      const intensity = Math.max(0.42, Math.min(1, step.accent || 0.74));
      applyRhythmForgeStep(matrix, offset + localStep, { laneId: 'snare', intensity });
      if (intensity > 0.78 && (localStep === 12 || localStep === 15)) {
        applyRhythmForgeStep(matrix, offset + localStep, { laneId: 'clap', intensity: Math.max(0.34, intensity * 0.74) });
      }
    });
    generated.hat.forEach((step, localStep) => {
      if (!step.active) return;
      const accent = Math.max(0.22, Math.min(1, step.accent || 0.5));
      applyRhythmForgeStep(matrix, offset + localStep, { laneId: 'hatClosed', intensity: Math.max(0.32, accent) });
      if (accent > 0.7 && (localStep % 8 === 7 || localStep === 15)) {
        applyRhythmForgeStep(matrix, offset + localStep, { laneId: 'hatOpen', intensity: Math.max(0.28, accent * 0.82) });
      }
      if (accent > 0.6 && localStep % 4 === 3) {
        applyRhythmForgeStep(matrix, offset + localStep, { laneId: 'perc', intensity: Math.max(0.24, accent * 0.68) });
      }
    });
  }

  return matrix;
}

export function buildVisibleDrumPatternMatrix(args: {
  pattern: DrumPattern;
  bars: number;
  seed?: number;
  rootHz?: number;
  baseSwing?: number;
  descriptors?: GrooveDescriptorVector;
}): DrumPatternMatrix {
  if (isRhythmForgeDrumPattern(args.pattern)) {
    return freezeRhythmForgeDrumPatternMatrix(args);
  }
  return buildStaticDrumPatternMatrix(args.pattern, args.bars);
}
