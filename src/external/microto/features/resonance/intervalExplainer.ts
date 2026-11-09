/**
 * Live interval explainer: human-readable "what is this interval?" for the shell (vision §5 discoverability, §1 harmonic first-class).
 * Maps cursor interval labels (from getCursorIntervalLabel) to short descriptions and optional cents.
 * Enables future "Learn more" or theory panel without changing this API.
 */

import { JI_NODES } from "./config/overtones";

/** Common JI ratio names for discoverability; extend as needed. */
const JI_RATIO_NAMES: Record<string, string> = {
  "1/1": "Unison",
  Root: "Unison",
  "9/8": "Major second",
  "6/5": "Minor third",
  "5/4": "Major third",
  "4/3": "Perfect fourth",
  "11/8": "Neutral fourth",
  "3/2": "Perfect fifth",
  "8/5": "Minor sixth",
  "13/8": "Neutral sixth",
  "5/3": "Major sixth",
  "7/4": "Harmonic seventh",
  "15/8": "Major seventh",
};

export type IntervalExplainerResult = {
  /** One-line description for shell (e.g. "Major third (JI)"). */
  short: string;
  /** Cents when known (for tooltip or future "Learn more"). */
  cents?: number;
  /** Optional longer hint for tooltip. */
  hint?: string;
};

/**
 * Returns a short explainer for the current cursor interval label.
 * @param intervalLabel - From getCursorIntervalLabel (e.g. "5/4", "Root", "+5", "BP +0:5").
 * @param gridTuning - Current grid tuning (e.g. "ji", "12edo", "bp") for context.
 */
export function getIntervalExplainer(
  intervalLabel: string,
  gridTuning: string,
): IntervalExplainerResult {
  const trimmed = intervalLabel.trim();
  if (!trimmed) return { short: "" };

  // JI: ratio or "Root" or "9/8 (+1)" style
  if (gridTuning === "ji") {
    const baseLabel = trimmed.includes("(") ? trimmed.slice(0, trimmed.indexOf("(")).trim() : trimmed;
    const name = JI_RATIO_NAMES[baseLabel];
    const node = JI_NODES.find((n) => n.label === baseLabel);
    const cents = node?.cents;
    if (name && cents !== undefined) {
      return {
        short: name,
        cents,
        hint: `Just intonation ${baseLabel} ≈ ${Math.round(cents)}¢`,
      };
    }
    if (name) return { short: name };
    if (node) {
      return {
        short: baseLabel,
        cents: node.cents,
        hint: `JI ${baseLabel} ≈ ${Math.round(node.cents)}¢`,
      };
    }
    // Octave-offset form e.g. "5/4 (+1)"
    const ratioPart = baseLabel || trimmed;
    const known = JI_RATIO_NAMES[ratioPart];
    if (known) return { short: `${known} (octave)` };
    return { short: ratioPart, hint: "Just intonation ratio" };
  }

  // EDO: "+5", "-2", "Root"
  const edoMatch = gridTuning.match(/^(\d+)edo$/);
  if (edoMatch) {
    const edo = parseInt(edoMatch[1], 10);
    if (trimmed === "Root") {
      return { short: "Unison", cents: 0, hint: "Root pitch" };
    }
    const stepMatch = trimmed.match(/^([+-]?\d+)$/);
    if (stepMatch && Number.isFinite(edo) && edo > 0) {
      const steps = parseInt(stepMatch[1], 10);
      const cents = (steps / edo) * 1200;
      const short =
        edo === 12
          ? (["Unison", "Semitone", "Major 2nd", "Minor 3rd", "Major 3rd", "Perfect 4th", "Tritone", "Perfect 5th", "Minor 6th", "Major 6th", "Minor 7th", "Major 7th"][Math.abs(steps)] ?? `${steps} steps`)
          : `${steps > 0 ? "+" : ""}${steps} steps`;
      return {
        short: steps === 0 ? "Unison" : short,
        cents,
        hint: `${trimmed} in ${edo}-EDO ≈ ${Math.round(cents)}¢`,
      };
    }
  }

  // BP: "BP +0:5" etc.
  if (gridTuning === "bp" && trimmed.startsWith("BP ")) {
    return {
      short: trimmed,
      hint: "Bohlen–Pierce step in tritave",
    };
  }

  return { short: trimmed };
}
