export const STATIONARY_RHYTHM_WORKLET_PROCESSOR_NAME =
  'xensonar-stationary-rhythm-worklet-lane-probe';

export const STATIONARY_RHYTHM_WORKLET_SCHEMA_VERSION = 1 as const;

export type StationaryRhythmWorkletBridgeStatus =
  | 'unstarted'
  | 'unsupported'
  | 'loading'
  | 'loaded'
  | 'running'
  | 'stopped'
  | 'failed';

export type StationaryRhythmProcessorState =
  | 'idle'
  | 'clear'
  | 'watch'
  | 'brake'
  | 'critical'
  | 'processor-error';

export type StationaryRhythmHitLane = 'kick' | 'snare' | 'hat' | 'bass' | 'probe';

export type StationaryRhythmTransportPolicy =
  | 'hold-current-bar'
  | 'switch-next-bar'
  | 'hard-resync';

export type StationaryRhythmPatternHit = {
  step: number;
  lane: StationaryRhythmHitLane;
  velocity: number;
  accent?: number;
  lengthSteps?: number;
  pitchHz?: number;
  soundToken?: string;
};

export type StationaryRhythmPatternSnapshot = {
  type: 'stationary-rhythm-pattern-snapshot';
  schemaVersion: typeof STATIONARY_RHYTHM_WORKLET_SCHEMA_VERSION;
  generation: number;
  patternVersion: number;
  bpm: number;
  bars: number;
  beatsPerBar: number;
  stepsPerBar: number;
  effectiveAtBar?: number;
  effectiveAtFrame?: number;
  transportPolicy: StationaryRhythmTransportPolicy;
  hits: StationaryRhythmPatternHit[];
  audibleMinimalVoices?: boolean;
  shadowOnly?: boolean;
  requestedAtMs: number;
};

export type StationaryRhythmControlMessage =
  | StationaryRhythmStartMessage
  | StationaryRhythmStopMessage
  | StationaryRhythmUpdateMessage
  | StationaryRhythmPatternSnapshot
  | StationaryRhythmRequestSnapshotMessage;

export type StationaryRhythmStartMessage = {
  type: 'stationary-rhythm-start';
  schemaVersion: typeof STATIONARY_RHYTHM_WORKLET_SCHEMA_VERSION;
  generation: number;
  bpm: number;
  beatsPerBar: number;
  stepsPerBar: number;
  audibleProbe: boolean;
  probeGain: number;
  requestedAtMs: number;
};

export type StationaryRhythmStopMessage = {
  type: 'stationary-rhythm-stop';
  schemaVersion: typeof STATIONARY_RHYTHM_WORKLET_SCHEMA_VERSION;
  generation: number;
  requestedAtMs: number;
  stopMode: 'immediate' | 'end-of-bar';
};

export type StationaryRhythmUpdateMessage = {
  type: 'stationary-rhythm-update';
  schemaVersion: typeof STATIONARY_RHYTHM_WORKLET_SCHEMA_VERSION;
  generation: number;
  bpm?: number;
  beatsPerBar?: number;
  stepsPerBar?: number;
  audibleProbe?: boolean;
  probeGain?: number;
  requestedAtMs: number;
};

export type StationaryRhythmRequestSnapshotMessage = {
  type: 'stationary-rhythm-request-snapshot';
  schemaVersion: typeof STATIONARY_RHYTHM_WORKLET_SCHEMA_VERSION;
  generation: number;
  requestedAtMs: number;
};

export type StationaryRhythmProcessorMessage =
  | StationaryRhythmReadyMessage
  | StationaryRhythmAckMessage
  | StationaryRhythmHeartbeatMessage
  | StationaryRhythmRejectMessage;

export type StationaryRhythmReadyMessage = {
  type: 'stationary-rhythm-ready';
  schemaVersion: typeof STATIONARY_RHYTHM_WORKLET_SCHEMA_VERSION;
  processorName: typeof STATIONARY_RHYTHM_WORKLET_PROCESSOR_NAME;
  processorGeneration: number;
  workletFrame: number;
  sampleRate: number;
};

export type StationaryRhythmAckMessage = {
  type: 'stationary-rhythm-ack';
  schemaVersion: typeof STATIONARY_RHYTHM_WORKLET_SCHEMA_VERSION;
  generation: number;
  acceptedType: StationaryRhythmControlMessage['type'];
  workletFrame: number;
  running: boolean;
  patternVersion?: number;
  pendingPatternVersion?: number;
};

export type StationaryRhythmRejectMessage = {
  type: 'stationary-rhythm-reject';
  schemaVersion: typeof STATIONARY_RHYTHM_WORKLET_SCHEMA_VERSION;
  generation: number;
  rejectedType: string;
  reason: string;
  workletFrame: number;
};

export type StationaryRhythmHeartbeatMessage = {
  type: 'stationary-rhythm-heartbeat';
  schemaVersion: typeof STATIONARY_RHYTHM_WORKLET_SCHEMA_VERSION;
  generation: number;
  processorGeneration: number;
  running: boolean;
  audibleProbe: boolean;
  audibleMinimalVoices: boolean;
  bpm: number;
  beatsPerBar: number;
  stepsPerBar: number;
  currentBar: number;
  stepIndex: number;
  nextStepFrame: number;
  currentFrame: number;
  renderQuantumSize: number;
  processQuantumCount: number;
  renderedFrameCount: number;
  frameContinuityGapCount: number;
  lateStepCount: number;
  missedStepWindowCount: number;
  maxStepLatenessFrames: number;
  heartbeatJitterFrames: number;
  activeProbeVoiceCount: number;
  activePatternVoiceCount: number;
  patternVersion: number;
  pendingPatternVersion: number;
  patternHitCount: number;
  patternAppliedCount: number;
  patternDeferredCount: number;
  duplicateStepGuardCount: number;
  processorState: StationaryRhythmProcessorState;
  peakAbs: number;
  postedAtWorkletTimeSec: number;
};

export type StationaryRhythmWorkletSnapshot = {
  version: typeof STATIONARY_RHYTHM_WORKLET_SCHEMA_VERSION;
  status: StationaryRhythmWorkletBridgeStatus;
  processorName: typeof STATIONARY_RHYTHM_WORKLET_PROCESSOR_NAME;
  requestedAtMs: number | null;
  completedAtMs: number | null;
  lastMessageAtMs: number | null;
  lastErrorAtMs: number | null;
  bridgeSessionId: number;
  processorGeneration: number;
  generation: number;
  contextState: AudioContextState | 'unknown';
  audioWorkletSupported: boolean;
  secureContext: boolean;
  fileOriginLikelyBlocked: boolean;
  nodeCreated: boolean;
  nodeConnected: boolean;
  probeRunning: boolean;
  audibleProbe: boolean;
  audibleMinimalVoices: boolean;
  probeGain: number;
  bpm: number;
  beatsPerBar: number;
  stepsPerBar: number;
  currentBar: number;
  stepIndex: number;
  nextStepFrame: number;
  workletCurrentFrame: number;
  renderQuantumSize: number;
  readyMessageCount: number;
  ackCount: number;
  rejectCount: number;
  heartbeatCount: number;
  processorErrorCount: number;
  processQuantumCount: number;
  renderedFrameCount: number;
  frameContinuityGapCount: number;
  lateStepCount: number;
  missedStepWindowCount: number;
  maxStepLatenessFrames: number;
  heartbeatJitterFrames: number;
  activeProbeVoiceCount: number;
  activePatternVoiceCount: number;
  patternVersion: number;
  pendingPatternVersion: number;
  patternHitCount: number;
  patternAppliedCount: number;
  patternDeferredCount: number;
  duplicateStepGuardCount: number;
  processorState: StationaryRhythmProcessorState;
  peakAbs: number;
  lastAcceptedType: StationaryRhythmControlMessage['type'] | null;
  lastRejectedType: string | null;
  lastRejectReason: string | null;
  errorMessage: string | null;
  detail: string | null;
  preservesLegacyRhythmReference: true;
  ownsProcessorClock: true;
  stepStreamDisabled: true;
  patternSnapshotBridgeEnabled: true;
  apostropheScopeIsolated: true;
};

export type StationaryRhythmWorkletProbeOptions = {
  bpm: number;
  beatsPerBar?: number;
  stepsPerBar?: number;
  probeGain?: number;
  audibleProbe?: boolean;
};

export const createInitialStationaryRhythmWorkletSnapshot = (
  bridgeSessionId = 0,
): StationaryRhythmWorkletSnapshot => ({
  version: STATIONARY_RHYTHM_WORKLET_SCHEMA_VERSION,
  status: 'unstarted',
  processorName: STATIONARY_RHYTHM_WORKLET_PROCESSOR_NAME,
  requestedAtMs: null,
  completedAtMs: null,
  lastMessageAtMs: null,
  lastErrorAtMs: null,
  bridgeSessionId,
  processorGeneration: 0,
  generation: 0,
  contextState: 'unknown',
  audioWorkletSupported: false,
  secureContext: false,
  fileOriginLikelyBlocked: false,
  nodeCreated: false,
  nodeConnected: false,
  probeRunning: false,
  audibleProbe: false,
  audibleMinimalVoices: false,
  probeGain: 0,
  bpm: 108,
  beatsPerBar: 4,
  stepsPerBar: 16,
  currentBar: 0,
  stepIndex: 0,
  nextStepFrame: 0,
  workletCurrentFrame: 0,
  renderQuantumSize: 0,
  readyMessageCount: 0,
  ackCount: 0,
  rejectCount: 0,
  heartbeatCount: 0,
  processorErrorCount: 0,
  processQuantumCount: 0,
  renderedFrameCount: 0,
  frameContinuityGapCount: 0,
  lateStepCount: 0,
  missedStepWindowCount: 0,
  maxStepLatenessFrames: 0,
  heartbeatJitterFrames: 0,
  activeProbeVoiceCount: 0,
  activePatternVoiceCount: 0,
  patternVersion: 0,
  pendingPatternVersion: 0,
  patternHitCount: 0,
  patternAppliedCount: 0,
  patternDeferredCount: 0,
  duplicateStepGuardCount: 0,
  processorState: 'idle',
  peakAbs: 0,
  lastAcceptedType: null,
  lastRejectedType: null,
  lastRejectReason: null,
  errorMessage: null,
  detail: null,
  preservesLegacyRhythmReference: true,
  ownsProcessorClock: true,
  stepStreamDisabled: true,
  patternSnapshotBridgeEnabled: true,
  apostropheScopeIsolated: true,
});
