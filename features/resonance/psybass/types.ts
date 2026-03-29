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
}

export type PsyBassStyle =
  | "classicOffbeat"
  | "rolling"
  | "gallop"
  | "tripletGhost"
  | "darkForest";

export interface PsyBassStep {
  active: boolean;
  semitone: number;
  octave: number;
  accent: number;
  length: number;
  glideToNext?: boolean;
  ghost?: boolean;
}

export interface PsyBassPattern {
  barIndex: number;
  style: PsyBassStyle;
  steps: PsyBassStep[];
  stepCount: 16 | 32;
  rootHz: number;
  swing: number;
}

export interface PsyBassParams {
  enabled: boolean;
  tempo: number;
  rootHz: number;
  stepCount: 16 | 32;
  swing: number;
  barsUntilRefresh: number;
  styleMorph: number;
  density: number;
  cutoff: number;
  resonance: number;
  drive: number;
  subAmount: number;
  noteLength: number;
  attack: number;
  decay: number;
  outputGain: number;
}

export interface PsyBassOptions {
  params?: Partial<PsyBassParams>;
  seed?: number;
}

export const DEFAULT_PSYBASS_PARAMS: PsyBassParams = {
  enabled: true,
  tempo: 145,
  rootHz: 49,
  stepCount: 16,
  swing: 0.03,
  barsUntilRefresh: 2,
  styleMorph: 0.1,
  density: 0.76,
  cutoff: 220,
  resonance: 4.5,
  drive: 0.38,
  subAmount: 0.2,
  noteLength: 0.58,
  attack: 0.001,
  decay: 0.14,
  outputGain: 0.86,
};

export interface SequencerTickResult {
  scheduledUntil: number;
  currentPattern: PsyBassPattern;
}
