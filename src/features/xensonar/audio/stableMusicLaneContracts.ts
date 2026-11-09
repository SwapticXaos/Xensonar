export const STABLE_MUSIC_LANE_SCHEMA_VERSION = 1 as const;
export const STABLE_MUSIC_LANE_WORKLET_PROCESSOR_NAME = 'xensonar-stable-music-lane-worklet' as const;

export const STABLE_MUSIC_LANE_IDS = ['beat', 'bass', 'material', 'rootFollow'] as const;
export type StableMusicLaneId = (typeof STABLE_MUSIC_LANE_IDS)[number];

export const STABLE_MUSIC_LANE_EXCLUDED_LIVE_PATHS = [
  'wellenstarter',
  'waveStarter',
  'particle',
  'resident',
  'collision',
] as const;

export type StableMusicTransportSnapshot = {
  schemaVersion: typeof STABLE_MUSIC_LANE_SCHEMA_VERSION;
  generation: number;
  bpm: number;
  beatsPerBar: number;
  stepsPerBar: number;
  audioNowSec: number;
  barIndex: number;
  stepIndex: number;
  phase01: number;
  gridBaseHz: number;
  requestedAtMs: number;
};

export type StableBeatHit = {
  step: number;
  lane: 'kick' | 'snare' | 'hat' | 'ghost';
  velocity: number;
};

export type StableBeatLanePlan = {
  lane: 'beat';
  active: boolean;
  patternId: string;
  volume: number;
  stepsPerBar: number;
  hits: StableBeatHit[];
};

export type StableBassNote = {
  step: number;
  lengthSteps: number;
  pitchHz: number;
  velocity: number;
  slideToHz?: number | null;
};

export type StableBassLanePlan = {
  lane: 'bass';
  active: boolean;
  patternId: string;
  volume: number;
  rootHz: number;
  stepsPerBar: number;
  notes: StableBassNote[];
};

export type StableMaterialLanePlan = {
  lane: 'material';
  active: boolean;
  materialEntryId: string | null;
  rootHz: number;
  volume: number;
  timeMode: string;
  loopStartFrame?: number;
  loopEndFrame?: number;
  bufferToken?: string | null;
};

export type StableRootFollowLanePlan = {
  lane: 'rootFollow';
  active: boolean;
  loopId: string | null;
  anchorHz: number;
  targetHz: number;
  voiceEngineMode: string;
  granulationMode: string;
  freezeIfControlStale: true;
};

export type StableMusicLanePlan =
  | StableBeatLanePlan
  | StableBassLanePlan
  | StableMaterialLanePlan
  | StableRootFollowLanePlan;

export type StableMusicLaneSnapshot = {
  schemaVersion: typeof STABLE_MUSIC_LANE_SCHEMA_VERSION;
  generation: number;
  transport: StableMusicTransportSnapshot;
  lanes: StableMusicLanePlan[];
  mode: 'shadow' | 'beat-audible' | 'speaker-probe';
  intent: 'rfl-amplified-wavestarter-burst-threshold-decoupling';
};

export type StableMusicLaneControlMessage =
  | {
      type: 'stable-music-lane-start';
      schemaVersion: typeof STABLE_MUSIC_LANE_SCHEMA_VERSION;
      generation: number;
      mode: 'shadow' | 'beat-audible' | 'speaker-probe';
    }
  | {
      type: 'stable-music-lane-stop';
      schemaVersion: typeof STABLE_MUSIC_LANE_SCHEMA_VERSION;
      generation: number;
    }
  | {
      type: 'stable-music-lane-snapshot';
      schemaVersion: typeof STABLE_MUSIC_LANE_SCHEMA_VERSION;
      snapshot: StableMusicLaneSnapshot;
    }
  | {
      type: 'stable-music-lane-request-heartbeat';
      schemaVersion: typeof STABLE_MUSIC_LANE_SCHEMA_VERSION;
      generation: number;
    };

export type StableMusicLaneProcessorMessage =
  | {
      type: 'stable-music-lane-ready';
      schemaVersion: typeof STABLE_MUSIC_LANE_SCHEMA_VERSION;
      processorName: typeof STABLE_MUSIC_LANE_WORKLET_PROCESSOR_NAME;
      processorGeneration: number;
      workletFrame: number;
      sampleRate: number;
    }
  | {
      type: 'stable-music-lane-ack';
      schemaVersion: typeof STABLE_MUSIC_LANE_SCHEMA_VERSION;
      generation: number;
      acceptedType: StableMusicLaneControlMessage['type'];
      running: boolean;
      workletFrame: number;
      laneCount: number;
      rootFollowAnchorHz: number | null;
      rootFollowTargetHz: number | null;
      beatAudioRunning: boolean;
      beatTriggerCount: number;
      activeBeatVoiceCount: number;
      speakerProofPulseCount: number;
      speakerProofPeakAbs: number;
      peakAbs: number;
    }
  | {
      type: 'stable-music-lane-heartbeat';
      schemaVersion: typeof STABLE_MUSIC_LANE_SCHEMA_VERSION;
      generation: number;
      running: boolean;
      workletFrame: number;
      processQuantumCount: number;
      heartbeatCount: number;
      lastSnapshotGeneration: number;
      laneCount: number;
      rootFollowAnchorHz: number | null;
      rootFollowTargetHz: number | null;
      beatAudioRunning: boolean;
      beatTriggerCount: number;
      activeBeatVoiceCount: number;
      speakerProofPulseCount: number;
      speakerProofPeakAbs: number;
      peakAbs: number;
    }
  | {
      type: 'stable-music-lane-reject';
      schemaVersion: typeof STABLE_MUSIC_LANE_SCHEMA_VERSION;
      generation: number;
      rejectedType: string;
      reason: string;
      workletFrame: number;
    };

export type StableMusicLaneRuntimeSnapshot = {
  status: 'idle' | 'loading' | 'loaded' | 'running' | 'stopped' | 'unsupported' | 'failed';
  generation: number;
  bridgeSessionId: number;
  audioWorkletSupported: boolean;
  contextState: AudioContextState | 'unknown';
  readyCount: number;
  ackCount: number;
  rejectCount: number;
  heartbeatCount: number;
  lastMessageAtMs: number | null;
  lastAcceptedType: StableMusicLaneControlMessage['type'] | null;
  lastRejectReason: string | null;
  lastSnapshotGeneration: number;
  laneCount: number;
  rootFollowAnchorHz: number | null;
  rootFollowTargetHz: number | null;
  beatAudioRunning: boolean;
  beatTriggerCount: number;
  activeBeatVoiceCount: number;
  speakerProofPulseCount: number;
  speakerProofPeakAbs: number;
  peakAbs: number;
  graphProbeStatus: 'idle' | 'measuring' | 'passed' | 'failed';
  graphProbeRms: number;
  graphProbePeakAbs: number;
  graphProbeSampleCount: number;
  graphProbeStartedAtMs: number | null;
  graphProbeLastMeasuredAtMs: number | null;
  graphProbeReason: string | null;
  detail: string;
  errorMessage: string | null;
};

export const createInitialStableMusicLaneRuntimeSnapshot = (
  bridgeSessionId = 0,
): StableMusicLaneRuntimeSnapshot => ({
  status: 'idle',
  generation: 0,
  bridgeSessionId,
  audioWorkletSupported: false,
  contextState: 'unknown',
  readyCount: 0,
  ackCount: 0,
  rejectCount: 0,
  heartbeatCount: 0,
  lastMessageAtMs: null,
  lastAcceptedType: null,
  lastRejectReason: null,
  lastSnapshotGeneration: 0,
  laneCount: 0,
  rootFollowAnchorHz: null,
  rootFollowTargetHz: null,
  beatAudioRunning: false,
  beatTriggerCount: 0,
  activeBeatVoiceCount: 0,
  speakerProofPulseCount: 0,
  speakerProofPeakAbs: 0,
  peakAbs: 0,
  graphProbeStatus: 'idle',
  graphProbeRms: 0,
  graphProbePeakAbs: 0,
  graphProbeSampleCount: 0,
  graphProbeStartedAtMs: null,
  graphProbeLastMeasuredAtMs: null,
  graphProbeReason: null,
  detail: 'stable-music-lane-cold',
  errorMessage: null,
});
