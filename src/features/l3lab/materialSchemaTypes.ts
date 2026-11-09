export type XensonarMaterialRole = 'loop' | 'waveMaterial' | 'particleExciter' | 'droneTexture';

export interface XensonarMaterialAudioPayload {
  kind: 'wav';
  blob: Blob;
  mimeType: string;
  durationSec?: number;
  channels?: 1 | 2;
  sampleRate?: number;
}

export interface XensonarMaterialTiming {
  bpm: number;
  bars: number;
  loopStartSec: number;
  loopEndSec: number;
  intendedLoopDurationSec: number;
}

export interface XensonarMaterialGuide {
  segmentsPerBar?: number;
  markers16?: number[];
  metronomeAudibleDefault?: boolean;
}

export interface XensonarMaterialPitch {
  rootHz?: number | null;
  rootMidi?: number;
  pitchStable?: boolean;
}

export interface XensonarMaterialPlaybackHints {
  normalizeDb?: number;
  preferredGain?: number;
  suggestedStartOffsetMs?: number;
  attackSafeMs?: number;
  maxPolyphonyHint?: number;
  oneShot?: boolean;
  looping?: boolean;
}

export interface XensonarMaterialRenderInfo {
  sourceDevice: string;
  sourceVersion?: string;
  renderMode?: string;
  notes?: string;
  machineRoomId?: string;
  machineRoomRole?: string;
  handoffTarget?: string;
  transitionIntent?: string;
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
}


export interface XensonarMaterialProvenance {
  createdAt?: string;
  author?: string;
  sessionId?: string;
  parentId?: string;
}

export interface XensonarMaterialPackageV1 {
  schemaVersion: 'xensonar-material-v1';
  id: string;
  name: string;
  role: XensonarMaterialRole;
  audio: XensonarMaterialAudioPayload;
  timing: XensonarMaterialTiming;
  guide?: XensonarMaterialGuide;
  pitch?: XensonarMaterialPitch;
  playbackHints?: XensonarMaterialPlaybackHints;
  renderInfo?: XensonarMaterialRenderInfo;
  provenance?: XensonarMaterialProvenance;
}

export type XensonarMaterialManifestV1 = Omit<XensonarMaterialPackageV1, 'audio'> & {
  audio: Omit<XensonarMaterialAudioPayload, 'blob'> & { fileName?: string };
};
