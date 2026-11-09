import type { WaveStarterCongestionState } from '../audio/waveStarterAttackIntegrityCongestionBrake';

export type ResonanceRootFollowControlMode =
  | 'live-player-timing'
  | 'live-watch-full-feel'
  | 'rate-limited-pressure-lane'
  | 'freeze-last-valid-pressure-lane'
  | 'recouple-live-player-timing';

export type ResonanceRootFollowControlReason =
  | 'low-pressure-player-timing-preserved'
  | 'watch-pressure-player-timing-preserved'
  | 'pressure-rate-window-open'
  | 'pressure-rate-window-held'
  | 'critical-freeze-last-valid'
  | 'critical-direct-hit-rate-window-open'
  | 'critical-direct-hit-rate-window-held'
  | 'recouple-after-pressure';

export type ResonanceRootFollowControlState = {
  lastAppliedAtMs: number;
  lastAppliedHz: number | null;
  freezeStartedAtMs: number | null;
  lastPressureMode: ResonanceRootFollowControlMode | null;
  liveDirectCount: number;
  watchDirectCount: number;
  rateLimitedCount: number;
  freezeHeldCount: number;
  recoupleCount: number;
};

export type ResonanceRootFollowControlDecision = {
  version: 1;
  mode: ResonanceRootFollowControlMode;
  reason: ResonanceRootFollowControlReason;
  shouldApplyTargetHz: boolean;
  targetHz: number;
  appliedHz: number | null;
  minIntervalMs: number;
  congestionState: WaveStarterCongestionState;
  isGlissando: boolean;
  isRepeat: boolean;
  preservesLowPressurePlayerTiming: true;
  trafficPoliceOnlyUnderPressure: true;
  preventsCatchupBurst: true;
};

export type ResolveResonanceRootFollowControlArgs = {
  state: ResonanceRootFollowControlState;
  nowMs: number;
  targetHz: number;
  congestionState: WaveStarterCongestionState;
  isGlissando: boolean;
  isRepeat: boolean;
  rootFollowSegmentQuantizeHint: boolean;
};

export function createResonanceRootFollowControlState(): ResonanceRootFollowControlState {
  return {
    lastAppliedAtMs: -Infinity,
    lastAppliedHz: null,
    freezeStartedAtMs: null,
    lastPressureMode: null,
    liveDirectCount: 0,
    watchDirectCount: 0,
    rateLimitedCount: 0,
    freezeHeldCount: 0,
    recoupleCount: 0,
  };
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));

function buildDecision(args: {
  state: ResonanceRootFollowControlState;
  mode: ResonanceRootFollowControlMode;
  reason: ResonanceRootFollowControlReason;
  shouldApplyTargetHz: boolean;
  targetHz: number;
  minIntervalMs: number;
  congestionState: WaveStarterCongestionState;
  isGlissando: boolean;
  isRepeat: boolean;
}): ResonanceRootFollowControlDecision {
  if (args.shouldApplyTargetHz) {
    args.state.lastAppliedHz = args.targetHz;
  }
  args.state.lastPressureMode = args.mode;
  return {
    version: 1,
    mode: args.mode,
    reason: args.reason,
    shouldApplyTargetHz: args.shouldApplyTargetHz,
    targetHz: args.targetHz,
    appliedHz: args.shouldApplyTargetHz ? args.targetHz : args.state.lastAppliedHz,
    minIntervalMs: args.minIntervalMs,
    congestionState: args.congestionState,
    isGlissando: args.isGlissando,
    isRepeat: args.isRepeat,
    preservesLowPressurePlayerTiming: true,
    trafficPoliceOnlyUnderPressure: true,
    preventsCatchupBurst: true,
  };
}

export function resolveResonanceRootFollowControlDecision(
  args: ResolveResonanceRootFollowControlArgs,
): ResonanceRootFollowControlDecision {
  const state = args.state;
  const nowMs = Number.isFinite(args.nowMs) ? args.nowMs : 0;
  const targetHz = clamp(args.targetHz, 27.5, 3520);
  const wasPressure =
    state.lastPressureMode === 'rate-limited-pressure-lane' ||
    state.lastPressureMode === 'freeze-last-valid-pressure-lane';
  const elapsedSinceLastApply = nowMs - state.lastAppliedAtMs;
  const isDenseGesture = args.isGlissando || args.isRepeat || args.rootFollowSegmentQuantizeHint;

  if (args.congestionState === 'clear') {
    const mode: ResonanceRootFollowControlMode = wasPressure
      ? 'recouple-live-player-timing'
      : 'live-player-timing';
    state.freezeStartedAtMs = null;
    if (mode === 'recouple-live-player-timing') state.recoupleCount += 1;
    else state.liveDirectCount += 1;
    state.lastAppliedAtMs = nowMs;
    return buildDecision({
      state,
      mode,
      reason: mode === 'recouple-live-player-timing'
        ? 'recouple-after-pressure'
        : 'low-pressure-player-timing-preserved',
      shouldApplyTargetHz: true,
      targetHz,
      minIntervalMs: 0,
      congestionState: args.congestionState,
      isGlissando: args.isGlissando,
      isRepeat: args.isRepeat,
    });
  }

  if (args.congestionState === 'watch') {
    state.freezeStartedAtMs = null;
    state.watchDirectCount += 1;
    state.lastAppliedAtMs = nowMs;
    return buildDecision({
      state,
      mode: 'live-watch-full-feel',
      reason: 'watch-pressure-player-timing-preserved',
      shouldApplyTargetHz: true,
      targetHz,
      minIntervalMs: 0,
      congestionState: args.congestionState,
      isGlissando: args.isGlissando,
      isRepeat: args.isRepeat,
    });
  }

  if (args.congestionState === 'critical' && isDenseGesture) {
    if (state.lastAppliedHz === null) {
      state.lastAppliedAtMs = nowMs;
      state.rateLimitedCount += 1;
      return buildDecision({
        state,
        mode: 'rate-limited-pressure-lane',
        reason: 'pressure-rate-window-open',
        shouldApplyTargetHz: true,
        targetHz,
        minIntervalMs: 64,
        congestionState: args.congestionState,
        isGlissando: args.isGlissando,
        isRepeat: args.isRepeat,
      });
    }
    if (state.freezeStartedAtMs === null) state.freezeStartedAtMs = nowMs;
    state.freezeHeldCount += 1;
    return buildDecision({
      state,
      mode: 'freeze-last-valid-pressure-lane',
      reason: 'critical-freeze-last-valid',
      shouldApplyTargetHz: false,
      targetHz,
      minIntervalMs: 64,
      congestionState: args.congestionState,
      isGlissando: args.isGlissando,
      isRepeat: args.isRepeat,
    });
  }

  const minIntervalMs = args.congestionState === 'critical' ? 42 : isDenseGesture ? 26 : 18;
  const canApply = elapsedSinceLastApply >= minIntervalMs || state.lastAppliedHz === null;
  if (canApply) {
    state.freezeStartedAtMs = null;
    state.rateLimitedCount += 1;
    state.lastAppliedAtMs = nowMs;
    return buildDecision({
      state,
      mode: 'rate-limited-pressure-lane',
      reason: args.congestionState === 'critical'
        ? 'critical-direct-hit-rate-window-open'
        : 'pressure-rate-window-open',
      shouldApplyTargetHz: true,
      targetHz,
      minIntervalMs,
      congestionState: args.congestionState,
      isGlissando: args.isGlissando,
      isRepeat: args.isRepeat,
    });
  }

  state.freezeHeldCount += 1;
  return buildDecision({
    state,
    mode: 'freeze-last-valid-pressure-lane',
    reason: args.congestionState === 'critical'
      ? 'critical-direct-hit-rate-window-held'
      : 'pressure-rate-window-held',
    shouldApplyTargetHz: false,
    targetHz,
    minIntervalMs,
    congestionState: args.congestionState,
    isGlissando: args.isGlissando,
    isRepeat: args.isRepeat,
  });
}
