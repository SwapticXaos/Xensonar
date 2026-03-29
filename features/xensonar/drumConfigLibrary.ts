import { useSyncExternalStore } from 'react';
import type { DrumLaneId, DrumPatternMatrix } from './drumPatternMachine';

export interface DrumConfigEntry {
  id: string;
  name: string;
  presetSource: string;
  drumKit: string;
  bars: number;
  stepCount: number;
  laneOrder: DrumLaneId[];
  laneSteps: Record<DrumLaneId, number[]>;
  createdAt: number;
  updatedAt: number;
  sourceWorkspace?: string;
}

interface PersistedDrumConfigRecord extends DrumConfigEntry {}

type Listener = () => void;
type DrumConfigLibraryState = { entries: DrumConfigEntry[] };

const DB_NAME = 'xensonar-drum-config-library';
const STORE_NAME = 'drumConfigs';
const MAX_ENTRIES = 64;
const EVENT_REGISTERED = 'xensonar:drum-config-registered';
const EVENT_UPDATED = 'xensonar:drum-config-updated';
const EVENT_DELETED = 'xensonar:drum-config-deleted';

let state: DrumConfigLibraryState = { entries: [] };
const listeners = new Set<Listener>();
let hydrationStarted = false;
const deletedIds = new Set<string>();

function emit() {
  listeners.forEach((listener) => listener());
}


function emitDomEvent(name: string, detail: Record<string, unknown>) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function createLibraryId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `drumcfg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
function cloneLaneSteps(laneSteps: Record<DrumLaneId, number[]>) {
  return Object.fromEntries(Object.entries(laneSteps).map(([laneId, values]) => [laneId, [...values]])) as Record<DrumLaneId, number[]>;
}

function normalizeEntry(entry: DrumConfigEntry): DrumConfigEntry {
  return {
    ...entry,
    name: entry.name.trim() || 'Drum Config',
    presetSource: entry.presetSource || 'custom',
    drumKit: entry.drumKit || 'dusty_tape',
    bars: Math.max(1, Math.round(entry.bars || 1)),
    stepCount: Math.max(16, Math.round(entry.stepCount || Math.max(1, entry.bars) * 16)),
    laneOrder: [...entry.laneOrder],
    laneSteps: cloneLaneSteps(entry.laneSteps),
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
  const records = await new Promise<PersistedDrumConfigRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve((request.result as PersistedDrumConfigRecord[]) ?? []);
    request.onerror = () => reject(request.error ?? new Error('Failed to load drum configs'));
  });

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
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(entry);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Failed to persist drum config'));
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
    request.onerror = () => reject(request.error ?? new Error('Failed to delete drum config'));
  });
}

export function drumMatrixToConfigEntry(args: {
  name: string;
  drumKit: string;
  matrix: DrumPatternMatrix;
  sourceWorkspace?: string;
}): DrumConfigEntry {
  const now = Date.now();
  return normalizeEntry({
    id: createLibraryId(),
    name: args.name,
    presetSource: args.matrix.pattern,
    drumKit: args.drumKit,
    bars: args.matrix.bars,
    stepCount: args.matrix.stepCount,
    laneOrder: [...args.matrix.laneOrder],
    laneSteps: cloneLaneSteps(args.matrix.laneSteps),
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
  emitDomEvent(EVENT_REGISTERED, { id: normalized.id, name: normalized.name, presetSource: normalized.presetSource });
  return normalized;
}

export async function registerDrumConfigFromMatrix(args: {
  name: string;
  drumKit: string;
  matrix: DrumPatternMatrix;
  sourceWorkspace?: string;
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
  emitDomEvent(EVENT_UPDATED, { id: next.id, name: next.name });
  return next;
}

export async function deleteDrumConfigEntry(id: string) {
  ensureHydrated();
  deletedIds.add(id);
  setEntries(state.entries.filter((entry) => entry.id !== id));
  await deletePersistedEntry(id);
  emitDomEvent(EVENT_DELETED, { id });
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
