import { createEmptyOvertoneMix } from "../domain/instrumentData";
import type { MetaPresetId } from "../domain/metaPresetTypes";
import type { SchwarmMaterial } from "../../resonance/schwarmdeuter";

export const MANDALA_PRESET_COLORS = ["#fb7185", "#f59e0b", "#facc15", "#4ade80", "#2dd4bf", "#38bdf8", "#818cf8", "#c084fc"];
export const MANDALA_RANDOMIZER_COLORS = ["#fb7185", "#f97316", "#f59e0b", "#facc15", "#a3e635", "#4ade80", "#2dd4bf", "#38bdf8", "#60a5fa", "#818cf8", "#a78bfa", "#c084fc", "#f472b6"];
export const MATERIAL_LOOP_HOTKEY_KEYS = ["a", "s", "d", "f", "g", "h", "j", "k", "l"] as const;
export const MATERIAL_LOOP_HOTKEY_LABELS = ["A", "S", "D", "F", "G", "H", "J", "K", "L"] as const;

export const MANDALA_DOT_POSITIONS = [
  { id: "north", cx: 0, cy: -30 },
  { id: "northEast", cx: 21.2, cy: -21.2 },
  { id: "east", cx: 30, cy: 0 },
  { id: "southEast", cx: 21.2, cy: 21.2 },
  { id: "south", cx: 0, cy: 30 },
  { id: "southWest", cx: -21.2, cy: 21.2 },
  { id: "west", cx: -30, cy: 0 },
  { id: "northWest", cx: -21.2, cy: -21.2 },
] as const satisfies { id: MetaPresetId; cx: number; cy: number }[];

export const WAVE_OVERTONE_MODES = [
  { value: "direct", label: "Direkt" },
  { value: "arp", label: "Arpeggio" },
  { value: "hybrid", label: "Hybrid" },
] as const;
export type WaveOvertoneMode = typeof WAVE_OVERTONE_MODES[number]["value"];

export const WAVE_OVERTONE_ARP_PATTERNS = [
  { value: "up", label: "Auf" },
  { value: "down", label: "Ab" },
  { value: "updown", label: "Auf/Ab" },
  { value: "random", label: "Zufall" },
] as const;
export type WaveOvertoneArpPattern = typeof WAVE_OVERTONE_ARP_PATTERNS[number]["value"];

export type WaveOvertoneArpRate = 16 | 32 | 64;
export const WAVE_OVERTONE_ARP_RATES: WaveOvertoneArpRate[] = [16, 32, 64];

const createNamedOvertoneMix = (entries: Array<[string, number]>) => {
  const mix = createEmptyOvertoneMix();
  entries.forEach(([label, amount]) => {
    mix[label] = Math.min(1, Math.max(0, amount));
  });
  return mix;
};

export const WAVE_OVERTONE_MIX_PRESETS = [
  {
    value: "empty",
    label: "Leer",
    globalLevel: 1,
    mix: createNamedOvertoneMix([]),
  },
  {
    value: "fifth_bloom",
    label: "Quintenblüte",
    globalLevel: 1.04,
    mix: createNamedOvertoneMix([["4/3", 0.42], ["3/2", 1], ["15/8", 0.34]]),
  },
  {
    value: "bright_ladder",
    label: "Helle Leiter",
    globalLevel: 1.08,
    mix: createNamedOvertoneMix([["11/8", 0.28], ["3/2", 0.56], ["8/5", 0.78], ["13/8", 0.86], ["5/3", 0.62], ["15/8", 1]]),
  },
  {
    value: "dissonant_flares",
    label: "Schillernd",
    globalLevel: 0.94,
    mix: createNamedOvertoneMix([["7/6", 0.52], ["11/8", 0.74], ["13/8", 0.92], ["7/4", 0.46]]),
  },
  {
    value: "gentle_choir",
    label: "Sanfter Chor",
    globalLevel: 0.92,
    mix: createNamedOvertoneMix([["4/3", 0.34], ["3/2", 0.58], ["8/5", 0.22], ["15/8", 0.18]]),
  },
] as const satisfies ReadonlyArray<{
  value: string;
  label: string;
  globalLevel: number;
  mix: Record<string, number>;
}>;

export type WaveOvertoneMixPresetId = typeof WAVE_OVERTONE_MIX_PRESETS[number]["value"];

export const SCHWARM_MATERIAL_OPTIONS: Array<{ value: SchwarmMaterial; label: string }> = [
  { value: "fungus", label: "Myzel / Pilz" },
  { value: "glass", label: "Glas / Schimmer" },
  { value: "metal", label: "Metall / Platten" },
  { value: "resin", label: "Harz / Reibung" },
  { value: "dust", label: "Staub / Luft" },
  { value: "plasma", label: "Plasma / Neon" },
];
