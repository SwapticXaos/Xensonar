/**
 * Just Intonation pitch snap: map a continuous frequency to the nearest JI node.
 * Shared tuning (vision §6). Used by Tuning Lab; reusable by other rooms that need
 * "snap to JI" without duplicating JI_NODES or grid logic.
 */

import { JI_NODES } from "./harmonicNodes";
import { clampFreq } from "./grid";

export type JiSnapResult = {
  freq: number;
  label: string;
};

export type JiSnapOptions = {
  /** Anchor frequency for 1/1 (default 110 Hz). */
  baseFreq?: number;
  /** Octave range around base (default ±2). */
  octaveRange?: number;
  /** Clamp output to [minFreq, maxFreq]. */
  minFreq?: number;
  maxFreq?: number;
};

const DEFAULT_BASE = 110;
const DEFAULT_OCTAVE_RANGE = 2;
const DEFAULT_MIN = 55;
const DEFAULT_MAX = 520;

/**
 * Returns the nearest JI node (frequency + ratio label) to rawFreq within the given options.
 * Candidates are built from JI_NODES across octaves; result is clamped via clampFreq.
 */
export function snapToNearestJiNode(rawFreq: number, options: JiSnapOptions = {}): JiSnapResult {
  const baseFreq = options.baseFreq ?? DEFAULT_BASE;
  const octaveRange = options.octaveRange ?? DEFAULT_OCTAVE_RANGE;
  const minFreq = options.minFreq ?? DEFAULT_MIN;
  const maxFreq = options.maxFreq ?? DEFAULT_MAX;

  const candidates: JiSnapResult[] = [];
  const octaves: number[] = [];
  for (let o = -octaveRange; o <= octaveRange; o += 1) octaves.push(o);

  for (const { ratio, label } of JI_NODES) {
    for (const oct of octaves) {
      const freq = baseFreq * ratio * Math.pow(2, oct);
      if (freq >= minFreq && freq <= maxFreq) {
        candidates.push({ freq, label });
      }
    }
  }

  if (!candidates.length) {
    return { freq: clampFreq(rawFreq, minFreq, maxFreq), label: "Root" };
  }

  let best = candidates[0];
  let bestDist = Math.abs(rawFreq - best.freq);

  for (let i = 1; i < candidates.length; i += 1) {
    const dist = Math.abs(rawFreq - candidates[i].freq);
    if (dist < bestDist) {
      best = candidates[i];
      bestDist = dist;
    }
  }

  return best;
}
