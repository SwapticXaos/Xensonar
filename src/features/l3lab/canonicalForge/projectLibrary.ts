import { useSyncExternalStore } from 'react';
import { deleteIndexedDbRecord, putIndexedDbRecord, readAllIndexedDbRecords, readIndexedDbRecord, type IndexedDbRecordStoreConfig } from '../../../core/browser/indexedDbRecordStore';
import type { WorkspacePackageImportMode } from '../../../core/systemMemory/packageCore';
import { chooseImportedSyntheticForgeProjectRecords } from './syntheticForgeWorkspacePackage';

type Listener = () => void;

import type {
  CanonicalForgeProjectMeta,
  CanonicalForgeProjectRecord,
  CanonicalForgeProjectSnapshot,
} from './projectLibraryTypes';
export type {
  CanonicalForgeProjectMeta,
  CanonicalForgeProjectRecord,
  CanonicalForgeProjectSnapshot,
} from './projectLibraryTypes';

type CanonicalProjectLibraryState = { entries: CanonicalForgeProjectMeta[] };

// Persistent legacy identifiers: never rename without a storage migration.
const DB_NAME = 'xensonar-canonical-forge-projects';
const STORE_NAME = 'canonicalForgeProjects';
const MAX_PROJECTS = 64;
const DB_CONFIG: IndexedDbRecordStoreConfig = {
  dbName: DB_NAME,
  storeName: STORE_NAME,
  openErrorMessage: 'Failed to open SyntheticForge workspace project DB',
};

let state: CanonicalProjectLibraryState = { entries: [] };
const listeners = new Set<Listener>();
let hydrationStarted = false;

function emit() {
  listeners.forEach((listener) => listener());
}

function metaFromRecord(record: CanonicalForgeProjectRecord): CanonicalForgeProjectMeta {
  return {
    id: record.id,
    name: record.name,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    bpm: record.bpm,
    bars: record.bars,
    activeTool: record.activeTool,
    hasSourceAudio: !!record.snapshot.sourceAsset,
    sourceDurationSec: record.snapshot.sourceAsset?.originalDuration ?? null,
  };
}

function setEntries(entries: CanonicalForgeProjectMeta[]) {
  state = {
    entries: [...entries].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_PROJECTS),
  };
  emit();
}

async function loadPersistedEntries() {
  if (typeof indexedDB === 'undefined') return;
  const records = await readAllIndexedDbRecords<CanonicalForgeProjectRecord>(DB_CONFIG, 'Failed to load SyntheticForge workspace projects');
  setEntries(records.map(metaFromRecord));
}

function ensureHydrated() {
  if (hydrationStarted) return;
  hydrationStarted = true;
  void loadPersistedEntries().catch((error) => {
    console.warn('[xensonar][synthetic-forge-workspace-library][hydrate]', error);
  });
}

export function useCanonicalForgeProjectLibrary<U = CanonicalProjectLibraryState>(selector?: (snapshot: CanonicalProjectLibraryState) => U): U {
  ensureHydrated();
  const select = selector ?? ((snapshot: CanonicalProjectLibraryState) => snapshot as unknown as U);
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => select(state),
    () => select(state),
  );
}

async function loadProjectRecord(id: string): Promise<CanonicalForgeProjectRecord> {
  const record = await readIndexedDbRecord<CanonicalForgeProjectRecord>(DB_CONFIG, id, 'Failed to load SyntheticForge workspace project');
  if (!record) throw new Error('Projekt nicht gefunden');
  return record;
}

export async function saveCanonicalForgeProject(args: {
  id?: string;
  name: string;
  snapshot: CanonicalForgeProjectSnapshot;
}): Promise<CanonicalForgeProjectMeta> {
  const now = Date.now();
  const existing = args.id ? await loadProjectRecord(args.id).catch(() => null) : null;
  const record: CanonicalForgeProjectRecord = {
    id: args.id ?? crypto.randomUUID(),
    name: args.name.trim() || 'synthetic-forge-project',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    bpm: args.snapshot.materialExport.bpm,
    bars: args.snapshot.materialExport.bars,
    activeTool: args.snapshot.activeTool,
    hasSourceAudio: !!args.snapshot.sourceAsset,
    sourceDurationSec: args.snapshot.sourceAsset?.originalDuration ?? null,
    snapshot: args.snapshot,
  };

  await putIndexedDbRecord(DB_CONFIG, record, 'Failed to save SyntheticForge workspace project');

  const meta = metaFromRecord(record);
  const nextEntries = [meta, ...state.entries.filter((entry) => entry.id !== record.id)];
  setEntries(nextEntries);
  return meta;
}

export async function loadCanonicalForgeProject(id: string): Promise<CanonicalForgeProjectRecord> {
  return loadProjectRecord(id);
}

export async function renameCanonicalForgeProject(id: string, name: string): Promise<CanonicalForgeProjectMeta> {
  const existing = await loadProjectRecord(id);
  existing.name = name.trim() || existing.name;
  existing.updatedAt = Date.now();

  await putIndexedDbRecord(DB_CONFIG, existing, 'Failed to rename SyntheticForge workspace project');

  const meta = metaFromRecord(existing);
  setEntries([meta, ...state.entries.filter((entry) => entry.id !== id)]);
  return meta;
}

export async function deleteCanonicalForgeProject(id: string): Promise<void> {
  await deleteIndexedDbRecord(DB_CONFIG, id, 'Failed to delete SyntheticForge workspace project');
  setEntries(state.entries.filter((entry) => entry.id !== id));
}


export async function listCanonicalForgeProjectRecords(): Promise<CanonicalForgeProjectRecord[]> {
  if (typeof indexedDB === 'undefined') return [];
  return readAllIndexedDbRecords<CanonicalForgeProjectRecord>(DB_CONFIG, 'Failed to export SyntheticForge workspace projects');
}

export async function applyCanonicalForgeProjectRecordsFromPackage(args: {
  records: CanonicalForgeProjectRecord[];
  mode: WorkspacePackageImportMode;
}) {
  const current = await listCanonicalForgeProjectRecords();
  const chosen = chooseImportedSyntheticForgeProjectRecords({ current, incoming: args.records, mode: args.mode });
  const nextIds = new Set(chosen.records.map((entry) => entry.id));
  for (const existing of current) {
    if (!nextIds.has(existing.id)) {
      await deleteIndexedDbRecord(DB_CONFIG, existing.id, 'Failed to remove SyntheticForge workspace project during package import');
    }
  }
  for (const record of chosen.records) {
    await putIndexedDbRecord(DB_CONFIG, record, 'Failed to restore SyntheticForge workspace project from package');
  }
  setEntries(chosen.records.map(metaFromRecord));
  return chosen.result;
}


// Product-facing aliases. The physical IndexedDB identifiers above remain legacy for compatibility.
export const useSyntheticForgeProjectLibrary = useCanonicalForgeProjectLibrary;
export const saveSyntheticForgeProject = saveCanonicalForgeProject;
export const loadSyntheticForgeProject = loadCanonicalForgeProject;
export const renameSyntheticForgeProject = renameCanonicalForgeProject;
export const deleteSyntheticForgeProject = deleteCanonicalForgeProject;
export const listSyntheticForgeProjectRecords = listCanonicalForgeProjectRecords;
export const applySyntheticForgeProjectRecordsFromPackage = applyCanonicalForgeProjectRecordsFromPackage;
