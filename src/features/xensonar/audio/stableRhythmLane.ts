import { recordAudioPressureAdaptiveAction } from '../../../core/audio/audioPressureMap';
import type { AudioTimeContext } from '../../../core/time/unifiedTime';
import { AUDIO_LANE_IDS } from './audioLaneContracts';
import { createSharedAudioTimeSnapshot, type SharedAudioTimeSnapshot } from '../audioTraffic/sharedAudioTimeContract';

export type StableRhythmLaneStepPlan = {
  absoluteStep: number;
  step16: number;
  barIndex: number;
  timeSec: number;
  stepDurationSec: number;
  audioNowSec: number;
  minAheadSec: number;
  stale: boolean;
  staleBySec: number;
};

export type StableRhythmLaneActionPort = {
  scheduleMetronomePulse?: (plan: StableRhythmLaneStepPlan) => void;
  scheduleDrumStep?: (plan: StableRhythmLaneStepPlan) => void;
  scheduleBassStep?: (plan: StableRhythmLaneStepPlan) => void;
  applyMyzelStep?: (plan: StableRhythmLaneStepPlan) => void;
};

export type StableRhythmLaneExecutionResult = {
  executed: boolean;
  staleDropped: boolean;
  faults: number;
};

export type StableRhythmLanePrefillWindow = {
  audioNowSec: number;
  stepDurationSec: number;
  minAheadSec: number;
  scheduleUntilSec: number;
  maxStepsPerTick: number;
  nextStep: number;
  safeStartStep: number;
  resynced: boolean;
  staleStepsDropped: number;
};

export type StableRhythmLaneBeatProtectionMode =
  | 'normal'
  | 'armed'
  | 'protected'
  | 'emergency';

export type StableRhythmLaneBeatProtectionInput = {
  waveStarterHoldActive?: boolean;
  processorPressureScore?: number | null;
  processorPressureState?: 'clear' | 'watch' | 'brake' | 'critical' | null;
  stableLaneAlreadyActive?: boolean;
};

export type StableRhythmLaneBeatProtectionResolution = {
  mode: StableRhythmLaneBeatProtectionMode;
  pressureScore: number;
  targetHorizonSec: number | null;
  minAheadSec: number | null;
  maxStepsPerTick: number | null;
  reason: string;
};

export type StableRhythmLaneTimeWindow = StableRhythmLanePrefillWindow & {
  sharedTime: SharedAudioTimeSnapshot;
  incomingStep: number;
  beatProtection: StableRhythmLaneBeatProtectionResolution;
};

const STABLE_RHYTHM_LANE_TRANSPORT_ANCHOR_SEC = 0;

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function pressureStateScore(state: StableRhythmLaneBeatProtectionInput['processorPressureState']): number {
  if (state === 'critical') return 0.94;
  if (state === 'brake') return 0.76;
  if (state === 'watch') return 0.48;
  return 0;
}

export function resolveStableRhythmLaneBeatProtection(
  input: StableRhythmLaneBeatProtectionInput = {},
): StableRhythmLaneBeatProtectionResolution {
  const pressureScore = clampNumber(
    Math.max(
      Number.isFinite(input.processorPressureScore ?? NaN)
        ? Number(input.processorPressureScore)
        : 0,
      pressureStateScore(input.processorPressureState),
      input.waveStarterHoldActive ? 0.52 : 0,
    ),
    0,
    1,
  );

  if (pressureScore >= 0.9 || input.processorPressureState === 'critical') {
    return {
      mode: 'emergency',
      pressureScore,
      targetHorizonSec: 1.12,
      minAheadSec: 0.045,
      maxStepsPerTick: 26,
      reason: 'wave-starter-critical-pressure-protects-beat',
    };
  }
  if (pressureScore >= 0.7 || input.processorPressureState === 'brake') {
    return {
      mode: 'protected',
      pressureScore,
      targetHorizonSec: 0.96,
      minAheadSec: 0.038,
      maxStepsPerTick: 22,
      reason: 'wave-starter-brake-pressure-widens-beat-prefill',
    };
  }
  if (pressureScore >= 0.42 || input.waveStarterHoldActive || input.processorPressureState === 'watch') {
    return {
      mode: 'armed',
      pressureScore,
      targetHorizonSec: 0.78,
      minAheadSec: 0.028,
      maxStepsPerTick: 18,
      reason: 'wave-starter-hold-arms-beat-prefill-before-stall',
    };
  }
  return {
    mode: 'normal',
    pressureScore,
    targetHorizonSec: null,
    minAheadSec: null,
    maxStepsPerTick: null,
    reason: 'normal-stable-rhythm-prefill',
  };
}

export function resolveStableRhythmLanePrefillWindow(args: {
  nextStep: number;
  audioNowSec: number;
  stepDurationSec: number;
  minAheadSec?: number;
  targetHorizonSec?: number;
  maxStepsPerTick?: number;
}): StableRhythmLanePrefillWindow {
  const stepDurationSec = Math.max(0.001, args.stepDurationSec);
  const audioNowSec = Number.isFinite(args.audioNowSec) ? args.audioNowSec : 0;
  const minAheadSec = clampNumber(args.minAheadSec ?? 0.02, 0.008, 0.06);
  const targetHorizonSec = clampNumber(
    args.targetHorizonSec ?? Math.max(0.32, Math.min(0.72, stepDurationSec * 6)),
    0.16,
    1.24,
  );
  const maxStepsPerTick = Math.max(2, Math.min(28, Math.round(args.maxStepsPerTick ?? 12)));
  const incomingStep = Math.max(0, Math.floor(Number.isFinite(args.nextStep) ? args.nextStep : 0));
  const safeStartStep = Math.max(0, Math.ceil((audioNowSec + minAheadSec) / stepDurationSec));
  const staleStepsDropped = Math.max(0, safeStartStep - incomingStep);
  const resynced = staleStepsDropped > 0;
  if (resynced) {
    recordAudioPressureAdaptiveAction('stable-rhythm-prefill-resynced', 1);
    recordAudioPressureAdaptiveAction('stationary-stale-dropped', staleStepsDropped);
  }
  return {
    audioNowSec,
    stepDurationSec,
    minAheadSec,
    scheduleUntilSec: audioNowSec + targetHorizonSec,
    maxStepsPerTick,
    nextStep: resynced ? safeStartStep : incomingStep,
    safeStartStep,
    resynced,
    staleStepsDropped,
  };
}


export function resolveStableRhythmLaneTimeWindow(args: {
  audioCtx: AudioTimeContext;
  bpm: number;
  nextStep?: number | null;
  minAheadSec?: number;
  targetHorizonSec?: number;
  maxStepsPerTick?: number;
  beatProtection?: StableRhythmLaneBeatProtectionInput;
}): StableRhythmLaneTimeWindow {
  const sharedTime = createSharedAudioTimeSnapshot({
    audioCtx: args.audioCtx,
    bpm: args.bpm,
    quantizeGrid: 16,
    currentAnchorSec: STABLE_RHYTHM_LANE_TRANSPORT_ANCHOR_SEC,
    laneId: AUDIO_LANE_IDS.RHYTHM_PATTERN,
  });
  const stepDurationSec = sharedTime.quantizeStepSec;
  const rawNextStep = Number.isFinite(args.nextStep ?? NaN)
    ? Number(args.nextStep)
    : Math.ceil(sharedTime.audioNowSec / stepDurationSec);
  const incomingStep = Math.abs(rawNextStep * stepDurationSec - sharedTime.audioNowSec) > 1.0
    ? Math.ceil(sharedTime.audioNowSec / stepDurationSec)
    : rawNextStep;
  const beatProtection = resolveStableRhythmLaneBeatProtection(args.beatProtection);
  const window = resolveStableRhythmLanePrefillWindow({
    nextStep: incomingStep,
    audioNowSec: sharedTime.audioNowSec,
    stepDurationSec,
    minAheadSec: args.minAheadSec ?? beatProtection.minAheadSec ?? undefined,
    targetHorizonSec:
      args.targetHorizonSec ??
      beatProtection.targetHorizonSec ??
      Math.max(0.36, Math.min(0.72, stepDurationSec * 6)),
    maxStepsPerTick: args.maxStepsPerTick ?? beatProtection.maxStepsPerTick ?? undefined,
  });
  if (beatProtection.mode !== 'normal') {
    recordAudioPressureAdaptiveAction('stable-rhythm-beat-protection-armed', 1);
    recordAudioPressureAdaptiveAction('stable-rhythm-protected-prefill-window', 1);
  }
  return {
    ...window,
    sharedTime,
    incomingStep,
    beatProtection,
  };
}


export function buildStableRhythmLaneStepPlan(args: {
  absoluteStep: number;
  timeSec: number;
  stepDurationSec: number;
  audioNowSec: number;
  minAheadSec?: number;
}): StableRhythmLaneStepPlan {
  const minAheadSec = Math.max(0.006, Math.min(0.05, args.minAheadSec ?? 0.015));
  const absoluteStep = Math.max(0, Math.floor(args.absoluteStep));
  const timeSec = Number.isFinite(args.timeSec) ? args.timeSec : 0;
  const audioNowSec = Number.isFinite(args.audioNowSec) ? args.audioNowSec : timeSec;
  const staleBySec = audioNowSec + minAheadSec - timeSec;
  return {
    absoluteStep,
    step16: ((absoluteStep % 16) + 16) % 16,
    barIndex: Math.floor(absoluteStep / 16),
    timeSec,
    stepDurationSec: Math.max(0.001, args.stepDurationSec),
    audioNowSec,
    minAheadSec,
    stale: staleBySec > 0,
    staleBySec: Math.max(0, staleBySec),
  };
}

export function executeStableRhythmLaneStepPlan(
  plan: StableRhythmLaneStepPlan,
  port: StableRhythmLaneActionPort,
): StableRhythmLaneExecutionResult {
  recordAudioPressureAdaptiveAction('stable-rhythm-shadow-plan-built', 1);
  if (plan.stale) {
    recordAudioPressureAdaptiveAction('stationary-stale-dropped', 1);
    return { executed: false, staleDropped: true, faults: 0 };
  }

  const actions = [
    port.scheduleMetronomePulse,
    port.scheduleDrumStep,
    port.scheduleBassStep,
    port.applyMyzelStep,
  ].filter(Boolean) as Array<(plan: StableRhythmLaneStepPlan) => void>;

  if (actions.length === 0) {
    recordAudioPressureAdaptiveAction('stable-rhythm-shadow-plan-empty', 1);
    return { executed: false, staleDropped: false, faults: 0 };
  }

  let faults = 0;
  for (const action of actions) {
    try {
      action(plan);
    } catch {
      faults += 1;
      recordAudioPressureAdaptiveAction('stable-rhythm-shadow-plan-fault', 1);
    }
  }
  return { executed: faults < actions.length, staleDropped: false, faults };
}
