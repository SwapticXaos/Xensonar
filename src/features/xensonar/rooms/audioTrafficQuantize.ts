import type { CollisionTriggerTargetKind, QueuedCollisionTrigger } from '../../soundLibrary/particlePitchRouting';

const SLOW_TRAFFIC_STEP_SEC = 0.24;
const QUANTIZED_TRAFFIC_SCHEDULE_LEAD_SEC = 0.008;
const QUANTIZED_TRAFFIC_MISSED_GRID_CATCHUP_GRACE_SEC = 0.024;
const QUANTIZED_TRAFFIC_MICRO_JITTER_MIN_SEC = 0.0025;
const QUANTIZED_TRAFFIC_MICRO_JITTER_MAX_SEC = 0.014;
const QUANTIZED_TRAFFIC_CATCHUP_JITTER_MIN_SEC = 0.004;
const QUANTIZED_TRAFFIC_CATCHUP_JITTER_MAX_SEC = 0.012;
const QUANTIZED_TRAFFIC_SLOW_JITTER_MAX_SEC = 0.018;

// A 20 ms control flush already schedules 20 ms ahead. Anything older than one
// full flush period is no longer a timely collision transient and must never be
// replayed as catch-up work after a control-plane pause.
export const QUANTIZED_TRAFFIC_STALE_TRIGGER_SEC = 0.02;
export const QUANTIZED_TRAFFIC_RECOVERY_GAP_SEC = 0.06;

function hashString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hashUnitInterval(value: string) {
  return hashString(value) / 0xffffffff;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}


export function isQuantizedTrafficRecoveryFlush(args: {
  currentTimeSec: number;
  previousFlushTimeSec: number;
  minimumGapSec?: number;
}) {
  if (!Number.isFinite(args.currentTimeSec) || !Number.isFinite(args.previousFlushTimeSec)) return false;
  const minimumGapSec = Math.max(
    QUANTIZED_TRAFFIC_STALE_TRIGGER_SEC,
    Number.isFinite(args.minimumGapSec ?? NaN)
      ? Number(args.minimumGapSec)
      : QUANTIZED_TRAFFIC_RECOVERY_GAP_SEC,
  );
  return args.currentTimeSec - args.previousFlushTimeSec > minimumGapSec;
}

export function isQuantizedTrafficTriggerStale(args: {
  dueTime: number;
  currentTimeSec: number;
  maxLatenessSec?: number;
}) {
  if (!Number.isFinite(args.dueTime) || !Number.isFinite(args.currentTimeSec)) return true;
  const maxLatenessSec = Math.max(
    0,
    Number.isFinite(args.maxLatenessSec ?? NaN)
      ? Number(args.maxLatenessSec)
      : QUANTIZED_TRAFFIC_STALE_TRIGGER_SEC,
  );
  return args.currentTimeSec - args.dueTime > maxLatenessSec;
}

export function resolveQuantizedTrafficMicroJitterSec(args: {
  sourceKey: string;
  targetKind: CollisionTriggerTargetKind;
  macroDueTime: number;
  stepSec: number;
  mode?: 'regular' | 'catchup' | 'overflow';
  salt?: string | number;
}) {
  const safeStep = Math.max(0.005, Number.isFinite(args.stepSec) ? args.stepSec : 0.125);
  const mode = args.mode ?? 'regular';
  const maxByStep = clampNumber(safeStep * 0.12, 0.004, mode === 'overflow' ? QUANTIZED_TRAFFIC_SLOW_JITTER_MAX_SEC : QUANTIZED_TRAFFIC_MICRO_JITTER_MAX_SEC);
  const maxByMode = mode === 'catchup'
    ? Math.min(maxByStep, QUANTIZED_TRAFFIC_CATCHUP_JITTER_MAX_SEC)
    : mode === 'overflow'
      ? Math.min(maxByStep, QUANTIZED_TRAFFIC_SLOW_JITTER_MAX_SEC)
      : Math.min(maxByStep, safeStep >= SLOW_TRAFFIC_STEP_SEC ? QUANTIZED_TRAFFIC_SLOW_JITTER_MAX_SEC : QUANTIZED_TRAFFIC_MICRO_JITTER_MAX_SEC);
  const minByMode = mode === 'catchup' ? QUANTIZED_TRAFFIC_CATCHUP_JITTER_MIN_SEC : QUANTIZED_TRAFFIC_MICRO_JITTER_MIN_SEC;
  if (maxByMode <= minByMode) return 0;
  const macroMs = Math.round(args.macroDueTime * 1000);
  const randomish = hashUnitInterval(`${mode}:${args.targetKind}:${args.sourceKey}:${macroMs}:${args.salt ?? ''}`);
  return minByMode + randomish * (maxByMode - minByMode);
}

function isFiniteTime(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function resolveQuantizeAnchor(current: number | null, nowSec: number) {
  return Number.isFinite(current ?? NaN) ? current as number : nowSec;
}

export function getAnchoredQuantizeDueTime(nowSec: number, stepSec: number, anchorSec: number) {
  const safeStep = Math.max(0.005, stepSec);
  const elapsed = Math.max(0, nowSec - anchorSec);
  const nextStepIndex = Math.ceil(elapsed / safeStep);
  return anchorSec + nextStepIndex * safeStep;
}

export function resolveGridLockedTrafficDueTime(args: {
  dueTime: number;
  nowSec: number;
  stepSec: number;
  anchorSec: number;
}) {
  const minPlayableTime = args.nowSec + QUANTIZED_TRAFFIC_SCHEDULE_LEAD_SEC;
  if (args.dueTime >= minPlayableTime) return args.dueTime;

  return getAnchoredQuantizeDueTime(minPlayableTime, args.stepSec, args.anchorSec);
}

export function resolveBoundedMissedGridCatchupDueTime(args: {
  macroDueTime: number;
  nowSec: number;
  stepSec: number;
  anchorSec: number;
  sourceKey: string;
  targetKind: CollisionTriggerTargetKind;
}) {
  const minPlayableTime = args.nowSec + QUANTIZED_TRAFFIC_SCHEDULE_LEAD_SEC;
  if (args.macroDueTime >= minPlayableTime) {
    return {
      dueTime: args.macroDueTime + resolveQuantizedTrafficMicroJitterSec({ ...args, mode: 'regular' }),
      macroDueTime: args.macroDueTime,
      catchup: false,
    };
  }

  const lateBySec = minPlayableTime - args.macroDueTime;
  if (lateBySec <= QUANTIZED_TRAFFIC_MISSED_GRID_CATCHUP_GRACE_SEC) {
    return {
      dueTime: args.nowSec + resolveQuantizedTrafficMicroJitterSec({ ...args, mode: 'catchup', salt: Math.round(lateBySec * 1000) }),
      macroDueTime: args.macroDueTime,
      catchup: true,
    };
  }

  const nextMacroDueTime = getAnchoredQuantizeDueTime(minPlayableTime, args.stepSec, args.anchorSec);
  return {
    dueTime: nextMacroDueTime + resolveQuantizedTrafficMicroJitterSec({
      ...args,
      macroDueTime: nextMacroDueTime,
      mode: 'regular',
      salt: 'late-next-grid',
    }),
    macroDueTime: nextMacroDueTime,
    catchup: false,
  };
}

export function resolveTrafficQuantizeSchedule(args: {
  nowSec: number;
  stepSec: number;
  anchorSec: number;
  sourceKey: string;
  targetKind: CollisionTriggerTargetKind;
  eventTimeSec?: number | null;
}) {
  const eventTimeSec = isFiniteTime(args.eventTimeSec)
    ? Math.min(args.nowSec, Math.max(args.anchorSec, args.eventTimeSec))
    : args.nowSec;
  const plannedMacroDueTime = getAnchoredQuantizeDueTime(eventTimeSec, args.stepSec, args.anchorSec);
  const schedule = resolveBoundedMissedGridCatchupDueTime({
    macroDueTime: plannedMacroDueTime,
    nowSec: args.nowSec,
    stepSec: args.stepSec,
    anchorSec: args.anchorSec,
    sourceKey: args.sourceKey,
    targetKind: args.targetKind,
  });
  return {
    dueTime: schedule.dueTime,
    macroDueTime: schedule.macroDueTime,
  };
}

export function mergeQueuedCollisionTrigger(queue: QueuedCollisionTrigger[], next: QueuedCollisionTrigger) {
  const nextSourceKey = next.sourceKey;
  const nextMacro = next.macroDueTime ?? next.dueTime;
  if (!nextSourceKey) {
    queue.push(next);
    return;
  }
  const matchIndex = queue.findIndex((item) => (
    item.sourceKey === nextSourceKey
    && item.targetKind === next.targetKind
    && Math.abs((item.macroDueTime ?? item.dueTime) - nextMacro) < 0.001
  ));
  if (matchIndex < 0) {
    queue.push(next);
    return;
  }
  const current = queue[matchIndex];
  const strongerAmp = Math.max(current.amp, next.amp);
  queue[matchIndex] = {
    ...current,
    ...next,
    amp: strongerAmp,
    waveGain: Math.max(current.waveGain, next.waveGain),
    dueTime: Math.min(current.dueTime, next.dueTime),
    macroDueTime: nextMacro,
  };
}
