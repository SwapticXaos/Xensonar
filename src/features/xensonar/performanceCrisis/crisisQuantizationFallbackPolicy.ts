import type { CrisisQuantizationGrid, CrisisQuantizationPolicy } from './performanceCrisisTypes';

const clampNumber = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));

export type CrisisQuantizedValueState = {
  value: number | null;
  lastAcceptedTimeSec: number | null;
};

export type CrisisQuantizationRuntimeDecision = {
  active: boolean;
  stepSec: number | null;
  segmentsPerBar: number | null;
  pressure: number;
};

export function normalizeCrisisSegmentsPerBar(grid: CrisisQuantizationGrid, customSegmentsPerBar?: number | null) {
  if (grid === '16') return 16;
  if (grid === '24') return 24;
  if (grid === '27') return 27;
  if (grid === '32') return 32;
  if (grid === '64') return 64;
  return Math.round(clampNumber(Number(customSegmentsPerBar ?? 32), 1, 256));
}

export function resolveCrisisQuantizationStepSec(args: {
  bpm: number;
  grid: CrisisQuantizationGrid;
  customSegmentsPerBar?: number | null;
}) {
  const bpm = clampNumber(args.bpm, 20, 320);
  const barSec = (60 / bpm) * 4;
  return barSec / normalizeCrisisSegmentsPerBar(args.grid, args.customSegmentsPerBar);
}

export function resolveCrisisQuantizationDecision(
  policy: CrisisQuantizationPolicy | null | undefined,
  pressureBias: number,
  bpm: number,
): CrisisQuantizationRuntimeDecision {
  const safePolicy = policy ?? {
    mode: 'fallback',
    grid: '32',
    customSegmentsPerBar: 32,
    fallbackPressureFloor: 0.72,
    fallbackFullPressure: 0.94,
    holdLastValidUnderLoad: true,
    catchUpOnGrid: true,
  } satisfies CrisisQuantizationPolicy;
  const pressure = clampNumber(pressureBias, 0, 1);
  const fallbackFloor = clampNumber(safePolicy.fallbackPressureFloor, 0, 1);
  const active = safePolicy.mode === 'strict' || (safePolicy.mode === 'fallback' && pressure >= fallbackFloor);
  if (!active || safePolicy.mode === 'off') {
    return { active: false, stepSec: null, segmentsPerBar: null, pressure };
  }
  const segmentsPerBar = normalizeCrisisSegmentsPerBar(safePolicy.grid, safePolicy.customSegmentsPerBar);
  return {
    active: true,
    stepSec: resolveCrisisQuantizationStepSec({ bpm, grid: safePolicy.grid, customSegmentsPerBar: safePolicy.customSegmentsPerBar }),
    segmentsPerBar,
    pressure,
  };
}

export function getCrisisQuantizedSlot(timeSec: number, anchorSec: number, stepSec: number) {
  return Math.floor((timeSec - anchorSec) / Math.max(0.001, stepSec));
}

export function resolveCrisisQuantizedValue(args: {
  liveValue: number;
  nowSec: number;
  anchorSec: number;
  bpm: number;
  pressureBias: number;
  policy: CrisisQuantizationPolicy | null | undefined;
  state: CrisisQuantizedValueState;
}) {
  const liveValue = Number.isFinite(args.liveValue) ? args.liveValue : args.state.value ?? 220;
  const decision = resolveCrisisQuantizationDecision(args.policy, args.pressureBias, args.bpm);
  if (!decision.active || !decision.stepSec) {
    args.state.value = liveValue;
    args.state.lastAcceptedTimeSec = args.nowSec;
    return { value: liveValue, decision, acceptedLiveValue: true };
  }

  const previousTime = args.state.lastAcceptedTimeSec;
  if (args.state.value === null || previousTime === null || !Number.isFinite(previousTime)) {
    args.state.value = liveValue;
    args.state.lastAcceptedTimeSec = args.nowSec;
    return { value: liveValue, decision, acceptedLiveValue: true };
  }

  const currentSlot = getCrisisQuantizedSlot(args.nowSec, args.anchorSec, decision.stepSec);
  const previousSlot = getCrisisQuantizedSlot(previousTime, args.anchorSec, decision.stepSec);
  if (currentSlot > previousSlot) {
    args.state.value = liveValue;
    args.state.lastAcceptedTimeSec = args.nowSec;
    return { value: liveValue, decision, acceptedLiveValue: true };
  }

  return { value: args.state.value, decision, acceptedLiveValue: false };
}

export function resolveCrisisQuantizedEventTime(args: {
  policy: CrisisQuantizationPolicy | null | undefined;
  pressureBias: number;
  nowSec: number;
  eventTimeSec: number;
  bpm: number;
  anchorSec: number;
  getAnchoredDueTime: (nowSec: number, stepSec: number, anchorSec: number) => number;
}) {
  const decision = resolveCrisisQuantizationDecision(args.policy, args.pressureBias, args.bpm);
  const eventTimeSec = Number.isFinite(args.eventTimeSec) ? args.eventTimeSec : args.nowSec;
  if (!decision.active || !decision.stepSec) {
    const dueTime = Math.max(args.nowSec + 0.004, eventTimeSec + 0.004);
    return { dueTime, macroDueTime: dueTime, decision };
  }
  const dueTime = args.getAnchoredDueTime(Math.max(args.nowSec, eventTimeSec), decision.stepSec, args.anchorSec);
  return { dueTime, macroDueTime: dueTime, decision };
}
