import { reorderPlaylistIds, type PlaylistDropOperation } from './material/playlistDropOperation';
import type { DrumPattern } from './domain/instrumentData';
import { buildDrumSoundPalette } from './groove/drumKitRouting';
import type { DrumPlaylistConfigOption, DrumPlaylistEntry, DrumPlaylistPatternOption, DrumPlaylistState } from './drumPatternPlaylistTypes';
import { dispatchDrumPatternPlaylistUpdated } from './drumPatternPlaylistEventContract';

export type { DrumPlaylistConfigOption, DrumPlaylistEntry, DrumPlaylistPatternOption, DrumPlaylistState } from './drumPatternPlaylistTypes';

const STORAGE_KEY = 'xensonar-drum-pattern-playlist-v1';
const EMPTY_STATE: DrumPlaylistState = { orderedIds: [], hiddenIds: [], aliases: {} };

export function createPresetDrumPlaylistId(value: string) {
  return `preset:${value}`;
}

export function createExportedDrumPlaylistId(value: string) {
  return `exported:${value}`;
}

export function readDrumPlaylistState(): DrumPlaylistState {
  if (typeof window === 'undefined') return EMPTY_STATE;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null') as Partial<DrumPlaylistState> | null;
    if (!parsed || typeof parsed !== 'object') return EMPTY_STATE;
    return {
      orderedIds: Array.isArray(parsed.orderedIds) ? parsed.orderedIds.filter((id): id is string => typeof id === 'string') : [],
      hiddenIds: Array.isArray(parsed.hiddenIds) ? parsed.hiddenIds.filter((id): id is string => typeof id === 'string') : [],
      aliases: parsed.aliases && typeof parsed.aliases === 'object'
        ? Object.fromEntries(Object.entries(parsed.aliases).filter((entry): entry is [string, string] => typeof entry[0] === 'string' && typeof entry[1] === 'string'))
        : {},
    };
  } catch {
    return EMPTY_STATE;
  }
}

export function writeDrumPlaylistState(state: DrumPlaylistState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  dispatchDrumPatternPlaylistUpdated();
}

export function buildDefaultDrumPlaylistEntries(args: {
  drumPatterns: readonly DrumPlaylistPatternOption[];
  exportedDrumConfigs: readonly DrumPlaylistConfigOption[];
}): DrumPlaylistEntry[] {
  return [
    ...args.drumPatterns.map((entry) => ({
      id: createPresetDrumPlaylistId(entry.value),
      kind: 'preset' as const,
      value: entry.value,
      name: entry.label,
    })),
    ...args.exportedDrumConfigs.map((entry) => {
      const palette = buildDrumSoundPalette({ drumKit: entry.drumKit, laneKitOverrides: entry.laneKitOverrides });
      return {
        id: createExportedDrumPlaylistId(entry.id),
        kind: 'exported' as const,
        value: entry.id,
        name: entry.name,
        bars: entry.bars,
        drumKit: palette.drumKit,
        laneKitOverrides: palette.drumLaneKits,
      };
    }),
  ];
}

export function resolveDrumPlaylistEntries(args: {
  drumPatterns: readonly DrumPlaylistPatternOption[];
  exportedDrumConfigs: readonly DrumPlaylistConfigOption[];
  state?: DrumPlaylistState;
}): DrumPlaylistEntry[] {
  const saved = args.state ?? readDrumPlaylistState();
  const base = buildDefaultDrumPlaylistEntries(args);
  const byId = new Map(base.map((entry) => [entry.id, entry]));
  const orderedIds = [
    ...saved.orderedIds.filter((id) => byId.has(id)),
    ...base.map((entry) => entry.id).filter((id) => !saved.orderedIds.includes(id)),
  ];
  const hidden = new Set(saved.hiddenIds);
  return orderedIds
    .map((id) => byId.get(id))
    .filter((entry): entry is DrumPlaylistEntry => entry !== undefined && !hidden.has(entry.id))
    .map((entry) => {
      const alias = saved.aliases[entry.id]?.trim();
      return alias ? { ...entry, name: alias } : entry;
    });
}

export function getActiveDrumPlaylistId(args: { drumConfigMode: 'preset' | 'exported'; drumPattern: DrumPattern; drumConfigId: string }) {
  return args.drumConfigMode === 'exported' && args.drumConfigId
    ? createExportedDrumPlaylistId(args.drumConfigId)
    : createPresetDrumPlaylistId(args.drumPattern);
}

export function patchForDrumPlaylistEntry(entry: DrumPlaylistEntry) {
  return entry.kind === 'exported'
    ? {
        drumConfigMode: 'exported' as const,
        drumConfigId: entry.value,
        drumActive: true,
        ...buildDrumSoundPalette({ drumKit: entry.drumKit, laneKitOverrides: entry.laneKitOverrides }),
      }
    : { drumConfigMode: 'preset' as const, drumPattern: entry.value as DrumPattern, drumConfigId: '', drumActive: true };
}

export function resolveActiveDrumPlaylistEntry(args: {
  entries: readonly DrumPlaylistEntry[];
  drumConfigMode: 'preset' | 'exported';
  drumPattern: DrumPattern;
  drumConfigId: string;
}) {
  const activeId = getActiveDrumPlaylistId(args);
  return args.entries.find((entry) => entry.id === activeId) ?? args.entries[0] ?? null;
}

export function resolveNextDrumPlaylistPatch(args: {
  drumPatterns: readonly DrumPlaylistPatternOption[];
  exportedDrumConfigs: readonly DrumPlaylistConfigOption[];
  drumConfigMode: 'preset' | 'exported';
  drumPattern: DrumPattern;
  drumConfigId: string;
  direction: -1 | 1;
}) {
  const entries = resolveDrumPlaylistEntries(args);
  if (!entries.length) return null;
  const activeId = getActiveDrumPlaylistId(args);
  const currentIndex = Math.max(0, entries.findIndex((entry) => entry.id === activeId));
  const nextIndex = (currentIndex + args.direction + entries.length) % entries.length;
  return patchForDrumPlaylistEntry(entries[nextIndex]);
}

export function updateDrumPlaylistAlias(entryId: string, name: string) {
  const state = readDrumPlaylistState();
  const aliases = { ...state.aliases };
  const trimmed = name.trim();
  if (trimmed) aliases[entryId] = trimmed;
  else delete aliases[entryId];
  writeDrumPlaylistState({ ...state, aliases });
}

export function hideDrumPlaylistEntry(entryId: string) {
  const state = readDrumPlaylistState();
  if (state.hiddenIds.includes(entryId)) return state;
  const next = { ...state, hiddenIds: [...state.hiddenIds, entryId] };
  writeDrumPlaylistState(next);
  return next;
}

function normalizeVisibleDrumPlaylistOrder(ids: readonly string[]) {
  return ids.filter((id, index, all) => id && all.indexOf(id) === index);
}

export function moveDrumPlaylistEntryFromVisibleOrder(args: { draggedId: string; targetId: string; operation: PlaylistDropOperation; currentIds: readonly string[] }) {
  const state = readDrumPlaylistState();
  const visibleOrder = normalizeVisibleDrumPlaylistOrder(args.currentIds);
  if (!visibleOrder.length || !visibleOrder.includes(args.draggedId) || !visibleOrder.includes(args.targetId)) return state;
  const nextVisibleOrder = reorderPlaylistIds({
    ids: visibleOrder,
    draggedId: args.draggedId,
    targetId: args.targetId,
    operation: args.operation,
  });
  const knownVisible = new Set(visibleOrder);
  const hiddenOrUnavailablePersistedIds = state.orderedIds.filter((id) => !knownVisible.has(id));
  const next = { ...state, orderedIds: [...nextVisibleOrder, ...hiddenOrUnavailablePersistedIds] };
  writeDrumPlaylistState(next);
  return next;
}

export function moveDrumPlaylistEntry(args: { draggedId: string; targetId: string; operation: PlaylistDropOperation; currentIds?: readonly string[] }) {
  if (args.currentIds && args.currentIds.length) {
    return moveDrumPlaylistEntryFromVisibleOrder({ ...args, currentIds: args.currentIds });
  }
  const state = readDrumPlaylistState();
  const visibleOrder = normalizeVisibleDrumPlaylistOrder([
    ...state.orderedIds,
    args.draggedId,
    args.targetId,
  ]);
  if (!visibleOrder.length) return state;
  const nextVisibleOrder = reorderPlaylistIds({
    ids: visibleOrder,
    draggedId: args.draggedId,
    targetId: args.targetId,
    operation: args.operation,
  });
  const knownVisible = new Set(visibleOrder);
  const hiddenOrUnavailablePersistedIds = state.orderedIds.filter((id) => !knownVisible.has(id));
  const next = { ...state, orderedIds: [...nextVisibleOrder, ...hiddenOrUnavailablePersistedIds] };
  writeDrumPlaylistState(next);
  return next;
}
