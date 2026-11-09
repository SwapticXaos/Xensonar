/**
 * Single source of truth for L3 Lab room (Level3LabRoom) key bindings.
 * Aligns with project-vision §6 (input/router by room) and §8 (reduce duplicated keyboard handlers).
 */

export type Level3KeyAction = "left" | "right" | "up" | "down";

export type Level3KeyDownAction =
  | { type: "move"; dir: Level3KeyAction }
  | { type: "pulse"; dir: Level3KeyAction };

/** Keydown: arrows = move; y/x/c/v = pulse left/right/up/down. */
export const LEVEL3_KEYDOWN_MAP: Record<string, Level3KeyDownAction> = {
  ArrowLeft: { type: "move", dir: "left" },
  ArrowRight: { type: "move", dir: "right" },
  ArrowUp: { type: "move", dir: "up" },
  ArrowDown: { type: "move", dir: "down" },
  y: { type: "pulse", dir: "left" },
  x: { type: "pulse", dir: "right" },
  c: { type: "pulse", dir: "up" },
  v: { type: "pulse", dir: "down" },
};

/** Keyup: only movement keys. */
export const LEVEL3_KEYUP_MAP: Record<string, Level3KeyAction> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
};

export function level3KeyDownLookup(key: string): Level3KeyDownAction | undefined {
  return LEVEL3_KEYDOWN_MAP[key] ?? LEVEL3_KEYDOWN_MAP[key.toLowerCase()];
}

export function level3KeyUpLookup(key: string): Level3KeyAction | undefined {
  return LEVEL3_KEYUP_MAP[key] ?? LEVEL3_KEYUP_MAP[key.toLowerCase()];
}
