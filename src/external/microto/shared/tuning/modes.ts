export type ChurchMode =
  | "chromatic"
  | "ionian"
  | "dorian"
  | "phrygian"
  | "lydian"
  | "mixolydian"
  | "aeolian"
  | "locrian";

export const CHURCH_MODES: { value: ChurchMode; label: string; steps: number[] }[] = [
  { value: "chromatic", label: "Chromatisch", steps: Array.from({ length: 12 }, (_, i) => i) },
  { value: "ionian", label: "Ionisch (Dur)", steps: [0, 2, 4, 5, 7, 9, 11] },
  { value: "dorian", label: "Dorisch", steps: [0, 2, 3, 5, 7, 9, 10] },
  { value: "phrygian", label: "Phrygisch", steps: [0, 1, 3, 5, 7, 8, 10] },
  { value: "lydian", label: "Lydisch", steps: [0, 2, 4, 6, 7, 9, 11] },
  { value: "mixolydian", label: "Mixolydisch", steps: [0, 2, 4, 5, 7, 9, 10] },
  { value: "aeolian", label: "Aeolisch (Moll)", steps: [0, 2, 3, 5, 7, 8, 10] },
  { value: "locrian", label: "Lokrisch", steps: [0, 1, 3, 5, 6, 8, 10] },
];

export const modeMask = (mode: ChurchMode) => {
  const entry = CHURCH_MODES.find((m) => m.value === mode);
  const allowed = new Set(entry?.steps ?? []);
  return Array.from({ length: 12 }, (_, i) => allowed.has(i));
};
