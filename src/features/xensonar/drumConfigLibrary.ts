import { useSyncExternalStore } from 'react';
import { deleteIndexedDbRecord, putIndexedDbRecord, readAllIndexedDbRecords, type IndexedDbRecordStoreConfig } from '../../core/browser/indexedDbRecordStore';
import type { DrumLaneId, DrumPatternMatrix } from './drumPatternMachineTypes';
import type { DrumLaneKitOverrides } from './groove/drumKitRoutingTypes';
import { sanitizeDrumKit, sanitizeDrumLaneKitOverrides } from './groove/drumKitRouting';
import type { DrumLaneSettingsMap } from './groove/drumLaneSettings';
import { cloneDrumLaneSettingsMap, sanitizeDrumLaneSettings } from './groove/drumLaneSettings';
import type { DrumStepProgramMap } from '../l3lab/canonicalForge/drumProgram';
import { sanitizeDrumStepPrograms } from '../l3lab/canonicalForge/drumProgram';
import { readDrumPlaylistState, writeDrumPlaylistState } from './drumPatternPlaylist';
import type { DrumPlaylistState } from './drumPatternPlaylistTypes';
import { isRecord, type WorkspacePackageImportMode } from '../../core/systemMemory/packageCore';

import type { DrumConfigEntry, DrumConfigLibraryArchiveImportResult, DrumConfigLibraryArchivePayload } from './drumConfigLibraryTypes';
import { dispatchDrumConfigLibraryEvent } from './drumConfig/drumConfigLibraryEventContract';

export type { DrumConfigEntry, DrumConfigLibraryArchiveImportResult, DrumConfigLibraryArchivePayload } from './drumConfigLibraryTypes';

interface PersistedDrumConfigRecord extends DrumConfigEntry {}

type Listener = () => void;
type DrumConfigLibraryState = { entries: DrumConfigEntry[] };

const DB_NAME = 'xensonar-drum-config-library';
const STORE_NAME = 'drumConfigs';
const MAX_ENTRIES = 64;
const DB_CONFIG: IndexedDbRecordStoreConfig = {
  dbName: DB_NAME,
  storeName: STORE_NAME,
  openErrorMessage: 'Failed to open IndexedDB',
};
let state: DrumConfigLibraryState = { entries: [] };
const listeners = new Set<Listener>();
let hydrationStarted = false;
const deletedIds = new Set<string>();

function emit() {
  listeners.forEach((listener) => listener());
}



function createLibraryId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `drumcfg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
function cloneLaneSteps(laneSteps: Record<DrumLaneId, number[]>) {
  return Object.fromEntries(Object.entries(laneSteps).map(([laneId, values]) => [laneId, [...values]])) as Record<DrumLaneId, number[]>;
}

function normalizeEntry(entry: DrumConfigEntry): DrumConfigEntry {
  const bars = Math.max(1, Math.round(entry.bars || 1));
  const segmentsPerBar = Math.max(1, Math.min(32, Math.round(entry.segmentsPerBar || (entry.stepCount ? Math.round(entry.stepCount / bars) : 16) || 16)));
  const stepCount = Math.max(segmentsPerBar, Math.round(entry.stepCount || bars * segmentsPerBar));
  return {
    ...entry,
    name: entry.name.trim() || 'Drum Config',
    presetSource: entry.presetSource || 'custom',
    drumKit: sanitizeDrumKit(entry.drumKit),
    bars,
    segmentsPerBar,
    segmentMarkers: Array.isArray(entry.segmentMarkers) ? [...entry.segmentMarkers] : [],
    stepCount,
    laneOrder: [...entry.laneOrder],
    laneSteps: cloneLaneSteps(entry.laneSteps),
    laneKitOverrides: sanitizeDrumLaneKitOverrides((entry as DrumConfigEntry).laneKitOverrides),
    laneSettings: cloneDrumLaneSettingsMap(sanitizeDrumLaneSettings((entry as DrumConfigEntry).laneSettings)),
    stepPrograms: sanitizeDrumStepPrograms((entry as DrumConfigEntry).stepPrograms, { laneOrder: entry.laneOrder, laneSteps: entry.laneSteps, stepCount }),
    createdAt: Number.isFinite(entry.createdAt) ? entry.createdAt : Date.now(),
    updatedAt: Number.isFinite(entry.updatedAt) ? entry.updatedAt : Date.now(),
  };
}

function sortEntries(entries: DrumConfigEntry[]) {
  return [...entries].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_ENTRIES);
}

function setEntries(nextEntries: DrumConfigEntry[]) {
  state = { entries: sortEntries(nextEntries) };
  emit();
}

async function loadPersistedEntries() {
  if (typeof indexedDB === 'undefined') return;
  const records = await readAllIndexedDbRecords<PersistedDrumConfigRecord>(DB_CONFIG, 'Failed to load drum configs');

  const persistedEntries = records.filter((record) => !deletedIds.has(record.id)).map(normalizeEntry);
  const merged = new Map<string, DrumConfigEntry>();
  for (const entry of persistedEntries) merged.set(entry.id, entry);
  for (const entry of state.entries) merged.set(entry.id, entry);
  setEntries([...merged.values()]);
}

function ensureHydrated() {
  if (hydrationStarted) return;
  hydrationStarted = true;
  void loadPersistedEntries().catch((error) => {
    console.warn('[xensonar][drum-config-library][hydrate]', error);
  });
}

async function persistEntry(entry: DrumConfigEntry) {
  if (typeof indexedDB === 'undefined') return;
  await putIndexedDbRecord(DB_CONFIG, entry, 'Failed to persist drum config');
}

async function deletePersistedEntry(id: string) {
  if (typeof indexedDB === 'undefined') return;
  await deleteIndexedDbRecord(DB_CONFIG, id, 'Failed to delete drum config');
}

export function drumMatrixToConfigEntry(args: {
  name: string;
  drumKit: unknown;
  matrix: DrumPatternMatrix;
  sourceWorkspace?: string;
  laneKitOverrides?: DrumLaneKitOverrides;
  laneSettings?: DrumLaneSettingsMap;
  stepPrograms?: DrumStepProgramMap;
}): DrumConfigEntry {
  const now = Date.now();
  return normalizeEntry({
    id: createLibraryId(),
    name: args.name,
    presetSource: args.matrix.pattern,
    drumKit: sanitizeDrumKit(args.drumKit),
    bars: args.matrix.bars,
    segmentsPerBar: args.matrix.segmentsPerBar,
    segmentMarkers: [...args.matrix.segmentMarkers],
    stepCount: args.matrix.stepCount,
    laneOrder: [...args.matrix.laneOrder],
    laneSteps: cloneLaneSteps(args.matrix.laneSteps),
    laneKitOverrides: sanitizeDrumLaneKitOverrides(args.laneKitOverrides),
    laneSettings: cloneDrumLaneSettingsMap(sanitizeDrumLaneSettings(args.laneSettings)),
    stepPrograms: sanitizeDrumStepPrograms(args.stepPrograms, { laneOrder: args.matrix.laneOrder, laneSteps: args.matrix.laneSteps, stepCount: args.matrix.stepCount }),
    createdAt: now,
    updatedAt: now,
    sourceWorkspace: args.sourceWorkspace,
  });
}

export async function registerDrumConfig(entry: DrumConfigEntry): Promise<DrumConfigEntry> {
  ensureHydrated();
  const normalized = normalizeEntry(entry);
  deletedIds.delete(normalized.id);
  setEntries([normalized, ...state.entries.filter((existing) => existing.id !== normalized.id)]);
  await persistEntry(normalized);
  dispatchDrumConfigLibraryEvent('registered', { id: normalized.id, name: normalized.name, presetSource: normalized.presetSource });
  return normalized;
}

export async function registerDrumConfigFromMatrix(args: {
  name: string;
  drumKit: unknown;
  matrix: DrumPatternMatrix;
  sourceWorkspace?: string;
  laneKitOverrides?: DrumLaneKitOverrides;
  laneSettings?: DrumLaneSettingsMap;
  stepPrograms?: DrumStepProgramMap;
}) {
  const entry = drumMatrixToConfigEntry(args);
  return registerDrumConfig(entry);
}

export async function updateDrumConfigEntry(id: string, patch: Partial<Pick<DrumConfigEntry, 'name'>>) {
  ensureHydrated();
  const existing = state.entries.find((entry) => entry.id === id);
  deletedIds.delete(id);
  if (!existing) throw new Error('Drum-Konfiguration nicht gefunden');
  const next = normalizeEntry({
    ...existing,
    name: patch.name !== undefined ? patch.name.trim() || existing.name : existing.name,
    updatedAt: Date.now(),
  });
  setEntries([next, ...state.entries.filter((entry) => entry.id !== id)]);
  await persistEntry(next);
  dispatchDrumConfigLibraryEvent('updated', { id: next.id, name: next.name });
  return next;
}

export async function deleteDrumConfigEntry(id: string) {
  ensureHydrated();
  deletedIds.add(id);
  setEntries(state.entries.filter((entry) => entry.id !== id));
  await deletePersistedEntry(id);
  dispatchDrumConfigLibraryEvent('deleted', { id });
}

export function getDrumConfigLibraryState(): DrumConfigLibraryState {
  ensureHydrated();
  return state;
}

export function subscribeDrumConfigLibrary(listener: Listener) {
  ensureHydrated();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDrumConfigLibrary<U = DrumConfigLibraryState>(selector?: (snapshot: DrumConfigLibraryState) => U): U {
  ensureHydrated();
  const select = selector ?? ((snapshot: DrumConfigLibraryState) => snapshot as unknown as U);
  return useSyncExternalStore(subscribeDrumConfigLibrary, () => select(state), () => select(state));
}


function cloneDrumConfigEntry(entry: DrumConfigEntry): DrumConfigEntry {
  return normalizeEntry({
    ...entry,
    laneOrder: [...entry.laneOrder],
    laneSteps: cloneLaneSteps(entry.laneSteps),
    segmentMarkers: [...entry.segmentMarkers],
    laneKitOverrides: sanitizeDrumLaneKitOverrides(entry.laneKitOverrides),
    laneSettings: cloneDrumLaneSettingsMap(sanitizeDrumLaneSettings(entry.laneSettings)),
    stepPrograms: sanitizeDrumStepPrograms(entry.stepPrograms, {
      laneOrder: entry.laneOrder,
      laneSteps: entry.laneSteps,
      stepCount: entry.stepCount,
    }),
  });
}

async function readPersistedDrumConfigEntries(): Promise<DrumConfigEntry[]> {
  if (typeof indexedDB === 'undefined') return [];
  const records = await readAllIndexedDbRecords<PersistedDrumConfigRecord>(DB_CONFIG, 'Failed to read drum configs');
  return records.filter((record) => !deletedIds.has(record.id)).map(normalizeEntry);
}

export async function listDrumConfigLibraryEntries(): Promise<DrumConfigEntry[]> {
  ensureHydrated();
  const merged = new Map<string, DrumConfigEntry>();
  try {
    for (const entry of await readPersistedDrumConfigEntries()) merged.set(entry.id, entry);
  } catch (error) {
    console.warn('[xensonar][drum-config-library][archive-read]', error);
  }
  for (const entry of state.entries) merged.set(entry.id, normalizeEntry(entry));
  const entries = sortEntries([...merged.values()]);
  setEntries(entries);
  return entries.map(cloneDrumConfigEntry);
}

function normalizeDrumPlaylistState(raw: unknown): DrumPlaylistState | null {
  if (!isRecord(raw)) return null;
  const aliases = isRecord(raw.aliases)
    ? Object.fromEntries(Object.entries(raw.aliases).filter((entry): entry is [string, string] => typeof entry[0] === 'string' && typeof entry[1] === 'string'))
    : {};
  return {
    orderedIds: Array.isArray(raw.orderedIds) ? raw.orderedIds.filter((id): id is string => typeof id === 'string') : [],
    hiddenIds: Array.isArray(raw.hiddenIds) ? raw.hiddenIds.filter((id): id is string => typeof id === 'string') : [],
    aliases,
  };
}

function mergeDrumPlaylistState(current: DrumPlaylistState, incoming: DrumPlaylistState, mode: WorkspacePackageImportMode): DrumPlaylistState {
  if (mode === 'replace' || mode === 'differential') return {
    orderedIds: [...incoming.orderedIds],
    hiddenIds: [...incoming.hiddenIds],
    aliases: { ...incoming.aliases },
  };
  const unique = (ids: string[]) => Array.from(new Set(ids.filter(Boolean)));
  return {
    orderedIds: unique([...current.orderedIds, ...incoming.orderedIds]),
    hiddenIds: unique([...current.hiddenIds, ...incoming.hiddenIds]),
    aliases: { ...current.aliases, ...incoming.aliases },
  };
}

function normalizeDrumConfigArchivePayload(raw: unknown): DrumConfigLibraryArchivePayload | null {
  if (!isRecord(raw)) return null;
  const entries = Array.isArray(raw.entries)
    ? raw.entries.filter(isRecord).map((entry) => normalizeEntry({
      id: typeof entry.id === 'string' ? entry.id : createLibraryId(),
      name: typeof entry.name === 'string' ? entry.name : 'Drum Config',
      presetSource: typeof entry.presetSource === 'string' ? entry.presetSource : 'custom',
      drumKit: sanitizeDrumKit(entry.drumKit),
      bars: typeof entry.bars === 'number' ? entry.bars : 1,
      segmentsPerBar: typeof entry.segmentsPerBar === 'number' ? entry.segmentsPerBar : 16,
      segmentMarkers: Array.isArray(entry.segmentMarkers) ? entry.segmentMarkers.filter((value): value is number => typeof value === 'number' && Number.isFinite(value)) : [],
      stepCount: typeof entry.stepCount === 'number' ? entry.stepCount : 16,
      laneOrder: Array.isArray(entry.laneOrder) ? entry.laneOrder.filter((value): value is DrumLaneId => typeof value === 'string') : [],
      laneSteps: isRecord(entry.laneSteps)
        ? Object.fromEntries(Object.entries(entry.laneSteps).map(([laneId, values]) => [laneId, Array.isArray(values) ? values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value)) : []])) as Record<DrumLaneId, number[]>
        : {} as Record<DrumLaneId, number[]>,
      laneKitOverrides: sanitizeDrumLaneKitOverrides(entry.laneKitOverrides),
      laneSettings: cloneDrumLaneSettingsMap(sanitizeDrumLaneSettings(entry.laneSettings)),
      stepPrograms: sanitizeDrumStepPrograms(entry.stepPrograms, {
        laneOrder: Array.isArray(entry.laneOrder) ? entry.laneOrder.filter((value): value is DrumLaneId => typeof value === 'string') : [],
        laneSteps: isRecord(entry.laneSteps)
          ? Object.fromEntries(Object.entries(entry.laneSteps).map(([laneId, values]) => [laneId, Array.isArray(values) ? values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value)) : []])) as Record<DrumLaneId, number[]>
          : {} as Record<DrumLaneId, number[]>,
        stepCount: typeof entry.stepCount === 'number' ? entry.stepCount : 16,
      }),
      createdAt: typeof entry.createdAt === 'number' ? entry.createdAt : Date.now(),
      updatedAt: typeof entry.updatedAt === 'number' ? entry.updatedAt : Date.now(),
      sourceWorkspace: typeof entry.sourceWorkspace === 'string' ? entry.sourceWorkspace : undefined,
    }))
    : [];
  return {
    entries,
    playlist: normalizeDrumPlaylistState(raw.playlist),
  };
}

export function parseDrumConfigLibraryArchivePayload(raw: unknown): DrumConfigLibraryArchivePayload | null {
  return normalizeDrumConfigArchivePayload(raw);
}

export async function exportDrumConfigLibraryArchivePayload(): Promise<DrumConfigLibraryArchivePayload> {
  return {
    entries: await listDrumConfigLibraryEntries(),
    playlist: readDrumPlaylistState(),
  };
}

function drumConfigIdentity(entry: Pick<DrumConfigEntry, 'name'>) {
  return (entry.name ?? '').trim().toLocaleLowerCase();
}

export async function applyDrumConfigLibraryArchivePayload(args: {
  payload: DrumConfigLibraryArchivePayload;
  mode: WorkspacePackageImportMode;
}): Promise<DrumConfigLibraryArchiveImportResult> {
  const payload = normalizeDrumConfigArchivePayload(args.payload);
  if (!payload) return { importedCount: 0, skippedCount: 0, replacedCount: 0, dedupedCount: 0, playlistImported: false };
  const existing = await listDrumConfigLibraryEntries();
  if (args.mode === 'replace') {
    for (const entry of existing) await deleteDrumConfigEntry(entry.id);
  }
  const working = args.mode === 'replace' ? [] : existing;
  const existingById = new Map(working.map((entry) => [entry.id, entry] as const));
  const existingByName = new Map(working.map((entry) => [drumConfigIdentity(entry), entry] as const));
  let importedCount = 0;
  let skippedCount = 0;
  let replacedCount = 0;
  for (const archiveEntry of payload.entries) {
    const existingBySameId = existingById.get(archiveEntry.id) ?? null;
    if (args.mode === 'merge' && existingBySameId) {
      skippedCount += 1;
      continue;
    }
    const existingDifferential = args.mode === 'differential'
      ? existingBySameId ?? existingByName.get(drumConfigIdentity(archiveEntry)) ?? null
      : null;
    const next = cloneDrumConfigEntry({
      ...archiveEntry,
      id: existingDifferential?.id ?? archiveEntry.id,
      sourceWorkspace: archiveEntry.sourceWorkspace ?? 'workspace-package',
    });
    if (existingDifferential) replacedCount += 1;
    await registerDrumConfig(next);
    existingById.set(next.id, next);
    existingByName.set(drumConfigIdentity(next), next);
    importedCount += 1;
  }
  let playlistImported = false;
  if (payload.playlist) {
    writeDrumPlaylistState(mergeDrumPlaylistState(readDrumPlaylistState(), payload.playlist, args.mode));
    playlistImported = true;
  } else if (args.mode === 'replace') {
    writeDrumPlaylistState({ orderedIds: [], hiddenIds: [], aliases: {} });
    playlistImported = true;
  }
  return { importedCount, skippedCount, replacedCount, dedupedCount: 0, playlistImported };
}
