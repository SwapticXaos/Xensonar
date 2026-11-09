import { JI_NODES } from "../../../shared/tuning/harmonicNodes";
import { DRONE_PRESETS } from "./presets";
import { type DronePreset } from "./types";

export { JI_NODES };
export const DRONE_JI_OVERTONES = JI_NODES.filter((n) => n.label !== "Root");

const DRONE_OVERTONE_PRESET_DEFAULTS: Record<DronePreset, Partial<Record<string, number>>> = {
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
  amber_drone: { "5/4": 0.58, "3/2": 0.64, "4/3": 0.42, "9/8": 0.28, "15/8": 0.22 },
  copper_bell: { "9/8": 0.52, "11/8": 0.48, "5/4": 0.44, "3/2": 0.38, "7/4": 0.26 },
  night_drone: { "4/3": 0.38, "3/2": 0.32, "15/8": 0.18, "6/5": 0.12 },
  dawn_drone: { "5/4": 0.44, "3/2": 0.36, "9/8": 0.28, "15/8": 0.2, "4/3": 0.16 },
  ember_drone: { "3/2": 0.52, "5/4": 0.48, "4/3": 0.38, "9/8": 0.28, "15/8": 0.22 },
  lumen_drone: { "5/4": 0.52, "9/8": 0.4, "3/2": 0.6, "15/8": 0.26 },
  glass_wisp: { "9/8": 0.62, "5/4": 0.38, "11/8": 0.48, "13/8": 0.46, "15/8": 0.28 },
  bp_glass: { "5/4": 0.36, "9/8": 0.42, "11/8": 0.58, "13/8": 0.6, "3/2": 0.3 },
  frost_drone: { "9/8": 0.5, "15/8": 0.44, "5/4": 0.38, "3/2": 0.32, "4/3": 0.2 },
  tide_drone: { "3/2": 0.54, "4/3": 0.46, "5/4": 0.4, "15/8": 0.24, "9/8": 0.2 },
  haze_drone: { "5/4": 0.5, "3/2": 0.58, "4/3": 0.4, "9/8": 0.26, "15/8": 0.2 },
  twilight_drone: { "4/3": 0.48, "3/2": 0.56, "5/4": 0.42, "15/8": 0.22, "9/8": 0.24 },
  moon_drone: { "5/4": 0.5, "3/2": 0.58, "15/8": 0.26, "4/3": 0.36, "9/8": 0.2 },
};

const WAVE_START_OVERTONE_DEFAULTS: Partial<Record<string, number>> = {
  "3/2": 0.82,
  "5/4": 0.46,
  "9/8": 0.34,
  "7/4": 0.24,
};

export const createEmptyOvertoneMix = () =>
  Object.fromEntries(DRONE_JI_OVERTONES.map((node) => [node.label, 0])) as Record<string, number>;

export const createDefaultWaveStartOvertoneMix = () => {
  const mix = createEmptyOvertoneMix();
  for (const [label, value] of Object.entries(WAVE_START_OVERTONE_DEFAULTS)) {
    if (typeof value === "number") {
      mix[label] = value;
    }
  }
  return mix;
};

const createOvertoneMixByPreset = () => {
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
    const existing = source[preset.value];
    copy[preset.value] =
      existing && Object.keys(existing).length > 0
        ? { ...existing }
        : { ...DEFAULT_OVERTONE_BY_PRESET[preset.value] };
  }
  return copy;
};

export const DEFAULT_OVERTONE_BY_PRESET = createOvertoneMixByPreset();
