/**
 * Platformer pitch-to-frequency mapping (12edo, 19edo, 22edo, JI, BP).
 * Extracted from platformerArrangement for LOC discipline and single-responsibility.
 */

export type PlatformerTuningMode = "12edo" | "19edo" | "22edo" | "ji" | "bp";

const JI_RATIOS = [
  1,
  16 / 15,
  9 / 8,
  6 / 5,
  5 / 4,
  4 / 3,
  45 / 32,
  3 / 2,
  8 / 5,
  5 / 3,
  16 / 9,
  15 / 8,
];

const semitoneFreq = (root: number, semitone: number) => root * Math.pow(2, semitone / 12);

const edoFreq = (root: number, pitch: number, divisions: number) => {
  const steps = Math.round((pitch * divisions) / 12);
  return root * Math.pow(2, steps / divisions);
};

export const platformerPitchToFreq = (
  root: number,
  pitch: number,
  tuningMode: PlatformerTuningMode,
): number => {
  if (!Number.isFinite(root) || root <= 0) return 110;
  if (!Number.isFinite(pitch)) return root;
  if (tuningMode === "12edo") return semitoneFreq(root, pitch);
  if (tuningMode === "19edo") return edoFreq(root, pitch, 19);
  if (tuningMode === "22edo") return edoFreq(root, pitch, 22);
  if (tuningMode === "ji") {
    const rounded = Math.round(pitch);
    const octave = Math.floor(rounded / 12);
    const pc = ((rounded % 12) + 12) % 12;
    const ratio = JI_RATIOS[pc] ?? 1;
    return root * ratio * Math.pow(2, octave);
  }
  return root * Math.pow(3, pitch / 13);
};
