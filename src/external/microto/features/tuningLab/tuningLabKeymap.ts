/**
 * Single source of truth for Tuning Lab room key bindings.
 * Aligns with project-vision §6 (input/router by room) and §8 (reduce duplicated keyboard handlers).
 */

export type TuningLabKeyDownAction = { type: "play" } | { type: "toggleJiGrid" };

/** Keydown: Space = play tone at cursor; G = toggle JI pitch grid. */
export const TUNINGLAB_KEYDOWN_MAP: Record<string, TuningLabKeyDownAction> = {
  " ": { type: "play" },
  g: { type: "toggleJiGrid" },
  G: { type: "toggleJiGrid" },
};

export function tuningLabKeyLookup(key: string): TuningLabKeyDownAction | undefined {
  return TUNINGLAB_KEYDOWN_MAP[key];
}
