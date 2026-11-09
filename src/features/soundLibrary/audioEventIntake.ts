export type AudioEventSource = 'wave_starter' | 'materialspur' | 'partikel' | 'drone' | 'resident' | 'sample' | 'other';
export type AudioTargetBus = 'music' | 'space' | 'drone' | 'event' | 'sample' | 'master';
export type AudioTapPoint = 'pre_fx' | 'post_fx' | 'monitor';

export type AudioEventIntent = {
  id: string;
  source: AudioEventSource;
  soundId: string;
  hz: number | null;
  startAtSec: number;
  durationSec: number | null;
  bus: AudioTargetBus;
  priority: number;
  sustainMode: 'pulse' | 'hold' | 'release' | 'sample_extend';
};

export type AudioArbiterDecision = {
  intentId: string;
  action: 'play' | 'merge' | 'delay' | 'drop';
  reason: string;
  routedBus: AudioTargetBus;
};

export type AudioTapSnapshot = {
  tap: AudioTapPoint;
  activeVoices: number;
  timestampSec: number;
  rms: number;
  peak: number;
};

export type AudioEventIntakeState = {
  pendingIntents: AudioEventIntent[];
  latestDecisions: AudioArbiterDecision[];
  latestTapSnapshots: AudioTapSnapshot[];
};

export function createEmptyAudioEventIntakeState(): AudioEventIntakeState {
  return {
    pendingIntents: [],
    latestDecisions: [],
    latestTapSnapshots: [],
  };
}
