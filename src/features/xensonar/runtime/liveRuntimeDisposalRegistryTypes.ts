export type LiveRuntimeResourceKind =
  | 'timeout'
  | 'interval'
  | 'animation-frame'
  | 'object-url'
  | 'event-listener'
  | 'media-recorder'
  | 'audio-node'
  | 'audio-source'
  | 'audio-graph-connection'
  | 'preview-audio'
  | 'source-asset'
  | 'cache'
  | 'unknown';

export type LiveRuntimeResourceSubsystem =
  | 'recording'
  | 'material-track'
  | 'root-follow'
  | 'quantized-traffic'
  | 'burst-diagnostics'
  | 'spectral-forge'
  | 'workspace-package'
  | 'master-bus'
  | 'wellenstarter'
  | 'audio-graph'
  | 'unknown';

export type LiveRuntimeResourceStatus =
  | 'registered'
  | 'active'
  | 'released'
  | 'replaced'
  | 'unknown'
  | 'failed';

export type LiveRuntimeResourceRegistration = {
  id?: string;
  kind: LiveRuntimeResourceKind;
  subsystem: LiveRuntimeResourceSubsystem;
  label: string;
  owner?: string;
  meta?: Record<string, string | number | boolean | null | undefined>;
};

export type LiveRuntimeResourceHandle = {
  id: string;
  kind: LiveRuntimeResourceKind;
  subsystem: LiveRuntimeResourceSubsystem;
  label: string;
  markReleased: (reason?: string) => boolean;
  markUnknown: (reason?: string) => boolean;
  isActive: () => boolean;
};

export type LiveRuntimeResourceSnapshotEntry = {
  id: string;
  kind: LiveRuntimeResourceKind;
  subsystem: LiveRuntimeResourceSubsystem;
  label: string;
  owner: string;
  status: LiveRuntimeResourceStatus;
  createdAtPerfNowMs: number;
  lastPerfNowMs: number;
  releasedAtPerfNowMs: number | null;
  releaseReason?: string;
  meta?: Record<string, string | number | boolean | null | undefined>;
};

export type LiveRuntimeResourceSummary = {
  registered: number;
  active: number;
  released: number;
  replaced: number;
  unknown: number;
  failed: number;
  lastPerfNowMs: number;
};

export type LiveRuntimeDisposalRegistrySnapshot = {
  createdAtIso: string;
  registered: number;
  active: number;
  released: number;
  replaced: number;
  unknown: number;
  failed: number;
  bySubsystem: Record<LiveRuntimeResourceSubsystem, number>;
  byKind: Record<LiveRuntimeResourceKind, number>;
  labels: Record<string, LiveRuntimeResourceSummary>;
  activeResources: LiveRuntimeResourceSnapshotEntry[];
  recent: LiveRuntimeResourceSnapshotEntry[];
};

