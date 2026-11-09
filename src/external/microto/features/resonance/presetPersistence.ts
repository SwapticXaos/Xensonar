/**
 * Resonance preset save/load to localStorage.
 * Vision: "immediately playable", portability — user can restore a performance state.
 * Single storage key; load returns Partial<ResonanceState> for safe merge with defaults + constraints.
 */

import type { ResonanceState } from "./config/state";

const STORAGE_KEY = "xensonar_resonance_preset";

export function saveResonancePreset(state: ResonanceState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or disabled; fail silently
  }
}

/**
 * Loads preset from localStorage. Returns null if missing, invalid, or on parse error.
 * Caller should merge with createDefaultResonanceState() and applyResonanceStateConstraints().
 */
export function loadResonancePreset(): Partial<ResonanceState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed == null || typeof parsed !== "object") return null;
    return parsed as Partial<ResonanceState>;
  } catch {
    return null;
  }
}
