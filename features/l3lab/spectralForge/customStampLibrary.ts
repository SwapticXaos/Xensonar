import { useSyncExternalStore } from 'react';
import type { StampData } from './audio/SpectralData';

export interface CustomStampEntry {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  width: number;
  height: number;
  stamp: StampData;
}

interface PersistedCustomStampRecord {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  width: number;
  height: number;
  data: Float32Array;
  grainData: Float32Array;
}

type Listener = () => void;
type CustomStampLibraryState = { entries: CustomStampEntry[] };

const DB_NAME = 'xensonar-spectral-forge-custom-stamps';
const STORE_NAME = 'customStamps';
const MAX_ENTRIES = 96;

let state: CustomStampLibraryState = { entries: [] };
const listeners = new Set<Listener>();
let hydrationStarted = false;

function emit() {
  listeners.forEach((listener) => listener());
}

function cloneStampData(stamp: StampData): StampData {
  return {
    width: stamp.width,
    height: stamp.height,
    data: stamp.data.slice(),
    grainData: stamp.grainData.slice(),
  };
}

function fromRecord(record: PersistedCustomStampRecord): CustomStampEntry {
  return {
    id: record.id,
    name: record.name,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    width: record.width,
    height: record.height,
    stamp: {
      width: record.width,
      height: record.height,
      data: record.data.slice(),
      grainData: record.grainData.slice(),
    },
  };
}

function toRecord(entry: CustomStampEntry): PersistedCustomStampRecord {
  return {
    id: entry.id,
    name: entry.name,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    width: entry.width,
    height: entry.height,
    data: entry.stamp.data.slice(),
    grainData: entry.stamp.grainData.slice(),
  };
}

function setEntries(entries: CustomStampEntry[]) {
  state = {
    entries: [...entries].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_ENTRIES),
  };
  emit();
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
    request.onerror = () => reject(request.error ?? new Error('Failed to open custom stamp DB'));
  });
}

async function persistEntry(entry: CustomStampEntry) {
  const db = await openDb();
  const record = toRecord(entry);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Failed to persist custom stamp'));
  });
}

async function deletePersistedEntry(id: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Failed to delete custom stamp'));
  });
}

async function loadPersistedEntries() {
  if (typeof indexedDB === 'undefined') return;
  const db = await openDb();
  const records = await new Promise<PersistedCustomStampRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve((request.result as PersistedCustomStampRecord[]) ?? []);
    request.onerror = () => reject(request.error ?? new Error('Failed to read custom stamps'));
  });
  setEntries(records.map(fromRecord));
}

function ensureHydrated() {
  if (hydrationStarted) return;
  hydrationStarted = true;
  void loadPersistedEntries().catch((error) => {
    console.warn('[xensonar][forge-custom-stamp-library][hydrate]', error);
  });
}

export function getCustomStampLibraryState(): CustomStampLibraryState {
  ensureHydrated();
  return state;
}

export function subscribeCustomStampLibrary(listener: Listener) {
  ensureHydrated();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCustomStampLibrary<U = CustomStampLibraryState>(selector?: (snapshot: CustomStampLibraryState) => U): U {
  ensureHydrated();
  const select = selector ?? ((snapshot: CustomStampLibraryState) => snapshot as unknown as U);
  return useSyncExternalStore(subscribeCustomStampLibrary, () => select(state), () => select(state));
}

export async function saveCustomStamp(args: { id?: string; name: string; stamp: StampData }): Promise<CustomStampEntry> {
  ensureHydrated();
  const now = Date.now();
  const existing = args.id ? state.entries.find((entry) => entry.id === args.id) ?? null : null;
  const entry: CustomStampEntry = {
    id: existing?.id ?? crypto.randomUUID(),
    name: args.name.trim() || 'custom-stamp',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    width: args.stamp.width,
    height: args.stamp.height,
    stamp: cloneStampData(args.stamp),
  };
  setEntries([entry, ...state.entries.filter((existingEntry) => existingEntry.id !== entry.id)]);
  await persistEntry(entry);
  return entry;
}

export async function deleteCustomStamp(id: string) {
  ensureHydrated();
  setEntries(state.entries.filter((entry) => entry.id !== id));
  await deletePersistedEntry(id);
}

export async function renameCustomStamp(id: string, name: string) {
  ensureHydrated();
  const existing = state.entries.find((entry) => entry.id === id);
  if (!existing) throw new Error('Custom-Stempel nicht gefunden');
  const next: CustomStampEntry = {
    ...existing,
    name: name.trim() || existing.name,
    updatedAt: Date.now(),
  };
  setEntries([next, ...state.entries.filter((entry) => entry.id !== id)]);
  await persistEntry(next);
  return next;
}
