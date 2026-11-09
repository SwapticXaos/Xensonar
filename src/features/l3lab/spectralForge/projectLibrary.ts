import { useSyncExternalStore } from "react";
import { clearIndexedDbRecords, deleteIndexedDbRecord, putIndexedDbRecord, readAllIndexedDbRecords, readIndexedDbRecord, type IndexedDbRecordStoreConfig } from "../../../core/browser/indexedDbRecordStore";
import type { ForgeProjectSnapshot, ToolType } from "./state/store";
import {
  arrayBufferToBase64Chunks,
  hashStableString,
  isRecord,
  type WorkspacePackageImportMode,
} from "../../../core/systemMemory/packageCore";
import type {
  CarrierIntegralBodySourceMode,
  CarrierIntegralMachineId,
} from "./integral";

export interface ForgeProjectCarrierIntegralMeta {
  machineId: CarrierIntegralMachineId | string;
  bodySourceMode: CarrierIntegralBodySourceMode | string;
  presetId: string | null;
  updatedAt: number | null;
}

export interface ForgeProjectMeta {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  bpm: number;
  bars: number;
  activeTool: ToolType;
  carrierIntegral?: ForgeProjectCarrierIntegralMeta | null;
}

export interface PersistedForgeProjectRecord extends ForgeProjectMeta {
  snapshot: ForgeProjectSnapshot;
}

type Listener = () => void;

type ProjectLibraryState = {
  entries: ForgeProjectMeta[];
};

const DB_NAME = "xensonar-spectral-forge-projects";
const STORE_NAME = "forgeProjects";
const MAX_PROJECTS = 64;
const DB_CONFIG: IndexedDbRecordStoreConfig = {
  dbName: DB_NAME,
  storeName: STORE_NAME,
  openErrorMessage: "Failed to open forge project DB",
};

let state: ProjectLibraryState = { entries: [] };
const listeners = new Set<Listener>();
let hydrationStarted = false;

function emit() {
  listeners.forEach((listener) => listener());
}

function createCarrierIntegralMeta(
  snapshot: ForgeProjectSnapshot,
): ForgeProjectCarrierIntegralMeta | null {
  const selection = snapshot.carrierIntegralSelection;
  if (!selection?.machineId || !selection?.bodySourceMode) return null;
  return {
    machineId: selection.machineId,
    bodySourceMode: selection.bodySourceMode,
    presetId: selection.presetId ?? null,
    updatedAt:
      typeof selection.updatedAt === "number" ? selection.updatedAt : null,
  };
}

function toForgeProjectMeta(
  record: PersistedForgeProjectRecord,
): ForgeProjectMeta {
  return {
    id: record.id,
    name: record.name,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    bpm: record.bpm,
    bars: record.bars,
    activeTool: record.activeTool,
    carrierIntegral:
      record.carrierIntegral ?? createCarrierIntegralMeta(record.snapshot),
  };
}

function setEntries(entries: ForgeProjectMeta[]) {
  state = { entries };
  emit();
}

async function loadPersistedEntries() {
  if (typeof indexedDB === "undefined") return;
  const records = await readAllIndexedDbRecords<PersistedForgeProjectRecord>(DB_CONFIG, "Failed to read forge projects");
  const entries = records
    .map(toForgeProjectMeta)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_PROJECTS);
  setEntries(entries);
}

function ensureHydrated() {
  if (hydrationStarted) return;
  hydrationStarted = true;
  void loadPersistedEntries().catch((error) => {
    console.warn("[xensonar][forge-project-library][hydrate]", error);
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

export function useForgeProjectLibrary<U = ProjectLibraryState>(
  selector?: (state: ProjectLibraryState) => U,
): U {
  ensureHydrated();
  const select =
    selector ?? ((snapshot: ProjectLibraryState) => snapshot as unknown as U);
  return useSyncExternalStore(
    subscribeForgeProjectLibrary,
    () => select(state),
    () => select(state),
  );
}

export async function saveForgeProject(args: {
  id?: string;
  name: string;
  snapshot: ForgeProjectSnapshot;
}): Promise<ForgeProjectMeta> {
  const now = Date.now();
  const existing = args.id
    ? await loadForgeProjectRecord(args.id).catch(() => null)
    : null;
  const record: PersistedForgeProjectRecord = {
    id: args.id ?? crypto.randomUUID(),
    name: args.name.trim() || "spectral-forge-project",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    bpm: args.snapshot.materialExport.bpm,
    bars: args.snapshot.materialExport.bars,
    activeTool: args.snapshot.activeTool,
    carrierIntegral: createCarrierIntegralMeta(args.snapshot),
    snapshot: args.snapshot,
  };

  await putIndexedDbRecord(DB_CONFIG, record, "Failed to save forge project");

  const nextEntries = [
    toForgeProjectMeta(record),
    ...state.entries.filter((entry) => entry.id !== record.id),
  ]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_PROJECTS);
  setEntries(nextEntries);
  return nextEntries[0];
}

async function loadForgeProjectRecord(
  id: string,
): Promise<PersistedForgeProjectRecord> {
  const record = await readIndexedDbRecord<PersistedForgeProjectRecord>(DB_CONFIG, id, "Failed to load forge project");
  if (!record) throw new Error("Project not found");
  return record;
}

export async function loadForgeProject(
  id: string,
): Promise<ForgeProjectSnapshot> {
  const record = await loadForgeProjectRecord(id);
  return record.snapshot;
}

export async function deleteForgeProject(id: string): Promise<void> {
  await deleteIndexedDbRecord(DB_CONFIG, id, "Failed to delete forge project");
  setEntries(state.entries.filter((entry) => entry.id !== id));
}

export type ForgeProjectArchiveSnapshot = Omit<
  ForgeProjectSnapshot,
  "spectralSnapshot"
> & {
  spectralSnapshotFormat: "float32-base64" | "float32-base64-chunks";
  spectralSnapshotBase64?: string;
  spectralSnapshotBase64Parts?: string[];
  spectralSnapshotLength: number;
  spectralSnapshotByteLength?: number;
};

export type ForgeProjectArchiveRecord = Omit<
  PersistedForgeProjectRecord,
  "snapshot"
> & {
  snapshot: ForgeProjectArchiveSnapshot;
  contentHash: string;
};

export type ForgeProjectLibraryArchivePayload = {
  projects: ForgeProjectArchiveRecord[];
};

export type ForgeProjectLibraryArchiveImportResult = {
  importedCount: number;
  skippedCount: number;
  replacedCount: number;
  dedupedCount: number;
};

function createForgeProjectId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
    return crypto.randomUUID();
  return `forge-project-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function loadAllForgeProjectRecords(): Promise<
  PersistedForgeProjectRecord[]
> {
  if (typeof indexedDB === "undefined") return [];
  return readAllIndexedDbRecords<PersistedForgeProjectRecord>(DB_CONFIG, "Failed to read forge projects");
}

function writeForgeProjectRecord(
  record: PersistedForgeProjectRecord,
): Promise<void> {
  return putIndexedDbRecord(DB_CONFIG, record, "Failed to write forge project");
}

function clearForgeProjectRecords(): Promise<void> {
  return clearIndexedDbRecords(DB_CONFIG, "Failed to clear forge projects");
}

function cloneSnapshotForArchive(
  snapshot: ForgeProjectSnapshot,
): ForgeProjectArchiveSnapshot {
  const archiveLikeSnapshot = snapshot as ForgeProjectSnapshot &
    Partial<ForgeProjectArchiveSnapshot>;
  const {
    spectralSnapshot: rawSpectralSnapshot,
    spectralSnapshotFormat: _discardArchiveFormat,
    spectralSnapshotBase64: _discardLegacyBase64,
    spectralSnapshotBase64Parts: _discardLegacyBase64Parts,
    spectralSnapshotLength: _discardArchiveLength,
    spectralSnapshotByteLength: _discardArchiveByteLength,
    ...snapshotWithoutRawSpectralPayload
  } = archiveLikeSnapshot;
  const spectralSnapshot =
    rawSpectralSnapshot instanceof Float32Array
      ? rawSpectralSnapshot
      : new Float32Array(rawSpectralSnapshot ?? []);
  const spectralBytes = new Uint8Array(
    spectralSnapshot.buffer,
    spectralSnapshot.byteOffset,
    spectralSnapshot.byteLength,
  ).slice();
  return {
    ...snapshotWithoutRawSpectralPayload,
    materialExport: {
      ...snapshot.materialExport,
      guideMarkers: [...snapshot.materialExport.guideMarkers],
    },
    viewPort: { ...snapshot.viewPort },
    waveformMix: { ...snapshot.waveformMix },
    stampTransform: { ...snapshot.stampTransform },
    sourceMeta: snapshot.sourceMeta ? { ...snapshot.sourceMeta } : null,
    carrierIntegralSelection: snapshot.carrierIntegralSelection
      ? {
          ...snapshot.carrierIntegralSelection,
          paramsPatch: { ...snapshot.carrierIntegralSelection.paramsPatch },
        }
      : null,
    carrierIntegralSynthLab: snapshot.carrierIntegralSynthLab
      ? {
          ...snapshot.carrierIntegralSynthLab,
          paramsPatch: { ...snapshot.carrierIntegralSynthLab.paramsPatch },
        }
      : null,
    carrierIntegralHarmonicXplore: snapshot.carrierIntegralHarmonicXplore
      ? { ...snapshot.carrierIntegralHarmonicXplore }
      : null,
    spectralSnapshotFormat: "float32-base64-chunks",
    spectralSnapshotBase64Parts: arrayBufferToBase64Chunks(spectralBytes.buffer),
    spectralSnapshotLength: spectralSnapshot.length,
    spectralSnapshotByteLength: spectralBytes.byteLength,
  };
}

function base64ChunksToFloat32Array(
  chunks: string[],
  expectedLength?: number,
): Float32Array {
  const byteChunks: Uint8Array[] = [];
  let totalBytes = 0;
  for (const chunkBase64 of chunks) {
    if (typeof chunkBase64 !== "string" || !chunkBase64) continue;
    const binary = window.atob(chunkBase64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1)
      bytes[index] = binary.charCodeAt(index);
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
  return typeof expectedLength === "number" &&
    expectedLength >= 0 &&
    expectedLength < view.length
    ? view.slice(0, expectedLength)
    : view;
}

function base64ToFloat32Array(
  base64: string,
  expectedLength?: number,
): Float32Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1)
    bytes[index] = binary.charCodeAt(index);
  const view = new Float32Array(bytes.buffer);
  return typeof expectedLength === "number" &&
    expectedLength >= 0 &&
    expectedLength < view.length
    ? view.slice(0, expectedLength)
    : view;
}

function spectralSnapshotFromUnknown(
  raw: unknown,
  expectedLength?: number,
): Float32Array {
  if (raw instanceof Float32Array) return raw;
  if (Array.isArray(raw))
    return new Float32Array(
      raw.filter(
        (value): value is number =>
          typeof value === "number" && Number.isFinite(value),
      ),
    );
  if (isRecord(raw)) {
    const entries = Object.entries(raw)
      .map(([key, value]) => [Number(key), value] as const)
      .filter(
        ([key, value]) =>
          Number.isInteger(key) &&
          key >= 0 &&
          typeof value === "number" &&
          Number.isFinite(value),
      )
      .sort((a, b) => a[0] - b[0]);
    if (entries.length)
      return new Float32Array(entries.map(([, value]) => value as number));
  }
  return new Float32Array(Math.max(0, expectedLength ?? 0));
}

function hydrateArchiveSnapshot(
  snapshot: unknown,
): ForgeProjectSnapshot | null {
  if (!isRecord(snapshot)) return null;
  const expectedLength =
    typeof snapshot.spectralSnapshotLength === "number"
      ? snapshot.spectralSnapshotLength
      : undefined;
  const spectralSnapshot =
    snapshot.spectralSnapshotFormat === "float32-base64-chunks" &&
    Array.isArray(snapshot.spectralSnapshotBase64Parts)
      ? base64ChunksToFloat32Array(
          snapshot.spectralSnapshotBase64Parts.filter(
            (entry): entry is string => typeof entry === "string",
          ),
          expectedLength,
        )
      : snapshot.spectralSnapshotFormat === "float32-base64" &&
          typeof snapshot.spectralSnapshotBase64 === "string"
        ? base64ToFloat32Array(snapshot.spectralSnapshotBase64, expectedLength)
        : spectralSnapshotFromUnknown(snapshot.spectralSnapshot, expectedLength);
  return {
    ...(snapshot as unknown as Omit<ForgeProjectSnapshot, "spectralSnapshot">),
    spectralSnapshot,
  } as ForgeProjectSnapshot;
}

function normalizeForgeArchiveRecord(
  raw: unknown,
): ForgeProjectArchiveRecord | null {
  if (!isRecord(raw) || !isRecord(raw.snapshot)) return null;
  const snapshot = hydrateArchiveSnapshot(raw.snapshot);
  if (!snapshot) return null;
  const now = Date.now();
  const id =
    typeof raw.id === "string" && raw.id ? raw.id : createForgeProjectId();
  const name =
    typeof raw.name === "string" && raw.name.trim()
      ? raw.name.trim()
      : "spectral-forge-project";
  const record: PersistedForgeProjectRecord = {
    id,
    name,
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : now,
    bpm: typeof raw.bpm === "number" ? raw.bpm : snapshot.materialExport.bpm,
    bars:
      typeof raw.bars === "number" ? raw.bars : snapshot.materialExport.bars,
    activeTool: (typeof raw.activeTool === "string"
      ? raw.activeTool
      : snapshot.activeTool) as ToolType,
    carrierIntegral: isRecord(raw.carrierIntegral)
      ? (raw.carrierIntegral as unknown as ForgeProjectCarrierIntegralMeta)
      : createCarrierIntegralMeta(snapshot),
    snapshot,
  };
  return toForgeArchiveRecord(record);
}

function toForgeArchiveRecord(
  record: PersistedForgeProjectRecord,
): ForgeProjectArchiveRecord {
  const snapshot = cloneSnapshotForArchive(record.snapshot);
  const contentHash = hashStableString(
    JSON.stringify({
      name: record.name,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      bpm: record.bpm,
      bars: record.bars,
      activeTool: record.activeTool,
      carrierIntegral: record.carrierIntegral ?? null,
      spectralSnapshotFormat: snapshot.spectralSnapshotFormat,
      spectralSnapshotLength: snapshot.spectralSnapshotLength,
      spectralSnapshotByteLength: snapshot.spectralSnapshotByteLength ?? null,
      spectralSnapshotBase64: snapshot.spectralSnapshotBase64 ?? null,
      spectralSnapshotBase64Parts: snapshot.spectralSnapshotBase64Parts
        ? snapshot.spectralSnapshotBase64Parts.map((part) => part.length)
        : null,
    }),
  );
  return {
    ...record,
    carrierIntegral:
      record.carrierIntegral ?? createCarrierIntegralMeta(record.snapshot),
    snapshot,
    contentHash,
  };
}

function hydrateArchiveRecord(
  record: ForgeProjectArchiveRecord,
): PersistedForgeProjectRecord | null {
  const snapshot = hydrateArchiveSnapshot(record.snapshot);
  if (!snapshot) return null;
  return {
    id: record.id,
    name: record.name,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    bpm: record.bpm,
    bars: record.bars,
    activeTool: record.activeTool,
    carrierIntegral:
      record.carrierIntegral ?? createCarrierIntegralMeta(snapshot),
    snapshot,
  };
}

function normalizeForgeProjectIdentity(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase();
}

export function parseForgeProjectLibraryArchivePayload(
  raw: unknown,
): ForgeProjectLibraryArchivePayload | null {
  if (!isRecord(raw)) return null;
  const projects = Array.isArray(raw.projects)
    ? raw.projects
        .map(normalizeForgeArchiveRecord)
        .filter(
          (record): record is ForgeProjectArchiveRecord => record !== null,
        )
    : [];
  return { projects };
}

export async function exportForgeProjectLibraryArchivePayload(): Promise<ForgeProjectLibraryArchivePayload> {
  const records = await loadAllForgeProjectRecords().catch((error) => {
    console.warn("[xensonar][forge-project-library][archive-read]", error);
    return [] as PersistedForgeProjectRecord[];
  });
  const projects: ForgeProjectArchiveRecord[] = [];
  for (const record of records
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_PROJECTS)) {
    try {
      projects.push(toForgeArchiveRecord(record));
    } catch (error) {
      console.warn(
        "[xensonar][forge-project-library][archive-record-skip]",
        record?.id ?? record?.name ?? "unknown",
        error,
      );
    }
  }
  return { projects };
}

export async function applyForgeProjectLibraryArchivePayload(args: {
  payload: ForgeProjectLibraryArchivePayload;
  mode: WorkspacePackageImportMode;
}): Promise<ForgeProjectLibraryArchiveImportResult> {
  const payload = parseForgeProjectLibraryArchivePayload(args.payload);
  if (!payload)
    return {
      importedCount: 0,
      skippedCount: 0,
      replacedCount: 0,
      dedupedCount: 0,
    };
  const existing = await loadAllForgeProjectRecords().catch(
    () => [] as PersistedForgeProjectRecord[],
  );
  if (args.mode === "replace") await clearForgeProjectRecords();
  const working = args.mode === "replace" ? [] : existing;
  const byId = new Map(working.map((record) => [record.id, record] as const));
  const byName = new Map(
    working.map(
      (record) => [normalizeForgeProjectIdentity(record.name), record] as const,
    ),
  );
  let importedCount = 0;
  let skippedCount = 0;
  let replacedCount = 0;
  for (const archiveRecord of payload.projects) {
    const hydrated = hydrateArchiveRecord(archiveRecord);
    if (!hydrated) continue;
    const existingBySameId = byId.get(hydrated.id) ?? null;
    if (args.mode === "merge" && existingBySameId) {
      skippedCount += 1;
      continue;
    }
    const replacement =
      args.mode === "differential"
        ? (existingBySameId ??
          byName.get(normalizeForgeProjectIdentity(hydrated.name)) ??
          null)
        : null;
    const next: PersistedForgeProjectRecord = {
      ...hydrated,
      id: replacement?.id ?? hydrated.id,
      createdAt: replacement?.createdAt ?? hydrated.createdAt,
      updatedAt: Date.now(),
    };
    if (replacement) replacedCount += 1;
    await writeForgeProjectRecord(next);
    byId.set(next.id, next);
    byName.set(normalizeForgeProjectIdentity(next.name), next);
    importedCount += 1;
  }
  const nextRecords =
    args.mode === "replace"
      ? payload.projects
          .map(hydrateArchiveRecord)
          .filter(
            (record): record is PersistedForgeProjectRecord => record !== null,
          )
      : await loadAllForgeProjectRecords().catch(
          () => [] as PersistedForgeProjectRecord[],
        );
  setEntries(
    nextRecords
      .map(toForgeProjectMeta)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_PROJECTS),
  );
  return { importedCount, skippedCount, replacedCount, dedupedCount: 0 };
}
