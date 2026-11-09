import { useSyncExternalStore } from 'react';
import { deleteIndexedDbRecord, putIndexedDbRecord, readAllIndexedDbRecords, type IndexedDbRecordStoreConfig } from '../../../core/browser/indexedDbRecordStore';
import type { StampData } from './audio/SpectralData';
import {
  arrayBufferToBase64Chunks,
  hashStableString,
  isRecord,
  type WorkspacePackageImportMode,
} from '../../../core/systemMemory/packageCore';

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
const DB_CONFIG: IndexedDbRecordStoreConfig = {
  dbName: DB_NAME,
  storeName: STORE_NAME,
  openErrorMessage: 'Failed to open custom stamp DB',
};

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

async function persistEntry(entry: CustomStampEntry) {
  await putIndexedDbRecord(DB_CONFIG, toRecord(entry), 'Failed to persist custom stamp');
}

async function deletePersistedEntry(id: string) {
  await deleteIndexedDbRecord(DB_CONFIG, id, 'Failed to delete custom stamp');
}

async function readPersistedCustomStampRecords(): Promise<PersistedCustomStampRecord[]> {
  if (typeof indexedDB === 'undefined') return [];
  return readAllIndexedDbRecords<PersistedCustomStampRecord>(DB_CONFIG, 'Failed to read custom stamps');
}

async function loadPersistedEntries() {
  const records = await readPersistedCustomStampRecords();
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
    id: existing?.id ?? args.id ?? crypto.randomUUID(),
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

export type CustomStampArchiveArray = {
  format: 'float32-base64-chunks';
  length: number;
  byteLength: number;
  base64Parts: string[];
};

export type CustomStampArchiveRecord = Omit<CustomStampEntry, 'stamp'> & {
  stamp: {
    width: number;
    height: number;
    data: CustomStampArchiveArray;
    grainData: CustomStampArchiveArray;
  };
  contentHash: string;
};

export type CustomStampLibraryArchivePayload = {
  stamps: CustomStampArchiveRecord[];
};

export type CustomStampLibraryArchiveImportResult = {
  importedCount: number;
  skippedCount: number;
  replacedCount: number;
  dedupedCount: number;
};

function float32ToArchiveArray(values: Float32Array): CustomStampArchiveArray {
  const bytes = new Uint8Array(values.buffer, values.byteOffset, values.byteLength).slice();
  return {
    format: 'float32-base64-chunks',
    length: values.length,
    byteLength: bytes.byteLength,
    base64Parts: arrayBufferToBase64Chunks(bytes.buffer),
  };
}

function base64ChunksToFloat32Array(chunks: string[], expectedLength?: number): Float32Array {
  const byteChunks: Uint8Array[] = [];
  let totalBytes = 0;
  for (const chunkBase64 of chunks) {
    if (!chunkBase64) continue;
    const binary = window.atob(chunkBase64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    byteChunks.push(bytes);
    totalBytes += bytes.byteLength;
  }
  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const bytes of byteChunks) {
    combined.set(bytes, offset);
    offset += bytes.byteLength;
  }
  const safeByteLength = combined.byteLength - (combined.byteLength % 4);
  const view = new Float32Array(combined.buffer.slice(0, safeByteLength));
  return typeof expectedLength === 'number' && expectedLength >= 0 && expectedLength < view.length
    ? view.slice(0, expectedLength)
    : view;
}

function archiveArrayToFloat32(raw: unknown, fallbackLength: number): Float32Array {
  if (!isRecord(raw)) return new Float32Array(Math.max(0, fallbackLength));
  if (raw.format === 'float32-base64-chunks' && Array.isArray(raw.base64Parts)) {
    return base64ChunksToFloat32Array(raw.base64Parts.filter((entry): entry is string => typeof entry === 'string'), typeof raw.length === 'number' ? raw.length : fallbackLength);
  }
  return new Float32Array(Math.max(0, fallbackLength));
}

function stampIdentity(value: string | null | undefined) {
  return (value ?? '').trim().toLocaleLowerCase();
}

function toCustomStampArchiveRecord(entry: CustomStampEntry): CustomStampArchiveRecord {
  const stamp = cloneStampData(entry.stamp);
  const data = float32ToArchiveArray(stamp.data);
  const grainData = float32ToArchiveArray(stamp.grainData);
  const contentHash = hashStableString(JSON.stringify({
    name: entry.name,
    width: entry.width,
    height: entry.height,
    dataLength: data.length,
    dataByteLength: data.byteLength,
    grainLength: grainData.length,
    grainByteLength: grainData.byteLength,
    dataParts: data.base64Parts.map((part) => part.length),
    grainParts: grainData.base64Parts.map((part) => part.length),
  }));
  return {
    id: entry.id,
    name: entry.name,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    width: entry.width,
    height: entry.height,
    stamp: {
      width: stamp.width,
      height: stamp.height,
      data,
      grainData,
    },
    contentHash,
  };
}

function normalizeCustomStampArchiveRecord(raw: unknown): CustomStampArchiveRecord | null {
  if (!isRecord(raw) || !isRecord(raw.stamp)) return null;
  const width = typeof raw.width === 'number' ? raw.width : typeof raw.stamp.width === 'number' ? raw.stamp.width : 0;
  const height = typeof raw.height === 'number' ? raw.height : typeof raw.stamp.height === 'number' ? raw.stamp.height : 0;
  const fallbackLength = Math.max(0, Math.round(width * height));
  const data = archiveArrayToFloat32(raw.stamp.data, fallbackLength);
  const grainData = archiveArrayToFloat32(raw.stamp.grainData, fallbackLength);
  const entry: CustomStampEntry = {
    id: typeof raw.id === 'string' && raw.id ? raw.id : crypto.randomUUID(),
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'custom-stamp',
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
    width,
    height,
    stamp: { width, height, data, grainData },
  };
  return toCustomStampArchiveRecord(entry);
}

export function parseCustomStampLibraryArchivePayload(raw: unknown): CustomStampLibraryArchivePayload | null {
  if (!isRecord(raw)) return null;
  const stamps = Array.isArray(raw.stamps)
    ? raw.stamps.map(normalizeCustomStampArchiveRecord).filter((record): record is CustomStampArchiveRecord => record !== null)
    : [];
  return { stamps };
}

export async function listCustomStampLibraryEntries(): Promise<CustomStampEntry[]> {
  ensureHydrated();
  const merged = new Map<string, CustomStampEntry>();
  try {
    for (const record of await readPersistedCustomStampRecords()) merged.set(record.id, fromRecord(record));
  } catch (error) {
    console.warn('[xensonar][forge-custom-stamp-library][archive-read]', error);
  }
  for (const entry of state.entries) merged.set(entry.id, { ...entry, stamp: cloneStampData(entry.stamp) });
  const entries = [...merged.values()].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_ENTRIES);
  setEntries(entries);
  return entries.map((entry) => ({ ...entry, stamp: cloneStampData(entry.stamp) }));
}

export async function exportCustomStampLibraryArchivePayload(): Promise<CustomStampLibraryArchivePayload> {
  const stamps: CustomStampArchiveRecord[] = [];
  for (const entry of await listCustomStampLibraryEntries()) {
    try {
      stamps.push(toCustomStampArchiveRecord(entry));
    } catch (error) {
      console.warn('[xensonar][forge-custom-stamp-library][archive-record-skip]', entry.id, error);
    }
  }
  return { stamps };
}

function archiveRecordToCustomStampEntry(record: CustomStampArchiveRecord): CustomStampEntry | null {
  const normalized = normalizeCustomStampArchiveRecord(record);
  if (!normalized) return null;
  return {
    id: normalized.id,
    name: normalized.name,
    createdAt: normalized.createdAt,
    updatedAt: normalized.updatedAt,
    width: normalized.width,
    height: normalized.height,
    stamp: {
      width: normalized.stamp.width,
      height: normalized.stamp.height,
      data: archiveArrayToFloat32(normalized.stamp.data, normalized.width * normalized.height),
      grainData: archiveArrayToFloat32(normalized.stamp.grainData, normalized.width * normalized.height),
    },
  };
}

export async function applyCustomStampLibraryArchivePayload(args: {
  payload: CustomStampLibraryArchivePayload;
  mode: WorkspacePackageImportMode;
}): Promise<CustomStampLibraryArchiveImportResult> {
  const payload = parseCustomStampLibraryArchivePayload(args.payload);
  if (!payload) return { importedCount: 0, skippedCount: 0, replacedCount: 0, dedupedCount: 0 };
  const existing = await listCustomStampLibraryEntries();
  if (args.mode === 'replace') {
    for (const entry of existing) await deleteCustomStamp(entry.id);
  }
  const working = args.mode === 'replace' ? [] : existing;
  const byId = new Map(working.map((entry) => [entry.id, entry] as const));
  const byName = new Map(working.map((entry) => [stampIdentity(entry.name), entry] as const));
  let importedCount = 0;
  let skippedCount = 0;
  let replacedCount = 0;
  for (const archiveRecord of payload.stamps) {
    const entry = archiveRecordToCustomStampEntry(archiveRecord);
    if (!entry) continue;
    const existingBySameId = byId.get(entry.id) ?? null;
    if (args.mode === 'merge' && existingBySameId) {
      skippedCount += 1;
      continue;
    }
    const replacement = args.mode === 'differential'
      ? (existingBySameId ?? byName.get(stampIdentity(entry.name)) ?? null)
      : null;
    const nextId = replacement?.id ?? entry.id;
    await saveCustomStamp({ id: nextId, name: entry.name, stamp: entry.stamp });
    if (replacement) replacedCount += 1;
    byId.set(nextId, { ...entry, id: nextId });
    byName.set(stampIdentity(entry.name), { ...entry, id: nextId });
    importedCount += 1;
  }
  return { importedCount, skippedCount, replacedCount, dedupedCount: 0 };
}
