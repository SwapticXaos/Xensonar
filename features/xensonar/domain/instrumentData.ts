import { createKeyboardPitchMap } from "../resonanceKeyboard";
import type { MyzelBallMode, MyzelNodeMode } from "../../resonance/myceliumInterpreters";

export const FREQ = (base: number, cents: number) => base * Math.pow(2, cents / 1200);
export const TOPO_WIDTH = 1100;
export const TOPO_HEIGHT = 400;
export const GAME_WIDTH = 1100;
export const GAME_HEIGHT = 580;
export const DRONE_MIN_FREQ = 55;
export const DRONE_MAX_FREQ = 440;
export const PARTICLE_VOLUME_MAX = 0.35;
export const RUN_EDOS = [12, 17, 19, 24, 31];
export const AGENT_KEYS = ["a", "s", "d", "f", "g", "h", "j", "k", "l", "ö", "ä", "#", "-"];
export const KAMMERTON_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "q", "w", "e", "r", "t", "z", "u", "i", "o", "p"];
export const MICRO_RATIOS = [1, 16 / 15, 10 / 9, 9 / 8, 7 / 6, 6 / 5, 5 / 4, 4 / 3, 45 / 32, 3 / 2, 8 / 5, 5 / 3, 9 / 5, 15 / 8];
export const BP_13TET_RATIOS = Array.from({ length: 13 }, (_, step) => Math.pow(3, step / 13));
export const GAMELAN_PELOG_CENTS = [0, 120, 270, 560, 690, 840, 1080];
export const MAQAM_RAST_CENTS = [0, 200, 350, 500, 700, 900, 1050];
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
  | "saxophon"
  | "glass_pipe"
  | "membrane_bloom"
  | "bronze_reed"
  | "dust_bow";
export type ParticlePreset =
  | "glass_ping"
  | "marimba"
  | "soft_pluck"
  | "fm_bell"
  | "pizzicato"
  | "steel_pan"
  | "crystal_bowl"
  | "woodblock"
  | "velvet_bloom"
  | "shimmer_pad"
  | "dust_chime"
  | "rubber_click"
  | "reed_pop"
  | "granular_spark";
export type WaveSoundPreset =
  | "glass_ping"
  | "soft_pluck"
  | "bell_tone"
  | "clean_pluck"
  | "deep_sub"
  | "vibrato_glass"
  | "tape_halo"
  | "membrane_thump"
  | "reed_sigh"
  | "spark_chime"
  | "bowed_glass";
export type ParticleGradientPreset = "none" | "bright_max" | "bright_min" | "warm_center" | "edge_spark" | "metal_max" | "wood_min";
export type WaveTimbreGradientPreset = "none" | "sitar_rise" | "psy_rise" | "wire_to_psy" | "psy_to_wire" | "center_shine" | "edge_tension";
export type WaveVolumeGradientPreset = "none" | "left_quiet_right_loud" | "left_loud_right_quiet";
export type WaveDecayPreset = "abrupt" | "linear" | "bellcurve" | "exponential" | "late_falloff";
export type WaveOvertoneWaveform = OscillatorType;
export type QuantizeGrid = 16 | 32 | 64;

export type DrumPattern = "trip_hop" | "four_on_floor" | "breakbeat" | "idm" | "minimal_techno" | "duststep" | "broken_lilt" | "forge_rooted" | "forge_braided" | "forge_fractured";
export type DrumKit = "dusty_tape" | "membrane_box" | "glass_metal";
export type BassPattern = "offbeat" | "walking" | "stotter" | "arpeggio" | "forge_rooted" | "forge_braided" | "forge_fractured" | "psy_classic" | "psy_rolling" | "psy_gallop" | "psy_triplet" | "psy_dark";

export type MyzelPattern = "breath" | "spiral" | "odd_bloom" | "choir";

export const MYZEL_PATTERNS: { value: MyzelPattern; label: string }[] = [
  { value: "breath", label: "Atembogen" },
  { value: "spiral", label: "Spiral Drift" },
  { value: "odd_bloom", label: "Odd Bloom" },
  { value: "choir", label: "Choir Weave" },
];

export const MYZEL_BALL_MODE_OPTIONS: { value: MyzelBallMode; label: string }[] = [
  { value: "scanner", label: "Scanner" },
  { value: "orbit", label: "Orbit" },
  { value: "pressure", label: "Druck" },
];

export const MYZEL_NODE_MODE_OPTIONS: { value: MyzelNodeMode; label: string }[] = [
  { value: "ji", label: "JI" },
  { value: "hybrid", label: "Hybrid" },
  { value: "field", label: "Feld" },
];

export const DRUM_PATTERNS: { value: DrumPattern; label: string }[] = [
  { value: "forge_rooted", label: "RhythmForge · Rooted" },
  { value: "forge_braided", label: "RhythmForge · Braided" },
  { value: "forge_fractured", label: "RhythmForge · Fractured" },
  { value: "duststep", label: "Dust Step" },
  { value: "broken_lilt", label: "Broken Lilt" },
  { value: "trip_hop", label: "Trip Hop (Legacy)" },
  { value: "four_on_floor", label: "Four on the Floor" },
  { value: "breakbeat", label: "Breakbeat" },
  { value: "idm", label: "IDM / Jungle" },
  { value: "minimal_techno", label: "Minimal HiHat" },
];

export const DRUM_KITS: { value: DrumKit; label: string }[] = [
  { value: "dusty_tape", label: "Dusty Tape" },
  { value: "membrane_box", label: "Membrane Box" },
  { value: "glass_metal", label: "Glass Metal" },
];

export const BASS_PATTERNS: { value: BassPattern; label: string }[] = [
  { value: "psy_classic", label: "PsyBass · Classic Offbeat" },
  { value: "psy_rolling", label: "PsyBass · Rolling" },
  { value: "psy_gallop", label: "PsyBass · Gallop" },
  { value: "psy_triplet", label: "PsyBass · Triplet Ghost" },
  { value: "psy_dark", label: "PsyBass · Dark Forest" },
  { value: "forge_rooted", label: "RhythmForge · Rooted" },
  { value: "forge_braided", label: "RhythmForge · Braided" },
  { value: "forge_fractured", label: "RhythmForge · Fractured" },
  { value: "offbeat", label: "Offbeat Pump" },
  { value: "walking", label: "Walking Line" },
  { value: "stotter", label: "Stotter-Sub" },
  { value: "arpeggio", label: "Arpeggio-Rise" },
];

export const MYZEL_PATTERN_STEPS: Record<MyzelPattern, number[]> = {
  breath: [1, 0, 0.16, 0, 0.72, 0, 0.24, 0, 1, 0, 0.14, 0, 0.68, 0, 0.22, 0],
  spiral: [0.9, 0.12, 0, 0.48, 0, 0.76, 0.18, 0, 0.86, 0.14, 0, 0.54, 0, 0.8, 0.2, 0],
  odd_bloom: [1, 0, 0, 0.52, 0, 0.84, 0, 0, 0.38, 0, 0.7, 0, 0.28, 0, 0.92, 0],
  choir: [0.82, 0.34, 0, 0.56, 0.2, 0.74, 0.12, 0.46, 0.88, 0.3, 0, 0.6, 0.16, 0.7, 0.1, 0.42],
};

export const getMyzelPatternLevel = (pattern: MyzelPattern, step: number) => MYZEL_PATTERN_STEPS[pattern][step % 16] ?? 0;

export const GRID_TUNING_OPTIONS: { value: GridTuning; label: string }[] = [
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

export const DRONE_PRESETS: { value: DronePreset; label: string }[] = [
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
  { value: "glass_pipe", label: "Glass Pipe" },
  { value: "membrane_bloom", label: "Membrane Bloom" },
  { value: "bronze_reed", label: "Bronze Reed" },
  { value: "dust_bow", label: "Dust Bow" },
];

export const PARTICLE_PRESETS: { value: ParticlePreset; label: string }[] = [
  { value: "glass_ping", label: "Glass Ping" },
  { value: "marimba", label: "Marimba" },
  { value: "soft_pluck", label: "Soft Pluck" },
  { value: "fm_bell", label: "FM Bell" },
  { value: "pizzicato", label: "Pizzicato" },
  { value: "steel_pan", label: "Steel Pan" },
  { value: "crystal_bowl", label: "Crystal Bowl" },
  { value: "woodblock", label: "Woodblock" },
  { value: "velvet_bloom", label: "Velvet Bloom" },
  { value: "shimmer_pad", label: "Shimmer Pad" },
  { value: "dust_chime", label: "Dust Chime" },
  { value: "rubber_click", label: "Rubber Click" },
  { value: "reed_pop", label: "Reed Pop" },
  { value: "granular_spark", label: "Granular Spark" },
];

export const PARTICLE_GRADIENT_PRESETS: { value: ParticleGradientPreset; label: string }[] = [
  { value: "none", label: "-" },
  { value: "bright_max", label: "Bright → Max" },
  { value: "bright_min", label: "Bright → Min" },
  { value: "warm_center", label: "Warm Center" },
  { value: "edge_spark", label: "Edge Spark" },
  { value: "metal_max", label: "Metal → Max" },
  { value: "wood_min", label: "Wood → Min" },
];

export const WAVE_TIMBRE_GRADIENT_PRESETS: { value: WaveTimbreGradientPreset; label: string }[] = [
  { value: "none", label: "-" },
  { value: "sitar_rise", label: "Sitar → rechts" },
  { value: "psy_rise", label: "Psy → rechts" },
  { value: "wire_to_psy", label: "Links Sitar / Rechts Psy" },
  { value: "psy_to_wire", label: "Links Psy / Rechts Sitar" },
  { value: "center_shine", label: "Center Shine" },
  { value: "edge_tension", label: "Edge Tension" },
];

export const WAVE_VOLUME_GRADIENT_PRESETS: { value: WaveVolumeGradientPreset; label: string }[] = [
  { value: "none", label: "-" },
  { value: "left_quiet_right_loud", label: "Links leise / Rechts laut" },
  { value: "left_loud_right_quiet", label: "Links laut / Rechts leise" },
];

export const WAVE_SOUND_PRESETS: { value: WaveSoundPreset; label: string }[] = [
  { value: "glass_ping", label: "Glass Ping" },
  { value: "soft_pluck", label: "Soft Pluck" },
  { value: "bell_tone", label: "Bell Tone" },
  { value: "clean_pluck", label: "Clean Pluck" },
  { value: "deep_sub", label: "Deep Sub" },
  { value: "vibrato_glass", label: "Vibrato Glass" },
  { value: "tape_halo", label: "Tape Halo" },
  { value: "membrane_thump", label: "Membrane Thump" },
  { value: "reed_sigh", label: "Reed Sigh" },
  { value: "spark_chime", label: "Spark Chime" },
  { value: "bowed_glass", label: "Bowed Glass" },
];

export const WAVE_DECAY_PRESETS: { value: WaveDecayPreset; label: string }[] = [
  { value: "abrupt", label: "Abrupt" },
  { value: "linear", label: "Linear" },
  { value: "bellcurve", label: "Bellcurve" },
  { value: "exponential", label: "Exponential" },
  { value: "late_falloff", label: "Late Falloff" },
];

export const PRESET_MAP: Record<DronePreset, {
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
}> = {
  warm_pad: { oscA: "sine", oscB: "triangle", filterType: "lowpass", cutoffBase: 620, cutoffSpan: 2200, qBase: 0.6, qSpan: 1.8, gainA: 0.03, gainASpan: 0.005, gainBBase: 0.001, gainBProfile: 0.012, lfoBase: 5, lfoSpan: 18, overtoneRatio: 2, overtoneDriftCents: 6 },
  string_swell: { oscA: "triangle", oscB: "sawtooth", filterType: "lowpass", cutoffBase: 780, cutoffSpan: 3000, qBase: 0.9, qSpan: 2.4, gainA: 0.026, gainASpan: 0.01, gainBBase: 0.001, gainBProfile: 0.017, lfoBase: 8, lfoSpan: 28, overtoneRatio: 3 / 2, overtoneDriftCents: 9 },
  dark_sub: { oscA: "sine", oscB: "sine", filterType: "lowpass", cutoffBase: 430, cutoffSpan: 1300, qBase: 0.5, qSpan: 1.1, gainA: 0.034, gainASpan: 0.003, gainBBase: 0.0008, gainBProfile: 0.008, lfoBase: 3, lfoSpan: 10, overtoneRatio: 4 / 3, overtoneDriftCents: 4 },
  metallic: { oscA: "sawtooth", oscB: "triangle", filterType: "bandpass", cutoffBase: 980, cutoffSpan: 4200, qBase: 1.2, qSpan: 5.2, gainA: 0.018, gainASpan: 0.012, gainBBase: 0.001, gainBProfile: 0.02, lfoBase: 12, lfoSpan: 38, overtoneRatio: 11 / 8, overtoneDriftCents: 16 },
  vocal_choir: { oscA: "triangle", oscB: "triangle", filterType: "bandpass", cutoffBase: 900, cutoffSpan: 2600, qBase: 1.4, qSpan: 3.4, gainA: 0.022, gainASpan: 0.009, gainBBase: 0.001, gainBProfile: 0.015, lfoBase: 15, lfoSpan: 40, overtoneRatio: 5 / 4, overtoneDriftCents: 11 },
  ethereal_halo: { oscA: "sine", oscB: "sine", filterType: "lowpass", cutoffBase: 1200, cutoffSpan: 3000, qBase: 0.6, qSpan: 2.2, gainA: 0.019, gainASpan: 0.007, gainBBase: 0.0015, gainBProfile: 0.016, lfoBase: 14, lfoSpan: 36, overtoneRatio: 9 / 4, overtoneDriftCents: 13 },
  reed_drone: { oscA: "square", oscB: "sawtooth", filterType: "lowpass", cutoffBase: 700, cutoffSpan: 2400, qBase: 1.1, qSpan: 2.8, gainA: 0.023, gainASpan: 0.009, gainBBase: 0.001, gainBProfile: 0.014, lfoBase: 7, lfoSpan: 20, overtoneRatio: 7 / 4, overtoneDriftCents: 10 },
  pulse_matrix: { oscA: "square", oscB: "triangle", filterType: "lowpass", cutoffBase: 840, cutoffSpan: 3600, qBase: 0.9, qSpan: 4.8, gainA: 0.02, gainASpan: 0.011, gainBBase: 0.001, gainBProfile: 0.018, lfoBase: 16, lfoSpan: 48, overtoneRatio: 13 / 8, overtoneDriftCents: 15 },
  fjord_tape: { oscA: "triangle", oscB: "sine", filterType: "lowpass", cutoffBase: 560, cutoffSpan: 1800, qBase: 0.7, qSpan: 2.1, gainA: 0.028, gainASpan: 0.006, gainBBase: 0.001, gainBProfile: 0.011, lfoBase: 9, lfoSpan: 16, overtoneRatio: 6 / 5, overtoneDriftCents: 7 },
  resonant_fifths: { oscA: "triangle", oscB: "square", filterType: "lowpass", cutoffBase: 760, cutoffSpan: 3300, qBase: 1.0, qSpan: 4.1, gainA: 0.023, gainASpan: 0.009, gainBBase: 0.001, gainBProfile: 0.016, lfoBase: 11, lfoSpan: 34, overtoneRatio: 3 / 2, overtoneDriftCents: 12 },
  cello: { oscA: "sawtooth", oscB: "triangle", filterType: "lowpass", cutoffBase: 320, cutoffSpan: 1800, qBase: 0.8, qSpan: 2.1, gainA: 0.035, gainASpan: 0.005, gainBBase: 0.001, gainBProfile: 0.02, lfoBase: 5, lfoSpan: 12, overtoneRatio: 3 / 2, overtoneDriftCents: 5 },
  saxophon: { oscA: "sawtooth", oscB: "square", filterType: "bandpass", cutoffBase: 480, cutoffSpan: 2200, qBase: 1.8, qSpan: 4.5, gainA: 0.025, gainASpan: 0.01, gainBBase: 0.001, gainBProfile: 0.015, lfoBase: 6, lfoSpan: 14, overtoneRatio: 5 / 3, overtoneDriftCents: 8 },
  glass_pipe: { oscA: "sine", oscB: "triangle", filterType: "bandpass", cutoffBase: 1100, cutoffSpan: 3900, qBase: 1.8, qSpan: 5.4, gainA: 0.018, gainASpan: 0.008, gainBBase: 0.0014, gainBProfile: 0.017, lfoBase: 12, lfoSpan: 30, overtoneRatio: 9 / 4, overtoneDriftCents: 14 },
  membrane_bloom: { oscA: "triangle", oscB: "sine", filterType: "lowpass", cutoffBase: 260, cutoffSpan: 1500, qBase: 0.8, qSpan: 2.6, gainA: 0.038, gainASpan: 0.007, gainBBase: 0.0012, gainBProfile: 0.018, lfoBase: 4, lfoSpan: 10, overtoneRatio: 4 / 3, overtoneDriftCents: 4 },
  bronze_reed: { oscA: "square", oscB: "triangle", filterType: "bandpass", cutoffBase: 640, cutoffSpan: 2600, qBase: 1.4, qSpan: 4.2, gainA: 0.024, gainASpan: 0.009, gainBBase: 0.0012, gainBProfile: 0.017, lfoBase: 8, lfoSpan: 18, overtoneRatio: 11 / 8, overtoneDriftCents: 10 },
  dust_bow: { oscA: "triangle", oscB: "sawtooth", filterType: "lowpass", cutoffBase: 520, cutoffSpan: 2200, qBase: 0.9, qSpan: 3.2, gainA: 0.027, gainASpan: 0.008, gainBBase: 0.0011, gainBProfile: 0.014, lfoBase: 7, lfoSpan: 24, overtoneRatio: 7 / 4, overtoneDriftCents: 11 },
};

export const CHURCH_MODES: { value: ChurchMode; label: string; steps: number[] }[] = [
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
export const getModesForSystem = (system: string) => (system === "bp" ? BP_CHURCH_MODES : BASE_CHURCH_MODES);

export const modeMask = (mode: ChurchMode, system: string = "12edo") => {
  const modeList = getModesForSystem(system);
  const fallbackList = CHURCH_MODES;
  const entry = modeList.find((m) => m.value === mode) ?? fallbackList.find((m) => m.value === mode);
  const expectedLength = system === "bp" ? 13 : 12;
  const allowed = new Set(entry?.steps ?? []);
  return Array.from({ length: expectedLength }, (_, i) => allowed.has(i));
};

export const deriveModeMask = (mode: ChurchMode, system: string) => {
  const systemLength = system === "ji"
    ? JI_NODES.length
    : system === "bp"
      ? 13
      : system === "gamelan"
        ? GAMELAN_PELOG_CENTS.length
        : system === "maqam"
          ? MAQAM_RAST_CENTS.length
          : parseInt(system.replace("edo", ""), 10) || 12;

  if (mode === "chromatic") return Array.from({ length: systemLength }, () => true);
  if (system === "bp") return modeMask(mode, "bp");
  const mode12edo = modeMask(mode, "12edo");
  if (system === "12edo") return mode12edo;

  const idealCents = Array.from({ length: 12 }, (_, i) => i * 100);
  const targetCents = idealCents.filter((_, i) => mode12edo[i]);

  let systemCents: number[] = [];
  let length = 0;
  if (system === "ji") {
    systemCents = JI_NODES.map((n) => n.cents);
    length = JI_NODES.length;
  } else if (system === "gamelan") {
    systemCents = [...GAMELAN_PELOG_CENTS];
    length = GAMELAN_PELOG_CENTS.length;
  } else if (system === "maqam") {
    systemCents = [...MAQAM_RAST_CENTS];
    length = MAQAM_RAST_CENTS.length;
  } else {
    const edo = parseInt(system.replace("edo", ""), 10);
    if (isNaN(edo)) return mode12edo;
    systemCents = Array.from({ length: edo }, (_, i) => (i / edo) * 1200);
    length = edo;
  }

  const mask = Array(length).fill(false);
  for (const ideal of targetCents) {
    let bestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < length; i++) {
      const diff = Math.abs(ideal - systemCents[i]);
      const wrappedDiff = Math.min(diff, Math.abs(diff - 1200), Math.abs(diff + 1200));
      if (wrappedDiff < minDiff) {
        minDiff = wrappedDiff;
        bestIdx = i;
      }
    }
    mask[bestIdx] = true;
  }
  return mask;
};

export const getMutedStepsForMode = (mode: ChurchMode, system: string) => {
  const mask = deriveModeMask(mode, system);
  const len = system === "ji" ? JI_NODES.length : system === "bp" ? 13 : system === "gamelan" ? GAMELAN_PELOG_CENTS.length : system === "maqam" ? MAQAM_RAST_CENTS.length : parseInt(system.replace("edo", ""), 10) || 12;
  const muted: number[] = [];
  for (let i = 0; i < len; i += 1) {
    if (!mask[i]) muted.push(i);
  }
  return muted;
};

export const getOptionLabel = <T extends string>(options: { value: T; label: string }[], value: T | string) =>
  options.find((option) => option.value === value)?.label ?? String(value);

export const sameNumberSet = (a: number[], b: number[]) => {
  if (a.length !== b.length) return false;
  const aa = [...a].sort((x, y) => x - y);
  const bb = [...b].sort((x, y) => x - y);
  for (let i = 0; i < aa.length; i += 1) {
    if (aa[i] !== bb[i]) return false;
  }
  return true;
};

export const sameBooleanArray = (a: boolean[], b: boolean[]) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (!!a[i] !== !!b[i]) return false;
  }
  return true;
};

export const formatHzCompact = (hz: number, digits = 1) => `${hz.toFixed(digits)}Hz`;

export const nextGridTuning = (current: GridTuning, direction: -1 | 1) => {
  const list = GRID_TUNING_OPTIONS.map((option) => option.value);
  const currentIndex = list.indexOf(current);
  if (currentIndex === -1) return current;
  return list[(currentIndex + direction + list.length) % list.length];
};

export const getTuningSteps = (tuning: GridTuning) => {
  if (tuning === "ji") return JI_NODES.length;
  if (tuning === "bp") return 13;
  if (tuning === "gamelan") return GAMELAN_PELOG_CENTS.length;
  if (tuning === "maqam") return MAQAM_RAST_CENTS.length;
  const edo = parseInt(tuning.replace("edo", ""), 10);
  return isNaN(edo) ? 12 : edo;
};

export const JI_NODES = [
  { ratio: 1 / 1, cents: 0, label: "Root" },
  { ratio: 9 / 8, cents: 203.9, label: "9/8" },
  { ratio: 6 / 5, cents: 315.6, label: "6/5" },
  { ratio: 5 / 4, cents: 386.3, label: "5/4" },
  { ratio: 4 / 3, cents: 498.0, label: "4/3" },
  { ratio: 11 / 8, cents: 551.3, label: "11/8" },
  { ratio: 3 / 2, cents: 701.9, label: "3/2" },
  { ratio: 8 / 5, cents: 813.7, label: "8/5" },
  { ratio: 13 / 8, cents: 840.5, label: "13/8" },
  { ratio: 5 / 3, cents: 884.3, label: "5/3" },
  { ratio: 7 / 4, cents: 968.8, label: "7/4" },
  { ratio: 15 / 8, cents: 1088.3, label: "15/8" },
];

export const DRONE_JI_OVERTONES = JI_NODES.filter((n) => n.label !== "Root");
export const KAMMERTON_KEY_MAP = createKeyboardPitchMap(KAMMERTON_KEYS);

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
  glass_pipe: { "11/8": 0.56, "13/8": 0.52, "15/8": 0.44, "3/2": 0.32 },
  membrane_bloom: { "4/3": 0.66, "3/2": 0.42, "6/5": 0.28, "5/4": 0.22 },
  bronze_reed: { "5/4": 0.46, "11/8": 0.44, "3/2": 0.52, "7/4": 0.38 },
  dust_bow: { "6/5": 0.42, "4/3": 0.46, "3/2": 0.4, "15/8": 0.28 },
};

export const createEmptyOvertoneMix = () =>
  Object.fromEntries(DRONE_JI_OVERTONES.map((node) => [node.label, 0])) as Record<string, number>;

export const createOvertoneMixByPreset = () => {
  const byPreset = {} as Record<DronePreset, Record<string, number>>;
  for (const preset of DRONE_PRESETS) {
    const mix = createEmptyOvertoneMix();
    const defaults = DRONE_OVERTONE_PRESET_DEFAULTS[preset.value] ?? {};
    for (const [label, value] of Object.entries(defaults)) {
      if (typeof value === "number") {
        mix[label] = value;
      }
    }
    byPreset[preset.value] = mix;
  }
  return byPreset;
};

export const cloneOvertoneMixByPreset = (source: Record<DronePreset, Record<string, number>>) => {
  const copy = {} as Record<DronePreset, Record<string, number>>;
  for (const preset of DRONE_PRESETS) {
    copy[preset.value] = { ...source[preset.value] };
  }
  return copy;
};

export const DEFAULT_OVERTONE_BY_PRESET = createOvertoneMixByPreset();



export const getParticleNodes = (system: ParticleSystem) => {
  if (system === "12edo") {
    return Array.from({ length: 12 }, (_, step) => ({
      ratio: Math.pow(2, step / 12),
      label: step === 0 ? "Root" : `${step}`,
    }));
  }
  if (system === "bp") {
    return Array.from({ length: 13 }, (_, step) => ({
      ratio: BP_13TET_RATIOS[step],
      label: step === 0 ? "Root" : `${step}`,
    }));
  }
  return JI_NODES.map((node) => ({ ratio: node.ratio, label: node.label }));
};

export const defaultAgentEnabled = (system: ParticleSystem, mode: ChurchMode) => deriveModeMask(mode, system);
