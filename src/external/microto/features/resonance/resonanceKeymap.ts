/**
 * Single source of truth for Resonance room key bindings.
 * Aligns with project-vision.txt §6 (input/router by room) and §8 (reduce duplicated keyboard handlers).
 * Room input hooks dispatch from this keymap instead of scattering key checks.
 */

import { AGENT_KEYS, KAMMERTON_KEYS } from "./config/constants";

export type PulseDirection = "left" | "right" | "up" | "down";

/** Keydown action for Resonance: cursor, sector pulse, pitch, agent toggle, or harmonic root. */
export type ResonanceKeyDownAction =
  | { action: "cursor"; dir: PulseDirection }
  | { action: "sectorPulse"; dir: PulseDirection; persistent: boolean }
  | { action: "pitch"; index: number }
  | { action: "agentToggle"; index: number }
  | { action: "waveOctaveBoost" }
  | { action: "waveDrive" }
  | { action: "setRootFromCursor" };

/** Keyup action: only cursor keys need keyup (clear arrow refs). */
export type ResonanceKeyUpAction =
  | { action: "cursor"; dir: PulseDirection }
  | { action: "waveOctaveBoost" }
  | { action: "waveDrive" };

/** Shift+R: set cursor pitch as global harmonic root (vision: harmonic first-class). */
export const SET_ROOT_FROM_CURSOR_KEY = "r";
export const SET_ROOT_FROM_CURSOR_MODIFIER = "shift";

function buildResonanceKeyDownMap(): Record<string, ResonanceKeyDownAction> {
  const map: Record<string, ResonanceKeyDownAction> = {
    ArrowLeft: { action: "cursor", dir: "left" },
    ArrowRight: { action: "cursor", dir: "right" },
    ArrowUp: { action: "cursor", dir: "up" },
    ArrowDown: { action: "cursor", dir: "down" },
    y: { action: "sectorPulse", dir: "left", persistent: false },
    x: { action: "sectorPulse", dir: "right", persistent: true },
    c: { action: "sectorPulse", dir: "up", persistent: false },
    v: { action: "sectorPulse", dir: "down", persistent: false },
    backspace: { action: "waveOctaveBoost" },
    space: { action: "waveDrive" },
  };
  /* Shift+R → setRootFromCursor handled in useResonanceInput (modifier check) to avoid overriding pitch "r". */
  KAMMERTON_KEYS.forEach((k, i) => {
    map[k] = { action: "pitch", index: i };
  });
  AGENT_KEYS.forEach((k, i) => {
    map[k] = { action: "agentToggle", index: i };
  });
  return map;
}

function buildResonanceKeyUpMap(): Record<string, ResonanceKeyUpAction> {
  return {
    ArrowLeft: { action: "cursor", dir: "left" },
    ArrowRight: { action: "cursor", dir: "right" },
    ArrowUp: { action: "cursor", dir: "up" },
    ArrowDown: { action: "cursor", dir: "down" },
    backspace: { action: "waveOctaveBoost" },
    space: { action: "waveDrive" },
  };
}

/** Key → keydown action for Resonance room. Single source of truth for bindings. */
export const RESONANCE_KEYDOWN_MAP: Record<string, ResonanceKeyDownAction> = buildResonanceKeyDownMap();

/** Key → keyup action for Resonance room (cursor only). */
export const RESONANCE_KEYUP_MAP: Record<string, ResonanceKeyUpAction> = buildResonanceKeyUpMap();
