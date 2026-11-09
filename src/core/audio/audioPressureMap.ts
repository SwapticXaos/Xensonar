export type AudioPressureSource =
  | 'root-follow-material-grain'
  | 'root-follow-sample-grain'
  | 'resident-elastic-grain'
  | 'particle-synth-tone'
  | 'particle-sample-tone'
  | 'resident-synth-tone'
  | 'resident-sample-tone'
  | 'room3-body-exciter'
  | 'scheduled-tone-oscillator'
  | 'noise-accent-buffer'
  | 'unknown';

export type AudioPressureEventKind =
  | 'buffer-source-start'
  | 'oscillator-start'
  | 'gain-node-create'
  | 'filter-node-create'
  | 'voice-admitted'
  | 'voice-deferred'
  | 'voice-rejected'
  | 'async-sample-late-start'
  | 'late-grain-dropped'
  | 'gate-open'
  | 'gate-close'
  | 'cleanup';

export type AudioPressureAdaptiveAction =
  | 'flush-reduced-to-5'
  | 'flush-reduced-to-4'
  | 'resident-reduced-to-1'
  | 'overflow-deferred'
  | 'transient-reduced-event'
  | 'transient-dropped-voice'
  | 'transient-send-gated'
  | 'root-follow-late-slice-resync'
  | 'keyboard-input-gliss-coalesced'
  | 'keyboard-input-wave-preview-suppressed'
  | 'keyboard-input-gliss-soft-attack'
  | 'keyboard-input-gliss-body-preserved'
  | 'keyboard-input-global-lane-protected'
  | 'keyboard-input-hold-repeat-coalesced'
  | 'root-follow-input-rate-limited'
  | 'root-follow-input-freeze-last-valid'
  | 'keyboard-input-audio-ready-latched'
  | 'wave-starter-lane-admitted'
  | 'wave-starter-lane-essential'
  | 'wave-starter-lane-rejected'
  | 'wave-starter-lane-space-routed'
  | 'wave-starter-lane-deferred'
  | 'wave-starter-lane-flushed'
  | 'wave-starter-lane-micro-released'
  | 'wave-starter-lane-stale-dropped'
  | 'stable-rhythm-shadow-plan-built'
  | 'stable-rhythm-shadow-plan-empty'
  | 'stable-rhythm-shadow-plan-fault'
  | 'stationary-stale-dropped'
  | 'stable-rhythm-prefill-resynced'
  | 'stable-rhythm-prefill-capped'
  | 'stable-rhythm-beat-protection-armed'
  | 'stable-rhythm-protected-prefill-window'
  | 'stable-rhythm-wellenstarter-pulse-throttled-for-beat'
  | 'safe-envelope-stale-dropped'
  | 'safe-envelope-catchup-ramped'
  | 'safe-envelope-anchored';

export type DominantAudioPressureSource =
  | 'root-follow-material-grains'
  | 'root-follow-sample-grains'
  | 'resident-elastic-grains'
  | 'scheduled-oscillators'
  | 'particle-resident-admission'
  | 'body-exciter'
  | 'async-sample-loading'
  | 'mixed'
  | 'quiet';

export type AudioPressureSnapshot = {
  windowMs: number;
  bucketMs: number;
  pressureScore: number;
  dominantSource: DominantAudioPressureSource;
  bufferSourcesStartedPerSecond: number;
  oscillatorsStartedPerSecond: number;
  gainNodesCreatedPerSecond: number;
  filterNodesCreatedPerSecond: number;
  voiceAdmittedPerSecond: number;
  voiceDeferredPerSecond: number;
  voiceRejectedPerSecond: number;
  asyncSampleLateStartsPerSecond: number;
  lateGrainsDroppedPerSecond: number;
  rootFollowMaterialGrainsPerSecond: number;
  rootFollowSampleGrainsPerSecond: number;
  residentElasticGrainsPerSecond: number;
  particleSynthVoicesPerSecond: number;
  particleSampleVoicesPerSecond: number;
  residentSynthVoicesPerSecond: number;
  residentSampleVoicesPerSecond: number;
  room3BodyExciterVoicesPerSecond: number;
  scheduledToneOscillatorsPerSecond: number;
  noiseAccentBuffersPerSecond: number;
  bySource: Partial<Record<AudioPressureSource, number>>;
  byKind: Partial<Record<AudioPressureEventKind, number>>;
};

export type AudioPressureHighWaterMarks = {
  sincePerfMs: number;
  updatedAtPerfMs: number | null;
  peakPressureScore: number;
  peakBufferSourcesStartedPerSecond: number;
  peakOscillatorsStartedPerSecond: number;
  peakRootFollowMaterialGrainsPerSecond: number;
  peakRootFollowSampleGrainsPerSecond: number;
  peakResidentElasticGrainsPerSecond: number;
  peakScheduledToneOscillatorsPerSecond: number;
  peakVoiceDeferredPerSecond: number;
  peakVoiceRejectedPerSecond: number;
  peakAsyncSampleLateStartsPerSecond: number;
  peakLateGrainsDroppedPerSecond: number;
  peakDominantSource: DominantAudioPressureSource;
};

export type AudioPressureAdaptiveActionCounters = Record<AudioPressureAdaptiveAction, number>;

export type AudioPressureWitnessSnapshot = {
  snapshot750ms: AudioPressureSnapshot;
  snapshot2000ms: AudioPressureSnapshot;
  snapshot6000ms: AudioPressureSnapshot;
  highWaterMarks: AudioPressureHighWaterMarks;
  adaptiveActions: AudioPressureAdaptiveActionCounters;
  calibration: {
    pressureBias: number;
    dominantSource: DominantAudioPressureSource;
    rootFollowGrainPressure: number;
    residentElasticPressure: number;
    oscillatorPressure: number;
    admissionPressure: number;
    sampleLatePressure: number;
  };
  notes: string[];
};

type Bucket = {
  startMs: number;
  bySource: Record<AudioPressureSource, number>;
  byKind: Record<AudioPressureEventKind, number>;
  actions: Record<AudioPressureAdaptiveAction, number>;
};

const SOURCES: AudioPressureSource[] = [
  'root-follow-material-grain',
  'root-follow-sample-grain',
  'resident-elastic-grain',
  'particle-synth-tone',
  'particle-sample-tone',
  'resident-synth-tone',
  'resident-sample-tone',
  'room3-body-exciter',
  'scheduled-tone-oscillator',
  'noise-accent-buffer',
  'unknown',
];

const KINDS: AudioPressureEventKind[] = [
  'buffer-source-start',
  'oscillator-start',
  'gain-node-create',
  'filter-node-create',
  'voice-admitted',
  'voice-deferred',
  'voice-rejected',
  'async-sample-late-start',
  'late-grain-dropped',
  'gate-open',
  'gate-close',
  'cleanup',
];

const ACTIONS: AudioPressureAdaptiveAction[] = [
  'flush-reduced-to-5',
  'flush-reduced-to-4',
  'resident-reduced-to-1',
  'overflow-deferred',
  'transient-reduced-event',
  'transient-dropped-voice',
  'transient-send-gated',
  'root-follow-late-slice-resync',
  'keyboard-input-gliss-coalesced',
  'keyboard-input-wave-preview-suppressed',
  'keyboard-input-gliss-soft-attack',
  'keyboard-input-gliss-body-preserved',
  'keyboard-input-global-lane-protected',
  'keyboard-input-hold-repeat-coalesced',
  'keyboard-input-audio-ready-latched',
  'wave-starter-lane-admitted',
  'wave-starter-lane-essential',
  'wave-starter-lane-rejected',
  'wave-starter-lane-space-routed',
  'wave-starter-lane-deferred',
  'wave-starter-lane-flushed',
  'wave-starter-lane-micro-released',
  'wave-starter-lane-stale-dropped',
  'stable-rhythm-shadow-plan-built',
  'stable-rhythm-shadow-plan-empty',
  'stable-rhythm-shadow-plan-fault',
  'stationary-stale-dropped',
  'stable-rhythm-prefill-resynced',
  'stable-rhythm-prefill-capped',
  'stable-rhythm-beat-protection-armed',
  'stable-rhythm-protected-prefill-window',
  'stable-rhythm-wellenstarter-pulse-throttled-for-beat',
  'safe-envelope-stale-dropped',
  'safe-envelope-catchup-ramped',
  'safe-envelope-anchored',
];

const DEFAULT_BUCKET_MS = 250;
const BUCKET_COUNT = 24;

function nowPerfMs() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function emptySourceRecord(): Record<AudioPressureSource, number> {
  return {
    'root-follow-material-grain': 0,
    'root-follow-sample-grain': 0,
    'resident-elastic-grain': 0,
    'particle-synth-tone': 0,
    'particle-sample-tone': 0,
    'resident-synth-tone': 0,
    'resident-sample-tone': 0,
    'room3-body-exciter': 0,
    'scheduled-tone-oscillator': 0,
    'noise-accent-buffer': 0,
    unknown: 0,
  };
}

function emptyKindRecord(): Record<AudioPressureEventKind, number> {
  return {
    'buffer-source-start': 0,
    'oscillator-start': 0,
    'gain-node-create': 0,
    'filter-node-create': 0,
    'voice-admitted': 0,
    'voice-deferred': 0,
    'voice-rejected': 0,
    'async-sample-late-start': 0,
    'late-grain-dropped': 0,
    'gate-open': 0,
    'gate-close': 0,
    cleanup: 0,
  };
}

function emptyActionRecord(): AudioPressureAdaptiveActionCounters {
  return {
    'flush-reduced-to-5': 0,
    'flush-reduced-to-4': 0,
    'resident-reduced-to-1': 0,
    'overflow-deferred': 0,
    'transient-reduced-event': 0,
    'transient-dropped-voice': 0,
    'transient-send-gated': 0,
    'root-follow-late-slice-resync': 0,
    'keyboard-input-gliss-coalesced': 0,
    'keyboard-input-wave-preview-suppressed': 0,
    'keyboard-input-gliss-soft-attack': 0,
    'keyboard-input-gliss-body-preserved': 0,
    'keyboard-input-global-lane-protected': 0,
    'keyboard-input-hold-repeat-coalesced': 0,
    'root-follow-input-rate-limited': 0,
    'root-follow-input-freeze-last-valid': 0,
    'keyboard-input-audio-ready-latched': 0,
    'wave-starter-lane-admitted': 0,
    'wave-starter-lane-essential': 0,
    'wave-starter-lane-rejected': 0,
    'wave-starter-lane-space-routed': 0,
    'wave-starter-lane-deferred': 0,
    'wave-starter-lane-flushed': 0,
    'wave-starter-lane-micro-released': 0,
    'wave-starter-lane-stale-dropped': 0,
    'stable-rhythm-shadow-plan-built': 0,
    'stable-rhythm-shadow-plan-empty': 0,
    'stable-rhythm-shadow-plan-fault': 0,
    'stationary-stale-dropped': 0,
    'stable-rhythm-prefill-resynced': 0,
    'stable-rhythm-prefill-capped': 0,
    'stable-rhythm-beat-protection-armed': 0,
    'stable-rhythm-protected-prefill-window': 0,
    'stable-rhythm-wellenstarter-pulse-throttled-for-beat': 0,
    'safe-envelope-stale-dropped': 0,
    'safe-envelope-catchup-ramped': 0,
    'safe-envelope-anchored': 0,
  };
}

function makeHighWaterMarks(sincePerfMs = nowPerfMs()): AudioPressureHighWaterMarks {
  return {
    sincePerfMs,
    updatedAtPerfMs: null,
    peakPressureScore: 0,
    peakBufferSourcesStartedPerSecond: 0,
    peakOscillatorsStartedPerSecond: 0,
    peakRootFollowMaterialGrainsPerSecond: 0,
    peakRootFollowSampleGrainsPerSecond: 0,
    peakResidentElasticGrainsPerSecond: 0,
    peakScheduledToneOscillatorsPerSecond: 0,
    peakVoiceDeferredPerSecond: 0,
    peakVoiceRejectedPerSecond: 0,
    peakAsyncSampleLateStartsPerSecond: 0,
    peakLateGrainsDroppedPerSecond: 0,
    peakDominantSource: 'quiet',
  };
}

function makeBucket(startMs = Number.NEGATIVE_INFINITY): Bucket {
  return {
    startMs,
    bySource: emptySourceRecord(),
    byKind: emptyKindRecord(),
    actions: emptyActionRecord(),
  };
}

const buckets: Bucket[] = Array.from({ length: BUCKET_COUNT }, () => makeBucket());
let lastBucketStartMs = Number.NEGATIVE_INFINITY;
let highWaterMarks: AudioPressureHighWaterMarks = makeHighWaterMarks();
let adaptiveActionTotals: AudioPressureAdaptiveActionCounters = emptyActionRecord();

function classifyDominantSource(snapshotLike: Pick<AudioPressureSnapshot,
  | 'rootFollowMaterialGrainsPerSecond'
  | 'rootFollowSampleGrainsPerSecond'
  | 'residentElasticGrainsPerSecond'
  | 'scheduledToneOscillatorsPerSecond'
  | 'particleSynthVoicesPerSecond'
  | 'residentSynthVoicesPerSecond'
  | 'room3BodyExciterVoicesPerSecond'
  | 'asyncSampleLateStartsPerSecond'
  | 'lateGrainsDroppedPerSecond'
  | 'voiceDeferredPerSecond'
  | 'voiceRejectedPerSecond'
>): DominantAudioPressureSource {
  const candidates: Array<[DominantAudioPressureSource, number]> = [
    ['root-follow-material-grains', Math.max(snapshotLike.rootFollowMaterialGrainsPerSecond / 520, snapshotLike.lateGrainsDroppedPerSecond / 72)],
    ['root-follow-sample-grains', snapshotLike.rootFollowSampleGrainsPerSecond / 420],
    ['resident-elastic-grains', snapshotLike.residentElasticGrainsPerSecond / 360],
    ['scheduled-oscillators', snapshotLike.scheduledToneOscillatorsPerSecond / 96],
    ['particle-resident-admission', (snapshotLike.particleSynthVoicesPerSecond + snapshotLike.residentSynthVoicesPerSecond + snapshotLike.voiceDeferredPerSecond * 0.7 + snapshotLike.voiceRejectedPerSecond) / 72],
    ['body-exciter', snapshotLike.room3BodyExciterVoicesPerSecond / 48],
    ['async-sample-loading', snapshotLike.asyncSampleLateStartsPerSecond / 8],
  ];
  const sorted = candidates.sort((a, b) => b[1] - a[1]);
  const [dominant, score] = sorted[0] ?? ['quiet', 0];
  const second = sorted[1]?.[1] ?? 0;
  if (score < 0.12) return 'quiet';
  if (second > 0.75 * score && second > 0.16) return 'mixed';
  return dominant;
}

function updateHighWaterMarks(snapshot: AudioPressureSnapshot) {
  const perfNowMs = nowPerfMs();
  const previousPeak = highWaterMarks.peakPressureScore;
  highWaterMarks.peakPressureScore = Math.max(highWaterMarks.peakPressureScore, snapshot.pressureScore);
  highWaterMarks.peakBufferSourcesStartedPerSecond = Math.max(highWaterMarks.peakBufferSourcesStartedPerSecond, snapshot.bufferSourcesStartedPerSecond);
  highWaterMarks.peakOscillatorsStartedPerSecond = Math.max(highWaterMarks.peakOscillatorsStartedPerSecond, snapshot.oscillatorsStartedPerSecond);
  highWaterMarks.peakRootFollowMaterialGrainsPerSecond = Math.max(highWaterMarks.peakRootFollowMaterialGrainsPerSecond, snapshot.rootFollowMaterialGrainsPerSecond);
  highWaterMarks.peakRootFollowSampleGrainsPerSecond = Math.max(highWaterMarks.peakRootFollowSampleGrainsPerSecond, snapshot.rootFollowSampleGrainsPerSecond);
  highWaterMarks.peakResidentElasticGrainsPerSecond = Math.max(highWaterMarks.peakResidentElasticGrainsPerSecond, snapshot.residentElasticGrainsPerSecond);
  highWaterMarks.peakScheduledToneOscillatorsPerSecond = Math.max(highWaterMarks.peakScheduledToneOscillatorsPerSecond, snapshot.scheduledToneOscillatorsPerSecond);
  highWaterMarks.peakVoiceDeferredPerSecond = Math.max(highWaterMarks.peakVoiceDeferredPerSecond, snapshot.voiceDeferredPerSecond);
  highWaterMarks.peakVoiceRejectedPerSecond = Math.max(highWaterMarks.peakVoiceRejectedPerSecond, snapshot.voiceRejectedPerSecond);
  highWaterMarks.peakAsyncSampleLateStartsPerSecond = Math.max(highWaterMarks.peakAsyncSampleLateStartsPerSecond, snapshot.asyncSampleLateStartsPerSecond);
  highWaterMarks.peakLateGrainsDroppedPerSecond = Math.max(highWaterMarks.peakLateGrainsDroppedPerSecond, snapshot.lateGrainsDroppedPerSecond);
  if (snapshot.pressureScore >= previousPeak) highWaterMarks.peakDominantSource = snapshot.dominantSource;
  highWaterMarks.updatedAtPerfMs = perfNowMs;
}

function resetBucket(bucket: Bucket, startMs: number) {
  if (Number.isFinite(bucket.startMs)) {
    const frozen = makeSnapshotFromRecords(bucket.bySource, bucket.byKind, DEFAULT_BUCKET_MS, false);
    updateHighWaterMarks(frozen);
  }
  bucket.startMs = startMs;
  for (const source of SOURCES) bucket.bySource[source] = 0;
  for (const kind of KINDS) bucket.byKind[kind] = 0;
  for (const action of ACTIONS) bucket.actions[action] = 0;
}

function bucketStartFor(perfNowMs: number, bucketMs = DEFAULT_BUCKET_MS) {
  return Math.floor(perfNowMs / bucketMs) * bucketMs;
}

function getWritableBucket(perfNowMs: number): Bucket {
  const startMs = bucketStartFor(perfNowMs);
  const index = Math.floor(startMs / DEFAULT_BUCKET_MS) % BUCKET_COUNT;
  const bucket = buckets[index];
  if (bucket.startMs !== startMs) resetBucket(bucket, startMs);
  lastBucketStartMs = Math.max(lastBucketStartMs, startMs);
  return bucket;
}

export function recordAudioPressureCount(
  source: AudioPressureSource,
  kind: AudioPressureEventKind,
  count = 1,
) {
  if (!Number.isFinite(count) || count <= 0) return;
  const safeCount = Math.min(10000, Math.max(0, count));
  const bucket = getWritableBucket(nowPerfMs());
  bucket.bySource[source] = (bucket.bySource[source] ?? 0) + safeCount;
  bucket.byKind[kind] = (bucket.byKind[kind] ?? 0) + safeCount;
}

export function recordAudioPressureAdaptiveAction(action: AudioPressureAdaptiveAction, count = 1) {
  if (!Number.isFinite(count) || count <= 0) return;
  const safeCount = Math.min(10000, Math.max(0, count));
  const bucket = getWritableBucket(nowPerfMs());
  bucket.actions[action] = (bucket.actions[action] ?? 0) + safeCount;
  adaptiveActionTotals[action] = (adaptiveActionTotals[action] ?? 0) + safeCount;
}

function partialNonZero<K extends string>(input: Record<K, number>): Partial<Record<K, number>> {
  const out: Partial<Record<K, number>> = {};
  Object.entries(input).forEach(([key, value]) => {
    if (typeof value === 'number' && value > 0) {
      out[key as K] = value;
    }
  });
  return out;
}

function rate(count: number, seconds: number) {
  return seconds > 0 ? count / seconds : 0;
}

function makeSnapshotFromRecords(
  bySource: Record<AudioPressureSource, number>,
  byKind: Record<AudioPressureEventKind, number>,
  windowMs: number,
  exposePartialRecords: boolean,
): AudioPressureSnapshot {
  const seconds = windowMs / 1000;
  const rootFollowMaterialGrainsPerSecond = rate(bySource['root-follow-material-grain'], seconds);
  const rootFollowSampleGrainsPerSecond = rate(bySource['root-follow-sample-grain'], seconds);
  const residentElasticGrainsPerSecond = rate(bySource['resident-elastic-grain'], seconds);
  const particleSynthVoicesPerSecond = rate(bySource['particle-synth-tone'], seconds);
  const particleSampleVoicesPerSecond = rate(bySource['particle-sample-tone'], seconds);
  const residentSynthVoicesPerSecond = rate(bySource['resident-synth-tone'], seconds);
  const residentSampleVoicesPerSecond = rate(bySource['resident-sample-tone'], seconds);
  const room3BodyExciterVoicesPerSecond = rate(bySource['room3-body-exciter'], seconds);
  const scheduledToneOscillatorsPerSecond = rate(bySource['scheduled-tone-oscillator'], seconds);
  const noiseAccentBuffersPerSecond = rate(bySource['noise-accent-buffer'], seconds);
  const bufferSourcesStartedPerSecond = rate(byKind['buffer-source-start'], seconds);
  const oscillatorsStartedPerSecond = rate(byKind['oscillator-start'], seconds);
  const gainNodesCreatedPerSecond = rate(byKind['gain-node-create'], seconds);
  const filterNodesCreatedPerSecond = rate(byKind['filter-node-create'], seconds);
  const voiceAdmittedPerSecond = rate(byKind['voice-admitted'], seconds);
  const voiceDeferredPerSecond = rate(byKind['voice-deferred'], seconds);
  const voiceRejectedPerSecond = rate(byKind['voice-rejected'], seconds);
  const asyncSampleLateStartsPerSecond = rate(byKind['async-sample-late-start'], seconds);
  const lateGrainsDroppedPerSecond = rate(byKind['late-grain-dropped'], seconds);
  const pressureScore = Math.round(
    bufferSourcesStartedPerSecond * 0.42
    + oscillatorsStartedPerSecond * 0.34
    + room3BodyExciterVoicesPerSecond * 0.22
    + voiceDeferredPerSecond * 0.18
    + asyncSampleLateStartsPerSecond * 0.28
    + lateGrainsDroppedPerSecond * 0.18,
  );
  const dominantSource = classifyDominantSource({
    rootFollowMaterialGrainsPerSecond,
    rootFollowSampleGrainsPerSecond,
    residentElasticGrainsPerSecond,
    scheduledToneOscillatorsPerSecond,
    particleSynthVoicesPerSecond,
    residentSynthVoicesPerSecond,
    room3BodyExciterVoicesPerSecond,
    asyncSampleLateStartsPerSecond,
    lateGrainsDroppedPerSecond,
    voiceDeferredPerSecond,
    voiceRejectedPerSecond,
  });

  return {
    windowMs,
    bucketMs: DEFAULT_BUCKET_MS,
    pressureScore,
    dominantSource,
    bufferSourcesStartedPerSecond,
    oscillatorsStartedPerSecond,
    gainNodesCreatedPerSecond,
    filterNodesCreatedPerSecond,
    voiceAdmittedPerSecond,
    voiceDeferredPerSecond,
    voiceRejectedPerSecond,
    asyncSampleLateStartsPerSecond,
    lateGrainsDroppedPerSecond,
    rootFollowMaterialGrainsPerSecond,
    rootFollowSampleGrainsPerSecond,
    residentElasticGrainsPerSecond,
    particleSynthVoicesPerSecond,
    particleSampleVoicesPerSecond,
    residentSynthVoicesPerSecond,
    residentSampleVoicesPerSecond,
    room3BodyExciterVoicesPerSecond,
    scheduledToneOscillatorsPerSecond,
    noiseAccentBuffersPerSecond,
    bySource: exposePartialRecords ? partialNonZero(bySource) : {},
    byKind: exposePartialRecords ? partialNonZero(byKind) : {},
  };
}

export function snapshotAudioPressureMap(windowMs = 1000): AudioPressureSnapshot {
  const safeWindowMs = Math.max(DEFAULT_BUCKET_MS, Math.min(6000, windowMs));
  const perfNowMs = nowPerfMs();
  const minStartMs = perfNowMs - safeWindowMs;
  const bySource = emptySourceRecord();
  const byKind = emptyKindRecord();

  for (const bucket of buckets) {
    if (!Number.isFinite(bucket.startMs) || bucket.startMs < minStartMs) continue;
    for (const source of SOURCES) bySource[source] += bucket.bySource[source] ?? 0;
    for (const kind of KINDS) byKind[kind] += bucket.byKind[kind] ?? 0;
  }

  const snapshot = makeSnapshotFromRecords(bySource, byKind, safeWindowMs, true);
  updateHighWaterMarks(snapshot);
  return snapshot;
}

export function resolveAudioPressureBiasFromSnapshot(snapshot: AudioPressureSnapshot) {
  const rootFollowGrainPressure = Math.max(
    snapshot.rootFollowMaterialGrainsPerSecond / 520,
    snapshot.rootFollowSampleGrainsPerSecond / 420,
  );
  const residentElasticPressure = snapshot.residentElasticGrainsPerSecond / 360;
  const granularPressure = Math.max(rootFollowGrainPressure, residentElasticPressure);
  const oscillatorPressure = (snapshot.scheduledToneOscillatorsPerSecond + snapshot.noiseAccentBuffersPerSecond * 1.15) / 125;
  const admissionPressure = (snapshot.voiceDeferredPerSecond * 0.7 + snapshot.voiceRejectedPerSecond * 0.9) / 125;
  const sampleLatePressure = snapshot.asyncSampleLateStartsPerSecond / 18;
  const clamp01 = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const pressureBias = clamp01(Math.max(
    oscillatorPressure + admissionPressure,
    granularPressure * 0.34 + (oscillatorPressure + admissionPressure) * 0.72,
    sampleLatePressure * 0.7 + (oscillatorPressure + admissionPressure) * 0.4,
  ));
  return {
    pressureBias,
    dominantSource: snapshot.dominantSource,
    rootFollowGrainPressure: clamp01(rootFollowGrainPressure),
    residentElasticPressure: clamp01(residentElasticPressure),
    oscillatorPressure: clamp01(oscillatorPressure),
    admissionPressure: clamp01(admissionPressure),
    sampleLatePressure: clamp01(sampleLatePressure),
  };
}

export function getAudioPressureHighWaterMarks(): AudioPressureHighWaterMarks {
  return { ...highWaterMarks };
}

export function getAudioPressureAdaptiveActionCounters(): AudioPressureAdaptiveActionCounters {
  return { ...adaptiveActionTotals };
}

export function resetAudioPressureMap() {
  for (const bucket of buckets) resetBucket(bucket, Number.NEGATIVE_INFINITY);
  lastBucketStartMs = Number.NEGATIVE_INFINITY;
}

export function resetAudioPressureWitness() {
  resetAudioPressureMap();
  highWaterMarks = makeHighWaterMarks();
  adaptiveActionTotals = emptyActionRecord();
}

export function getAudioPressureMapLastBucketStartMs() {
  return lastBucketStartMs;
}

export function snapshotAudioPressureWitness(): AudioPressureWitnessSnapshot {
  const snapshot750ms = snapshotAudioPressureMap(750);
  const snapshot2000ms = snapshotAudioPressureMap(2000);
  const snapshot6000ms = snapshotAudioPressureMap(6000);
  const calibration = resolveAudioPressureBiasFromSnapshot(snapshot750ms);
  const notes: string[] = [];
  if (snapshot750ms.dominantSource === 'quiet') notes.push('quiet: no relevant pressure recorded in the current witness window');
  if (snapshot750ms.dominantSource === 'mixed') notes.push('mixed: more than one pressure family is close to the current peak');
  if (adaptiveActionTotals['flush-reduced-to-4'] + adaptiveActionTotals['flush-reduced-to-5'] === 0) {
    notes.push('adaptive-admission: no flush reduction has been observed since the last reset');
  }
  if (snapshot750ms.asyncSampleLateStartsPerSecond > 0) notes.push('sample-loading: late sample starts were observed');
  if (snapshot750ms.lateGrainsDroppedPerSecond > 0 || adaptiveActionTotals['root-follow-late-slice-resync'] > 0) notes.push('root-follow: late granular scheduling was observed and guarded');
  return {
    snapshot750ms,
    snapshot2000ms,
    snapshot6000ms,
    highWaterMarks: getAudioPressureHighWaterMarks(),
    adaptiveActions: getAudioPressureAdaptiveActionCounters(),
    calibration,
    notes,
  };
}

declare global {
  interface Window {
    __xensonarAudioPressureWitness?: () => AudioPressureWitnessSnapshot;
    __xensonarResetAudioPressurePeaks?: () => void;
  }
}

function installAudioPressureWitnessWindowHooks() {
  if (typeof window === 'undefined') return;
  window.__xensonarAudioPressureWitness = snapshotAudioPressureWitness;
  window.__xensonarResetAudioPressurePeaks = resetAudioPressureWitness;
}

installAudioPressureWitnessWindowHooks();
