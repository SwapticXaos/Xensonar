export interface Room3BodyControls {
  coupling: number;
  material: number;
  air: number;
  roughness: number;
  resonance: number;
}

export interface Room3ModField {
  gateGlobal: number;
  gateBody: number;
  gateShimmer: number;
  motion: number;
  coherence: number;
  tension: number;
  brightness: number;
  density: number;
  asymmetry: number;
  drift: number;
  roughness: number;
  air: number;
}

export interface Room3PartialGroups {
  fundamental: number;
  formant: number;
  shimmer: number;
  roughness: number;
}

export interface Room3TimbreState {
  materialLabel: string;
  exciterHardness: number;
  exciterNoise: number;
  damping: number;
  inharmonicity: number;
  air: number;
  saturationPre: number;
  saturationPost: number;
  driftCoherence: number;
  bodyMix: number;
  resonanceFocus: number;
  partialGroups: Room3PartialGroups;
}
