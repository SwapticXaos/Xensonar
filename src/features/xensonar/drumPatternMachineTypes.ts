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
  segmentsPerBar: number;
  segmentMarkers: number[];
  stepCount: number;
  laneOrder: DrumLaneId[];
  laneSteps: Record<DrumLaneId, number[]>;
  sourceKind: 'static' | 'rhythmforge';
};
