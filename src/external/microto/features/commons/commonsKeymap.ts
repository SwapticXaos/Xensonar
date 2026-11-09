/**
 * Single source of truth for Commons room (Resonance Commons) key bindings.
 * Aligns with project-vision §6 (input/router by room) and §8 (reduce duplicated keyboard handlers).
 */

export type CommonsKeyDownAction =
  | { type: "cursor"; dir: "left" | "right" | "up" | "down" }
  | { type: "action" }
  | { type: "agentToggle"; index: number };

/** Keydown: cursor, Space = action, a/s/d/f/g/h/j/k/l = agentToggle 0..8. Exported for room UI labels. */
export const COMMONS_AGENT_KEYS = ["a", "s", "d", "f", "g", "h", "j", "k", "l"];

function buildCommonsKeyDownMap(): Record<string, CommonsKeyDownAction> {
  const map: Record<string, CommonsKeyDownAction> = {
    ArrowLeft: { type: "cursor", dir: "left" },
    ArrowRight: { type: "cursor", dir: "right" },
    ArrowUp: { type: "cursor", dir: "up" },
    ArrowDown: { type: "cursor", dir: "down" },
    " ": { type: "action" },
  };
  COMMONS_AGENT_KEYS.forEach((k, i) => {
    map[k] = { type: "agentToggle", index: i };
  });
  return map;
}

export const COMMONS_KEYDOWN_MAP: Record<string, CommonsKeyDownAction> = buildCommonsKeyDownMap();

export function commonsKeyLookup(key: string): CommonsKeyDownAction | undefined {
  return COMMONS_KEYDOWN_MAP[key] ?? COMMONS_KEYDOWN_MAP[key.toLowerCase()];
}
