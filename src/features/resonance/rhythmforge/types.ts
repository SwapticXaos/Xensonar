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
