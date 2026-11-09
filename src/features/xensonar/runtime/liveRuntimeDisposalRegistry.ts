import type {
  LiveRuntimeResourceKind,
  LiveRuntimeResourceSubsystem,
  LiveRuntimeResourceStatus,
  LiveRuntimeResourceRegistration,
  LiveRuntimeResourceHandle,
  LiveRuntimeResourceSnapshotEntry,
  LiveRuntimeResourceSummary,
  LiveRuntimeDisposalRegistrySnapshot,
} from './liveRuntimeDisposalRegistryTypes';

export type * from './liveRuntimeDisposalRegistryTypes';

type LiveRuntimeResourceRecord = LiveRuntimeResourceSnapshotEntry;

const createdAtIso = new Date().toISOString();
const activeResources = new Map<string, LiveRuntimeResourceRecord>();
const labelSummaries = new Map<string, LiveRuntimeResourceSummary>();
const recent: LiveRuntimeResourceRecord[] = [];
let nextResourceId = 1;
let registered = 0;
let released = 0;
let replaced = 0;
let unknown = 0;
let failed = 0;

function nowPerfMs() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function makeId(args: LiveRuntimeResourceRegistration) {
  if (args.id?.trim()) return args.id.trim();
  const next = nextResourceId;
  nextResourceId += 1;
  return `${args.subsystem}:${args.kind}:${args.label}:${next}`;
}

function cloneMeta(meta: LiveRuntimeResourceRegistration['meta']) {
  if (!meta) return undefined;
  return { ...meta };
}

function rememberRecent(record: LiveRuntimeResourceRecord, maxEntries = 220) {
  recent.push({ ...record, meta: record.meta ? { ...record.meta } : undefined });
  if (recent.length > maxEntries) recent.splice(0, recent.length - maxEntries);
}

function getLabelSummary(label: string) {
  const existing = labelSummaries.get(label);
  if (existing) return existing;
  const next: LiveRuntimeResourceSummary = {
    registered: 0,
    active: 0,
    released: 0,
    replaced: 0,
    unknown: 0,
    failed: 0,
    lastPerfNowMs: 0,
  };
  labelSummaries.set(label, next);
  return next;
}

function noteStatus(label: string, status: LiveRuntimeResourceStatus, perfNowMs: number) {
  const summary = getLabelSummary(label);
  if (status === 'registered' || status === 'active') summary.registered += 1;
  if (status === 'released') summary.released += 1;
  if (status === 'replaced') summary.replaced += 1;
  if (status === 'unknown') summary.unknown += 1;
  if (status === 'failed') summary.failed += 1;
  summary.lastPerfNowMs = perfNowMs;
}

function buildHandle(record: LiveRuntimeResourceRecord): LiveRuntimeResourceHandle {
  return {
    id: record.id,
    kind: record.kind,
    subsystem: record.subsystem,
    label: record.label,
    markReleased: (reason?: string) => markLiveRuntimeResourceReleased(record.id, reason),
    markUnknown: (reason?: string) => markLiveRuntimeResourceUnknown(record.id, reason),
    isActive: () => activeResources.has(record.id),
  };
}

export function registerLiveRuntimeResource(args: LiveRuntimeResourceRegistration): LiveRuntimeResourceHandle {
  const perfNowMs = nowPerfMs();
  const id = makeId(args);
  const owner = args.owner?.trim() || 'unknown';
  const existing = activeResources.get(id);
  if (existing) {
    const replacedRecord: LiveRuntimeResourceRecord = {
      ...existing,
      status: 'replaced',
      lastPerfNowMs: perfNowMs,
      releasedAtPerfNowMs: perfNowMs,
      releaseReason: 'replaced-by-new-registration',
    };
    activeResources.delete(id);
    replaced += 1;
    noteStatus(existing.label, 'replaced', perfNowMs);
    rememberRecent(replacedRecord);
  }

  const record: LiveRuntimeResourceRecord = {
    id,
    kind: args.kind,
    subsystem: args.subsystem,
    label: args.label,
    owner,
    status: 'active',
    createdAtPerfNowMs: perfNowMs,
    lastPerfNowMs: perfNowMs,
    releasedAtPerfNowMs: null,
    meta: cloneMeta(args.meta),
  };
  activeResources.set(id, record);
  registered += 1;
  noteStatus(args.label, 'registered', perfNowMs);
  rememberRecent(record);
  return buildHandle(record);
}

export function markLiveRuntimeResourceReleased(id: string | null | undefined, reason = 'caller-released') {
  if (!id) return false;
  const record = activeResources.get(id);
  if (!record) return false;
  const perfNowMs = nowPerfMs();
  activeResources.delete(id);
  released += 1;
  const releasedRecord: LiveRuntimeResourceRecord = {
    ...record,
    status: 'released',
    lastPerfNowMs: perfNowMs,
    releasedAtPerfNowMs: perfNowMs,
    releaseReason: reason,
  };
  noteStatus(record.label, 'released', perfNowMs);
  rememberRecent(releasedRecord);
  return true;
}

export function markLiveRuntimeResourceUnknown(id: string | null | undefined, reason = 'unknown-native-or-external-release') {
  if (!id) return false;
  const record = activeResources.get(id);
  if (!record) return false;
  const perfNowMs = nowPerfMs();
  activeResources.delete(id);
  unknown += 1;
  const unknownRecord: LiveRuntimeResourceRecord = {
    ...record,
    status: 'unknown',
    lastPerfNowMs: perfNowMs,
    releasedAtPerfNowMs: perfNowMs,
    releaseReason: reason,
  };
  noteStatus(record.label, 'unknown', perfNowMs);
  rememberRecent(unknownRecord);
  return true;
}

export function markLiveRuntimeResourceFailed(args: {
  id?: string;
  kind: LiveRuntimeResourceKind;
  subsystem: LiveRuntimeResourceSubsystem;
  label: string;
  owner?: string;
  reason?: string;
}) {
  const perfNowMs = nowPerfMs();
  const record: LiveRuntimeResourceRecord = {
    id: args.id ?? `${args.subsystem}:${args.kind}:${args.label}:failed:${perfNowMs}`,
    kind: args.kind,
    subsystem: args.subsystem,
    label: args.label,
    owner: args.owner ?? 'unknown',
    status: 'failed',
    createdAtPerfNowMs: perfNowMs,
    lastPerfNowMs: perfNowMs,
    releasedAtPerfNowMs: perfNowMs,
    releaseReason: args.reason ?? 'registration-or-runtime-failed',
  };
  failed += 1;
  noteStatus(record.label, 'failed', perfNowMs);
  rememberRecent(record);
}

export function snapshotLiveRuntimeDisposalRegistry(): LiveRuntimeDisposalRegistrySnapshot {
  const bySubsystem = {
    recording: 0,
    'material-track': 0,
    'root-follow': 0,
    'quantized-traffic': 0,
    'burst-diagnostics': 0,
    'spectral-forge': 0,
    'workspace-package': 0,
    'master-bus': 0,
    wellenstarter: 0,
    'audio-graph': 0,
    unknown: 0,
  } satisfies Record<LiveRuntimeResourceSubsystem, number>;
  const byKind = {
    timeout: 0,
    interval: 0,
    'animation-frame': 0,
    'object-url': 0,
    'event-listener': 0,
    'media-recorder': 0,
    'audio-node': 0,
    'audio-source': 0,
    'audio-graph-connection': 0,
    'preview-audio': 0,
    'source-asset': 0,
    cache: 0,
    unknown: 0,
  } satisfies Record<LiveRuntimeResourceKind, number>;
  const active = Array.from(activeResources.values());
  for (const record of active) {
    bySubsystem[record.subsystem] += 1;
    byKind[record.kind] += 1;
  }
  const activeByLabel = new Map<string, number>();
  for (const record of active) activeByLabel.set(record.label, (activeByLabel.get(record.label) ?? 0) + 1);
  const labels: Record<string, LiveRuntimeResourceSummary> = {};
  for (const [label, summary] of labelSummaries.entries()) {
    labels[label] = { ...summary, active: activeByLabel.get(label) ?? 0 };
  }
  return {
    createdAtIso,
    registered,
    active: active.length,
    released,
    replaced,
    unknown,
    failed,
    bySubsystem,
    byKind,
    labels,
    activeResources: active.slice(-120).map((record) => ({ ...record, meta: record.meta ? { ...record.meta } : undefined })),
    recent: recent.slice(-140).map((record) => ({ ...record, meta: record.meta ? { ...record.meta } : undefined })),
  };
}

export function resetLiveRuntimeDisposalRegistryForTests() {
  activeResources.clear();
  labelSummaries.clear();
  recent.splice(0, recent.length);
  nextResourceId = 1;
  registered = 0;
  released = 0;
  replaced = 0;
  unknown = 0;
  failed = 0;
}
