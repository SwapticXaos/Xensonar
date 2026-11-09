import { type BassPattern, type DrumPattern } from "./types";

export const DRONE_MIN_FREQ = 55;
export const DRONE_MAX_FREQ = 440;
export const DRONE_FREQ_SPAN = DRONE_MAX_FREQ - DRONE_MIN_FREQ;
export const DEFAULT_SWARM_COUNT = 18;

export const RUN_EDOS = [12, 17, 19, 24, 31];
export const AGENT_KEYS = ["a", "s", "d", "f", "g", "h", "j", "k", "l", "ö", "ä", "#", "-"];
export const KAMMERTON_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "q", "w", "e", "r", "t", "z", "u", "i", "o", "p"];
export const MICRO_RATIOS = [1, 16 / 15, 10 / 9, 9 / 8, 7 / 6, 6 / 5, 5 / 4, 4 / 3, 45 / 32, 3 / 2, 8 / 5, 5 / 3, 9 / 5, 15 / 8];
export const BP_13TET_RATIOS = Array.from({ length: 13 }, (_, step) => Math.pow(3, step / 13));

export const DRUM_PATTERNS: { value: DrumPattern; label: string }[] = [
  { value: "trip_hop", label: "Trip Hop" },
  { value: "four_on_floor", label: "Four on the Floor" },
  { value: "breakbeat", label: "Breakbeat" },
  { value: "idm", label: "IDM / Jungle" },
];

export const BASS_PATTERNS: { value: BassPattern; label: string }[] = [
  { value: "offbeat", label: "Offbeat Pump" },
  { value: "walking", label: "Walking Line" },
  { value: "stotter", label: "Stotter-Sub" },
  { value: "arpeggio", label: "Arpeggio-Rise" },
];

