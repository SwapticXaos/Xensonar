import type { GridTuning } from './gridTuningTypes';
import type { StoredCustomGridTuning } from './gridRasterTypes';

export const CUSTOM_GRID_TUNING_STORAGE_KEY = 'xensonar:grid-tuning-library:v2';
export const GRID_TUNING_LIBRARY_UPDATED_EVENT = 'xensonar:grid-tuning-library-updated';
export const GRID_TUNING_RACK_STORAGE_KEY = 'xensonar:grid-tuning-active-rack:v1';
export const GRID_TUNING_RACK_UPDATED_EVENT = 'xensonar:grid-tuning-rack-updated';

let cachedCustomGridTunings: StoredCustomGridTuning[] | null = null;

export function loadPersistedCustomGridTunings(args: {
  sanitize: (value: unknown) => StoredCustomGridTuning | null;
}) {
  if (cachedCustomGridTunings) return cachedCustomGridTunings;
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_GRID_TUNING_STORAGE_KEY);
    if (!raw) {
      cachedCustomGridTunings = [];
      return cachedCustomGridTunings;
    }
    const parsed = JSON.parse(raw);
    const cleaned = Array.isArray(parsed)
      ? parsed.map(args.sanitize).filter((entry): entry is StoredCustomGridTuning => !!entry)
      : [];
    cachedCustomGridTunings = cleaned;
    return cleaned;
  } catch {
    cachedCustomGridTunings = [];
    return cachedCustomGridTunings;
  }
}

export function persistCustomGridTunings(entries: StoredCustomGridTuning[]) {
  cachedCustomGridTunings = [...entries];
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CUSTOM_GRID_TUNING_STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new CustomEvent(GRID_TUNING_LIBRARY_UPDATED_EVENT, { detail: entries }));
}

export function readPersistedGridTuningRack(args: {
  defaultRack: GridTuning[];
  sanitizeRack: (value: unknown) => GridTuning[];
}) {
  if (typeof window === 'undefined') return [...args.defaultRack];
  try {
    const raw = window.localStorage.getItem(GRID_TUNING_RACK_STORAGE_KEY);
    if (!raw) return [...args.defaultRack];
    return args.sanitizeRack(JSON.parse(raw));
  } catch {
    return [...args.defaultRack];
  }
}

export function writePersistedGridTuningRack(args: {
  rack: GridTuning[];
  sanitizeRack: (value: unknown) => GridTuning[];
}) {
  if (typeof window === 'undefined') return;
  const sanitized = args.sanitizeRack(args.rack);
  window.localStorage.setItem(GRID_TUNING_RACK_STORAGE_KEY, JSON.stringify(sanitized));
  window.dispatchEvent(new CustomEvent(GRID_TUNING_RACK_UPDATED_EVENT, { detail: sanitized }));
}

export function resetPersistedGridTuningRack(args: {
  defaultRack: GridTuning[];
  sanitizeRack: (value: unknown) => GridTuning[];
}) {
  writePersistedGridTuningRack({ rack: [...args.defaultRack], sanitizeRack: args.sanitizeRack });
}
