import type { HarmonicWorldExport } from "./harmonicWorld";

const STORAGE_KEY = "xensonar.worldHistory.v1";
const MAX_HISTORY = 16;

type StoredHistoryEntry = HarmonicWorldExport;
export type WorldHistoryEntry = StoredHistoryEntry;

function safeParse(json: string | null): StoredHistoryEntry[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed as StoredHistoryEntry[];
  } catch {
    return [];
  }
}

function safeStringify(entries: StoredHistoryEntry[]): string {
  try {
    return JSON.stringify(entries);
  } catch {
    return "[]";
  }
}

export function loadWorldHistory(): StoredHistoryEntry[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return safeParse(raw);
}

export function saveWorldHistory(entries: StoredHistoryEntry[]): void {
  if (typeof window === "undefined") return;
  const compact = entries.slice(0, MAX_HISTORY);
  window.localStorage.setItem(STORAGE_KEY, safeStringify(compact));
}

function exportsRoughlyMatch(a: HarmonicWorldExport, b: HarmonicWorldExport): boolean {
  if (a.id != null && a.id !== "" && b.id != null && b.id !== "") {
    return a.id === b.id;
  }
  if (a.gridTuning !== b.gridTuning) return false;
  if (Math.abs(a.baseFreq - b.baseFreq) > 0.01) return false;
  if (a.quantizeOn !== b.quantizeOn) return false;
  if (a.quantizeSubdivision !== b.quantizeSubdivision) return false;
  if (Math.abs(a.quantizeBpm - b.quantizeBpm) > 0.5) return false;
  return true;
}

export function addWorldToHistory(
  current: StoredHistoryEntry[],
  exportData: HarmonicWorldExport,
): StoredHistoryEntry[] {
  const existingIndex = current.findIndex((entry) => exportsRoughlyMatch(entry, exportData));
  const withoutDuplicate =
    existingIndex >= 0 ? current.filter((_, index) => index !== existingIndex) : current;
  const next = [exportData, ...withoutDuplicate];
  return next.slice(0, MAX_HISTORY);
}

/**
 * Convenience helper for recording a world import into history.
 * Intended to be called from harmonic world runtime or world-aware rooms.
 */
export function recordWorldImport(exportData: HarmonicWorldExport): void {
  if (typeof window === "undefined") return;
  const current = loadWorldHistory();
  const next = addWorldToHistory(current, exportData);
  saveWorldHistory(next);
}

export function clearWorldHistory(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

