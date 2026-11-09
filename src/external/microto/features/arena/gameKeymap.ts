/**
 * Single source of truth for GAME room (Irrlicht Arena) key bindings.
 * Aligns with project-vision §6 (input/router by room) and §8 (reduce duplicated keyboard handlers).
 */

export type GameKeyAction = "left" | "right" | "shoot";

/** Key (event.key or event.code) → keydown action. Use event.key for arrows/letters, event.code for Space. */
export const GAME_KEYDOWN_MAP: Record<string, GameKeyAction> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  a: "left",
  d: "right",
  Space: "shoot",
};

/** Key → keyup action (same keys; only left/right/shoot need keyup). */
export const GAME_KEYUP_MAP: Record<string, GameKeyAction> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  a: "left",
  d: "right",
  Space: "shoot",
};

/** Resolve key for lookup: use event.key for most, event.code for Space so "Space" maps to shoot. */
export function gameKeyLookup(key: string, code: string): GameKeyAction | undefined {
  return GAME_KEYDOWN_MAP[key] ?? GAME_KEYDOWN_MAP[code];
}
