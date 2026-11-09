import { arrayBufferToBase64, isRecord, type WorkspacePackageImportMode } from '../../../core/systemMemory/packageCore';
import { buildCanonicalAnalysisBundle } from './analysis';
import { buildRawPreviewAsset, cloneStampData } from './spectralWorkspaceUtils';
import type { AudioSourceAnalysisCache, AudioSourceAsset } from '../spectralForge/audio/AudioImporterTypes';
import type { StampData } from '../spectralForge/audio/SpectralData';
import type { CanonicalForgeProjectRecord, CanonicalForgeProjectSnapshot } from './projectLibraryTypes';
import type { CanonicalForgeSessionState } from './sessionTypes';

export const SYNTHETIC_FORGE_PACKAGE_WORKSPACE_RESTORED_EVENT = 'xensonar:spectral-forge-package-workspace-restored' as const;

export type Float32ArchiveV1 = {
  encoding: 'f32-base64-v1';
  length: number;
  dataBase64: string;
};

export type AudioSourceAnalysisCacheArchiveV1 = Omit<AudioSourceAnalysisCache, 'data' | 'transientEnvelope'> & {
  data: Float32ArchiveV1;
  transientEnvelope: Float32ArchiveV1;
};

export type AudioSourceAssetArchiveV1 = Omit<AudioSourceAsset,
  'monoSamples' | 'leftSamples' | 'rightSamples' | 'midSamples' | 'sideSamples' |
  'waveformPreview' | 'stereoWidthPreview' | 'analysisCache'> & {
  monoSamples: Float32ArchiveV1;
  leftSamples: Float32ArchiveV1;
  rightSamples: Float32ArchiveV1;
  midSamples: Float32ArchiveV1;
  sideSamples: Float32ArchiveV1;
  waveformPreview: Float32ArchiveV1;
  stereoWidthPreview: Float32ArchiveV1;
  analysisCache?: AudioSourceAnalysisCacheArchiveV1;
};

export type StampDataArchiveV1 = Omit<StampData, 'data' | 'grainData'> & {
  data: Float32ArchiveV1;
  grainData: Float32ArchiveV1;
};

export type CanonicalForgeProjectSnapshotArchiveV1 = Omit<CanonicalForgeProjectSnapshot,
  'sourceAsset' | 'spectralSnapshot' | 'stampData'> & {
  sourceAsset: AudioSourceAssetArchiveV1 | null;
  spectralSnapshot: Float32ArchiveV1 | null;
  stampData: StampDataArchiveV1 | null;
};

export type SyntheticForgeSavedWorkspaceArchiveRecordV1 = Omit<CanonicalForgeProjectRecord, 'snapshot'> & {
  snapshot: CanonicalForgeProjectSnapshotArchiveV1;
};

export type SyntheticForgeSavedWorkspaceLibraryArchivePayload = {
  schemaVersion: 1;
  projects: SyntheticForgeSavedWorkspaceArchiveRecordV1[];
};

type SharedSourceArchiveV1 = {
  mode: 'shared-raw';
  fileName: string;
  projectionReadMode?: AudioSourceAsset['projectionReadMode'];
  sampleRate: number;
  originalDuration: number;
  channelCount: number;
  importStartSec: number;
  importDurationSec: number;
  analysisCache?: AudioSourceAnalysisCacheArchiveV1;
};

type FullSourceArchiveV1 = { mode: 'full'; asset: AudioSourceAssetArchiveV1 };

export type SyntheticForgeCurrentWorkspaceArchivePayload = {
  schemaVersion: 1;
  session: Omit<CanonicalForgeSessionState,
    'rawSourceAsset' | 'sourceAsset' | 'bundle' | 'spectralSnapshot' | 'stampData'>;
  rawSourceAsset: AudioSourceAssetArchiveV1 | null;
  sourceAsset: SharedSourceArchiveV1 | FullSourceArchiveV1 | null;
  spectralSnapshot: Float32ArchiveV1 | null;
  stampData: StampDataArchiveV1 | null;
};

function encodeFloat32(value: Float32Array | null | undefined): Float32ArchiveV1 | null {
  if (!value) return null;
  const bytes = new Uint8Array(value.byteLength);
  bytes.set(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
  return { encoding: 'f32-base64-v1', length: value.length, dataBase64: arrayBufferToBase64(bytes.buffer) };
}

function decodeFloat32(raw: unknown): Float32Array | null {
  if (!isRecord(raw) || raw.encoding !== 'f32-base64-v1' || typeof raw.dataBase64 !== 'string') return null;
  const binary = window.atob(raw.dataBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const length = typeof raw.length === 'number' && Number.isFinite(raw.length) ? Math.max(0, Math.floor(raw.length)) : Math.floor(bytes.byteLength / 4);
  const available = Math.floor(bytes.byteLength / 4);
  const view = new Float32Array(bytes.buffer, 0, Math.min(length, available));
  return view.slice();
}

function encodeAnalysisCache(cache: AudioSourceAnalysisCache | undefined): AudioSourceAnalysisCacheArchiveV1 | undefined {
  if (!cache) return undefined;
  return {
    width: cache.width,
    height: cache.height,
    data: encodeFloat32(cache.data)!,
    transientEnvelope: encodeFloat32(cache.transientEnvelope)!,
  };
}

function decodeAnalysisCache(raw: unknown): AudioSourceAnalysisCache | undefined {
  if (!isRecord(raw)) return undefined;
  const data = decodeFloat32(raw.data);
  const transientEnvelope = decodeFloat32(raw.transientEnvelope);
  if (!data || !transientEnvelope) return undefined;
  return {
    width: typeof raw.width === 'number' ? raw.width : 0,
    height: typeof raw.height === 'number' ? raw.height : 0,
    data,
    transientEnvelope,
  };
}

export function encodeAudioSourceAssetForPackage(asset: AudioSourceAsset | null): AudioSourceAssetArchiveV1 | null {
  if (!asset) return null;
  return {
    kind: 'audio',
    fileName: asset.fileName,
    projectionReadMode: asset.projectionReadMode,
    monoSamples: encodeFloat32(asset.monoSamples)!,
    leftSamples: encodeFloat32(asset.leftSamples)!,
    rightSamples: encodeFloat32(asset.rightSamples)!,
    midSamples: encodeFloat32(asset.midSamples)!,
    sideSamples: encodeFloat32(asset.sideSamples)!,
    sampleRate: asset.sampleRate,
    originalDuration: asset.originalDuration,
    channelCount: asset.channelCount,
    importStartSec: asset.importStartSec,
    importDurationSec: asset.importDurationSec,
    waveformPreview: encodeFloat32(asset.waveformPreview)!,
    stereoWidthPreview: encodeFloat32(asset.stereoWidthPreview)!,
    analysisCache: encodeAnalysisCache(asset.analysisCache),
  };
}

export function decodeAudioSourceAssetFromPackage(raw: unknown): AudioSourceAsset | null {
  if (!isRecord(raw) || raw.kind !== 'audio') return null;
  const monoSamples = decodeFloat32(raw.monoSamples);
  const leftSamples = decodeFloat32(raw.leftSamples);
  const rightSamples = decodeFloat32(raw.rightSamples);
  const midSamples = decodeFloat32(raw.midSamples);
  const sideSamples = decodeFloat32(raw.sideSamples);
  const waveformPreview = decodeFloat32(raw.waveformPreview);
  const stereoWidthPreview = decodeFloat32(raw.stereoWidthPreview);
  if (!monoSamples || !leftSamples || !rightSamples || !midSamples || !sideSamples || !waveformPreview || !stereoWidthPreview) return null;
  return {
    kind: 'audio',
    fileName: typeof raw.fileName === 'string' ? raw.fileName : 'imported-audio',
    projectionReadMode: raw.projectionReadMode === 'legacy' || raw.projectionReadMode === 'transient' || raw.projectionReadMode === 'hybrid' ? raw.projectionReadMode : undefined,
    monoSamples,
    leftSamples,
    rightSamples,
    midSamples,
    sideSamples,
    sampleRate: typeof raw.sampleRate === 'number' ? raw.sampleRate : 44100,
    originalDuration: typeof raw.originalDuration === 'number' ? raw.originalDuration : 0,
    channelCount: typeof raw.channelCount === 'number' ? raw.channelCount : 1,
    importStartSec: typeof raw.importStartSec === 'number' ? raw.importStartSec : 0,
    importDurationSec: typeof raw.importDurationSec === 'number' ? raw.importDurationSec : 0,
    waveformPreview,
    stereoWidthPreview,
    analysisCache: decodeAnalysisCache(raw.analysisCache),
  };
}

function encodeStamp(stamp: StampData | null | undefined): StampDataArchiveV1 | null {
  if (!stamp) return null;
  return { width: stamp.width, height: stamp.height, data: encodeFloat32(stamp.data)!, grainData: encodeFloat32(stamp.grainData)! };
}

function decodeStamp(raw: unknown): StampData | null {
  if (!isRecord(raw)) return null;
  const data = decodeFloat32(raw.data);
  const grainData = decodeFloat32(raw.grainData);
  if (!data || !grainData) return null;
  return { width: typeof raw.width === 'number' ? raw.width : 0, height: typeof raw.height === 'number' ? raw.height : 0, data, grainData };
}

function audioBackingShared(a: AudioSourceAsset | null, b: AudioSourceAsset | null) {
  if (!a || !b) return false;
  return a.monoSamples === b.monoSamples && a.leftSamples === b.leftSamples && a.rightSamples === b.rightSamples &&
    a.midSamples === b.midSamples && a.sideSamples === b.sideSamples && a.waveformPreview === b.waveformPreview &&
    a.stereoWidthPreview === b.stereoWidthPreview;
}

export function encodeSyntheticForgeCurrentWorkspaceForPackage(session: CanonicalForgeSessionState | null): SyntheticForgeCurrentWorkspaceArchivePayload | null {
  if (!session) return null;
  const { rawSourceAsset, sourceAsset, bundle: _bundle, spectralSnapshot, stampData, ...rest } = session;
  const rawArchive = encodeAudioSourceAssetForPackage(rawSourceAsset);
  let sourceArchive: SyntheticForgeCurrentWorkspaceArchivePayload['sourceAsset'] = null;
  if (sourceAsset) {
    if (rawSourceAsset && audioBackingShared(rawSourceAsset, sourceAsset)) {
      sourceArchive = {
        mode: 'shared-raw',
        fileName: sourceAsset.fileName,
        projectionReadMode: sourceAsset.projectionReadMode,
        sampleRate: sourceAsset.sampleRate,
        originalDuration: sourceAsset.originalDuration,
        channelCount: sourceAsset.channelCount,
        importStartSec: sourceAsset.importStartSec,
        importDurationSec: sourceAsset.importDurationSec,
        analysisCache: encodeAnalysisCache(sourceAsset.analysisCache),
      };
    } else {
      sourceArchive = { mode: 'full', asset: encodeAudioSourceAssetForPackage(sourceAsset)! };
    }
  }
  return {
    schemaVersion: 1,
    session: rest,
    rawSourceAsset: rawArchive,
    sourceAsset: sourceArchive,
    spectralSnapshot: encodeFloat32(spectralSnapshot),
    stampData: encodeStamp(stampData),
  };
}

export function decodeSyntheticForgeCurrentWorkspaceFromPackage(raw: unknown): CanonicalForgeSessionState | null {
  if (!isRecord(raw) || raw.schemaVersion !== 1 || !isRecord(raw.session)) return null;
  const rawSourceAsset = decodeAudioSourceAssetFromPackage(raw.rawSourceAsset);
  let sourceAsset: AudioSourceAsset | null = null;
  if (isRecord(raw.sourceAsset) && raw.sourceAsset.mode === 'shared-raw' && rawSourceAsset) {
    sourceAsset = {
      ...rawSourceAsset,
      fileName: typeof raw.sourceAsset.fileName === 'string' ? raw.sourceAsset.fileName : rawSourceAsset.fileName,
      projectionReadMode: raw.sourceAsset.projectionReadMode === 'legacy' || raw.sourceAsset.projectionReadMode === 'transient' || raw.sourceAsset.projectionReadMode === 'hybrid' ? raw.sourceAsset.projectionReadMode : rawSourceAsset.projectionReadMode,
      sampleRate: typeof raw.sourceAsset.sampleRate === 'number' ? raw.sourceAsset.sampleRate : rawSourceAsset.sampleRate,
      originalDuration: typeof raw.sourceAsset.originalDuration === 'number' ? raw.sourceAsset.originalDuration : rawSourceAsset.originalDuration,
      channelCount: typeof raw.sourceAsset.channelCount === 'number' ? raw.sourceAsset.channelCount : rawSourceAsset.channelCount,
      importStartSec: typeof raw.sourceAsset.importStartSec === 'number' ? raw.sourceAsset.importStartSec : rawSourceAsset.importStartSec,
      importDurationSec: typeof raw.sourceAsset.importDurationSec === 'number' ? raw.sourceAsset.importDurationSec : rawSourceAsset.importDurationSec,
      analysisCache: decodeAnalysisCache(raw.sourceAsset.analysisCache),
    };
  } else if (isRecord(raw.sourceAsset) && raw.sourceAsset.mode === 'full') {
    sourceAsset = decodeAudioSourceAssetFromPackage(raw.sourceAsset.asset);
  }
  const spectralSnapshot = decodeFloat32(raw.spectralSnapshot);
  const stampData = decodeStamp(raw.stampData);
  const bundle = sourceAsset?.analysisCache ? buildCanonicalAnalysisBundle(sourceAsset) : null;
  return {
    ...(raw.session as unknown as Omit<CanonicalForgeSessionState, 'rawSourceAsset' | 'sourceAsset' | 'bundle' | 'spectralSnapshot' | 'stampData'>),
    rawSourceAsset: rawSourceAsset ?? buildRawPreviewAsset(sourceAsset),
    sourceAsset,
    bundle,
    spectralSnapshot,
    stampData: cloneStampData(stampData),
  };
}

export function encodeSyntheticForgeSavedWorkspaceProject(record: CanonicalForgeProjectRecord): SyntheticForgeSavedWorkspaceArchiveRecordV1 {
  const { snapshot, ...meta } = record;
  const { sourceAsset, spectralSnapshot, stampData, ...rest } = snapshot;
  return {
    ...meta,
    snapshot: {
      ...rest,
      sourceAsset: encodeAudioSourceAssetForPackage(sourceAsset),
      spectralSnapshot: encodeFloat32(spectralSnapshot),
      stampData: encodeStamp(stampData),
    },
  };
}

export function decodeSyntheticForgeSavedWorkspaceProject(raw: unknown): CanonicalForgeProjectRecord | null {
  if (!isRecord(raw) || !isRecord(raw.snapshot)) return null;
  const snapshotRaw = raw.snapshot;
  const sourceAsset = decodeAudioSourceAssetFromPackage(snapshotRaw.sourceAsset);
  const spectralSnapshot = decodeFloat32(snapshotRaw.spectralSnapshot);
  const stampData = decodeStamp(snapshotRaw.stampData);
  const { sourceAsset: _sourceAsset, spectralSnapshot: _spectralSnapshot, stampData: _stampData, ...snapshotRest } = snapshotRaw;
  if (typeof raw.id !== 'string' || typeof raw.name !== 'string') return null;
  return {
    id: raw.id,
    name: raw.name,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
    bpm: typeof raw.bpm === 'number' ? raw.bpm : 108,
    bars: typeof raw.bars === 'number' ? raw.bars : 1,
    activeTool: raw.activeTool as CanonicalForgeProjectRecord['activeTool'],
    hasSourceAudio: !!sourceAsset,
    sourceDurationSec: sourceAsset?.originalDuration ?? null,
    snapshot: {
      ...(snapshotRest as unknown as Omit<CanonicalForgeProjectSnapshot, 'sourceAsset' | 'spectralSnapshot' | 'stampData'>),
      sourceAsset,
      spectralSnapshot,
      stampData,
    },
  };
}

export function parseSyntheticForgeSavedWorkspaceLibraryArchivePayload(raw: unknown): SyntheticForgeSavedWorkspaceLibraryArchivePayload | null {
  if (!isRecord(raw) || raw.schemaVersion !== 1 || !Array.isArray(raw.projects)) return null;
  const projects = raw.projects.filter(isRecord) as SyntheticForgeSavedWorkspaceArchiveRecordV1[];
  return { schemaVersion: 1, projects };
}

export function parseSyntheticForgeCurrentWorkspaceArchivePayload(raw: unknown): SyntheticForgeCurrentWorkspaceArchivePayload | null {
  if (!isRecord(raw) || raw.schemaVersion !== 1 || !isRecord(raw.session)) return null;
  return raw as unknown as SyntheticForgeCurrentWorkspaceArchivePayload;
}

export type SyntheticForgeSavedWorkspaceApplyResult = {
  present: boolean;
  importedCount: number;
  skippedCount: number;
  replacedCount: number;
};

export function chooseImportedSyntheticForgeProjectRecords(args: {
  current: CanonicalForgeProjectRecord[];
  incoming: CanonicalForgeProjectRecord[];
  mode: WorkspacePackageImportMode;
}): { records: CanonicalForgeProjectRecord[]; result: SyntheticForgeSavedWorkspaceApplyResult } {
  const { current, incoming, mode } = args;
  if (mode === 'replace') {
    return { records: incoming, result: { present: true, importedCount: incoming.length, skippedCount: 0, replacedCount: current.length } };
  }
  const byId = new Map(current.map((entry) => [entry.id, entry] as const));
  let importedCount = 0;
  let skippedCount = 0;
  let replacedCount = 0;
  for (const entry of incoming) {
    const existing = byId.get(entry.id);
    if (mode === 'merge' && existing) {
      skippedCount += 1;
      continue;
    }
    if (existing) replacedCount += 1;
    else importedCount += 1;
    byId.set(entry.id, entry);
  }
  return { records: Array.from(byId.values()), result: { present: true, importedCount, skippedCount, replacedCount } };
}


// Legacy 322 compatibility aliases. Product terminology is SyntheticForge.
/** @deprecated Use SYNTHETIC_FORGE_PACKAGE_WORKSPACE_RESTORED_EVENT. */
export const SPECTRAL_FORGE_PACKAGE_WORKSPACE_RESTORED_EVENT = SYNTHETIC_FORGE_PACKAGE_WORKSPACE_RESTORED_EVENT;
/** @deprecated Use SyntheticForgeSavedWorkspaceArchiveRecordV1. */
export type SpectralForgeSavedWorkspaceArchiveRecordV1 = SyntheticForgeSavedWorkspaceArchiveRecordV1;
/** @deprecated Use SyntheticForgeSavedWorkspaceLibraryArchivePayload. */
export type SpectralForgeSavedWorkspaceLibraryArchivePayload = SyntheticForgeSavedWorkspaceLibraryArchivePayload;
/** @deprecated Use SyntheticForgeCurrentWorkspaceArchivePayload. */
export type SpectralForgeCurrentWorkspaceArchivePayload = SyntheticForgeCurrentWorkspaceArchivePayload;
/** @deprecated Use SyntheticForgeSavedWorkspaceApplyResult. */
export type SpectralForgeSavedWorkspaceApplyResult = SyntheticForgeSavedWorkspaceApplyResult;
/** @deprecated Use encodeSyntheticForgeCurrentWorkspaceForPackage. */
export const encodeSpectralForgeCurrentWorkspaceForPackage = encodeSyntheticForgeCurrentWorkspaceForPackage;
/** @deprecated Use decodeSyntheticForgeCurrentWorkspaceFromPackage. */
export const decodeSpectralForgeCurrentWorkspaceFromPackage = decodeSyntheticForgeCurrentWorkspaceFromPackage;
/** @deprecated Use encodeSyntheticForgeSavedWorkspaceProject. */
export const encodeSpectralForgeSavedWorkspaceProject = encodeSyntheticForgeSavedWorkspaceProject;
/** @deprecated Use decodeSyntheticForgeSavedWorkspaceProject. */
export const decodeSpectralForgeSavedWorkspaceProject = decodeSyntheticForgeSavedWorkspaceProject;
/** @deprecated Use parseSyntheticForgeSavedWorkspaceLibraryArchivePayload. */
export const parseSpectralForgeSavedWorkspaceLibraryArchivePayload = parseSyntheticForgeSavedWorkspaceLibraryArchivePayload;
/** @deprecated Use parseSyntheticForgeCurrentWorkspaceArchivePayload. */
export const parseSpectralForgeCurrentWorkspaceArchivePayload = parseSyntheticForgeCurrentWorkspaceArchivePayload;
/** @deprecated Use chooseImportedSyntheticForgeProjectRecords. */
export const chooseImportedSpectralForgeProjectRecords = chooseImportedSyntheticForgeProjectRecords;
