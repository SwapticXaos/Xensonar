import type { MaterialEntry, MaterialRole } from './materialLibrary';
import { arrayBufferToBase64, hashStableString, isRecord } from '../../core/systemMemory/packageCore';

export type MaterialLibraryArchiveEntry = {
  archivedId: string;
  name: string;
  role: MaterialRole;
  mimeType: string;
  dataBase64: string;
  createdAt: number;
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
  preferredMyzelGroup?: string;
  workspaceOrigin?: string;
  transitionGuard?: string;
  balanceCarrier?: string;
  routeSummary?: string;
  stabilizeBy?: string;
  rootFollowPreferred?: boolean;
  rootFollowGranularProfile?: string;
  spectralGranularBridge?: string;
  audioPaintImportDetailJson?: string;
  audioIdentityKey?: string;
  audioIdentitySource?: string;
  contentHash: string;
};

export type MaterialLibraryArchivePayload = {
  entries: MaterialLibraryArchiveEntry[];
};

function computeMaterialArchiveEntryContentHash(args: Omit<MaterialLibraryArchiveEntry, 'archivedId' | 'createdAt' | 'preferredMyzelGroup' | 'workspaceOrigin' | 'transitionGuard' | 'balanceCarrier' | 'routeSummary' | 'stabilizeBy' | 'contentHash'>) {
  return hashStableString(JSON.stringify({
    name: args.name,
    role: args.role,
    mimeType: args.mimeType,
    dataBase64: args.dataBase64,
    sizeBytes: args.sizeBytes,
    durationSec: args.durationSec,
    bpm: args.bpm,
    bars: args.bars,
    guideSegments: args.guideSegments,
    guideMarkers: args.guideMarkers,
    loopStartSec: args.loopStartSec,
    loopEndSec: args.loopEndSec,
    rootHz: args.rootHz,
    sourceVersion: args.sourceVersion,
    renderMode: args.renderMode,
    intendedLoopDurationSec: args.intendedLoopDurationSec ?? null,
    rootFollowPreferred: args.rootFollowPreferred ?? false,
    rootFollowGranularProfile: args.rootFollowGranularProfile ?? null,
    spectralGranularBridge: args.spectralGranularBridge ?? null,
    audioPaintImportDetailJson: args.audioPaintImportDetailJson ?? null,
    audioIdentityKey: args.audioIdentityKey ?? null,
    audioIdentitySource: args.audioIdentitySource ?? null,
  }));
}

export async function buildMaterialLibraryArchivePayload(entries: MaterialEntry[]): Promise<MaterialLibraryArchivePayload> {
  const archiveEntries = await Promise.all(entries.map(async (entry) => {
    const dataBase64 = arrayBufferToBase64(await entry.blob.arrayBuffer());
    const contentHash = computeMaterialArchiveEntryContentHash({
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
      intendedLoopDurationSec: entry.intendedLoopDurationSec,
      rootFollowPreferred: entry.rootFollowPreferred ?? false,
      rootFollowGranularProfile: entry.rootFollowGranularProfile,
      spectralGranularBridge: entry.spectralGranularBridge,
      audioPaintImportDetailJson: entry.audioPaintImportDetailJson,
      audioIdentityKey: entry.audioIdentityKey,
      audioIdentitySource: entry.audioIdentitySource,
    });
    return {
      archivedId: entry.id,
      name: entry.name,
      role: entry.role,
      mimeType: entry.blob.type || 'audio/wav',
      dataBase64,
      createdAt: entry.createdAt,
      sizeBytes: entry.blob.size,
      durationSec: entry.durationSec,
      bpm: entry.bpm,
      bars: entry.bars,
      guideSegments: entry.guideSegments,
      guideMarkers: entry.guideMarkers.slice(),
      loopStartSec: entry.loopStartSec,
      loopEndSec: entry.loopEndSec,
      rootHz: entry.rootHz,
      sourceVersion: entry.sourceVersion,
      renderMode: entry.renderMode,
      intendedLoopDurationSec: entry.intendedLoopDurationSec,
      preferredMyzelGroup: entry.preferredMyzelGroup,
      workspaceOrigin: entry.workspaceOrigin,
      transitionGuard: entry.transitionGuard,
      balanceCarrier: entry.balanceCarrier,
      routeSummary: entry.routeSummary,
      stabilizeBy: entry.stabilizeBy,
      rootFollowPreferred: entry.rootFollowPreferred ?? false,
      rootFollowGranularProfile: entry.rootFollowGranularProfile,
      spectralGranularBridge: entry.spectralGranularBridge,
      audioPaintImportDetailJson: entry.audioPaintImportDetailJson,
      audioIdentityKey: entry.audioIdentityKey,
      audioIdentitySource: entry.audioIdentitySource,
      contentHash,
    } satisfies MaterialLibraryArchiveEntry;
  }));
  return { entries: archiveEntries };
}

export function parseMaterialLibraryArchivePayload(raw: unknown): MaterialLibraryArchivePayload | null {
  if (!isRecord(raw)) return null;
  const entries = Array.isArray(raw.entries) ? raw.entries : [];
  return {
    entries: entries.filter(isRecord).map((entry) => ({
      archivedId: typeof entry.archivedId === 'string' ? entry.archivedId : `material-${Math.random().toString(36).slice(2, 8)}`,
      name: typeof entry.name === 'string' ? entry.name : 'Importiertes Material',
      role: entry.role === 'loop' || entry.role === 'waveMaterial' || entry.role === 'particleExciter' || entry.role === 'droneTexture' ? entry.role : 'loop',
      mimeType: typeof entry.mimeType === 'string' ? entry.mimeType : 'audio/wav',
      dataBase64: typeof entry.dataBase64 === 'string' ? entry.dataBase64 : '',
      createdAt: typeof entry.createdAt === 'number' ? entry.createdAt : Date.now(),
      sizeBytes: typeof entry.sizeBytes === 'number'
        ? entry.sizeBytes
        : (typeof entry.dataBase64 === 'string' ? Math.max(0, Math.floor(entry.dataBase64.length * 0.75)) : 0),
      durationSec: typeof entry.durationSec === 'number' ? entry.durationSec : 0,
      bpm: typeof entry.bpm === 'number' ? entry.bpm : 108,
      bars: typeof entry.bars === 'number' ? entry.bars : 1,
      guideSegments: typeof entry.guideSegments === 'number' ? entry.guideSegments : 1,
      guideMarkers: Array.isArray(entry.guideMarkers) ? entry.guideMarkers.filter((value): value is number => typeof value === 'number' && Number.isFinite(value)) : [],
      loopStartSec: typeof entry.loopStartSec === 'number' ? entry.loopStartSec : 0,
      loopEndSec: typeof entry.loopEndSec === 'number' ? entry.loopEndSec : 0,
      rootHz: typeof entry.rootHz === 'number' ? entry.rootHz : null,
      sourceVersion: typeof entry.sourceVersion === 'string' ? entry.sourceVersion : 'unknown',
      renderMode: typeof entry.renderMode === 'string' ? entry.renderMode : 'unknown',
      intendedLoopDurationSec: typeof entry.intendedLoopDurationSec === 'number' ? entry.intendedLoopDurationSec : undefined,
      preferredMyzelGroup: typeof entry.preferredMyzelGroup === 'string' ? entry.preferredMyzelGroup : undefined,
      workspaceOrigin: typeof entry.workspaceOrigin === 'string' ? entry.workspaceOrigin : undefined,
      transitionGuard: typeof entry.transitionGuard === 'string' ? entry.transitionGuard : undefined,
      balanceCarrier: typeof entry.balanceCarrier === 'string' ? entry.balanceCarrier : undefined,
      routeSummary: typeof entry.routeSummary === 'string' ? entry.routeSummary : undefined,
      stabilizeBy: typeof entry.stabilizeBy === 'string' ? entry.stabilizeBy : undefined,
      rootFollowPreferred: typeof entry.rootFollowPreferred === 'boolean' ? entry.rootFollowPreferred : false,
      rootFollowGranularProfile: typeof entry.rootFollowGranularProfile === 'string' ? entry.rootFollowGranularProfile : undefined,
      spectralGranularBridge: typeof entry.spectralGranularBridge === 'string' ? entry.spectralGranularBridge : undefined,
      audioPaintImportDetailJson: typeof entry.audioPaintImportDetailJson === 'string' ? entry.audioPaintImportDetailJson : undefined,
      audioIdentityKey: typeof entry.audioIdentityKey === 'string' ? entry.audioIdentityKey : undefined,
      audioIdentitySource: typeof entry.audioIdentitySource === 'string' ? entry.audioIdentitySource : undefined,
      contentHash: typeof entry.contentHash === 'string' ? entry.contentHash : hashStableString(JSON.stringify(entry)),
    })) as MaterialLibraryArchiveEntry[],
  };
}
