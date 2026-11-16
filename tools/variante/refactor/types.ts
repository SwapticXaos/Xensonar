export type Tuning = "12edo" | "19edo" | "31edo" | "ji" | "bp";

export type Mode =
  | "chromatic"
  | "ionian"
  | "dorian"
  | "ukr_dorian"
  | "phrygian"
  | "lydian"
  | "mixolydian"
  | "aeolian"
  | "locrian"
  | "bp_lambda"
  | "bp_major"
  | "bp_minor";

export type ParticlePreset = "glass_ping" | "soft_pluck" | "fm_bell" | "marimba" | "crystal_bowl" | "woodblock";
export type DronePreset = "warm_pad" | "reed_drone" | "pulse_matrix" | "dark_sub" | "ethereal_halo";
export type Direction = "left" | "right" | "up" | "down";
export type RippleFalloff = "linear" | "abrupt" | "bell" | "late" | "exponential";
export type PulseMode = "line" | "sector";
export type GridPerspective = "natural" | "equalized";

export type RatioNode = {
  ratio: number;
  cents: number;
  label: string;
};

export type Agent = {
  id: number;
  step: number;
  ratio: number;
  cents: number;
  label: string;
  enabled: boolean;
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  energy: number;
  hue: number;
  lastTrigger: number;
};

export type Ripple = {
  id: number;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  width: number;
  energy: number;
  falloff: RippleFalloff;
  rootStep: number;
};

export type DirectedPulse = {
  id: number;
  direction: Direction;
  pos: number;
  speed: number;
  energy: number;
};

export type TrailPoint = {
  x: number;
  y: number;
  age: number;
};

export type Params = {
  tuning: Tuning;
  mode: Mode;
  tonicHz: number;
  masterVolume: number;
  drift: number;
  cursorAttraction: number;
  rippleStrength: number;
  rippleWidth: number;
  rippleRadius: number;
  rippleFalloff: RippleFalloff;
  rippleSpeed: number;
  gridSnap: boolean;
  quantizeOn: boolean;
  quantizeBpm: number;
  echoOn: boolean;
  echoFeedback: number;
  echoMix: number;
  droneOn: boolean;
  dronePreset: DronePreset;
  particlePreset: ParticlePreset;
  density: number;
  trailOn: boolean;
  trailLength: number;
  modeMaskStrength: number;
  shimmer: number;
  inputIndicator: boolean;
  keyboardWindowStart: number;
  pulseMode: PulseMode;
  gridPerspective: GridPerspective;
  manualMutedSteps: number[];
  manualStepOffsets: number[];
  showGridTriangles: boolean;
};

export const DEFAULT_PARAMS: Params = {
  tuning: "ji",
  mode: "dorian",
  tonicHz: 220,
  masterVolume: 0.72,
  drift: 0.12,
  cursorAttraction: 0.04,
  rippleStrength: 1.05,
  rippleWidth: 28,
  rippleRadius: 240,
  rippleFalloff: "bell",
  rippleSpeed: 220,
  gridSnap: true,
  quantizeOn: true,
  quantizeBpm: 104,
  echoOn: true,
  echoFeedback: 0.32,
  echoMix: 0.24,
  droneOn: true,
  dronePreset: "ethereal_halo",
  particlePreset: "glass_ping",
  density: 18,
  trailOn: true,
  trailLength: 32,
  modeMaskStrength: 0.6,
  shimmer: 0.2,
  inputIndicator: true,
  keyboardWindowStart: 0,
  pulseMode: "line",
  gridPerspective: "natural",
  manualMutedSteps: [],
  manualStepOffsets: [],
  showGridTriangles: true,
};
