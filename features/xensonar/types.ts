export type GridTuning = "12edo" | "17edo" | "19edo" | "22edo" | "31edo" | "ji" | "bp" | "gamelan" | "maqam";
export type ParticleSystem = "ji" | "12edo" | "bp";

export type ChurchMode =
  | "chromatic"
  | "ionian"
  | "dorian"
  | "phrygian"
  | "lydian"
  | "mixolydian"
  | "aeolian"
  | "locrian"
  | "bp_lambda"
  | "bp_major"
  | "bp_minor";

export type DronePreset =
  | "warm_pad"
  | "string_swell"
  | "dark_sub"
  | "metallic"
  | "vocal_choir"
  | "ethereal_halo"
  | "reed_drone"
  | "pulse_matrix"
  | "fjord_tape"
  | "resonant_fifths"
  | "cello"
  | "saxophon";

export type ParticlePreset =
  | "glass_ping"
  | "marimba"
  | "soft_pluck"
  | "fm_bell"
  | "pizzicato"
  | "steel_pan"
  | "crystal_bowl"
  | "woodblock";

export type WaveSoundPreset = "glass_ping" | "soft_pluck" | "bell_tone" | "clean_pluck";

export type ParticleGradientPreset =
  | "none"
  | "bright_max"
  | "bright_min"
  | "warm_center"
  | "edge_spark"
  | "metal_max"
  | "wood_min";

export type WaveDecayPreset = "abrupt" | "linear" | "bellcurve" | "exponential" | "late_falloff";
export type QuantizeGrid = 16 | 32 | 64;

export type DrumPattern = "trip_hop" | "four_on_floor" | "breakbeat" | "idm";
export type BassPattern = "offbeat" | "walking" | "stotter" | "arpeggio";

export type Room = "MAIN" | "NEXUS" | "TOPOLOGY" | "GAME" | "RESONANCE" | "COMMONS" | "L3LAB";

export type Option<Value extends string> = {
  value: Value;
  label: string;
};

export type ChurchModeOption = Option<ChurchMode> & {
  steps: number[];
};

export type DronePresetConfig = {
  oscA: OscillatorType;
  oscB: OscillatorType;
  filterType: BiquadFilterType;
  cutoffBase: number;
  cutoffSpan: number;
  qBase: number;
  qSpan: number;
  gainA: number;
  gainASpan: number;
  gainBBase: number;
  gainBProfile: number;
  lfoBase: number;
  lfoSpan: number;
  overtoneRatio: number;
  overtoneDriftCents: number;
};

export interface Jinode {
  ratio: number;
  cents: number;
  label: string;
}

export interface SemanticNode {
  x: number;
  y: number;
  freq: number;
  energy: number;
  label: string;
}

export interface Orb {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
}

export interface HiddenAnchor {
  ratio: number;
  label: string;
  angle: number;
  radius: number;
  jitter: number;
  orbit: number;
  weight: number;
  x: number;
  y: number;
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  hue: number;
}

export interface HeartPickup {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  spin: number;
  life: number;
}

export interface NexusAgent {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ratio: number;
  label: string;
  phase: number;
  lastHit: number;
  lastHitGain: number;
  lastHitX: number;
  lastHitY: number;
  history: { x: number; y: number }[];
}

export interface NexusRipple {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxRadius: number;
  decay: WaveDecayPreset;
  direction?: "left" | "right" | "up" | "down";
  hitAgents?: number[];
}

export interface DirectedPulse {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxRadius: number;
  decay: WaveDecayPreset;
  direction: "left" | "right" | "up" | "down";
  hitAgents: number[];
}

export interface GridLine {
  id: string;
  label: string;
  freq: number;
  manualMuted: boolean;
  modeMuted: boolean;
  stepIndex?: number;
}

export interface RecordingState {
  isRecording: boolean;
  durationMs: number;
  hasTake: boolean;
  cropStartMs: number;
  cropEndMs: number;
  filenameBase: string;
  exportStatus: "idle" | "encoding" | "ready" | "error";
  exportMessage: string;
}

export interface ParticleNode {
  ratio: number;
  label: string;
}

export interface QuantizedParticleEvent {
  dueTime: number;
  freq: number;
  amp: number;
  preset: ParticlePreset;
  x: number;
  y: number;
  waveGain: number;
}

export type StemKey = "master" | "particles" | "waves" | "drone" | "fx";
export type StemArmState = Record<StemKey, boolean>;
export type StemRecorderStatus = "idle" | "recording" | "processing" | "ready" | "error" | "unsupported";

export interface StemDescriptor {
  key: StemKey;
  label: string;
  description: string;
}

export interface StemExportFile {
  key: StemKey;
  label: string;
  filename: string;
  sizeBytes: number;
}

export type OvertoneMix = Record<string, number>;
export type OvertoneMixByPreset = Record<DronePreset, OvertoneMix>;

export type NeurofeedbackSource = "mock" | "lsl" | "websocket" | "serial" | "offline";
export type NeurofeedbackBand = "delta" | "theta" | "alpha" | "beta" | "gamma";
export type NeurofeedbackMetric =
  | "calm"
  | "focus"
  | "arousal"
  | "valence"
  | "alpha_ratio"
  | "theta_beta_ratio"
  | "signal_quality";
export type NeurofeedbackTarget =
  | "droneTimbre"
  | "droneVolume"
  | "waveRadius"
  | "particleVolume"
  | "echoDecay"
  | "cursorY"
  | "gridBase";
export type NeurofeedbackStatus = "idle" | "armed" | "streaming" | "degraded" | "error";
export type DeliveryPhaseStatus = "planned" | "active" | "blocked" | "done" | "stop";

export interface NeurofeedbackSample {
  timestamp: number;
  bands: Partial<Record<NeurofeedbackBand, number>>;
  metrics: Partial<Record<NeurofeedbackMetric, number>>;
  quality: number;
}

export interface NeurofeedbackMapping {
  id: string;
  metric: NeurofeedbackMetric;
  target: NeurofeedbackTarget;
  amount: number;
  invert: boolean;
  smoothing: number;
  enabled: boolean;
}

export interface NeurofeedbackProfile {
  source: NeurofeedbackSource;
  status: NeurofeedbackStatus;
  enabled: boolean;
  sampleRateHz: number;
  controlMix: number;
  mappings: NeurofeedbackMapping[];
  lastSample: NeurofeedbackSample | null;
}
