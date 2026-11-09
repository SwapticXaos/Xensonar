/**
 * Platformer motif/theme derivation helpers.
 * Extracted from platformerArrangement for structure optimization (LOC discipline, single-responsibility).
 */
import { clamp } from "../../shared/tuning/grid";
import { clampSemi, type MovementEvent } from "./platformerArrangementTypes";

export const normalizePitchClass = (semi: number) => {
  const pc = ((Math.round(semi) % 12) + 12) % 12;
  return pc > 6 ? pc - 12 : pc;
};

export const getEventDetail = (event: MovementEvent) =>
  typeof event.detail === "number" && Number.isFinite(event.detail) ? event.detail : 0;

export const normalizePhaseWeights = (phaseVotes: [number, number, number]): [number, number, number] => {
  const total = phaseVotes[0] + phaseVotes[1] + phaseVotes[2];
  if (total <= 0.0001) return [0.34, 0.33, 0.33];
  return [
    clamp(phaseVotes[0] / total, 0, 1),
    clamp(phaseVotes[1] / total, 0, 1),
    clamp(phaseVotes[2] / total, 0, 1),
  ];
};

export const buildMotif = (
  source: number[],
  fallback: number[],
  targetLength: number,
  transform?: (semi: number, index: number) => number,
): number[] => {
  if (targetLength <= 0) return [];
  const seed = source.length > 0 ? source : fallback;
  if (seed.length === 0) return [];

  const out: number[] = [];
  let cursor = 0;
  while (out.length < targetLength && cursor < targetLength * 8) {
    const raw = seed[cursor % seed.length] ?? fallback[cursor % Math.max(1, fallback.length)] ?? 0;
    const next = clampSemi(transform ? transform(raw, out.length) : raw);
    if (out.length === 0 || out[out.length - 1] !== next || seed.length === 1) {
      out.push(next);
    }
    cursor += 1;
  }
  return out.length > 0 ? out : [clampSemi(fallback[0] ?? 0)];
};

export const buildRootContour = (source: number[], fallback: number[], targetLength: number): number[] =>
  buildMotif(source, fallback.map(normalizePitchClass), targetLength, normalizePitchClass);

export const selectEventSemis = (
  events: MovementEvent[],
  predicate: (event: MovementEvent) => boolean,
  transform?: (event: MovementEvent, index: number) => number,
): number[] =>
  events
    .filter(predicate)
    .map((event, index) => clampSemi(transform ? transform(event, index) : event.semi));

export const fallbackRootContour = (phrase: number[]) =>
  phrase.map((semi) => normalizePitchClass(semi));

export const fallbackPhraseSource = (phrase: number[]) =>
  phrase.length > 0 ? phrase.map(clampSemi) : [0, 3, 7, 10];

/** Snap semi to nearest chord tone (shared by arrangement and completion pattern). */
export const snapToChord = (semi: number, chord: number[]): number => {
  if (chord.length === 0) return semi;
  let best = semi;
  let bestDist = Infinity;
  for (const base of chord) {
    for (let octave = -2; octave <= 2; octave += 1) {
      const candidate = base + octave * 12;
      const dist = Math.abs(candidate - semi);
      if (dist < bestDist) {
        bestDist = dist;
        best = candidate;
      }
    }
  }
  return best;
};
