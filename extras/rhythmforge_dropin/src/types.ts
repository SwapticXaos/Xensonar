export interface GrooveDescriptorVector {
  cohesion: number;
  turbulence: number;
  crystallization: number;
  pressure: number;
  fracture: number;
  orbitality: number;
  recurrence: number;
}

export interface GrooveState {
  time: number;
  descriptors: GrooveDescriptorVector;
  spectralCentroidHz?: number;
}

export type DrumVoice = "kick" | "snare" | "hat";

export interface BassStep {
  active: boolean;
  ratio: number;
  octave: number;
  glideToNext?: boolean;
  accent?: number;
  tie?: boolean;
}

export interface DrumStep {
  active: boolean;
  accent?: number;
}

export interface GeneratedPattern {
  barIndex: number;
  bass: BassStep[];
  kick: DrumStep[];
  snare: DrumStep[];
  hat: DrumStep[];
  swing: number;
  noteLength: number;
  rootHz: number;
}

export interface RhythmForgeParams {
  enabled: boolean;
  tempo: number;
  swing: number;
  rootHz: number;
  barsUntilRefresh: number;
  patternLength: 16;
  bassAmount: number;
  drumsAmount: number;
  drive: number;
  bassCutoff: number;
  hatBrightness: number;
  humanize: number;
  outputGain: number;
}

export interface RhythmForgeOptions {
  params?: Partial<RhythmForgeParams>;
}

export const DEFAULT_RHYTHMFORGE_PARAMS: RhythmForgeParams = {
  enabled: true,
  tempo: 108,
  swing: 0.08,
  rootHz: 55,
  barsUntilRefresh: 2,
  patternLength: 16,
  bassAmount: 0.82,
  drumsAmount: 0.88,
  drive: 0.12,
  bassCutoff: 780,
  hatBrightness: 7200,
  humanize: 0.016,
  outputGain: 0.86,
};

export interface SequencerTickResult {
  scheduledUntil: number;
  currentPattern: GeneratedPattern;
}
