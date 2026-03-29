import { useSyncExternalStore } from 'react';
import { createMaterialPackageFromExport, packageToMaterialEntry, validateMaterialPackage } from './materialAdapter';
import { XENSONAR_MATERIAL_SCHEMA_VERSION, type XensonarMaterialPackageV1, type XensonarMaterialRole } from './materialSchema';

export type MaterialRole = XensonarMaterialRole;
export interface ExportedMaterialMeta {
  name: string;
  role: MaterialRole;
  bpm: number;
  bars: number;
  guideSegments: number;
  guideMarkers: number[];
  loopStartSec: number;
  loopEndSec: number;
  rootHz: number | null;
  sourceVersion: string;
  renderMode: string;
  durationSec: number;
  intendedLoopDurationSec?: number;
  preferredMyzelGroup?: string;
  workspaceOrigin?: string;
  transitionGuard?: string;
  balanceCarrier?: string;
  routeSummary?: string;
  stabilizeBy?: string;
  stableId?: string;
  tempo16?: number; // legacy fallback for older metadata
}

export interface MaterialEntry extends ExportedMaterialMeta {
  id: string;
  blob: Blob;
  blobUrl: string;
  createdAt: number;
}

interface PersistedMaterialRecord extends ExportedMaterialMeta {
  id: string;
  blob: Blob;
  createdAt: number;
}

type Listener = () => void;

type MaterialLibraryState = { entries: MaterialEntry[] };

const DB_NAME = 'xensonar-material-library';
const STORE_NAME = 'materials';
const MAX_ENTRIES = 48;

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
  const bpm = Number.isFinite(meta.bpm) && meta.bpm > 0
    ? meta.bpm
    : Number.isFinite(meta.tempo16) && (meta.tempo16 ?? 0) > 0
      ? Math.max(1, (meta.tempo16 as number) / 4)
      : 108;
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

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
}

async function loadPersistedEntries() {
  if (typeof indexedDB === 'undefined') return;
  const db = await openDb();
  const records = await new Promise<PersistedMaterialRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve((request.result as PersistedMaterialRecord[]) ?? []);
    request.onerror = () => reject(request.error ?? new Error('Failed to load persisted materials'));
  });
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
  const db = await openDb();
  const record: PersistedMaterialRecord = {
    ...entry,
    bpm: entry.bpm,
    blob: entry.blob,
    createdAt: entry.createdAt,
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Failed to persist material'));
  });
}

async function deletePersistedEntry(id: string) {
  if (typeof indexedDB === 'undefined') return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Failed to delete material'));
  });
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
  return entry;
}

export function registerMaterialExport(meta: ExportedMaterialMeta, blob: Blob): MaterialEntry {
  const pkg = createMaterialPackageFromExport(meta, blob);
  return registerExternalMaterialPackage(pkg);
}

export async function updateMaterialEntry(id: string, patch: Partial<Pick<MaterialEntry, 'name' | 'role'>>) {
  ensureHydrated();
  const existing = state.entries.find((entry) => entry.id === id);
  deletedIds.delete(id);
  if (!existing) throw new Error('Material nicht gefunden');
  const next: MaterialEntry = normalizeEntry({
    ...existing,
    name: patch.name !== undefined ? patch.name.trim() || existing.name : existing.name,
    role: patch.role ?? existing.role,
  });
  setEntries([next, ...state.entries.filter((entry) => entry.id !== id)]);
  await persistEntry(next);
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('xensonar:material-updated', {
      detail: {
        id: next.id,
        role: next.role,
        name: next.name,
      },
    }));
  }
  return next;
}

export async function deleteMaterialEntry(id: string) {
  ensureHydrated();
  deletedIds.add(id);
  setEntries(state.entries.filter((entry) => entry.id !== id));
  await deletePersistedEntry(id);
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
