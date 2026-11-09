import { createMaterialPackageFromExport } from './materialAdapter';
import {
  arrayBufferToBase64,
  base64ToBlob,
  buildJsonPackageId,
  hashStableString,
  type WorkspacePackageImportMode,
} from '../../core/systemMemory/packageCore';
import { resolveImportedStableId } from '../../core/systemMemory/importMergeUtils';
import {
  deleteMaterialEntry,
  getMaterialLibraryState,
  registerExternalMaterialPackage,
  type MaterialEntry,
} from './materialLibrary';
import { buildMaterialLibraryArchivePayload, type MaterialLibraryArchiveEntry, type MaterialLibraryArchivePayload } from './materialLibraryPackage';

function buildImportedMaterialId() {
  return buildJsonPackageId('mat');
}

function roundMetaNumber(value: number | null | undefined, digits: number) {
  if (value == null || !Number.isFinite(value)) return 'null';
  return Number(value).toFixed(digits);
}

function normalizeMetaText(value: string | null | undefined) {
  return (value ?? '').trim().toLocaleLowerCase();
}

function materialMetadataSignature(args: {
  name: string;
  role: string;
  sizeBytes: number;
  durationSec: number;
  bpm: number;
  bars: number;
  guideSegments: number;
  guideMarkers: number[];
  loopStartSec: number;
  loopEndSec: number;
  rootHz: number | null;
  sourceVersion: string;
  renderMode: string;
  intendedLoopDurationSec?: number;
  rootFollowPreferred?: boolean;
  workspaceOrigin?: string;
  rootFollowGranularProfile?: string;
  spectralGranularBridge?: string;
  audioPaintImportDetailJson?: string;
  audioIdentityKey?: string;
  audioIdentitySource?: string;
}) {
  return [
    normalizeMetaText(args.name),
    args.role,
    String(args.sizeBytes ?? 0),
    roundMetaNumber(args.durationSec, 4),
    roundMetaNumber(args.bpm, 3),
    String(args.bars ?? 0),
    String(args.guideSegments ?? 0),
    (args.guideMarkers ?? []).map((value) => roundMetaNumber(value, 4)).join(','),
    roundMetaNumber(args.loopStartSec, 4),
    roundMetaNumber(args.loopEndSec, 4),
    roundMetaNumber(args.rootHz, 3),
    args.sourceVersion ?? '',
    args.renderMode ?? '',
    roundMetaNumber(args.intendedLoopDurationSec, 4),
    args.rootFollowPreferred ? 'root-follow-preferred' : 'root-follow-neutral',
    normalizeMetaText(args.workspaceOrigin),
    normalizeMetaText(args.rootFollowGranularProfile),
    normalizeMetaText(args.spectralGranularBridge),
    normalizeMetaText(args.audioPaintImportDetailJson),
    normalizeMetaText(args.audioIdentityKey),
    normalizeMetaText(args.audioIdentitySource),
  ].join('|');
}

function materialEntryMetadataSignature(entry: MaterialEntry) {
  return materialMetadataSignature({ ...entry, sizeBytes: entry.blob.size });
}

function archivedMaterialMetadataSignature(entry: MaterialLibraryArchiveEntry) {
  return materialMetadataSignature(entry);
}

async function hashMaterialEntry(entry: MaterialEntry) {
  const dataBase64 = arrayBufferToBase64(await entry.blob.arrayBuffer());
  return hashStableString(JSON.stringify({
    name: entry.name,
    role: entry.role,
    mimeType: entry.blob.type || 'audio/wav',
    dataBase64,
    sizeBytes: entry.blob.size,
    durationSec: entry.durationSec,
    bpm: entry.bpm,
    bars: entry.bars,
    guideSegments: entry.guideSegments,
    guideMarkers: entry.guideMarkers,
    loopStartSec: entry.loopStartSec,
    loopEndSec: entry.loopEndSec,
    rootHz: entry.rootHz,
    sourceVersion: entry.sourceVersion,
    renderMode: entry.renderMode,
    intendedLoopDurationSec: entry.intendedLoopDurationSec ?? null,
    rootFollowPreferred: entry.rootFollowPreferred ?? false,
    rootFollowGranularProfile: entry.rootFollowGranularProfile ?? null,
    spectralGranularBridge: entry.spectralGranularBridge ?? null,
    audioPaintImportDetailJson: entry.audioPaintImportDetailJson ?? null,
    audioIdentityKey: entry.audioIdentityKey ?? null,
    audioIdentitySource: entry.audioIdentitySource ?? null,
  }));
}

export async function exportMaterialLibraryArchivePayload() {
  return buildMaterialLibraryArchivePayload(getMaterialLibraryState().entries);
}

export async function applyMaterialLibraryArchivePayload(args: {
  payload: MaterialLibraryArchivePayload;
  mode: WorkspacePackageImportMode;
}) {
  const currentEntries = getMaterialLibraryState().entries;
  const usedIds = new Set(currentEntries.map((entry) => entry.id));
  const existingHashToId = new Map<string, string>();
  const existingBySignature = new Map<string, MaterialEntry[]>();
  for (const entry of currentEntries) {
    existingHashToId.set(await hashMaterialEntry(entry), entry.id);
    const signature = materialEntryMetadataSignature(entry);
    const group = existingBySignature.get(signature) ?? [];
    group.push(entry);
    existingBySignature.set(signature, group);
  }

  if (args.mode === 'replace') {
    for (const entry of currentEntries) {
      await deleteMaterialEntry(entry.id);
    }
    existingHashToId.clear();
    existingBySignature.clear();
    usedIds.clear();
  }

  let importedCount = 0;
  let skippedCount = 0;
  let replacedCount = 0;
  let dedupedCount = 0;
  const importedIdMap = new Map<string, string>();
  const replacedIdMap = new Map<string, string>();
  const touchedIds = new Set<string>();

  for (const archived of args.payload.entries) {
    const signature = archivedMaterialMetadataSignature(archived);
    const existingByContent = existingHashToId.get(archived.contentHash);
    if (args.mode === 'merge' && existingByContent) {
      importedIdMap.set(archived.archivedId, existingByContent);
      skippedCount += 1;
      continue;
    }

    const signatureMatches = args.mode === 'differential' ? (existingBySignature.get(signature) ?? []) : [];
    const replaceExistingId = signatureMatches[0]?.id ?? null;
    const stableId = replaceExistingId ?? resolveImportedStableId({
      preferredId: archived.archivedId,
      usedIds,
      createId: buildImportedMaterialId,
    });

    if (replaceExistingId) {
      replacedCount += 1;
      replacedIdMap.set(replaceExistingId, stableId);
      for (const duplicate of signatureMatches.slice(1)) {
        await deleteMaterialEntry(duplicate.id);
        usedIds.delete(duplicate.id);
        dedupedCount += 1;
      }
    }

    const blob = base64ToBlob(archived.dataBase64, archived.mimeType || 'audio/wav');
    const pkg = createMaterialPackageFromExport({
      name: archived.name,
      role: archived.role,
      bpm: archived.bpm,
      bars: archived.bars,
      guideSegments: archived.guideSegments,
      guideMarkers: archived.guideMarkers,
      loopStartSec: archived.loopStartSec,
      loopEndSec: archived.loopEndSec,
      rootHz: archived.rootHz,
      sourceVersion: archived.sourceVersion,
      renderMode: archived.renderMode,
      durationSec: archived.durationSec,
      intendedLoopDurationSec: archived.intendedLoopDurationSec,
      preferredMyzelGroup: archived.preferredMyzelGroup,
      workspaceOrigin: archived.workspaceOrigin,
      transitionGuard: archived.transitionGuard,
      balanceCarrier: archived.balanceCarrier,
      routeSummary: archived.routeSummary,
      stabilizeBy: archived.stabilizeBy,
      rootFollowPreferred: archived.rootFollowPreferred ?? false,
      rootFollowGranularProfile: archived.rootFollowGranularProfile,
      spectralGranularBridge: archived.spectralGranularBridge,
      audioPaintImportDetailJson: archived.audioPaintImportDetailJson,
      audioIdentityKey: archived.audioIdentityKey,
      audioIdentitySource: archived.audioIdentitySource,
      stableId,
    }, blob);
    const registered = registerExternalMaterialPackage(pkg);
    usedIds.add(registered.id);
    touchedIds.add(registered.id);
    existingHashToId.set(archived.contentHash, registered.id);
    existingBySignature.set(signature, [registered]);
    importedIdMap.set(archived.archivedId, registered.id);
    importedCount += 1;
  }

  return { importedCount, skippedCount, replacedCount, dedupedCount, importedIdMap, replacedIdMap, touchedIds };
}
