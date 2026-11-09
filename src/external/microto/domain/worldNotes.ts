import type { HarmonicWorld, HarmonicWorldExport } from "./harmonicWorld";

const STORAGE_KEY = "xensonar.worldNotes.v1";

type WorldNotesMap = Record<string, string>;

function safeParseNotes(raw: string | null): WorldNotesMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as WorldNotesMap;
  } catch {
    return {};
  }
}

function safeStringifyNotes(map: WorldNotesMap): string {
  try {
    return JSON.stringify(map);
  } catch {
    return "{}";
  }
}

function makeWorldKeyFromSnapshot(world: {
  id: HarmonicWorld["id"];
  label: HarmonicWorld["label"];
  baseFreq: HarmonicWorld["baseFreq"];
  gridTuning: HarmonicWorld["gridTuning"];
}): string {
  if (world.id) {
    return `id:${world.id}`;
  }
  if (world.label) {
    return `label:${world.label}`;
  }
  return `grid:${world.gridTuning}:${world.baseFreq.toFixed(4)}`;
}

export function loadWorldNotes(): WorldNotesMap {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return safeParseNotes(raw);
}

export function saveWorldNotes(map: WorldNotesMap): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, safeStringifyNotes(map));
}

export function getWorldNote(world: HarmonicWorld | HarmonicWorldExport | null | undefined): string {
  if (!world) return "";
  const key = makeWorldKeyFromSnapshot(world);
  const map = loadWorldNotes();
  return map[key] ?? "";
}

export function setWorldNote(
  world: HarmonicWorld | HarmonicWorldExport | null | undefined,
  note: string,
): void {
  if (!world) return;
  if (typeof window === "undefined") return;
  const key = makeWorldKeyFromSnapshot(world);
  const current = loadWorldNotes();
  if (!note.trim()) {
    const { [key]: _, ...rest } = current;
    saveWorldNotes(rest);
    return;
  }
  const next: WorldNotesMap = {
    ...current,
    [key]: note,
  };
  saveWorldNotes(next);
}

