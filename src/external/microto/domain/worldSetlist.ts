/**
 * Performance setlist: an ordered list of harmonic worlds for step-through during a set.
 * Vision §2 (exploratory), §3 (expressive timbre); enables "prepare N worlds, jump next/prev" workflow.
 */

import type { HarmonicWorldExport } from "./harmonicWorld";

function exportMatchesExport(a: HarmonicWorldExport, b: HarmonicWorldExport): boolean {
  if (a.id != null && a.id !== "" && b.id != null && b.id !== "") return a.id === b.id;
  if (a.gridTuning !== b.gridTuning) return false;
  if (Math.abs(a.baseFreq - b.baseFreq) > 0.01) return false;
  if (a.quantizeOn !== b.quantizeOn) return false;
  if (a.quantizeSubdivision !== b.quantizeSubdivision) return false;
  if (Math.abs(a.quantizeBpm - b.quantizeBpm) > 0.5) return false;
  return true;
}

const STORAGE_KEY = "xensonar.worldSetlist.v1";
export const WORLD_SETLIST_STORAGE_KEY = STORAGE_KEY;
const MAX_SLOTS = 8;

export type WorldSetlist = {
  slots: HarmonicWorldExport[];
  /** 0-based index of the slot that was last loaded (for next/prev navigation). */
  currentIndex: number;
};

const DEFAULT_SETLIST: WorldSetlist = { slots: [], currentIndex: 0 };

function safeParse(json: string | null): WorldSetlist | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const obj = parsed as Record<string, unknown>;
    const slots = Array.isArray(obj.slots) ? (obj.slots as HarmonicWorldExport[]) : [];
    const currentIndex =
      typeof obj.currentIndex === "number" && Number.isInteger(obj.currentIndex)
        ? Math.max(0, Math.min(obj.currentIndex, Math.max(0, slots.length - 1)))
        : 0;
    return { slots: slots.slice(0, MAX_SLOTS), currentIndex };
  } catch {
    return null;
  }
}

function safeStringify(setlist: WorldSetlist): string {
  try {
    return JSON.stringify(setlist);
  } catch {
    return JSON.stringify(DEFAULT_SETLIST);
  }
}

export function loadWorldSetlist(): WorldSetlist {
  if (typeof window === "undefined") return DEFAULT_SETLIST;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const loaded = safeParse(raw);
  return loaded ?? DEFAULT_SETLIST;
}

export function saveWorldSetlist(setlist: WorldSetlist): void {
  if (typeof window === "undefined") return;
  const normalized: WorldSetlist = {
    slots: setlist.slots.slice(0, MAX_SLOTS),
    currentIndex: clampIndex(setlist.currentIndex, setlist.slots.length),
  };
  window.localStorage.setItem(STORAGE_KEY, safeStringify(normalized));
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(index, length - 1));
}

/** Add a world export to the setlist. Appends up to MAX_SLOTS; does not dedupe by content. */
export function addToSetlist(
  current: WorldSetlist,
  exportData: HarmonicWorldExport,
): WorldSetlist {
  const nextSlots = [...current.slots, exportData].slice(0, MAX_SLOTS);
  const nextIndex = nextSlots.length - 1;
  saveWorldSetlist({ slots: nextSlots, currentIndex: nextIndex });
  return { slots: nextSlots, currentIndex: nextIndex };
}

/** Remove the slot at the given index. Adjusts currentIndex if needed. */
export function removeFromSetlist(current: WorldSetlist, index: number): WorldSetlist {
  if (index < 0 || index >= current.slots.length) return current;
  const nextSlots = current.slots.filter((_, i) => i !== index);
  let nextIndex = current.currentIndex;
  if (nextSlots.length === 0) nextIndex = 0;
  else if (current.currentIndex >= nextSlots.length) nextIndex = nextSlots.length - 1;
  else if (index < current.currentIndex) nextIndex = current.currentIndex - 1;
  const next = { slots: nextSlots, currentIndex: nextIndex };
  saveWorldSetlist(next);
  return next;
}

/** Move currentIndex to the next slot; returns updated setlist (and persists). */
export function setlistGoNext(current: WorldSetlist): WorldSetlist {
  if (current.slots.length <= 0) return current;
  const nextIndex = Math.min(current.currentIndex + 1, current.slots.length - 1);
  if (nextIndex === current.currentIndex) return current;
  const updated = { ...current, currentIndex: nextIndex };
  saveWorldSetlist(updated);
  return updated;
}

/** Move currentIndex to the previous slot; returns updated setlist (and persists). */
export function setlistGoPrev(current: WorldSetlist): WorldSetlist {
  if (current.slots.length <= 0) return current;
  const nextIndex = Math.max(current.currentIndex - 1, 0);
  if (nextIndex === current.currentIndex) return current;
  const updated = { ...current, currentIndex: nextIndex };
  saveWorldSetlist(updated);
  return updated;
}

/** Get the export at the given setlist index, or null. */
export function getSetlistSlotExport(
  setlist: WorldSetlist,
  index: number,
): HarmonicWorldExport | null {
  if (index < 0 || index >= setlist.slots.length) return null;
  return setlist.slots[index] ?? null;
}

/** Find the setlist index that best matches the given export. Returns -1 if none. */
export function findSetlistIndexForExport(
  setlist: WorldSetlist,
  exportData: HarmonicWorldExport,
): number {
  return setlist.slots.findIndex((slot) => exportMatchesExport(slot, exportData));
}

/** Check if the setlist has any slots. */
export function hasSetlistSlots(setlist: WorldSetlist): boolean {
  return setlist.slots.length > 0;
}
