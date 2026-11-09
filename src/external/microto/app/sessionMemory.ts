/**
 * Session memory: persist last-visited content room so returning users can resume in one click.
 * Vision §5 discoverability; extends "zero-friction playability" across reloads.
 */

import type { Room } from "./roomRegistry";
import { ROOMS_WITH_RENDERERS } from "./roomRegistry";

const STORAGE_KEY = "xensonar_last_content_room";

function isContentRoom(room: Room): boolean {
  return (ROOMS_WITH_RENDERERS as readonly string[]).includes(room);
}

/**
 * Returns the last room the user was in (from a previous session), or null if none or invalid.
 */
export function getLastContentRoom(): Room | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null || raw === "") return null;
    if (!isContentRoom(raw as Room)) return null;
    return raw as Room;
  } catch {
    return null;
  }
}

/**
 * Persists the current room as "last content room" when the user navigates to a content room.
 * Call from App when room state changes (only persists rooms in ROOMS_WITH_RENDERERS).
 */
export function setLastContentRoom(room: Room): void {
  if (!isContentRoom(room)) return;
  try {
    localStorage.setItem(STORAGE_KEY, room);
  } catch {
    // Ignore storage errors (private mode, quota, etc.)
  }
}
