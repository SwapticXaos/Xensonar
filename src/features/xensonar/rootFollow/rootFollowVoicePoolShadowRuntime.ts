import type { RootFollowActiveSynthVoice } from './rootFollowRendererTypes';
import type { RootFollowCrisisRenderEnvelope } from './rootFollowCrisisRenderPolicy';

export type RootFollowVoiceLifecycleState =
  | 'active'
  | 'releasing'
  | 'stealable'
  | 'retired';

export type RootFollowVoicePoolRuntimeMode =
  | 'legacy'
  | 'shadow-plan'
  | 'main-thread-pool'
  | 'worklet-shadow'
  | 'worklet-direct-pilot'
  | 'worklet-granular-shadow'
  | 'worklet-buffer-shadow'
  | 'worklet-granular-pilot'
  | 'worklet-stable-lane-pilot'
  | 'worklet-stable-lane-primary-audition'
  | 'worklet-granular-primary-candidate';

export type RootFollowVoicePoolAudiblePath =
  | 'legacy-main-thread'
  | 'main-thread-pooled-direct'
  | 'worklet-shadow-muted'
  | 'worklet-direct-pilot'
  | 'worklet-granular-pilot'
  | 'worklet-stable-lane-pilot'
  | 'worklet-stable-lane-primary-audition'
  | 'worklet-granular-primary-candidate';

export type RootFollowVoicePoolShadowEvent = {
  id: string;
  voiceKey: string;
  noteStart: number;
  noteEnd: number;
  targetFrequency: number;
  sourceKind: string | null;
  noteClass: string | null;
  presetId: string | null;
};

export type RootFollowVoicePoolShadowSummary = {
  version: 1;
  mode: Exclude<RootFollowVoicePoolRuntimeMode, 'legacy'>;
  audiblePath: RootFollowVoicePoolAudiblePath;
  preservesLegacyPath: true;
  now: number;
  plannedVoiceCount: number;
  scheduledVoiceCount: number;
  pooledVoiceCount: number;
  existingVoiceCount: number;
  activeVoiceCount: number;
  releasingVoiceCount: number;
  stealableVoiceCount: number;
  retiredVoiceCount: number;
  staleEventCount: number;
  lateEventCount: number;
  wouldReuseVoiceCount: number;
  wouldCreateVoiceCount: number;
  wouldStealVoiceCount: number;
  maxPoolPressure: number;
  densityScale: number;
  staleWindowMs: number;
  sourcePresetId: string;
  lifecycleStateByVoiceId: Record<string, RootFollowVoiceLifecycleState>;
};

export type RootFollowVoicePoolAdmissionResult<T> = {
  eventsToSchedule: readonly T[];
  summary: RootFollowVoicePoolShadowSummary;
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));

function classifyRootFollowVoice(args: {
  now: number;
  voice: RootFollowActiveSynthVoice;
}): RootFollowVoiceLifecycleState {
  const { now, voice } = args;
  const endTime = Number.isFinite(voice.endTime) ? voice.endTime : now;
  if (endTime < now - 0.08) return 'retired';
  if (endTime < now + 0.018) return 'stealable';
  if (endTime < now + 0.09) return 'releasing';
  return 'active';
}

function rootFollowVoiceFamilyId(id: string) {
  const raw = String(id || '').trim();
  const withoutOscillatorSuffix = raw.split(':')[0] || raw;
  const withoutOccurrenceSuffix = withoutOscillatorSuffix.split('@')[0] || withoutOscillatorSuffix;
  return withoutOccurrenceSuffix || raw;
}

function isMainThreadPoolCandidate(event: RootFollowVoicePoolShadowEvent) {
  // Main-thread pooling is intentionally restricted to oscillator-like Direct/Synth events.
  // Sample/material-elastic paths keep their legacy scheduling until the later granular/worklet plan.
  return (event.sourceKind ?? 'synth-live') === 'synth-live';
}

function collectRootFollowVoiceLifecycle(args: {
  now: number;
  activeSynthVoices: ReadonlyMap<string, RootFollowActiveSynthVoice>;
}) {
  const lifecycleStateByVoiceId: Record<string, RootFollowVoiceLifecycleState> = {};
  const reusableFamilies = new Set<string>();
  let activeVoiceCount = 0;
  let releasingVoiceCount = 0;
  let stealableVoiceCount = 0;
  let retiredVoiceCount = 0;

  args.activeSynthVoices.forEach((voice, id) => {
    const state = classifyRootFollowVoice({ now: args.now, voice });
    lifecycleStateByVoiceId[id] = state;
    if (state === 'active') {
      activeVoiceCount += 1;
      reusableFamilies.add(rootFollowVoiceFamilyId(id));
    } else if (state === 'releasing') {
      releasingVoiceCount += 1;
      reusableFamilies.add(rootFollowVoiceFamilyId(id));
    } else if (state === 'stealable') {
      stealableVoiceCount += 1;
      reusableFamilies.add(rootFollowVoiceFamilyId(id));
    } else retiredVoiceCount += 1;
  });

  return {
    lifecycleStateByVoiceId,
    reusableFamilies,
    activeVoiceCount,
    releasingVoiceCount,
    stealableVoiceCount,
    retiredVoiceCount,
  };
}

export function buildRootFollowVoicePoolShadowEvents<T>(args: {
  events: readonly T[];
  getId: (event: T) => string;
  getNoteStart: (event: T) => number;
  getNoteDuration: (event: T) => number;
  getTargetFrequency: (event: T) => number;
  getSourceKind?: (event: T) => string | null | undefined;
  getNoteClass?: (event: T) => string | null | undefined;
  getPresetId?: (event: T) => string | null | undefined;
}): RootFollowVoicePoolShadowEvent[] {
  return args.events.map((event) => {
    const noteStart = args.getNoteStart(event);
    const noteDuration = Math.max(0.001, args.getNoteDuration(event));
    const id = args.getId(event);
    const sourceKind = args.getSourceKind?.(event) ?? null;
    const noteClass = args.getNoteClass?.(event) ?? null;
    const presetId = args.getPresetId?.(event) ?? null;
    const targetFrequency = Math.max(0.0001, args.getTargetFrequency(event));
    return {
      id,
      voiceKey: [rootFollowVoiceFamilyId(id), sourceKind ?? 'unknown', noteClass ?? 'standard', presetId ?? 'default'].join('::'),
      noteStart,
      noteEnd: noteStart + noteDuration,
      targetFrequency,
      sourceKind,
      noteClass,
      presetId,
    };
  });
}

export function summarizeRootFollowVoicePoolShadow(args: {
  now: number;
  activeSynthVoices: ReadonlyMap<string, RootFollowActiveSynthVoice>;
  events: readonly RootFollowVoicePoolShadowEvent[];
  crisisEnvelope: RootFollowCrisisRenderEnvelope;
  maxPoolSize?: number;
  mode?: Exclude<RootFollowVoicePoolRuntimeMode, 'legacy'>;
  scheduledVoiceCount?: number;
  pooledVoiceCount?: number;
}): RootFollowVoicePoolShadowSummary {
  const now = Number.isFinite(args.now) ? args.now : 0;
  const staleWindowSec = clampNumber(args.crisisEnvelope.staleWindowMs, 8, 160) / 1000;
  const lifecycle = collectRootFollowVoiceLifecycle({
    now,
    activeSynthVoices: args.activeSynthVoices,
  });

  let staleEventCount = 0;
  let lateEventCount = 0;
  let wouldReuseVoiceCount = 0;
  let wouldCreateVoiceCount = 0;
  for (const event of args.events) {
    if (event.noteEnd < now - staleWindowSec) {
      staleEventCount += 1;
      continue;
    }
    if (event.noteStart < now) lateEventCount += 1;
    const eventFamily = rootFollowVoiceFamilyId(event.id);
    if (isMainThreadPoolCandidate(event) && lifecycle.reusableFamilies.has(eventFamily)) wouldReuseVoiceCount += 1;
    else wouldCreateVoiceCount += 1;
  }

  const maxPoolSize = Math.max(1, Math.round(args.maxPoolSize ?? 48));
  const scheduledVoiceCount = Math.max(0, Math.round(args.scheduledVoiceCount ?? args.events.length));
  const projectedPressure =
    (lifecycle.activeVoiceCount + lifecycle.releasingVoiceCount + scheduledVoiceCount) / maxPoolSize;
  const wouldStealVoiceCount = Math.max(
    0,
    lifecycle.activeVoiceCount + lifecycle.releasingVoiceCount + scheduledVoiceCount - maxPoolSize,
  );
  const mode = args.mode ?? 'shadow-plan';

  return {
    version: 1,
    mode,
    audiblePath: mode === 'main-thread-pool'
      ? 'main-thread-pooled-direct'
      : mode === 'worklet-shadow'
        ? 'worklet-shadow-muted'
        : mode === 'worklet-direct-pilot'
          ? 'worklet-direct-pilot'
          : mode === 'worklet-granular-shadow'
            ? 'worklet-shadow-muted'
            : mode === 'worklet-buffer-shadow'
              ? 'worklet-shadow-muted'
              : mode === 'worklet-granular-pilot'
                ? 'worklet-granular-pilot'
                : mode === 'worklet-stable-lane-pilot'
                  ? 'worklet-stable-lane-pilot'
                  : mode === 'worklet-stable-lane-primary-audition'
                    ? 'worklet-stable-lane-primary-audition'
                    : mode === 'worklet-granular-primary-candidate'
                    ? 'worklet-granular-primary-candidate'
                    : 'legacy-main-thread',
    preservesLegacyPath: true,
    now,
    plannedVoiceCount: args.events.length,
    scheduledVoiceCount,
    pooledVoiceCount: Math.max(0, Math.round(args.pooledVoiceCount ?? 0)),
    existingVoiceCount: args.activeSynthVoices.size,
    activeVoiceCount: lifecycle.activeVoiceCount,
    releasingVoiceCount: lifecycle.releasingVoiceCount,
    stealableVoiceCount: lifecycle.stealableVoiceCount,
    retiredVoiceCount: lifecycle.retiredVoiceCount,
    staleEventCount,
    lateEventCount,
    wouldReuseVoiceCount,
    wouldCreateVoiceCount,
    wouldStealVoiceCount,
    maxPoolPressure: clampNumber(projectedPressure, 0, 4),
    densityScale: args.crisisEnvelope.densityScale,
    staleWindowMs: args.crisisEnvelope.staleWindowMs,
    sourcePresetId: args.crisisEnvelope.sourcePresetId,
    lifecycleStateByVoiceId: lifecycle.lifecycleStateByVoiceId,
  };
}

export function applyRootFollowMainThreadVoicePoolAdmission<T>(args: {
  mode: RootFollowVoicePoolRuntimeMode;
  now: number;
  activeSynthVoices: ReadonlyMap<string, RootFollowActiveSynthVoice>;
  events: readonly T[];
  shadowEvents: readonly RootFollowVoicePoolShadowEvent[];
  crisisEnvelope: RootFollowCrisisRenderEnvelope;
  maxPoolSize?: number;
}): RootFollowVoicePoolAdmissionResult<T> {
  if (args.mode !== 'main-thread-pool') {
    const shadowMode: Exclude<RootFollowVoicePoolRuntimeMode, 'legacy'> =
      args.mode === 'worklet-shadow'
        ? 'worklet-shadow'
        : args.mode === 'worklet-direct-pilot'
          ? 'worklet-direct-pilot'
          : args.mode === 'worklet-granular-shadow'
            ? 'worklet-granular-shadow'
            : args.mode === 'worklet-buffer-shadow'
              ? 'worklet-buffer-shadow'
              : args.mode === 'worklet-granular-pilot'
                ? 'worklet-granular-pilot'
                : args.mode === 'worklet-stable-lane-pilot'
                  ? 'worklet-stable-lane-pilot'
                  : args.mode === 'worklet-stable-lane-primary-audition'
                    ? 'worklet-stable-lane-primary-audition'
                    : args.mode === 'worklet-granular-primary-candidate'
                    ? 'worklet-granular-primary-candidate'
                    : 'shadow-plan';
    return {
      eventsToSchedule: args.events,
      summary: summarizeRootFollowVoicePoolShadow({
        now: args.now,
        activeSynthVoices: args.activeSynthVoices,
        events: args.shadowEvents,
        crisisEnvelope: args.crisisEnvelope,
        maxPoolSize: args.maxPoolSize,
        mode: shadowMode,
        scheduledVoiceCount: args.events.length,
        pooledVoiceCount: 0,
      }),
    };
  }

  const lifecycle = collectRootFollowVoiceLifecycle({
    now: args.now,
    activeSynthVoices: args.activeSynthVoices,
  });
  const eventsToSchedule: T[] = [];
  let pooledVoiceCount = 0;

  args.events.forEach((event, index) => {
    const shadowEvent = args.shadowEvents[index];
    if (!shadowEvent) {
      eventsToSchedule.push(event);
      return;
    }
    const staleWindowSec = clampNumber(args.crisisEnvelope.staleWindowMs, 8, 160) / 1000;
    const stale = shadowEvent.noteEnd < args.now - staleWindowSec;
    if (stale) return;
    const eventFamily = rootFollowVoiceFamilyId(shadowEvent.id);
    const canPool =
      isMainThreadPoolCandidate(shadowEvent) &&
      lifecycle.reusableFamilies.has(eventFamily) &&
      shadowEvent.noteEnd > args.now + 0.018;
    if (canPool) {
      pooledVoiceCount += 1;
      return;
    }
    eventsToSchedule.push(event);
  });

  return {
    eventsToSchedule,
    summary: summarizeRootFollowVoicePoolShadow({
      now: args.now,
      activeSynthVoices: args.activeSynthVoices,
      events: args.shadowEvents,
      crisisEnvelope: args.crisisEnvelope,
      maxPoolSize: args.maxPoolSize,
      mode: 'main-thread-pool',
      scheduledVoiceCount: eventsToSchedule.length,
      pooledVoiceCount,
    }),
  };
}

// guard-marker: | 'worklet-direct-pilot';
