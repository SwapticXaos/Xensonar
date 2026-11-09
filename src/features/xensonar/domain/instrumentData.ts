import { createKeyboardPitchCodeMap, createKeyboardPitchMap } from "../resonanceKeyboard";
import type { CustomGridTuningId, GridTuning } from './gridTuningTypes';
export type { BuiltInGridTuning, CustomGridTuningId, GridTuning } from './gridTuningTypes';
import type { RasterDefinition, RasterFamily, RasterModePolicy, RasterPeriodFamily, StoredCustomGridTuning } from './gridRasterTypes';
export type { RasterDefinition, RasterDivisionKind, RasterFamily, RasterModePolicy, RasterPeriodFamily, StoredCustomGridTuning } from './gridRasterTypes';
import type { MyzelBallMode, MyzelNodeMode } from "../../resonance/myceliumInterpreters";
import {
  loadPersistedCustomGridTunings,
  persistCustomGridTunings,
  readPersistedGridTuningRack,
  resetPersistedGridTuningRack,
  writePersistedGridTuningRack,
} from './gridLibraryPersistence';

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
export const KAMMERTON_KEY_CODES = ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0", "KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyZ", "KeyU", "KeyI", "KeyO", "KeyP"] as const;
export const MICRO_RATIOS = [1, 16 / 15, 10 / 9, 9 / 8, 7 / 6, 6 / 5, 5 / 4, 4 / 3, 45 / 32, 3 / 2, 8 / 5, 5 / 3, 9 / 5, 15 / 8];
export const BP_13TET_RATIOS = Array.from({ length: 13 }, (_, step) => Math.pow(3, step / 13));
export const GAMELAN_PELOG_CENTS = [0, 120, 270, 560, 690, 840, 1080];
export const MAQAM_RAST_CENTS = [0, 200, 350, 500, 700, 900, 1050];
export type ParticleSystem = "ji" | "12edo" | "bp";
export type ChurchMode =
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
  | "granular_spark"
  | "kalimba"
  | "gong"
  | "chime"
  | "tine"
  | "reed_tap"
  | "blip"
  | "shimmer"
  | "dust";
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
  | "bowed_glass"
  | "kalimba_tine"
  | "gong_wash"
  | "chime_spray"
  | "dust_pulse";
export type ParticleGradientPreset = "none" | "bright_max" | "bright_min" | "warm_center" | "edge_spark" | "metal_max" | "wood_min";
export type WaveTimbreGradientPreset = "none" | "sitar_rise" | "psy_rise" | "wire_to_psy" | "psy_to_wire" | "center_shine" | "edge_tension";
export type WaveVolumeGradientPreset = "none" | "left_quiet_right_loud" | "left_loud_right_quiet";
export type WaveDecayPreset = "abrupt" | "linear" | "bellcurve" | "exponential" | "late_falloff";
export type WaveOvertoneWaveform = OscillatorType;
export type QuantizeGrid = number;

export type DrumPattern = "trip_hop" | "four_on_floor" | "breakbeat" | "idm" | "minimal_techno" | "duststep" | "broken_lilt" | "forge_rooted" | "forge_braided" | "forge_fractured";
export type DrumKit = "dusty_tape" | "membrane_box" | "glass_metal" | "asphalt_punch" | "velvet_breaks" | "neon_arc" | "bronze_static" | "resin_tom" | "paper_spark";
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
  { value: "asphalt_punch", label: "Asphalt Punch" },
  { value: "velvet_breaks", label: "Velvet Breaks" },
  { value: "neon_arc", label: "Neon Arc" },
  { value: "bronze_static", label: "Bronze Static" },
  { value: "resin_tom", label: "Resin Tom" },
  { value: "paper_spark", label: "Paper Spark" },
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

export const GRID_RASTER_REGISTRY: RasterDefinition[] = [
  { id: "12edo", label: "12 EDO", family: "edo", periodFamily: "octave", divisionKind: "equal", steps: 12, defaultModePolicy: "church_projection", hotkeyCycleEligible: true, description: "Equal divisions of the octave.", periodCents: 1200, builtIn: true },
  { id: "17edo", label: "17 EDO", family: "edo", periodFamily: "octave", divisionKind: "equal", steps: 17, defaultModePolicy: "church_projection", hotkeyCycleEligible: true, description: "Equal divisions of the octave.", periodCents: 1200, builtIn: true },
  { id: "19edo", label: "19 EDO", family: "edo", periodFamily: "octave", divisionKind: "equal", steps: 19, defaultModePolicy: "church_projection", hotkeyCycleEligible: true, description: "Equal divisions of the octave.", periodCents: 1200, builtIn: true },
  { id: "22edo", label: "22 EDO", family: "edo", periodFamily: "octave", divisionKind: "equal", steps: 22, defaultModePolicy: "church_projection", hotkeyCycleEligible: true, description: "Equal divisions of the octave.", periodCents: 1200, builtIn: true },
  { id: "31edo", label: "31 EDO", family: "edo", periodFamily: "octave", divisionKind: "equal", steps: 31, defaultModePolicy: "church_projection", hotkeyCycleEligible: true, description: "Equal divisions of the octave.", periodCents: 1200, builtIn: true },
  { id: "bp", label: "Bohlen-Pierce (13-EDT)", family: "edt", periodFamily: "tritave", divisionKind: "equal", steps: 13, defaultModePolicy: "bp_native", hotkeyCycleEligible: true, description: "Equal divisions of the tritave with native Bohlen-Pierce modes.", periodCents: 1200 * Math.log2(3), builtIn: true },
  { id: "ji", label: "Just Intonation", family: "ji", periodFamily: "octave", divisionKind: "ratio", steps: 12, defaultModePolicy: "church_projection", hotkeyCycleEligible: true, description: "Ratio-based octave field using the existing JI pitch pool.", periodCents: 1200, builtIn: true },
  { id: "gamelan", label: "Gamelan (Pelog-ish)", family: "cdo", periodFamily: "octave", divisionKind: "custom", steps: 7, defaultModePolicy: "church_projection", hotkeyCycleEligible: true, description: "Custom divisions of the octave using the current Pelog-like cents list.", periodCents: 1200, stepCents: [...GAMELAN_PELOG_CENTS], builtIn: true },
  { id: "maqam", label: "Maqam (Rast-ish)", family: "cdo", periodFamily: "octave", divisionKind: "custom", steps: 7, defaultModePolicy: "church_projection", hotkeyCycleEligible: true, description: "Custom divisions of the octave using the current Rast-like cents list.", periodCents: 1200, stepCents: [...MAQAM_RAST_CENTS], builtIn: true },
];

export const GRID_TUNING_OPTIONS: { value: GridTuning; label: string }[] = GRID_RASTER_REGISTRY.filter((entry) => entry.hotkeyCycleEligible).map((entry) => ({ value: entry.id, label: entry.label }));

export {
  CUSTOM_GRID_TUNING_STORAGE_KEY,
  GRID_TUNING_LIBRARY_UPDATED_EVENT,
  GRID_TUNING_RACK_STORAGE_KEY,
  GRID_TUNING_RACK_UPDATED_EVENT,
} from './gridLibraryPersistence';

const defaultPeriodCentsForFamily = (family: RasterPeriodFamily) => (family === "tritave" ? 1200 * Math.log2(3) : 1200);
const sortNumericAscending = (values: number[]) => [...values].sort((a, b) => a - b);

const sanitizeStoredCustomGridTuning = (value: unknown): StoredCustomGridTuning | null => {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<StoredCustomGridTuning> & { id?: string };
  if (typeof candidate.id !== "string" || !candidate.id.startsWith("custom:")) return null;
  if (typeof candidate.label !== "string" || !candidate.label.trim()) return null;
  if (candidate.periodFamily !== "octave" && candidate.periodFamily !== "tritave") return null;
  if (!["edo", "edt", "cdo", "cdt"].includes(String(candidate.family))) return null;
  if (candidate.divisionKind !== "equal" && candidate.divisionKind !== "custom") return null;
  const periodCents = Number(candidate.periodCents);
  if (!Number.isFinite(periodCents) || periodCents <= 0) return null;
  const rawSteps = Array.isArray(candidate.stepCents) ? candidate.stepCents : [];
  const cleanedSteps = sortNumericAscending(rawSteps.map((entry) => Number(entry)).filter((entry) => Number.isFinite(entry) && entry >= 0 && entry < periodCents));
  const deduped: number[] = [];
  for (const step of cleanedSteps) {
    if (deduped.length === 0 || Math.abs(deduped[deduped.length - 1] - step) > 0.05) deduped.push(Math.round(step * 10) / 10);
  }
  const normalizedSteps = deduped.length > 0 && deduped[0] === 0 ? deduped : [0, ...deduped];
  const steps = Math.max(1, Number(candidate.steps) || normalizedSteps.length);
  return {
    id: candidate.id as CustomGridTuningId,
    label: candidate.label.trim(),
    family: candidate.family as RasterFamily,
    periodFamily: candidate.periodFamily,
    divisionKind: candidate.divisionKind,
    steps,
    defaultModePolicy: candidate.defaultModePolicy === "bp_native" ? "bp_native" : "church_projection",
    hotkeyCycleEligible: candidate.hotkeyCycleEligible !== false,
    description: typeof candidate.description === "string" ? candidate.description : "Custom raster preset.",
    periodCents: Math.round(periodCents * 10) / 10,
    stepCents: normalizedSteps.slice(0, steps),
    builtIn: false,
    updatedAt: Number(candidate.updatedAt) || Date.now(),
  };
};

const loadCustomGridTunings = (): StoredCustomGridTuning[] => loadPersistedCustomGridTunings({
  sanitize: sanitizeStoredCustomGridTuning,
});

export const readStoredCustomGridTunings = () => [...loadCustomGridTunings()];

export const replaceStoredCustomGridTunings = (entries: StoredCustomGridTuning[]) => {
  const sanitized = entries
    .map(sanitizeStoredCustomGridTuning)
    .filter((entry): entry is StoredCustomGridTuning => !!entry)
    .sort((a, b) => a.label.localeCompare(b.label));
  persistCustomGridTunings(sanitized);
  return sanitized;
};

export const saveStoredCustomGridTuning = (preset: StoredCustomGridTuning) => {
  const sanitized = sanitizeStoredCustomGridTuning(preset);
  if (!sanitized) return null;
  const existing = loadCustomGridTunings().filter((entry) => entry.id !== sanitized.id);
  existing.push({ ...sanitized, updatedAt: Date.now() });
  persistCustomGridTunings(existing.sort((a, b) => a.label.localeCompare(b.label)));
  return sanitized.id;
};

export const deleteStoredCustomGridTuning = (id: GridTuning) => {
  if (!String(id).startsWith("custom:")) return;
  const filtered = loadCustomGridTunings().filter((entry) => entry.id !== id);
  persistCustomGridTunings(filtered);
};

export const getStoredCustomGridTuning = (id: GridTuning) => loadCustomGridTunings().find((entry) => entry.id === id) ?? null;

const getAllRasterDefinitions = (): RasterDefinition[] => [...GRID_RASTER_REGISTRY, ...loadCustomGridTunings()];

export const GRID_TUNING_ACTIVE_SLOT_COUNT = 11;
export const DEFAULT_ACTIVE_GRID_TUNING_RACK: GridTuning[] = GRID_TUNING_OPTIONS.map((option) => option.value).slice(0, 9);

const isGridTuningId = (value: unknown): value is GridTuning => getAllRasterDefinitions().some((entry) => entry.id === value);

export const sanitizeActiveGridTuningRack = (value: unknown): GridTuning[] => {
  if (!Array.isArray(value)) return [...DEFAULT_ACTIVE_GRID_TUNING_RACK];
  const cleaned: GridTuning[] = [];
  for (const entry of value) {
    if (!isGridTuningId(entry)) continue;
    if (cleaned.includes(entry)) continue;
    cleaned.push(entry);
    if (cleaned.length >= GRID_TUNING_ACTIVE_SLOT_COUNT) break;
  }
  return cleaned.length > 0 ? cleaned : [...DEFAULT_ACTIVE_GRID_TUNING_RACK];
};

export const readStoredActiveGridTuningRack = (): GridTuning[] => readPersistedGridTuningRack({
  defaultRack: DEFAULT_ACTIVE_GRID_TUNING_RACK,
  sanitizeRack: sanitizeActiveGridTuningRack,
});

export const writeStoredActiveGridTuningRack = (rack: GridTuning[]) => {
  writePersistedGridTuningRack({
    rack,
    sanitizeRack: sanitizeActiveGridTuningRack,
  });
};

export const resetStoredActiveGridTuningRack = () => resetPersistedGridTuningRack({
  defaultRack: DEFAULT_ACTIVE_GRID_TUNING_RACK,
  sanitizeRack: sanitizeActiveGridTuningRack,
});

export const getActiveGridTuningRack = () => readStoredActiveGridTuningRack();

export const getActiveGridTuningOptions = (current?: GridTuning): { value: GridTuning; label: string }[] => {
  const rack = readStoredActiveGridTuningRack();
  const library = getGridTuningLibraryOptions();
  const values = current && !rack.includes(current) ? [...rack, current] : rack;
  return values.map((value) => ({ value, label: getOptionLabel(library, value) }));
};

export const getGridTuningLibraryOptions = (): { value: GridTuning; label: string }[] => getAllRasterDefinitions().map((entry) => ({ value: entry.id, label: entry.label }));

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
  { value: "kalimba", label: "Kalimba" },
  { value: "gong", label: "Gong" },
  { value: "chime", label: "Chime" },
  { value: "tine", label: "Tine" },
  { value: "reed_tap", label: "Reed Tap" },
  { value: "blip", label: "Blip" },
  { value: "shimmer", label: "Shimmer" },
  { value: "dust", label: "Dust" },
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
  { value: "kalimba_tine", label: "Kalimba Tine" },
  { value: "gong_wash", label: "Gong Wash" },
  { value: "chime_spray", label: "Chime Spray" },
  { value: "dust_pulse", label: "Dust Pulse" },
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
  { value: "ukr_dorian", label: "ukr-dorisch", steps: [0, 2, 3, 6, 7, 9, 10] },
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

export const getRasterDefinition = (system: string) => getStoredCustomGridTuning(system as GridTuning) ?? GRID_RASTER_REGISTRY.find((entry) => entry.id === system);
export const getRasterModePolicy = (system: string): RasterModePolicy => getRasterDefinition(system)?.defaultModePolicy ?? "church_projection";
export const getRasterPeriodCents = (system: string) => {
  if (system === "ji") return 1200;
  if (system === "gamelan" || system === "maqam") return 1200;
  const definition = getRasterDefinition(system);
  if (!definition) return 1200;
  return definition.periodCents ?? defaultPeriodCentsForFamily(definition.periodFamily);
};
export const getRasterPeriodRatio = (system: string) => Math.pow(2, getRasterPeriodCents(system) / 1200);
export const getRasterStepCents = (system: string) => {
  if (system === "ji") return JI_NODES.map((node) => node.cents);
  if (system === "gamelan") return [...GAMELAN_PELOG_CENTS];
  if (system === "maqam") return [...MAQAM_RAST_CENTS];
  const definition = getRasterDefinition(system);
  if (!definition) return Array.from({ length: 12 }, (_, index) => index * 100);
  if (definition.stepCents?.length) return definition.stepCents.slice(0, definition.steps);
  const periodCents = getRasterPeriodCents(system);
  return Array.from({ length: definition.steps }, (_, index) => (index / Math.max(1, definition.steps)) * periodCents);
};
export const getModesForSystem = (system: string) => (getRasterModePolicy(system) === "bp_native" ? BP_CHURCH_MODES : BASE_CHURCH_MODES);

export const modeMask = (mode: ChurchMode, system: string = "12edo") => {
  const modeList = getModesForSystem(system);
  const fallbackList = CHURCH_MODES;
  const entry = modeList.find((m) => m.value === mode) ?? fallbackList.find((m) => m.value === mode);
  const expectedLength = getRasterModePolicy(system) === "bp_native" ? 13 : 12;
  const allowed = new Set(entry?.steps ?? []);
  return Array.from({ length: expectedLength }, (_, i) => allowed.has(i));
};

export const deriveModeMask = (mode: ChurchMode, system: string) => {
  const systemCents = getRasterStepCents(system);
  const systemLength = systemCents.length;
  if (mode === "chromatic") return Array.from({ length: systemLength }, () => true);
  if (getRasterModePolicy(system) === "bp_native") return modeMask(mode, system);
  const mode12edo = modeMask(mode, "12edo");
  if (system === "12edo") return mode12edo;

  const idealCents = Array.from({ length: 12 }, (_, i) => i * 100);
  const targetCents = idealCents.filter((_, i) => mode12edo[i]);
  const mask = Array(systemLength).fill(false);
  for (const ideal of targetCents) {
    let bestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < systemLength; i++) {
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
  const muted: number[] = [];
  for (let i = 0; i < mask.length; i += 1) {
    if (!mask[i]) muted.push(i);
  }
  return muted;
};

export const getOptionLabel = <T extends string>(options: { value: T; label: string }[], value: T | string) =>
  options.find((option) => option.value === value)?.label ?? getRasterDefinition(String(value))?.label ?? String(value);

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
  const list = (typeof window !== "undefined" ? readStoredActiveGridTuningRack() : GRID_TUNING_OPTIONS.map((option) => option.value));
  if (list.length === 0) return current;
  const currentIndex = list.indexOf(current);
  if (currentIndex === -1) return list[0] ?? current;
  return list[(currentIndex + direction + list.length) % list.length];
};

export const getTuningSteps = (tuning: GridTuning) => getRasterDefinition(tuning)?.steps ?? 12;

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
export const KAMMERTON_KEY_CODE_MAP = createKeyboardPitchCodeMap(KAMMERTON_KEY_CODES);

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
