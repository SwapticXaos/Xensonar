import type { WaveStarterRuntimePolicy } from '../performanceCrisis/performanceCrisisRuntimePolicies';
export type WaveStarterLaneAdmissionKind = 'admit-full' | 'defer-slot' | 'drop-overload';

export type WaveStarterLaneState = {
  recentStartsMs: number[];
  recentDefersMs: number[];
  recentDropsMs: number[];
  lastAdmittedAtMs: number | null;
  lastDeferredAtMs: number | null;
  lastDroppedAtMs: number | null;
};

export type WaveStarterLaneAdmission = {
  kind: WaveStarterLaneAdmissionKind;
  reason:
    | 'quiet'
    | 'cooldown'
    | 'dense-wave-lane'
    | 'global-pressure'
    | 'scheduled-tone-pressure'
    | 'slot-not-yet-free'
    | 'hard-overload';
  recentStarts120ms: number;
  recentStarts420ms: number;
  minSpacingMs: number;
  recommendedDelayMs: number;
  nextEligibleAtMs: number;
};

export function createWaveStarterLaneState(): WaveStarterLaneState {
  return {
    recentStartsMs: [],
    recentDefersMs: [],
    recentDropsMs: [],
    lastAdmittedAtMs: null,
    lastDeferredAtMs: null,
    lastDroppedAtMs: null,
  };
}

function pruneRecent(list: number[], nowMs: number, horizonMs: number) {
  let write = 0;
  for (let i = 0; i < list.length; i += 1) {
    const value = list[i];
    if (Number.isFinite(value) && nowMs - value <= horizonMs) {
      list[write] = value;
      write += 1;
    }
  }
  list.length = write;
}

function countSince(list: number[], nowMs: number, horizonMs: number) {
  let count = 0;
  for (let i = 0; i < list.length; i += 1) {
    if (nowMs - list[i] <= horizonMs) count += 1;
  }
  return count;
}

function clampDelayMs(value: number) {
  if (!Number.isFinite(value)) return 7;
  return Math.max(4, Math.min(18, value));
}

export function resolveWaveStarterLaneAdmission(args: {
  state: WaveStarterLaneState;
  nowMs: number;
  pressureBias: number;
  activeScheduledToneCount: number;
  fromDeferredSlot?: boolean;
  policy?: WaveStarterRuntimePolicy;
}): WaveStarterLaneAdmission {
  const { state } = args;
  const nowMs = Number.isFinite(args.nowMs) ? args.nowMs : Date.now();
  pruneRecent(state.recentStartsMs, nowMs, 900);
  pruneRecent(state.recentDefersMs, nowMs, 900);
  pruneRecent(state.recentDropsMs, nowMs, 900);

  const pressureBias = Math.max(0, Math.min(1, Number.isFinite(args.pressureBias) ? args.pressureBias : 0));
  const activeScheduledToneCount = Math.max(0, Number.isFinite(args.activeScheduledToneCount) ? args.activeScheduledToneCount : 0);
  const policy = args.policy;
  const maxDeferralMs = policy ? Math.max(4, Math.min(18, policy.maxDeferralMs)) : 12;
  const staleDropMs = policy ? Math.max(8, Math.min(34, policy.staleDropMs)) : 24;
  const pressureGate = policy?.admissionMode === 'pressure-gated';
  const openGate = policy?.admissionMode === 'open';
  const recentStarts60ms = countSince(state.recentStartsMs, nowMs, 60);
  const recentStarts120ms = countSince(state.recentStartsMs, nowMs, 120);
  const recentStarts420ms = countSince(state.recentStartsMs, nowMs, 420);
  const recentDefers120ms = countSince(state.recentDefersMs, nowMs, 120);
  const sinceLastAdmitted = state.lastAdmittedAtMs === null ? Infinity : nowMs - state.lastAdmittedAtMs;

  // Wellenstarter impulses are treated as valuable intents. Under pressure they are not
  // clipped into a reduced attack; they wait for the next tiny safe slot. Only hard
  // overload or a stale/latest-intent replacement should drop them.
  const minSpacingMs = openGate
    ? (pressureBias >= 0.82 || activeScheduledToneCount >= 110 ? 12 : 4)
    : pressureGate
      ? (pressureBias >= 0.68 || activeScheduledToneCount >= 90 ? 24 : pressureBias >= 0.46 || activeScheduledToneCount >= 68 ? 14 : 5)
      : pressureBias >= 0.76 || activeScheduledToneCount >= 96
        ? 24
        : pressureBias >= 0.54 || activeScheduledToneCount >= 76
          ? 14
          : 4;
  const nextEligibleAtMs = state.lastAdmittedAtMs === null ? nowMs : state.lastAdmittedAtMs + minSpacingMs;
  const cooldownDelayMs = clampDelayMs(nextEligibleAtMs - nowMs);

  const recentDefersHardLimit = policy ? Math.max(4, Math.floor(staleDropMs / 2)) : 8;
  if (pressureBias >= (pressureGate ? 0.9 : 0.94) || activeScheduledToneCount >= (pressureGate ? 118 : 126) || (recentDefers120ms >= recentDefersHardLimit && recentStarts120ms >= 3)) {
    return {
      kind: 'drop-overload',
      reason: 'hard-overload',
      recentStarts120ms,
      recentStarts420ms,
      minSpacingMs,
      recommendedDelayMs: 0,
      nextEligibleAtMs,
    };
  }

  if (sinceLastAdmitted < minSpacingMs) {
    return {
      kind: 'defer-slot',
      reason: 'cooldown',
      recentStarts120ms,
      recentStarts420ms,
      minSpacingMs,
      recommendedDelayMs: Math.min(maxDeferralMs, cooldownDelayMs),
      nextEligibleAtMs,
    };
  }

  // 32 Hz live attack streams (~13.4 starts / 420 ms) are sustained playing, not
  // a burst. Keep the short-window burst gates intact and reserve the long-window
  // gate for genuinely denser sustained traffic.
  if (recentStarts60ms >= 4 || recentStarts120ms >= 5 || recentStarts420ms >= 16) {
    return {
      kind: 'defer-slot',
      reason: 'dense-wave-lane',
      recentStarts120ms,
      recentStarts420ms,
      minSpacingMs,
      recommendedDelayMs: Math.min(maxDeferralMs, pressureBias >= 0.72 ? 12 : 8),
      nextEligibleAtMs: nowMs + Math.min(maxDeferralMs, pressureBias >= 0.72 ? 12 : 8),
    };
  }

  if (pressureBias >= 0.82 || activeScheduledToneCount >= 112) {
    return {
      kind: 'defer-slot',
      reason: pressureBias >= 0.82 ? 'global-pressure' : 'scheduled-tone-pressure',
      recentStarts120ms,
      recentStarts420ms,
      minSpacingMs,
      recommendedDelayMs: Math.min(maxDeferralMs, pressureBias >= 0.88 || activeScheduledToneCount >= 120 ? 14 : 9),
      nextEligibleAtMs: nowMs + Math.min(maxDeferralMs, pressureBias >= 0.88 || activeScheduledToneCount >= 120 ? 14 : 9),
    };
  }

  if (args.fromDeferredSlot && (pressureBias >= 0.68 || activeScheduledToneCount >= 92)) {
    return {
      kind: 'defer-slot',
      reason: 'slot-not-yet-free',
      recentStarts120ms,
      recentStarts420ms,
      minSpacingMs,
      recommendedDelayMs: Math.min(maxDeferralMs, 7),
      nextEligibleAtMs: nowMs + Math.min(maxDeferralMs, 7),
    };
  }

  return {
    kind: 'admit-full',
    reason: 'quiet',
    recentStarts120ms,
    recentStarts420ms,
    minSpacingMs,
    recommendedDelayMs: 0,
    nextEligibleAtMs: nowMs,
  };
}

export function commitWaveStarterLaneAdmission(state: WaveStarterLaneState, admission: WaveStarterLaneAdmission, nowMs: number) {
  if (admission.kind === 'drop-overload') {
    state.lastDroppedAtMs = nowMs;
    state.recentDropsMs.push(nowMs);
    pruneRecent(state.recentDropsMs, nowMs, 900);
    return;
  }
  if (admission.kind === 'defer-slot') {
    state.lastDeferredAtMs = nowMs;
    state.recentDefersMs.push(nowMs);
    pruneRecent(state.recentDefersMs, nowMs, 900);
    return;
  }
  state.lastAdmittedAtMs = nowMs;
  state.recentStartsMs.push(nowMs);
  pruneRecent(state.recentStartsMs, nowMs, 900);
}
