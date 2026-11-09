import type { XensonarMaterialRole } from './materialSchemaTypes';

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
  tempo16?: number;
  rootFollowPreferred?: boolean;
  rootFollowGranularProfile?: string;
  spectralGranularBridge?: string;
  audioPaintImportDetailJson?: string;
  audioIdentityKey?: string;
  audioIdentitySource?: string;
}

export interface MaterialEntry extends ExportedMaterialMeta {
  id: string;
  blob: Blob;
  blobUrl: string;
  createdAt: number;
}

export interface PersistedMaterialRecord extends ExportedMaterialMeta {
  id: string;
  blob: Blob;
  createdAt: number;
}
