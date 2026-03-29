import { useSyncExternalStore } from 'react';
import type { ForgeProjectSnapshot, ToolType } from './state/store';

export interface ForgeProjectMeta {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  bpm: number;
  bars: number;
  activeTool: ToolType;
}

interface PersistedForgeProjectRecord extends ForgeProjectMeta {
  snapshot: ForgeProjectSnapshot;
}

type Listener = () => void;

type ProjectLibraryState = {
  entries: ForgeProjectMeta[];
};

const DB_NAME = 'xensonar-spectral-forge-projects';
const STORE_NAME = 'forgeProjects';
const MAX_PROJECTS = 64;

let state: ProjectLibraryState = { entries: [] };
const listeners = new Set<Listener>();
let hydrationStarted = false;

function emit() {
  listeners.forEach((listener) => listener());
}

function setEntries(entries: ForgeProjectMeta[]) {
  state = { entries };
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
    request.onerror = () => reject(request.error ?? new Error('Failed to open forge project DB'));
  });
}

async function loadPersistedEntries() {
  if (typeof indexedDB === 'undefined') return;
  const db = await openDb();
  const records = await new Promise<PersistedForgeProjectRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve((request.result as PersistedForgeProjectRecord[]) ?? []);
    request.onerror = () => reject(request.error ?? new Error('Failed to read forge projects'));
  });
  const entries = records
    .map(({ snapshot: _snapshot, ...meta }) => meta)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_PROJECTS);
  setEntries(entries);
}

function ensureHydrated() {
  if (hydrationStarted) return;
  hydrationStarted = true;
  void loadPersistedEntries().catch((error) => {
    console.warn('[xensonar][forge-project-library][hydrate]', error);
  });
}

export function getForgeProjectLibraryState(): ProjectLibraryState {
  ensureHydrated();
  return state;
}

export function subscribeForgeProjectLibrary(listener: Listener) {
  ensureHydrated();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useForgeProjectLibrary<U = ProjectLibraryState>(selector?: (state: ProjectLibraryState) => U): U {
  ensureHydrated();
  const select = selector ?? ((snapshot: ProjectLibraryState) => snapshot as unknown as U);
  return useSyncExternalStore(subscribeForgeProjectLibrary, () => select(state), () => select(state));
}

export async function saveForgeProject(args: { id?: string; name: string; snapshot: ForgeProjectSnapshot }): Promise<ForgeProjectMeta> {
  const db = await openDb();
  const now = Date.now();
  const existing = args.id ? await loadForgeProjectRecord(args.id).catch(() => null) : null;
  const record: PersistedForgeProjectRecord = {
    id: args.id ?? crypto.randomUUID(),
    name: args.name.trim() || 'spectral-forge-project',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    bpm: args.snapshot.materialExport.bpm,
    bars: args.snapshot.materialExport.bars,
    activeTool: args.snapshot.activeTool,
    snapshot: args.snapshot,
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Failed to save forge project'));
  });

  const nextEntries = [
    { id: record.id, name: record.name, createdAt: record.createdAt, updatedAt: record.updatedAt, bpm: record.bpm, bars: record.bars, activeTool: record.activeTool },
    ...state.entries.filter((entry) => entry.id !== record.id),
  ]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_PROJECTS);
  setEntries(nextEntries);
  return nextEntries[0];
}

async function loadForgeProjectRecord(id: string): Promise<PersistedForgeProjectRecord> {
  const db = await openDb();
  const record = await new Promise<PersistedForgeProjectRecord | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve((request.result as PersistedForgeProjectRecord | null) ?? null);
    request.onerror = () => reject(request.error ?? new Error('Failed to load forge project'));
  });
  if (!record) throw new Error('Project not found');
  return record;
}

export async function loadForgeProject(id: string): Promise<ForgeProjectSnapshot> {
  const record = await loadForgeProjectRecord(id);
  return record.snapshot;
}

export async function deleteForgeProject(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Failed to delete forge project'));
  });
  setEntries(state.entries.filter((entry) => entry.id !== id));
}
