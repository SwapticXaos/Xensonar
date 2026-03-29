import type {
  BassPattern,
  ChurchModeOption,
  DronePreset,
  DronePresetConfig,
  DrumPattern,
  GridTuning,
  Jinode,
  NeurofeedbackMapping,
  Option,
  ParticleGradientPreset,
  ParticlePreset,
  StemDescriptor,
  WaveDecayPreset,
} from "./types";

export const TOPO_WIDTH = 1100;
export const TOPO_HEIGHT = 400;
export const GAME_WIDTH = 1100;
export const GAME_HEIGHT = 580;
export const DRONE_MIN_FREQ = 55;
export const DRONE_MAX_FREQ = 440;

export const RUN_EDOS = [12, 17, 19, 24, 31] as const;
export const AGENT_KEYS = ["a", "s", "d", "f", "g", "h", "j", "k", "l", "ö", "ä", "#", "-"] as const;
export const KAMMERTON_KEYS = ["p", "o", "i", "u", "z", "t", "r", "e", "w", "q", "0", "9", "8", "7", "6", "5", "4", "3", "2", "1"] as const;

export const MICRO_RATIOS = [1, 16 / 15, 10 / 9, 9 / 8, 7 / 6, 6 / 5, 5 / 4, 4 / 3, 45 / 32, 3 / 2, 8 / 5, 5 / 3, 9 / 5, 15 / 8] as const;
export const BP_13TET_RATIOS = Array.from({ length: 13 }, (_, step) => Math.pow(3, step / 13));
export const GAMELAN_PELOG_CENTS = [0, 120, 270, 560, 690, 840, 1080] as const;
export const MAQAM_RAST_CENTS = [0, 200, 350, 500, 700, 900, 1050] as const;

export const JI_NODES: Jinode[] = [
  { ratio: 1 / 1, cents: 0, label: "Root" },
  { ratio: 9 / 8, cents: 203.9, label: "9/8" },
  { ratio: 6 / 5, cents: 315.6, label: "6/5" },
  { ratio: 5 / 4, cents: 386.3, label: "5/4" },
  { ratio: 4 / 3, cents: 498, label: "4/3" },
  { ratio: 11 / 8, cents: 551.3, label: "11/8" },
  { ratio: 3 / 2, cents: 701.9, label: "3/2" },
  { ratio: 8 / 5, cents: 813.7, label: "8/5" },
  { ratio: 13 / 8, cents: 840.5, label: "13/8" },
  { ratio: 5 / 3, cents: 884.3, label: "5/3" },
  { ratio: 7 / 4, cents: 968.8, label: "7/4" },
  { ratio: 15 / 8, cents: 1088.3, label: "15/8" },
];

export const DRONE_JI_OVERTONES = JI_NODES.filter((n) => n.label !== "Root");

export const GRID_TUNING_OPTIONS: Option<GridTuning>[] = [
  { value: "12edo", label: "12 EDO" },
  { value: "17edo", label: "17 EDO" },
  { value: "19edo", label: "19 EDO" },
  { value: "22edo", label: "22 EDO" },
  { value: "31edo", label: "31 EDO" },
  { value: "bp", label: "Bohlen-Pierce (13-TET)" },
  { value: "ji", label: "Just Intonation" },
  { value: "gamelan", label: "Gamelan (Pelog-ish)" },
  { value: "maqam", label: "Maqam (Rast-ish)" },
];

export const DRUM_PATTERNS: Option<DrumPattern>[] = [
  { value: "trip_hop", label: "Trip Hop" },
  { value: "four_on_floor", label: "Four on the Floor" },
  { value: "breakbeat", label: "Breakbeat" },
  { value: "idm", label: "IDM / Jungle" },
];

export const BASS_PATTERNS: Option<BassPattern>[] = [
  { value: "offbeat", label: "Offbeat Pump" },
  { value: "walking", label: "Walking Line" },
  { value: "stotter", label: "Stotter-Sub" },
  { value: "arpeggio", label: "Arpeggio-Rise" },
];

export const DRONE_PRESETS: Option<DronePreset>[] = [
  { value: "warm_pad", label: "Warm Pad" },
  { value: "string_swell", label: "String Swell" },
  { value: "dark_sub", label: "Dark Sub" },
  { value: "metallic", label: "Metallic" },
  { value: "vocal_choir", label: "Vocal Choir" },
  { value: "ethereal_halo", label: "Ethereal Halo" },
  { value: "reed_drone", label: "Reed Drone" },
  { value: "pulse_matrix", label: "Pulse Matrix" },
  { value: "fjord_tape", label: "Fjord Tape" },
  { value: "resonant_fifths", label: "Resonant Fifths" },
  { value: "cello", label: "Cello" },
  { value: "saxophon", label: "Saxophon" },
];

export const PARTICLE_PRESETS: Option<ParticlePreset>[] = [
  { value: "glass_ping", label: "Glass Ping" },
  { value: "marimba", label: "Marimba" },
  { value: "soft_pluck", label: "Soft Pluck" },
  { value: "fm_bell", label: "FM Bell" },
  { value: "pizzicato", label: "Pizzicato" },
  { value: "steel_pan", label: "Steel Pan" },
  { value: "crystal_bowl", label: "Crystal Bowl" },
  { value: "woodblock", label: "Woodblock" },
];

export const PARTICLE_GRADIENT_PRESETS: Option<ParticleGradientPreset>[] = [
  { value: "none", label: "-" },
  { value: "bright_max", label: "Bright → Max" },
  { value: "bright_min", label: "Bright → Min" },
  { value: "warm_center", label: "Warm Center" },
  { value: "edge_spark", label: "Edge Spark" },
  { value: "metal_max", label: "Metal → Max" },
  { value: "wood_min", label: "Wood → Min" },
];

export const WAVE_DECAY_PRESETS: Option<WaveDecayPreset>[] = [
  { value: "abrupt", label: "Abrupt" },
  { value: "linear", label: "Linear" },
  { value: "bellcurve", label: "Bellcurve" },
  { value: "exponential", label: "Exponential" },
  { value: "late_falloff", label: "Late Falloff" },
];

export const CHURCH_MODES: ChurchModeOption[] = [
  { value: "chromatic", label: "Chromatisch", steps: Array.from({ length: 12 }, (_, i) => i) },
  { value: "ionian", label: "Ionisch (Dur)", steps: [0, 2, 4, 5, 7, 9, 11] },
  { value: "dorian", label: "Dorisch", steps: [0, 2, 3, 5, 7, 9, 10] },
  { value: "phrygian", label: "Phrygisch", steps: [0, 1, 3, 5, 7, 8, 10] },
  { value: "lydian", label: "Lydisch", steps: [0, 2, 4, 6, 7, 9, 11] },
  { value: "mixolydian", label: "Mixolydisch", steps: [0, 2, 4, 5, 7, 9, 10] },
  { value: "aeolian", label: "Aeolisch (Moll)", steps: [0, 2, 3, 5, 7, 8, 10] },
  { value: "locrian", label: "Lokrisch", steps: [0, 1, 3, 5, 6, 8, 10] },
  { value: "bp_lambda", label: "BP Lambda", steps: [0, 2, 3, 4, 6, 7, 9, 10, 12] },
  { value: "bp_major", label: "BP Dur", steps: [0, 2, 4, 5, 7, 8, 9, 11, 12] },
  { value: "bp_minor", label: "BP Moll", steps: [0, 1, 3, 5, 6, 8, 9, 11, 12] },
];

export const BASE_CHURCH_MODES = CHURCH_MODES.filter((mode) => !mode.value.startsWith("bp_"));
export const BP_CHURCH_MODES = CHURCH_MODES.filter((mode) => mode.value === "chromatic" || mode.value.startsWith("bp_"));

export const PRESET_MAP: Record<DronePreset, DronePresetConfig> = {
  warm_pad: { oscA: "sine", oscB: "triangle", filterType: "lowpass", cutoffBase: 620, cutoffSpan: 2200, qBase: 0.6, qSpan: 1.8, gainA: 0.03, gainASpan: 0.005, gainBBase: 0.001, gainBProfile: 0.012, lfoBase: 5, lfoSpan: 18, overtoneRatio: 2, overtoneDriftCents: 6 },
  string_swell: { oscA: "triangle", oscB: "sawtooth", filterType: "lowpass", cutoffBase: 780, cutoffSpan: 3000, qBase: 0.9, qSpan: 2.4, gainA: 0.026, gainASpan: 0.01, gainBBase: 0.001, gainBProfile: 0.017, lfoBase: 8, lfoSpan: 28, overtoneRatio: 3 / 2, overtoneDriftCents: 9 },
  dark_sub: { oscA: "sine", oscB: "sine", filterType: "lowpass", cutoffBase: 430, cutoffSpan: 1300, qBase: 0.5, qSpan: 1.1, gainA: 0.034, gainASpan: 0.003, gainBBase: 0.0008, gainBProfile: 0.008, lfoBase: 3, lfoSpan: 10, overtoneRatio: 4 / 3, overtoneDriftCents: 4 },
  metallic: { oscA: "sawtooth", oscB: "triangle", filterType: "bandpass", cutoffBase: 980, cutoffSpan: 4200, qBase: 1.2, qSpan: 5.2, gainA: 0.018, gainASpan: 0.012, gainBBase: 0.001, gainBProfile: 0.02, lfoBase: 12, lfoSpan: 38, overtoneRatio: 11 / 8, overtoneDriftCents: 16 },
  vocal_choir: { oscA: "triangle", oscB: "triangle", filterType: "bandpass", cutoffBase: 900, cutoffSpan: 2600, qBase: 1.4, qSpan: 3.4, gainA: 0.022, gainASpan: 0.009, gainBBase: 0.001, gainBProfile: 0.015, lfoBase: 15, lfoSpan: 40, overtoneRatio: 5 / 4, overtoneDriftCents: 11 },
  ethereal_halo: { oscA: "sine", oscB: "sine", filterType: "lowpass", cutoffBase: 1200, cutoffSpan: 3000, qBase: 0.6, qSpan: 2.2, gainA: 0.019, gainASpan: 0.007, gainBBase: 0.0015, gainBProfile: 0.016, lfoBase: 14, lfoSpan: 36, overtoneRatio: 9 / 4, overtoneDriftCents: 13 },
  reed_drone: { oscA: "square", oscB: "sawtooth", filterType: "lowpass", cutoffBase: 700, cutoffSpan: 2400, qBase: 1.1, qSpan: 2.8, gainA: 0.023, gainASpan: 0.009, gainBBase: 0.001, gainBProfile: 0.014, lfoBase: 7, lfoSpan: 20, overtoneRatio: 7 / 4, overtoneDriftCents: 10 },
  pulse_matrix: { oscA: "square", oscB: "triangle", filterType: "lowpass", cutoffBase: 840, cutoffSpan: 3600, qBase: 0.9, qSpan: 4.8, gainA: 0.02, gainASpan: 0.011, gainBBase: 0.001, gainBProfile: 0.018, lfoBase: 16, lfoSpan: 48, overtoneRatio: 13 / 8, overtoneDriftCents: 15 },
  fjord_tape: { oscA: "triangle", oscB: "sine", filterType: "lowpass", cutoffBase: 560, cutoffSpan: 1800, qBase: 0.7, qSpan: 2.1, gainA: 0.028, gainASpan: 0.006, gainBBase: 0.001, gainBProfile: 0.011, lfoBase: 9, lfoSpan: 16, overtoneRatio: 6 / 5, overtoneDriftCents: 7 },
  resonant_fifths: { oscA: "triangle", oscB: "square", filterType: "lowpass", cutoffBase: 760, cutoffSpan: 3300, qBase: 1, qSpan: 4.1, gainA: 0.023, gainASpan: 0.009, gainBBase: 0.001, gainBProfile: 0.016, lfoBase: 11, lfoSpan: 34, overtoneRatio: 3 / 2, overtoneDriftCents: 12 },
  cello: { oscA: "sawtooth", oscB: "triangle", filterType: "lowpass", cutoffBase: 320, cutoffSpan: 1800, qBase: 0.8, qSpan: 2.1, gainA: 0.035, gainASpan: 0.005, gainBBase: 0.001, gainBProfile: 0.02, lfoBase: 5, lfoSpan: 12, overtoneRatio: 3 / 2, overtoneDriftCents: 5 },
  saxophon: { oscA: "sawtooth", oscB: "square", filterType: "bandpass", cutoffBase: 480, cutoffSpan: 2200, qBase: 1.8, qSpan: 4.5, gainA: 0.025, gainASpan: 0.01, gainBBase: 0.001, gainBProfile: 0.015, lfoBase: 6, lfoSpan: 14, overtoneRatio: 5 / 3, overtoneDriftCents: 8 },
};

export const DRONE_OVERTONE_PRESET_DEFAULTS: Record<DronePreset, Partial<Record<string, number>>> = {
  warm_pad: { "5/4": 0.55, "3/2": 0.72, "4/3": 0.48, "6/5": 0.24, "15/8": 0.2 },
  string_swell: { "3/2": 0.68, "5/3": 0.46, "5/4": 0.42, "8/5": 0.3, "15/8": 0.28 },
  dark_sub: { "4/3": 0.52, "3/2": 0.35, "6/5": 0.22 },
  metallic: { "11/8": 0.62, "13/8": 0.58, "7/4": 0.4, "3/2": 0.24 },
  vocal_choir: { "5/4": 0.62, "3/2": 0.56, "15/8": 0.4, "9/8": 0.3 },
  ethereal_halo: { "15/8": 0.66, "13/8": 0.54, "11/8": 0.42, "3/2": 0.36 },
  reed_drone: { "6/5": 0.48, "4/3": 0.52, "3/2": 0.58, "7/4": 0.34 },
  pulse_matrix: { "9/8": 0.52, "5/4": 0.44, "11/8": 0.46, "13/8": 0.5 },
  fjord_tape: { "4/3": 0.44, "3/2": 0.52, "5/3": 0.36, "6/5": 0.3 },
  resonant_fifths: { "3/2": 0.78, "4/3": 0.66, "5/3": 0.44, "15/8": 0.32 },
  cello: { "6/5": 0.4, "5/4": 0.48, "3/2": 0.58, "8/5": 0.35 },
  saxophon: { "5/4": 0.52, "11/8": 0.38, "3/2": 0.5, "7/4": 0.34 },
};

export const DIRECTED_PULSE_MIN_INTERVAL_MS = 70;
export const CUSTOM_MODE_VALUE = "__custom__";
export const BASE_WAVE_MAX_RADIUS = 168;
export const BASE_WAVE_SPEED = 2.5;
export const MAX_RECORDING_MS = 5 * 60 * 1000;

export const STEM_DESCRIPTORS: StemDescriptor[] = [
  { key: "master", label: "Master", description: "Gesamter Summenmix des Rooms" },
  { key: "particles", label: "Particles", description: "Agent-Pings, quantisierte Treffer und Impulsnoten" },
  { key: "waves", label: "Wave Starts", description: "Auslöser-Klicks, Ripple-Starts und gerichtete Pulse" },
  { key: "drone", label: "Drone", description: "Grundton, Obertöne und tonale Dauerschichten" },
  { key: "fx", label: "FX", description: "Echo, räumliche Effekte und spätere Sonderspuren" },
];

export const DEFAULT_NEUROFEEDBACK_MAPPINGS: NeurofeedbackMapping[] = [
  {
    id: "nf-calm-drone-timbre",
    metric: "calm",
    target: "droneTimbre",
    amount: 0.45,
    invert: false,
    smoothing: 0.82,
    enabled: true,
  },
  {
    id: "nf-focus-particles",
    metric: "focus",
    target: "particleVolume",
    amount: 0.35,
    invert: false,
    smoothing: 0.78,
    enabled: true,
  },
  {
    id: "nf-arousal-radius",
    metric: "arousal",
    target: "waveRadius",
    amount: 0.4,
    invert: false,
    smoothing: 0.72,
    enabled: false,
  },
];
