export const WAVE_STARTER_HOLD_SEGMENT_OPTIONS = [16, 24, 27, 32, 64] as const;
export const DEFAULT_WAVE_STARTER_HOLD_SEGMENTS = 24;
export const DEFAULT_KEYBOARD_HOLD_SEGMENTS = 24;
export const DEFAULT_HOLD_CUSTOM_SEGMENTS = 48;
export const DEFAULT_WAVE_STARTER_HOLD_PATTERN_STEPS = Array.from({ length: DEFAULT_WAVE_STARTER_HOLD_SEGMENTS }, () => 1) as number[];

export type WaveStarterHoldSegmentOption =
  (typeof WAVE_STARTER_HOLD_SEGMENT_OPTIONS)[number];
export type WaveStarterHoldLane = "wellenstart" | "klaviatur";
export type WaveStarterHoldArticulation = "normal" | "sustain-extend";
export type WaveStarterHoldExtendPolicy = "none" | "apostrophe-safe-extend";

export type WaveStarterHoldGestureLoop = {
  lane: WaveStarterHoldLane;
  keyId: string;
  active: boolean;
  startedAtMs: number;
  lastUpdatedAtMs: number;
  lastPulseAtMs: number;
  nextPulseAtMs: number;
  segmentsPerBar: number;
  intervalMs: number;
  referenceBars: number;
  targetHz: number | null;
  sustainExtendActive: boolean;
  sustainExtendLatched: boolean;
  sustainExtendSinceMs: number | null;
  articulation: WaveStarterHoldArticulation;
  extendPolicy: WaveStarterHoldExtendPolicy;
  pulseCount: number;
  visualUpdateCount: number;
  repeatUpdateCount: number;
};

export type WaveStarterHoldGestureLoopLaneState = {
  gestures: Record<
    WaveStarterHoldLane,
    Record<string, WaveStarterHoldGestureLoop>
  >;
  immediateHitCount: number;
  loopPulseCount: number;
  repeatAbsorbedCount: number;
  releaseCount: number;
  skippedCatchupCount: number;
  patternMutedPulseCount: number;
};

export type WaveStarterHoldClockState = WaveStarterHoldGestureLoopLaneState;

export type WaveStarterHoldGestureLoopFrame = {
  allowImmediateAudio: boolean;
  visualRipple: boolean;
  intervalMs: number;
  referenceBars: number;
  segmentsPerBar: number;
  lane: WaveStarterHoldLane;
  keyId: string;
  targetHz: number | null;
  sustainExtendActive: boolean;
  articulation: WaveStarterHoldArticulation;
  extendPolicy: WaveStarterHoldExtendPolicy;
  reason:
    | "gesture-start-immediate-hit"
    | "gesture-retarget-immediate-hit"
    | "gesture-loop-owned-repeat"
    | "gesture-invalid-clock"
    | "gesture-pattern-muted-step";
};

export type WaveStarterHoldAudioDecision = {
  allowAudio: boolean;
  intervalMs: number;
  referenceBars: number;
  segmentsPerBar: number;
  lane: WaveStarterHoldLane;
  sustainExtendActive: boolean;
  articulation: WaveStarterHoldArticulation;
  extendPolicy: WaveStarterHoldExtendPolicy;
  reason:
    | "fresh-hit"
    | "segment-pulse"
    | "segment-wait"
    | "non-repeat"
    | "invalid-clock"
    | WaveStarterHoldGestureLoopFrame["reason"];
};

export type WaveStarterHoldGestureLoopPulse = {
  lane: WaveStarterHoldLane;
  keyId: string;
  targetHz: number | null;
  intervalMs: number;
  segmentsPerBar: number;
  referenceBars: number;
  pulseIndex: number;
  sustainExtendActive: boolean;
  articulation: WaveStarterHoldArticulation;
  extendPolicy: WaveStarterHoldExtendPolicy;
  reason: "gesture-loop-segment-pulse";
};

export function createWaveStarterHoldGestureLoopLaneState(): WaveStarterHoldGestureLoopLaneState {
  return {
    gestures: {
      wellenstart: {},
      klaviatur: {},
    },
    immediateHitCount: 0,
    loopPulseCount: 0,
    repeatAbsorbedCount: 0,
    releaseCount: 0,
    skippedCatchupCount: 0,
    patternMutedPulseCount: 0,
  };
}

export function createWaveStarterHoldClockState(): WaveStarterHoldClockState {
  return createWaveStarterHoldGestureLoopLaneState();
}

export function isDefaultWaveStarterHoldSegment(
  value: number,
): value is WaveStarterHoldSegmentOption {
  return WAVE_STARTER_HOLD_SEGMENT_OPTIONS.includes(
    value as WaveStarterHoldSegmentOption,
  );
}

export function resolveWaveStarterHoldSegments(
  value: number | undefined,
  customValue: number | undefined,
  fallback = DEFAULT_WAVE_STARTER_HOLD_SEGMENTS,
): number {
  const selected = Number.isFinite(value)
    ? Math.round(value as number)
    : fallback;
  if (isDefaultWaveStarterHoldSegment(selected)) return selected;
  const custom = Number.isFinite(customValue)
    ? Math.round(customValue as number)
    : selected;
  return Math.max(1, Math.min(256, custom));
}

export function normalizeWaveStarterHoldPatternSteps(
  steps: readonly number[] | undefined,
  segmentsPerBar: number,
): number[] {
  const segments = Math.max(1, Math.min(256, Math.round(segmentsPerBar)));
  const source = Array.isArray(steps) ? steps : [];
  return Array.from({ length: segments }, (_, index) =>
    source[index] === 0 ? 0 : 1,
  );
}

export function isWaveStarterHoldPatternStepActive(
  steps: readonly number[] | undefined,
  segmentsPerBar: number,
  stepIndex: number,
): boolean {
  const pattern = normalizeWaveStarterHoldPatternSteps(steps, segmentsPerBar);
  if (pattern.length <= 0) return true;
  const index = ((Math.round(stepIndex) % pattern.length) + pattern.length) % pattern.length;
  return pattern[index] !== 0;
}

export function resolveWaveStarterHoldSegmentIntervalMs(args: {
  bpm: number | undefined;
  segmentsPerBar: number;
  referenceBars?: number;
}): number {
  const bpm = Math.max(
    30,
    Math.min(320, Number.isFinite(args.bpm) ? (args.bpm as number) : 108),
  );
  const segments = Math.max(1, Math.min(256, Math.round(args.segmentsPerBar)));
  const referenceBars = Math.max(0.125, Math.min(16, Number.isFinite(args.referenceBars ?? NaN) ? Number(args.referenceBars) : 1));
  return 240000 * referenceBars / bpm / segments;
}

const normalizeHoldKeyId = (keyId: string) =>
  keyId.trim() || "unknown-hold-key";
const resolveHoldArticulation = (
  sustainExtendActive?: boolean,
  sustainExtendLatched?: boolean,
): WaveStarterHoldArticulation =>
  sustainExtendActive || sustainExtendLatched ? "sustain-extend" : "normal";
const resolveExtendPolicy = (
  sustainExtendActive?: boolean,
  sustainExtendLatched?: boolean,
): WaveStarterHoldExtendPolicy =>
  sustainExtendActive || sustainExtendLatched
    ? "apostrophe-safe-extend"
    : "none";

function applySustainExtendLatch(
  gesture: WaveStarterHoldGestureLoop,
  active: boolean,
  nowMs: number,
) {
  if (!active) return;
  gesture.sustainExtendLatched = true;
  if (gesture.sustainExtendSinceMs === null)
    gesture.sustainExtendSinceMs = nowMs;
}

function ensureGestureLoop(args: {
  state: WaveStarterHoldGestureLoopLaneState;
  lane: WaveStarterHoldLane;
  keyId: string;
  nowMs: number;
  segmentsPerBar: number;
  intervalMs: number;
  referenceBars: number;
  targetHz?: number | null;
  sustainExtendActive?: boolean;
}): WaveStarterHoldGestureLoop {
  const keyId = normalizeHoldKeyId(args.keyId);
  const laneGestures = args.state.gestures[args.lane];
  const existing = laneGestures[keyId];
  const targetHz = Number.isFinite(args.targetHz ?? NaN)
    ? (args.targetHz as number)
    : (existing?.targetHz ?? null);
  const sustainExtendActive = args.sustainExtendActive === true;
  if (existing?.active) {
    applySustainExtendLatch(existing, sustainExtendActive, args.nowMs);
    const safeExtendActive =
      existing.sustainExtendLatched || sustainExtendActive;
    existing.lastUpdatedAtMs = args.nowMs;
    existing.segmentsPerBar = args.segmentsPerBar;
    existing.intervalMs = args.intervalMs;
    existing.referenceBars = args.referenceBars;
    existing.targetHz = targetHz;
    existing.sustainExtendActive = safeExtendActive;
    existing.articulation = resolveHoldArticulation(
      sustainExtendActive,
      existing.sustainExtendLatched,
    );
    existing.extendPolicy = resolveExtendPolicy(
      sustainExtendActive,
      existing.sustainExtendLatched,
    );
    existing.visualUpdateCount += 1;
    return existing;
  }

  const next: WaveStarterHoldGestureLoop = {
    lane: args.lane,
    keyId,
    active: true,
    startedAtMs: args.nowMs,
    lastUpdatedAtMs: args.nowMs,
    lastPulseAtMs: args.nowMs,
    nextPulseAtMs: args.nowMs + args.intervalMs,
    segmentsPerBar: args.segmentsPerBar,
    intervalMs: args.intervalMs,
    referenceBars: args.referenceBars,
    targetHz,
    sustainExtendActive,
    sustainExtendLatched: sustainExtendActive,
    sustainExtendSinceMs: sustainExtendActive ? args.nowMs : null,
    articulation: resolveHoldArticulation(
      sustainExtendActive,
      sustainExtendActive,
    ),
    extendPolicy: resolveExtendPolicy(sustainExtendActive, sustainExtendActive),
    pulseCount: 0,
    visualUpdateCount: 1,
    repeatUpdateCount: 0,
  };
  laneGestures[keyId] = next;
  return next;
}

export function resolveWaveStarterHoldGestureLoopFrame(args: {
  state: WaveStarterHoldGestureLoopLaneState;
  lane: WaveStarterHoldLane;
  keyId: string;
  isRepeat: boolean;
  nowMs: number;
  bpm: number | undefined;
  segmentsPerBar: number;
  referenceBars?: number;
  targetHz?: number | null;
  sustainExtendActive?: boolean;
  activeSteps?: readonly number[];
}): WaveStarterHoldGestureLoopFrame {
  const intervalMs = resolveWaveStarterHoldSegmentIntervalMs({
    bpm: args.bpm,
    segmentsPerBar: args.segmentsPerBar,
    referenceBars: args.referenceBars,
  });
  const segmentsPerBar = Math.max(
    1,
    Math.min(256, Math.round(args.segmentsPerBar)),
  );
  const keyId = normalizeHoldKeyId(args.keyId);
  if (!Number.isFinite(args.nowMs) || !Number.isFinite(intervalMs)) {
    return {
      allowImmediateAudio: false,
      visualRipple: true,
      intervalMs,
      referenceBars: Math.max(0.125, Math.min(16, Number.isFinite(args.referenceBars ?? NaN) ? Number(args.referenceBars) : 1)),
      segmentsPerBar,
      lane: args.lane,
      keyId,
      targetHz: Number.isFinite(args.targetHz ?? NaN)
        ? (args.targetHz as number)
        : null,
      sustainExtendActive: args.sustainExtendActive === true,
      articulation: resolveHoldArticulation(args.sustainExtendActive),
      extendPolicy: resolveExtendPolicy(args.sustainExtendActive),
      reason: "gesture-invalid-clock",
    };
  }

  const hadActiveGesture = !!args.state.gestures[args.lane][keyId]?.active;
  const gesture = ensureGestureLoop({
    state: args.state,
    lane: args.lane,
    keyId,
    nowMs: args.nowMs,
    segmentsPerBar,
    intervalMs,
    referenceBars: Math.max(0.125, Math.min(16, Number.isFinite(args.referenceBars ?? NaN) ? Number(args.referenceBars) : 1)),
    targetHz: args.targetHz,
    sustainExtendActive: args.sustainExtendActive,
  });

  if (args.isRepeat && hadActiveGesture) {
    gesture.repeatUpdateCount += 1;
    args.state.repeatAbsorbedCount += 1;
    return {
      allowImmediateAudio: false,
      visualRipple: true,
      intervalMs,
      referenceBars: gesture.referenceBars,
      segmentsPerBar,
      lane: args.lane,
      keyId,
      targetHz: gesture.targetHz,
      sustainExtendActive: gesture.sustainExtendActive,
      articulation: gesture.articulation,
      extendPolicy: gesture.extendPolicy,
      reason: "gesture-loop-owned-repeat",
    };
  }

  gesture.lastPulseAtMs = args.nowMs;
  gesture.nextPulseAtMs = args.nowMs + intervalMs;
  gesture.pulseCount += 1;
  const firstStepActive = isWaveStarterHoldPatternStepActive(
    args.activeSteps,
    segmentsPerBar,
    0,
  );
  if (!firstStepActive) {
    args.state.patternMutedPulseCount += 1;
    return {
      allowImmediateAudio: false,
      visualRipple: true,
      intervalMs,
      referenceBars: gesture.referenceBars,
      segmentsPerBar,
      lane: args.lane,
      keyId,
      targetHz: gesture.targetHz,
      sustainExtendActive: gesture.sustainExtendActive,
      articulation: gesture.articulation,
      extendPolicy: gesture.extendPolicy,
      reason: "gesture-pattern-muted-step",
    };
  }
  args.state.immediateHitCount += 1;
  return {
    allowImmediateAudio: true,
    visualRipple: true,
    intervalMs,
    referenceBars: gesture.referenceBars,
    segmentsPerBar,
    lane: args.lane,
    keyId,
    targetHz: gesture.targetHz,
    sustainExtendActive: gesture.sustainExtendActive,
    articulation: gesture.articulation,
    extendPolicy: gesture.extendPolicy,
    reason: hadActiveGesture
      ? "gesture-retarget-immediate-hit"
      : "gesture-start-immediate-hit",
  };
}

export function collectDueWaveStarterHoldGestureLoopPulses(args: {
  state: WaveStarterHoldGestureLoopLaneState;
  nowMs: number;
  bpm: number | undefined;
  segmentsByLane: Record<WaveStarterHoldLane, number>;
  referenceBarsByLane?: Partial<Record<WaveStarterHoldLane, number>>;
  maxPulses?: number;
  sustainExtendActive?: boolean;
  activeStepsByLane?: Partial<Record<WaveStarterHoldLane, readonly number[]>>;
}): WaveStarterHoldGestureLoopPulse[] {
  if (!Number.isFinite(args.nowMs)) return [];
  const maxPulses = Math.max(1, Math.min(12, Math.round(args.maxPulses ?? 6)));
  const pulses: WaveStarterHoldGestureLoopPulse[] = [];

  for (const lane of ["wellenstart", "klaviatur"] as const) {
    const laneGestures = args.state.gestures[lane];
    const segmentsPerBar = Math.max(
      1,
      Math.min(
        256,
        Math.round(
          args.segmentsByLane[lane] ?? DEFAULT_WAVE_STARTER_HOLD_SEGMENTS,
        ),
      ),
    );
    const referenceBars = Math.max(0.125, Math.min(16, Number.isFinite(args.referenceBarsByLane?.[lane] ?? NaN) ? Number(args.referenceBarsByLane?.[lane]) : 1));
    const intervalMs = resolveWaveStarterHoldSegmentIntervalMs({
      bpm: args.bpm,
      segmentsPerBar,
      referenceBars,
    });
    for (const gesture of Object.values(laneGestures)) {
      if (!gesture.active) continue;
      gesture.segmentsPerBar = segmentsPerBar;
      gesture.intervalMs = intervalMs;
      gesture.referenceBars = referenceBars;
      const sustainExtendActive = args.sustainExtendActive === true;
      applySustainExtendLatch(gesture, sustainExtendActive, args.nowMs);
      gesture.sustainExtendActive =
        gesture.sustainExtendLatched || sustainExtendActive;
      gesture.articulation = resolveHoldArticulation(
        sustainExtendActive,
        gesture.sustainExtendLatched,
      );
      gesture.extendPolicy = resolveExtendPolicy(
        sustainExtendActive,
        gesture.sustainExtendLatched,
      );
      if (!Number.isFinite(gesture.nextPulseAtMs)) {
        gesture.nextPulseAtMs = args.nowMs + intervalMs;
        continue;
      }
      if (args.nowMs + 0.5 < gesture.nextPulseAtMs) continue;

      if (pulses.length >= maxPulses) {
        args.state.skippedCatchupCount += 1;
        gesture.nextPulseAtMs = args.nowMs + intervalMs;
        continue;
      }

      const nextPulseIndex = gesture.pulseCount;
      gesture.pulseCount += 1;
      gesture.lastPulseAtMs = args.nowMs;
      const patternStepActive = isWaveStarterHoldPatternStepActive(
        args.activeStepsByLane?.[lane],
        segmentsPerBar,
        nextPulseIndex,
      );
      if (patternStepActive) {
        pulses.push({
          lane,
          keyId: gesture.keyId,
          targetHz: gesture.targetHz,
          intervalMs,
          segmentsPerBar,
          referenceBars,
          pulseIndex: nextPulseIndex,
          sustainExtendActive: gesture.sustainExtendActive,
          articulation: gesture.articulation,
          extendPolicy: gesture.extendPolicy,
          reason: "gesture-loop-segment-pulse",
        });
        args.state.loopPulseCount += 1;
      } else {
        args.state.patternMutedPulseCount += 1;
      }

      const missedSegments =
        intervalMs > 0
          ? Math.max(
              0,
              Math.floor((args.nowMs - gesture.nextPulseAtMs) / intervalMs),
            )
          : 0;
      if (missedSegments > 0) args.state.skippedCatchupCount += missedSegments;
      gesture.nextPulseAtMs = args.nowMs + intervalMs;
    }
  }

  return pulses;
}

export function releaseWaveStarterHoldGestureLoop(args: {
  state: WaveStarterHoldGestureLoopLaneState;
  lane?: WaveStarterHoldLane;
  keyId?: string;
}) {
  const lanes: WaveStarterHoldLane[] = args.lane
    ? [args.lane]
    : ["wellenstart", "klaviatur"];
  for (const lane of lanes) {
    if (args.keyId) {
      const keyId = normalizeHoldKeyId(args.keyId);
      if (args.state.gestures[lane][keyId]?.active)
        args.state.releaseCount += 1;
      delete args.state.gestures[lane][keyId];
      continue;
    }
    const activeCount = Object.values(args.state.gestures[lane]).filter(
      (gesture) => gesture.active,
    ).length;
    args.state.releaseCount += activeCount;
    args.state.gestures[lane] = {};
  }
}

export function hasActiveWaveStarterHoldGestureLoop(args: {
  state: WaveStarterHoldGestureLoopLaneState;
  lane?: WaveStarterHoldLane;
  requireSustainExtend?: boolean;
}): boolean {
  const lanes: WaveStarterHoldLane[] = args.lane
    ? [args.lane]
    : ["wellenstart", "klaviatur"];
  return lanes.some((lane) =>
    Object.values(args.state.gestures[lane]).some((gesture) => {
      if (!gesture.active) return false;
      if (!args.requireSustainExtend) return true;
      return (
        gesture.sustainExtendActive ||
        gesture.sustainExtendLatched ||
        gesture.extendPolicy === "apostrophe-safe-extend"
      );
    }),
  );
}

export function resolveWaveStarterHoldAudioDecision(args: {
  state: WaveStarterHoldClockState;
  lane: WaveStarterHoldLane;
  keyId: string;
  isRepeat: boolean;
  nowMs: number;
  bpm: number | undefined;
  segmentsPerBar: number;
  referenceBars?: number;
  targetHz?: number | null;
  sustainExtendActive?: boolean;
}): WaveStarterHoldAudioDecision {
  const frame = resolveWaveStarterHoldGestureLoopFrame(args);
  return {
    allowAudio: frame.allowImmediateAudio,
    intervalMs: frame.intervalMs,
    referenceBars: frame.referenceBars,
    segmentsPerBar: frame.segmentsPerBar,
    lane: frame.lane,
    sustainExtendActive: frame.sustainExtendActive,
    articulation: frame.articulation,
    extendPolicy: frame.extendPolicy,
    reason: frame.reason,
  };
}
