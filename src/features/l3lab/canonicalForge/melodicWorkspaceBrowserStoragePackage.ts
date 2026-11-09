import { isRecord, type WorkspacePackageImportMode } from '../../../core/systemMemory/packageCore';
import { CUSTOM_GRID_TUNING_STORAGE_KEY, GRID_TUNING_RACK_STORAGE_KEY } from '../../xensonar/domain/gridLibraryPersistence';
import { BASS_CLIP_LIBRARY_STORAGE_KEY } from '../../xensonar/groove/bassClipLibrary';
import { ROOT_FOLLOW_BANK_STORAGE_KEY } from '../../xensonar/material/rootFollowBankStorage';
import { ROOT_FOLLOW_LOOP_UI_STORAGE_KEY } from '../../xensonar/rootFollow/rootFollowLoopUiStorage';
import { PARTICLE_SAMPLE_PROFILE_STORAGE_KEY } from '../../xensonar/rooms/nexusParamsInitialState';
import { RESIDENT_CONSTELLATIONS_STORAGE_KEY } from '../../topology/residentConstellations';

export type WorkspaceBrowserStorageEntry = {
  key: string;
  value: string;
  label: string;
};

export type WorkspaceBrowserStorageArchivePayload = {
  schemaVersion: 1;
  entries: WorkspaceBrowserStorageEntry[];
};

// Sanity literals: xensonar-bass-clip-library-v1 · xensonar:grid-tuning-library:v2 · xensonar-drum-pattern-playlist-v1 · xensonar.resident.constellations.v1
export const WORKSPACE_PACKAGE_BROWSER_STORAGE_KEYS = [
  { key: CUSTOM_GRID_TUNING_STORAGE_KEY, label: 'Custom Raster Presets' },
  { key: GRID_TUNING_RACK_STORAGE_KEY, label: 'Custom Raster Rack' },
  { key: BASS_CLIP_LIBRARY_STORAGE_KEY, label: 'Bass Patterns / Bassläufe' },
  { key: ROOT_FOLLOW_BANK_STORAGE_KEY, label: 'Root-Follow Bank' },
  { key: ROOT_FOLLOW_LOOP_UI_STORAGE_KEY, label: 'Root-Follow UI State' },
  { key: 'xensonar-drum-pattern-playlist-v1', label: 'Drum Pattern Playlist' },
  { key: PARTICLE_SAMPLE_PROFILE_STORAGE_KEY, label: 'Partikel Sample Profile' },
  { key: RESIDENT_CONSTELLATIONS_STORAGE_KEY, label: 'Room III Resident-Konstellationen' },
  { key: 'xensonar.entrophonUnifiedSoundConfig.v116', label: 'Entrophon Klangkonfiguration' },
  { key: 'xensonar.rootFollow.granular.customSlot.v1', label: 'Root-Follow Granular Custom Slot' },
  { key: 'xensonar.gluecksrad.wheelOrder.v1', label: 'Glücksrad / MetaPreset Reihenfolge' },
] as const;

function readStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

export function exportWorkspaceBrowserStorageArchivePayload(): WorkspaceBrowserStorageArchivePayload {
  const storage = readStorage();
  const entries: WorkspaceBrowserStorageEntry[] = [];
  if (!storage) return { schemaVersion: 1, entries };
  for (const descriptor of WORKSPACE_PACKAGE_BROWSER_STORAGE_KEYS) {
    try {
      const value = storage.getItem(descriptor.key);
      if (value != null) entries.push({ key: descriptor.key, value, label: descriptor.label });
    } catch {}
  }
  return { schemaVersion: 1, entries };
}

export function parseWorkspaceBrowserStorageArchivePayload(raw: unknown): WorkspaceBrowserStorageArchivePayload | null {
  if (!isRecord(raw)) return null;
  const entries = Array.isArray(raw.entries)
    ? raw.entries
        .filter(isRecord)
        .map((entry) => {
          const key = typeof entry.key === 'string' ? entry.key : '';
          const value = typeof entry.value === 'string' ? entry.value : '';
          const label = typeof entry.label === 'string' ? entry.label : key;
          return key && WORKSPACE_PACKAGE_BROWSER_STORAGE_KEYS.some((descriptor) => descriptor.key === key)
            ? { key, value, label }
            : null;
        })
        .filter((entry): entry is WorkspaceBrowserStorageEntry => entry !== null)
    : [];
  return { schemaVersion: 1, entries };
}

export function applyWorkspaceBrowserStorageArchivePayload(args: {
  payload: WorkspaceBrowserStorageArchivePayload | null;
  mode: WorkspacePackageImportMode;
}) {
  const storage = readStorage();
  const payload = parseWorkspaceBrowserStorageArchivePayload(args.payload);
  const result = { present: !!payload, importedCount: 0, skippedCount: 0, replacedCount: 0 };
  if (!storage || !payload) return result;
  const allowed = new Set(WORKSPACE_PACKAGE_BROWSER_STORAGE_KEYS.map((entry) => entry.key));
  if (args.mode === 'replace') {
    for (const key of allowed) {
      try { storage.removeItem(key); } catch {}
    }
  }
  for (const entry of payload.entries) {
    if (!allowed.has(entry.key as (typeof WORKSPACE_PACKAGE_BROWSER_STORAGE_KEYS)[number]['key'])) continue;
    try {
      const hadExisting = storage.getItem(entry.key) != null;
      if (args.mode === 'merge' && hadExisting) {
        result.skippedCount += 1;
        continue;
      }
      storage.setItem(entry.key, entry.value);
      if (hadExisting) result.replacedCount += 1;
      result.importedCount += 1;
    } catch {}
  }
  return result;
}
