/**
 * Single source of truth for Platformer room (Jump Run Soundtrack) key bindings.
 * Aligns with project-vision §6 (input/router by room) and §8 (reduce duplicated keyboard handlers).
 */

export type PlatformerKeyAction = "left" | "right" | "jump";

/** Key (event.key or event.code) → keydown/keyup action. */
export const PLATFORMER_KEYDOWN_MAP: Record<string, PlatformerKeyAction> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  a: "left",
  d: "right",
  " ": "jump",
  ArrowUp: "jump",
  w: "jump",
};

export const PLATFORMER_KEYUP_MAP: Record<string, PlatformerKeyAction> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  a: "left",
  d: "right",
  " ": "jump",
  ArrowUp: "jump",
  w: "jump",
};

export function platformerKeyLookup(key: string, code?: string): PlatformerKeyAction | undefined {
  const k = key.toLowerCase();
  return PLATFORMER_KEYDOWN_MAP[key] ?? PLATFORMER_KEYDOWN_MAP[k] ?? (code ? PLATFORMER_KEYDOWN_MAP[code] : undefined);
}
