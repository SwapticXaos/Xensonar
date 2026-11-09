import type { Room } from "../../app/roomRegistry";

/**
 * Canonical list of rooms that own a canvas + RAF loop.
 * Used by DiagnosticsHUD lifecycle leak checks and room-level observability.
 * WORLDLAB and WORLDGALLERY are UI-only and intentionally excluded.
 */
export const CANVAS_ROOMS: readonly Room[] = [
  "TOPOLOGY",
  "GAME",
  "RESONANCE",
  "COMMONS",
  "L3LAB",
  "PLATFORMER",
  "SANDBOX",
  "TUNINGLAB",
];

export function isCanvasRoom(room: Room): boolean {
  return (CANVAS_ROOMS as readonly string[]).includes(room);
}

