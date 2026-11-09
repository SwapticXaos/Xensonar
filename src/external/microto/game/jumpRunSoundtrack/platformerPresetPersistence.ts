/**
 * Jump+Run composition preset persistence (localStorage).
 * Supports a small named preset library for movement-derived loop playback.
 * Sanitization logic in platformerPresetSanitize.ts (pure, testable).
 */

import {
  sanitizePreset,
  sanitizePresetItem,
  sanitizeName,
  sanitizeId,
  type PlatformerCompositionPreset,
  type PlatformerCompositionPresetItem,
} from "./platformerPresetSanitize";

const STORAGE_KEY = "xensonar_platformer_composition_preset";
const QUICK_SAVE_ID = "quick-save";
const MAX_LIBRARY_ITEMS = 24;

export type { PlatformerCompositionPreset, PlatformerCompositionPresetItem };

export type PlatformerPresetImportMode = "merge" | "replace";

export type PlatformerPresetImportResult = {
  items: PlatformerCompositionPresetItem[];
  imported: number;
  rejected: number;
  trimmed: number;
};

type PersistedPresetLibrary = {
  version: 1;
  items: PlatformerCompositionPresetItem[];
};

const clonePreset = (preset: PlatformerCompositionPreset): PlatformerCompositionPreset => ({
  version: 1,
  savedAt: preset.savedAt,
  phrase: [...preset.phrase],
  movementEvents: preset.movementEvents.map((event) => ({ ...event })),
  tuningMode: preset.tuningMode,
  arrangementMode: preset.arrangementMode,
  formMode: preset.formMode,
  sectionBias: preset.sectionBias,
  evolutionDepth: preset.evolutionDepth,
  tempoFollow: preset.tempoFollow,
  bpm: preset.bpm,
  masterVolume: preset.masterVolume,
  composerOn: preset.composerOn,
});

const uniqueAndSortItems = (items: PlatformerCompositionPresetItem[]): PlatformerCompositionPresetItem[] => {
  const unique = new Map<string, PlatformerCompositionPresetItem>();
  for (const item of items) {
    if (!unique.has(item.id)) unique.set(item.id, item);
  }
  return [...unique.values()]
    .sort((a, b) => b.savedAt - a.savedAt)
    .slice(0, MAX_LIBRARY_ITEMS);
};

const parsePresetItemsFromUnknown = (value: unknown): PlatformerCompositionPresetItem[] => {
  const isObject = (v: unknown): v is Record<string, unknown> =>
    v != null && typeof v === "object" && !Array.isArray(v);

  if (isObject(value) && Array.isArray(value.items)) {
    const items = value.items
      .map((item) => sanitizePresetItem(item))
      .filter((item): item is PlatformerCompositionPresetItem => item != null);
    return uniqueAndSortItems(items);
  }
  if (Array.isArray(value)) {
    const items = value
      .map((item) => sanitizePresetItem(item))
      .filter((item): item is PlatformerCompositionPresetItem => item != null);
    return uniqueAndSortItems(items);
  }

  const legacyPreset = sanitizePreset(value);
  if (legacyPreset) {
    return [{
      id: "legacy-quick-save",
      name: "Legacy Quick Save",
      savedAt: legacyPreset.savedAt,
      preset: legacyPreset,
    }];
  }

  return [];
};

const parsePresetLibrary = (raw: string | null): PlatformerCompositionPresetItem[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsePresetItemsFromUnknown(parsed);
  } catch {
    return [];
  }
};

const writePresetLibrary = (items: PlatformerCompositionPresetItem[]) => {
  try {
    const payload: PersistedPresetLibrary = {
      version: 1,
      items: uniqueAndSortItems(items).map((item) => ({
        ...item,
        preset: clonePreset(item.preset),
      })),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage disabled or quota exceeded
  }
};

const readPresetLibrary = () => parsePresetLibrary(localStorage.getItem(STORAGE_KEY));

const createPresetId = (name: string) => {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "loop";
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 7);
  return `${slug}-${ts}-${rnd}`;
};

export function listPlatformerCompositionPresets(): PlatformerCompositionPresetItem[] {
  return readPresetLibrary().map((item) => ({
    ...item,
    preset: clonePreset(item.preset),
  }));
}

export function saveNamedPlatformerCompositionPreset(
  name: string,
  preset: PlatformerCompositionPreset,
  existingId?: string,
): PlatformerCompositionPresetItem[] {
  const safePreset = sanitizePreset(preset);
  if (!safePreset) return listPlatformerCompositionPresets();

  const id = sanitizeId(existingId);
  const now = Date.now();
  const items = readPresetLibrary();
  const cleanName = sanitizeName(name, "Session Loop");
  const entry: PlatformerCompositionPresetItem = {
    id: id ?? createPresetId(cleanName),
    name: cleanName,
    savedAt: now,
    preset: { ...safePreset, savedAt: now },
  };

  const index = id ? items.findIndex((item) => item.id === id) : -1;
  if (index >= 0) {
    items[index] = entry;
  } else {
    items.unshift(entry);
  }
  const out = uniqueAndSortItems(items);
  writePresetLibrary(out);
  return out.map((item) => ({
    ...item,
    preset: clonePreset(item.preset),
  }));
}

export function loadPlatformerCompositionPresetById(id: string): PlatformerCompositionPreset | null {
  const cleanId = sanitizeId(id);
  if (!cleanId) return null;
  const item = readPresetLibrary().find((entry) => entry.id === cleanId);
  return item ? clonePreset(item.preset) : null;
}

export function removePlatformerCompositionPreset(id: string): PlatformerCompositionPresetItem[] {
  const cleanId = sanitizeId(id);
  if (!cleanId) return listPlatformerCompositionPresets();
  const next = readPresetLibrary().filter((item) => item.id !== cleanId);
  writePresetLibrary(next);
  return next.map((item) => ({
    ...item,
    preset: clonePreset(item.preset),
  }));
}

export function exportPlatformerCompositionPresetLibrary(pretty = true): string {
  const payload: PersistedPresetLibrary = {
    version: 1,
    items: readPresetLibrary().map((item) => ({
      ...item,
      preset: clonePreset(item.preset),
    })),
  };
  return JSON.stringify(payload, null, pretty ? 2 : 0);
}

const getImportCandidateCount = (value: unknown): number => {
  const isObject = (v: unknown): v is Record<string, unknown> =>
    v != null && typeof v === "object" && !Array.isArray(v);
  if (isObject(value) && Array.isArray(value.items)) return value.items.length;
  if (Array.isArray(value)) return value.length;
  if (isObject(value)) return 1;
  return 0;
};

export function importPlatformerCompositionPresetLibrary(
  raw: string,
  mode: PlatformerPresetImportMode = "merge",
): PlatformerPresetImportResult {
  const text = raw.trim();
  if (!text) {
    return {
      items: listPlatformerCompositionPresets(),
      imported: 0,
      rejected: 0,
      trimmed: 0,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return {
      items: listPlatformerCompositionPresets(),
      imported: 0,
      rejected: 1,
      trimmed: 0,
    };
  }

  const importedItems = parsePresetItemsFromUnknown(parsed);
  const candidateCount = getImportCandidateCount(parsed);
  const rejected = Math.max(0, candidateCount - importedItems.length);
  if (importedItems.length === 0) {
    return {
      items: listPlatformerCompositionPresets(),
      imported: 0,
      rejected,
      trimmed: 0,
    };
  }

  const baseItems = mode === "replace" ? [] : readPresetLibrary();
  const merged = [...baseItems];
  for (const imported of importedItems) {
    const index = merged.findIndex((item) => item.id === imported.id);
    if (index >= 0) {
      merged[index] = imported;
    } else {
      merged.push(imported);
    }
  }

  const next = uniqueAndSortItems(merged);
  const trimmed = Math.max(0, merged.length - next.length);
  writePresetLibrary(next);
  return {
    items: next.map((item) => ({
      ...item,
      preset: clonePreset(item.preset),
    })),
    imported: importedItems.length,
    rejected,
    trimmed,
  };
}

/**
 * Backwards-compatible quick-save API used by existing room wiring.
 * Saves/updates a fixed "Quick Save" slot.
 */
export function savePlatformerCompositionPreset(preset: PlatformerCompositionPreset): void {
  saveNamedPlatformerCompositionPreset("Quick Save", preset, QUICK_SAVE_ID);
}

/**
 * Backwards-compatible quick-load API: returns latest saved preset when present.
 */
export function loadPlatformerCompositionPreset(): PlatformerCompositionPreset | null {
  const items = readPresetLibrary();
  if (items.length === 0) return null;
  return clonePreset(items[0].preset);
}

export function clearPlatformerCompositionPreset(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage disabled
  }
}
