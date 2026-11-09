/**
 * Cursor interval label for harmonic feedback (vision: harmonic systems first-class).
 * Returns a short label for the current cursor pitch relative to the grid root,
 * so the user sees which interval or step they are on when the grid is enabled.
 */
import { JI_NODES } from "./config/overtones";

/**
 * Returns a human-readable interval/step label for the cursor frequency
 * given the current grid root (gridBase) and tuning (gridTuning).
 * Used to draw the "cursor interval" hint on the Resonance canvas when grid is on.
 */
export function getCursorIntervalLabel(
  gridBase: number,
  gridTuning: string,
  cursorFreq: number,
): string {
  if (!Number.isFinite(gridBase) || gridBase <= 0 || !Number.isFinite(cursorFreq) || cursorFreq <= 0) {
    return "";
  }
  const ratio = cursorFreq / gridBase;
  if (ratio <= 0) return "";

  if (gridTuning === "ji") {
    // Octave-normalize ratio to [1, 2), find nearest JI node
    let r = ratio;
    let octOffset = 0;
    while (r >= 2) {
      r /= 2;
      octOffset += 1;
    }
    while (r < 1) {
      r *= 2;
      octOffset -= 1;
    }
    const logR = Math.log(r);
    let best = JI_NODES[0];
    let bestDist = Math.abs(Math.log(best.ratio) - logR);
    for (let i = 1; i < JI_NODES.length; i++) {
      const d = Math.abs(Math.log(JI_NODES[i].ratio) - logR);
      if (d < bestDist) {
        bestDist = d;
        best = JI_NODES[i];
      }
    }
    if (octOffset !== 0) {
      const sign = octOffset > 0 ? "+" : "";
      return `${best.label} (${sign}${octOffset})`;
    }
    return best.label;
  }

  if (gridTuning === "bp") {
    // Tritave-normalize: ratio is in 3^k space; 13 steps per tritave
    const log3Ratio = Math.log(ratio) / Math.log(3);
    const tritaveOffset = Math.floor(log3Ratio);
    const stepInTritave = (log3Ratio - tritaveOffset) * 13;
    const step = ((Math.round(stepInTritave) % 13) + 13) % 13;
    const triStr = tritaveOffset >= 0 ? `+${tritaveOffset}` : String(tritaveOffset);
    return `BP ${triStr}:${step}`;
  }

  // EDO: 12edo, 17edo, 19edo, 22edo, 31edo, etc.
  const edoMatch = gridTuning.match(/^(\d+)edo$/);
  if (edoMatch) {
    const edo = parseInt(edoMatch[1], 10);
    if (!Number.isNaN(edo) && edo > 0) {
      const steps = Math.round(edo * (Math.log(ratio) / Math.LN2));
      if (steps === 0) return "Root";
      return steps > 0 ? `+${steps}` : String(steps);
    }
  }

  return "";
}
