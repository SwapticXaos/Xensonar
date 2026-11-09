export type AudioGraphConnectionSubsystem =
  | 'master'
  | 'recording'
  | 'root-follow'
  | 'material-loop'
  | 'myzel'
  | 'diagnostics'
  | 'effect-send'
  | 'unknown';

export type AudioGraphConnectionLifecycleStatus =
  | 'attempted'
  | 'connected'
  | 'repeat-attempt'
  | 'failed'
  | 'released'
  | 'unknown-after-native-disconnect';

export type AudioGraphConnectionProbeOptions = {
  label: string;
  subsystem?: AudioGraphConnectionSubsystem;
  output?: number;
  input?: number;
};

export type ManagedAudioGraphConnection = {
  key: string;
  label: string;
  subsystem: AudioGraphConnectionSubsystem;
  sourceId: number;
  targetId: number;
  output: number | null;
  input: number | null;
  connectedAtPerfNowMs: number;
  markReleased: (reason?: string) => boolean;
  isKnownActive: () => boolean;
};

export type AudioGraphConnectionProbeResult = {
  attempted: boolean;
  connected: boolean;
  repeatAttempt: boolean;
  knownActive: boolean;
  key: string | null;
  handle: ManagedAudioGraphConnection | null;
};

export type AudioGraphConnectionRegistryLabelSummary = {
  attempts: number;
  connected: number;
  failed: number;
  repeatAttempts: number;
  knownActive: number;
  released: number;
  lastPerfNowMs: number;
};

export type AudioGraphConnectionRegistryRecentEntry = {
  label: string;
  subsystem: AudioGraphConnectionSubsystem;
  perfNowMs: number;
  sourceId: number;
  targetId: number;
  output: number | null;
  input: number | null;
  lifecycleStatus: AudioGraphConnectionLifecycleStatus;
  repeatAttempt: boolean;
  connected: boolean;
  knownActive: boolean;
  releaseReason?: string;
  errorName?: string;
};

export type AudioGraphConnectionRegistryActiveEntry = {
  key: string;
  label: string;
  subsystem: AudioGraphConnectionSubsystem;
  sourceId: number;
  targetId: number;
  output: number | null;
  input: number | null;
  connectedAtPerfNowMs: number;
  lastPerfNowMs: number;
  repeatAttempts: number;
};

export type AudioGraphConnectionRegistrySnapshot = {
  createdAtIso: string;
  attempts: number;
  connected: number;
  failed: number;
  repeatAttempts: number;
  knownActive: number;
  released: number;
  labels: Record<string, AudioGraphConnectionRegistryLabelSummary>;
  activeBySubsystem: Record<AudioGraphConnectionSubsystem, number>;
  active: AudioGraphConnectionRegistryActiveEntry[];
  recent: AudioGraphConnectionRegistryRecentEntry[];
};

type AudioGraphConnectTarget = AudioNode | AudioParam;

type ActiveConnectionRecord = AudioGraphConnectionRegistryActiveEntry;

const nodeIds = new WeakMap<object, number>();
const observedConnectionKeys = new Set<string>();
const activeConnections = new Map<string, ActiveConnectionRecord>();
let nextNodeId = 1;
let attempts = 0;
let connected = 0;
let failed = 0;
let repeatAttempts = 0;
let released = 0;
const createdAtIso = new Date().toISOString();
const labelStats = new Map<string, AudioGraphConnectionRegistryLabelSummary>();
const recent: AudioGraphConnectionRegistryRecentEntry[] = [];

function nowPerfMs() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function getObjectId(value: object) {
  const existing = nodeIds.get(value);
  if (existing) return existing;
  const next = nextNodeId;
  nextNodeId += 1;
  nodeIds.set(value, next);
  return next;
}

function getLabelSummary(label: string) {
  const existing = labelStats.get(label);
  if (existing) return existing;
  const next: AudioGraphConnectionRegistryLabelSummary = {
    attempts: 0,
    connected: 0,
    failed: 0,
    repeatAttempts: 0,
    knownActive: 0,
    released: 0,
    lastPerfNowMs: 0,
  };
  labelStats.set(label, next);
  return next;
}

function buildConnectionKey(sourceId: number, targetId: number, output: number | null, input: number | null) {
  return `${sourceId}->${targetId}:o${output ?? 'default'}:i${input ?? 'default'}`;
}

function rememberRecent(entry: AudioGraphConnectionRegistryRecentEntry, maxEntries = 180) {
  recent.push(entry);
  if (recent.length > maxEntries) recent.splice(0, recent.length - maxEntries);
}

function makeHandle(record: ActiveConnectionRecord): ManagedAudioGraphConnection {
  return {
    key: record.key,
    label: record.label,
    subsystem: record.subsystem,
    sourceId: record.sourceId,
    targetId: record.targetId,
    output: record.output,
    input: record.input,
    connectedAtPerfNowMs: record.connectedAtPerfNowMs,
    markReleased: (reason?: string) => markAudioGraphConnectionReleased(record.key, reason),
    isKnownActive: () => activeConnections.has(record.key),
  };
}

function connectNativeAudioGraphNode(
  source: AudioNode,
  target: AudioGraphConnectTarget,
  output: number | null,
  input: number | null,
) {
  if (input !== null) {
    (source as any).connect(target as any, output ?? 0, input);
  } else if (output !== null) {
    (source as any).connect(target as any, output);
  } else {
    (source as any).connect(target as any);
  }
}

export function probeAudioGraphConnection(
  source: AudioNode | null | undefined,
  target: AudioGraphConnectTarget | null | undefined,
  options: AudioGraphConnectionProbeOptions,
): AudioGraphConnectionProbeResult {
  if (!source || !target) {
    return { attempted: false, connected: false, repeatAttempt: false, knownActive: false, key: null, handle: null };
  }

  const sourceId = getObjectId(source);
  const targetId = getObjectId(target);
  const output = options.output ?? null;
  const input = options.input ?? null;
  const key = buildConnectionKey(sourceId, targetId, output, input);
  const repeatAttempt = observedConnectionKeys.has(key);
  const previouslyActive = activeConnections.has(key);
  observedConnectionKeys.add(key);

  attempts += 1;
  if (repeatAttempt) repeatAttempts += 1;

  const perfNowMs = nowPerfMs();
  const stats = getLabelSummary(options.label);
  stats.attempts += 1;
  stats.repeatAttempts += repeatAttempt ? 1 : 0;
  stats.lastPerfNowMs = perfNowMs;

  try {
    connectNativeAudioGraphNode(source, target, output, input);
    connected += 1;
    stats.connected += 1;

    const existing = activeConnections.get(key);
    const record: ActiveConnectionRecord = existing
      ? {
          ...existing,
          lastPerfNowMs: perfNowMs,
          repeatAttempts: existing.repeatAttempts + (repeatAttempt ? 1 : 0),
        }
      : {
          key,
          label: options.label,
          subsystem: options.subsystem ?? 'unknown',
          sourceId,
          targetId,
          output,
          input,
          connectedAtPerfNowMs: perfNowMs,
          lastPerfNowMs: perfNowMs,
          repeatAttempts: repeatAttempt ? 1 : 0,
        };
    activeConnections.set(key, record);
    if (!previouslyActive) {
      stats.knownActive += 1;
    }

    rememberRecent({
      label: options.label,
      subsystem: options.subsystem ?? 'unknown',
      perfNowMs,
      sourceId,
      targetId,
      output,
      input,
      lifecycleStatus: repeatAttempt ? 'repeat-attempt' : 'connected',
      repeatAttempt,
      connected: true,
      knownActive: true,
    });
    return { attempted: true, connected: true, repeatAttempt, knownActive: true, key, handle: makeHandle(record) };
  } catch (error) {
    failed += 1;
    stats.failed += 1;
    rememberRecent({
      label: options.label,
      subsystem: options.subsystem ?? 'unknown',
      perfNowMs,
      sourceId,
      targetId,
      output,
      input,
      lifecycleStatus: 'failed',
      repeatAttempt,
      connected: false,
      knownActive: activeConnections.has(key),
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    throw error;
  }
}

export function connectAudioGraphNode(
  source: AudioNode | null | undefined,
  target: AudioGraphConnectTarget | null | undefined,
  options: AudioGraphConnectionProbeOptions,
): ManagedAudioGraphConnection | null {
  return probeAudioGraphConnection(source, target, options).handle;
}

export function markAudioGraphConnectionReleased(key: string | null | undefined, reason = 'caller-released') {
  if (!key) return false;
  const record = activeConnections.get(key);
  if (!record) return false;
  activeConnections.delete(key);
  released += 1;
  const perfNowMs = nowPerfMs();
  const stats = getLabelSummary(record.label);
  stats.released += 1;
  stats.lastPerfNowMs = perfNowMs;
  rememberRecent({
    label: record.label,
    subsystem: record.subsystem,
    perfNowMs,
    sourceId: record.sourceId,
    targetId: record.targetId,
    output: record.output,
    input: record.input,
    lifecycleStatus: 'released',
    repeatAttempt: false,
    connected: true,
    knownActive: false,
    releaseReason: reason,
  });
  return true;
}

/** Call after a successful source.disconnect(target); all matching ports were removed. */
export function markAudioGraphDestinationReleased(source: AudioNode, target: AudioNode, reason: string) {
  const sourceId = nodeIds.get(source), targetId = nodeIds.get(target);
  if (sourceId === undefined || targetId === undefined) return;
  for (const [key, record] of activeConnections) {
    if (record.sourceId === sourceId && record.targetId === targetId) markAudioGraphConnectionReleased(key, reason);
  }
}

export function markAudioGraphConnectionNativeDisconnectUnknown(label: string, subsystem: AudioGraphConnectionSubsystem = 'unknown') {
  const perfNowMs = nowPerfMs();
  const stats = getLabelSummary(label);
  stats.lastPerfNowMs = perfNowMs;
  rememberRecent({
    label,
    subsystem,
    perfNowMs,
    sourceId: -1,
    targetId: -1,
    output: null,
    input: null,
    lifecycleStatus: 'unknown-after-native-disconnect',
    repeatAttempt: false,
    connected: false,
    knownActive: false,
  });
}

export function snapshotAudioGraphConnectionRegistry(): AudioGraphConnectionRegistrySnapshot {
  const activeBySubsystem = {
    master: 0,
    recording: 0,
    'root-follow': 0,
    'material-loop': 0,
    myzel: 0,
    diagnostics: 0,
    'effect-send': 0,
    unknown: 0,
  } satisfies Record<AudioGraphConnectionSubsystem, number>;
  const active = Array.from(activeConnections.values());
  const activeByLabel = new Map<string, number>();
  for (const entry of active) {
    activeBySubsystem[entry.subsystem] += 1;
    activeByLabel.set(entry.label, (activeByLabel.get(entry.label) ?? 0) + 1);
  }
  const labels: Record<string, AudioGraphConnectionRegistryLabelSummary> = {};
  for (const [label, stats] of labelStats.entries()) {
    labels[label] = { ...stats, knownActive: activeByLabel.get(label) ?? 0 };
  }
  return {
    createdAtIso,
    attempts,
    connected,
    failed,
    repeatAttempts,
    knownActive: activeConnections.size,
    released,
    labels,
    activeBySubsystem,
    active: active.slice(-80).map((entry) => ({ ...entry })),
    recent: recent.slice(-100),
  };
}

export function resetAudioGraphConnectionRegistryProbe() {
  observedConnectionKeys.clear();
  activeConnections.clear();
  labelStats.clear();
  recent.splice(0, recent.length);
  attempts = 0;
  connected = 0;
  failed = 0;
  repeatAttempts = 0;
  released = 0;
}
