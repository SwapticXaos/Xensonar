import { useSyncExternalStore } from 'react';
import { deleteIndexedDbRecord, putIndexedDbRecord, readAllIndexedDbRecords, type IndexedDbRecordStoreConfig } from '../../core/browser/indexedDbRecordStore';
import { createMaterialPackageFromExport, packageToMaterialEntry, validateMaterialPackage } from './materialAdapter';
import { XENSONAR_MATERIAL_SCHEMA_VERSION } from './materialSchema';
import type { XensonarMaterialPackageV1 } from './materialSchemaTypes';
import type { ExportedMaterialMeta, MaterialEntry, PersistedMaterialRecord } from './materialLibraryTypes';
import { dispatchMaterialLibraryEvent } from './materialLibraryEventContract';

export type { ExportedMaterialMeta, MaterialEntry, MaterialRole } from './materialLibraryTypes';

type Listener = () => void;

type MaterialLibraryState = { entries: MaterialEntry[] };

const DB_NAME = 'xensonar-material-library';
const STORE_NAME = 'materials';
const MAX_ENTRIES = 48;
const XENSONAR_LOOP_REFERENCE_BPM = 108;
const DB_CONFIG: IndexedDbRecordStoreConfig = {
  dbName: DB_NAME,
  storeName: STORE_NAME,
  openErrorMessage: 'Failed to open IndexedDB',
};

let state: MaterialLibraryState = { entries: [] };
const listeners = new Set<Listener>();
let hydrationStarted = false;
const deletedIds = new Set<string>();

function emit() {
  listeners.forEach((listener) => listener());
}

function sortEntries(entries: MaterialEntry[]) {
  return [...entries].sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_ENTRIES);
}

function setEntries(nextEntries: MaterialEntry[]) {
  const sorted = sortEntries(nextEntries);
  const nextIds = new Set(sorted.map((entry) => entry.id));
  for (const entry of state.entries) {
    if (!nextIds.has(entry.id)) {
      try { URL.revokeObjectURL(entry.blobUrl); } catch {}
    }
  }
  state = { entries: sorted };
  emit();
}

function normalizeMeta(meta: ExportedMaterialMeta): ExportedMaterialMeta {
  const preserveLoopBpm = meta.role === 'loop' && (
    meta.renderMode?.startsWith('carrier-donor-v2')
    || meta.renderMode?.startsWith('carrier-integral-')
    || meta.workspaceOrigin === 'spectralforge-v2'
    || meta.workspaceOrigin === 'spectralforge-carrier-integral'
  );
  const bpm = meta.role === 'loop' && !preserveLoopBpm
    ? XENSONAR_LOOP_REFERENCE_BPM
    : Number.isFinite(meta.bpm) && meta.bpm > 0
      ? meta.bpm
      : Number.isFinite(meta.tempo16) && (meta.tempo16 ?? 0) > 0
        ? Math.max(1, (meta.tempo16 as number) / 4)
        : XENSONAR_LOOP_REFERENCE_BPM;
  return {
    ...meta,
    bpm,
  };
}

function normalizeEntry(entry: MaterialEntry): MaterialEntry {
  return {
    ...normalizeMeta(entry),
    id: entry.id,
    blob: entry.blob,
    blobUrl: entry.blobUrl,
    createdAt: entry.createdAt,
  };
}

async function loadPersistedEntries() {
  if (typeof indexedDB === 'undefined') return;
  const records = await readAllIndexedDbRecords<PersistedMaterialRecord>(DB_CONFIG, 'Failed to load persisted materials');
  const persistedEntries: MaterialEntry[] = records
    .filter((record) => !deletedIds.has(record.id))
    .map((record) => ({
      ...normalizeMeta(record),
      id: record.id,
      blob: record.blob,
      blobUrl: URL.createObjectURL(record.blob),
      createdAt: record.createdAt,
    }));

  const merged = new Map<string, MaterialEntry>();
  for (const entry of persistedEntries) merged.set(entry.id, entry);
  for (const entry of state.entries) merged.set(entry.id, entry);
  setEntries([...merged.values()]);
}

function ensureHydrated() {
  if (hydrationStarted) return;
  hydrationStarted = true;
  void loadPersistedEntries().catch((error) => {
    console.warn('[xensonar][material-library][hydrate]', error);
  });
}

async function persistEntry(entry: MaterialEntry) {
  if (typeof indexedDB === 'undefined') return;
  const record: PersistedMaterialRecord = {
    ...entry,
    bpm: entry.bpm,
    blob: entry.blob,
    createdAt: entry.createdAt,
  };
  await putIndexedDbRecord(DB_CONFIG, record, 'Failed to persist material');
}

async function deletePersistedEntry(id: string) {
  if (typeof indexedDB === 'undefined') return;
  await deleteIndexedDbRecord(DB_CONFIG, id, 'Failed to delete material');
}

export function registerExternalMaterialPackage(pkg: XensonarMaterialPackageV1): MaterialEntry {
  ensureHydrated();
  const errors = validateMaterialPackage(pkg);
  if (errors.length) {
    throw new Error(`Invalid Xensonar material package: ${errors.join(', ')}`);
  }
  const entry = normalizeEntry(packageToMaterialEntry(pkg));
  deletedIds.delete(entry.id);
  setEntries([entry, ...state.entries.filter((existing) => existing.id !== entry.id)]);
  void persistEntry(entry).catch((error) => {
    console.warn('[xensonar][material-library][persist]', error);
  });
  dispatchMaterialLibraryEvent('registered', {
    id: entry.id,
    role: entry.role,
    name: entry.name,
  });
  return entry;
}

export function registerMaterialExport(meta: ExportedMaterialMeta, blob: Blob): MaterialEntry {
  const pkg = createMaterialPackageFromExport(meta, blob);
  return registerExternalMaterialPackage(pkg);
}

export async function updateMaterialEntry(id: string, patch: Partial<Pick<MaterialEntry, 'name' | 'role' | 'rootFollowPreferred'>> & { rootHz?: number | null }) {
  ensureHydrated();
  const existing = state.entries.find((entry) => entry.id === id);
  deletedIds.delete(id);
  if (!existing) throw new Error('Material nicht gefunden');
  const next: MaterialEntry = normalizeEntry({
    ...existing,
    name: patch.name !== undefined ? patch.name.trim() || existing.name : existing.name,
    role: patch.role ?? existing.role,
    rootFollowPreferred: patch.rootFollowPreferred ?? existing.rootFollowPreferred,
    rootHz: patch.rootHz === null
      ? null
      : typeof patch.rootHz === 'number' && Number.isFinite(patch.rootHz)
        ? patch.rootHz
        : existing.rootHz,
  });
  setEntries([next, ...state.entries.filter((entry) => entry.id !== id)]);
  await persistEntry(next);
  dispatchMaterialLibraryEvent('updated', {
    id: next.id,
    role: next.role,
    name: next.name,
  });
  return next;
}

export async function moveMaterialEntry(id: string, direction: -1 | 1) {
  ensureHydrated();
  const sorted = sortEntries(state.entries);
  const index = sorted.findIndex((entry) => entry.id === id);
  if (index === -1) throw new Error('Material nicht gefunden');
  const swapIndex = index + direction;
  if (swapIndex < 0 || swapIndex >= sorted.length) return sorted[index];
  const current = sorted[index];
  const other = sorted[swapIndex];
  const nextCurrent = normalizeEntry({
    ...current,
    createdAt: other.createdAt,
  });
  const nextOther = normalizeEntry({
    ...other,
    createdAt: current.createdAt,
  });
  setEntries(state.entries.map((entry) => {
    if (entry.id === nextCurrent.id) return nextCurrent;
    if (entry.id === nextOther.id) return nextOther;
    return entry;
  }));
  await Promise.all([persistEntry(nextCurrent), persistEntry(nextOther)]);
  dispatchMaterialLibraryEvent('reordered', {
    id: nextCurrent.id,
    swapWith: nextOther.id,
  });
  return nextCurrent;
}

export async function swapMaterialEntries(firstId: string, secondId: string) {
  ensureHydrated();
  if (!firstId || !secondId || firstId === secondId) {
    const existing = state.entries.find((entry) => entry.id === firstId);
    if (!existing) throw new Error('Material nicht gefunden');
    return existing;
  }
  const first = state.entries.find((entry) => entry.id === firstId);
  const second = state.entries.find((entry) => entry.id === secondId);
  if (!first || !second) throw new Error('Material nicht gefunden');
  const nextFirst = normalizeEntry({ ...first, createdAt: second.createdAt });
  const nextSecond = normalizeEntry({ ...second, createdAt: first.createdAt });
  setEntries(state.entries.map((entry) => {
    if (entry.id === nextFirst.id) return nextFirst;
    if (entry.id === nextSecond.id) return nextSecond;
    return entry;
  }));
  await Promise.all([persistEntry(nextFirst), persistEntry(nextSecond)]);
  dispatchMaterialLibraryEvent('reordered', { id: nextFirst.id, swapWith: nextSecond.id });
  return nextFirst;
}


export async function reorderMaterialEntriesByIdOrder(orderedIds: readonly string[]) {
  ensureHydrated();
  const uniqueIds = orderedIds.filter((id, index, all) => id && all.indexOf(id) === index);
  const selectedEntries = uniqueIds
    .map((id) => state.entries.find((entry) => entry.id === id) ?? null)
    .filter((entry): entry is MaterialEntry => Boolean(entry));
  if (selectedEntries.length !== uniqueIds.length || selectedEntries.length < 2) {
    const fallback = selectedEntries[0] ?? null;
    if (!fallback && uniqueIds[0]) throw new Error('Material nicht gefunden');
    return fallback;
  }

  const createdAtSlots = selectedEntries
    .map((entry) => entry.createdAt)
    .sort((a, b) => b - a);
  const nextById = new Map<string, MaterialEntry>();
  selectedEntries.forEach((entry, index) => {
    nextById.set(entry.id, normalizeEntry({
      ...entry,
      createdAt: createdAtSlots[index] ?? entry.createdAt,
    }));
  });

  setEntries(state.entries.map((entry) => nextById.get(entry.id) ?? entry));
  await Promise.all([...nextById.values()].map((entry) => persistEntry(entry)));
  dispatchMaterialLibraryEvent('reordered', {
    id: uniqueIds[0],
    orderedIds: uniqueIds,
  });
  return state.entries.find((entry) => entry.id === uniqueIds[0]) ?? null;
}

export async function deleteMaterialEntry(id: string) {
  ensureHydrated();
  deletedIds.add(id);
  setEntries(state.entries.filter((entry) => entry.id !== id));
  await deletePersistedEntry(id);
  dispatchMaterialLibraryEvent('deleted', { id });
}

export function getSupportedMaterialSchemaVersion() {
  return XENSONAR_MATERIAL_SCHEMA_VERSION;
}

export function getMaterialLibraryState(): MaterialLibraryState {
  ensureHydrated();
  return state;
}

export function subscribeMaterialLibrary(listener: Listener) {
  ensureHydrated();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useMaterialLibrary<U = MaterialLibraryState>(selector?: (snapshot: MaterialLibraryState) => U): U {
  ensureHydrated();
  const select = selector ?? ((snapshot: MaterialLibraryState) => snapshot as unknown as U);
  return useSyncExternalStore(subscribeMaterialLibrary, () => select(state), () => select(state));
}
