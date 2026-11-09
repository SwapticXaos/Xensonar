import type { RootFollowGranularSettings } from './rootFollowGranularSettings';
import type { RootFollowCrisisRenderEnvelope } from './rootFollowCrisisRenderPolicy';

export type RootFollowGranularWorkletPlanMode = 'flowing' | 'fragment';

export type RootFollowGranularWorkletPlanWindow = {
  id: string;
  mode: RootFollowGranularWorkletPlanMode;
  quality: 'base' | 'fragment';
  windowStartSec: number;
  windowDurationSec: number;
  sourceOffsetSec: number;
  sourceDurationSec: number;
  playbackRate: number;
  targetHz: number;
  anchorHz: number;
  densityScale: number;
};

export type RootFollowGranularWorkletRenderPlan = {
  version: 1;
  lane: 'root-follow-material-granular';
  mode: RootFollowGranularWorkletPlanMode;
  entryId: string;
  audioNowSec: number;
  transportAnchorSec: number;
  desiredLoopDurationSec: number;
  sourceDurationSec: number;
  loopStartSec: number;
  loopEndSec: number;
  crisis: Pick<RootFollowCrisisRenderEnvelope, 'densityScale' | 'lateGrainStrategy' | 'staleWindowMs' | 'preventCatchUpStorm' | 'sourcePresetId'>;
  tuning: {
    grainWindowMs: number;
    grainStepMs: number;
    maxGrainsPerWindow: number;
    microDensity: number;
    jitter: number;
    sourceSpread: number;
  };
  windows: RootFollowGranularWorkletPlanWindow[];
  preservesLegacyMaterialPath: true;
  hasSampleBufferTransfer: boolean;
  activeAudioPath: boolean;
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));

export function createRootFollowGranularWorkletRenderPlan(args: {
  mode: RootFollowGranularWorkletPlanMode;
  entryId: string;
  audioNowSec: number;
  transportAnchorSec: number;
  desiredLoopDurationSec: number;
  sourceDurationSec: number;
  loopStartSec: number;
  loopEndSec: number;
  envelope: RootFollowCrisisRenderEnvelope;
  settings: RootFollowGranularSettings;
  hasSampleBufferTransfer?: boolean;
  activeAudioPath?: boolean;
}): RootFollowGranularWorkletRenderPlan {
  return {
    version: 1,
    lane: 'root-follow-material-granular',
    mode: args.mode,
    entryId: args.entryId,
    audioNowSec: args.audioNowSec,
    transportAnchorSec: args.transportAnchorSec,
    desiredLoopDurationSec: args.desiredLoopDurationSec,
    sourceDurationSec: args.sourceDurationSec,
    loopStartSec: args.loopStartSec,
    loopEndSec: args.loopEndSec,
    crisis: {
      densityScale: args.envelope.densityScale,
      lateGrainStrategy: args.envelope.lateGrainStrategy,
      staleWindowMs: args.envelope.staleWindowMs,
      preventCatchUpStorm: args.envelope.preventCatchUpStorm,
      sourcePresetId: args.envelope.sourcePresetId,
    },
    tuning: {
      grainWindowMs: clampNumber(args.settings.windowMs, 4, 240),
      grainStepMs: clampNumber(args.settings.stepMs, 2, 240),
      maxGrainsPerWindow: Math.round(clampNumber(args.settings.maxGrainsPerWindow, 1, 256)),
      microDensity: clampNumber(args.settings.microDensity, 0, 8),
      jitter: clampNumber(args.settings.jitter, 0, 1),
      sourceSpread: clampNumber(args.settings.sourceSpread, 0, 1),
    },
    windows: [],
    preservesLegacyMaterialPath: true,
    hasSampleBufferTransfer: args.hasSampleBufferTransfer === true,
    activeAudioPath: args.activeAudioPath === true,
  };
}

export function appendRootFollowGranularWorkletPlanWindow(
  plan: RootFollowGranularWorkletRenderPlan,
  window: Omit<RootFollowGranularWorkletPlanWindow, 'id'> & { id?: string | null },
) {
  if (plan.windows.length >= 96) return;
  const windowStartSec = clampNumber(window.windowStartSec, 0, Number.MAX_SAFE_INTEGER);
  const windowDurationSec = clampNumber(window.windowDurationSec, 0.001, 8);
  const sourceOffsetSec = clampNumber(window.sourceOffsetSec, 0, Number.MAX_SAFE_INTEGER);
  const sourceDurationSec = clampNumber(window.sourceDurationSec, 0.001, 8);
  const playbackRate = clampNumber(window.playbackRate, 0.03125, 32);
  const targetHz = clampNumber(window.targetHz, 1, 20000);
  const anchorHz = clampNumber(window.anchorHz, 1, 20000);
  plan.windows.push({
    id: window.id || `${plan.entryId}:${plan.mode}:${Math.round(windowStartSec * 1000)}:${plan.windows.length}`,
    mode: window.mode,
    quality: window.quality,
    windowStartSec,
    windowDurationSec,
    sourceOffsetSec,
    sourceDurationSec,
    playbackRate,
    targetHz,
    anchorHz,
    densityScale: clampNumber(window.densityScale, 0, 1),
  });
}

export function summarizeRootFollowGranularWorkletRenderPlan(plan: RootFollowGranularWorkletRenderPlan) {
  const totalWindowDurationSec = plan.windows.reduce((sum, window) => sum + window.windowDurationSec, 0);
  const earliestWindowStartSec = plan.windows.reduce(
    (min, window) => Math.min(min, window.windowStartSec),
    Number.POSITIVE_INFINITY,
  );
  const latestWindowEndSec = plan.windows.reduce(
    (max, window) => Math.max(max, window.windowStartSec + window.windowDurationSec),
    0,
  );
  return {
    version: 1 as const,
    lane: plan.lane,
    mode: plan.mode,
    entryId: plan.entryId,
    windowCount: plan.windows.length,
    totalWindowDurationSec: Math.round(totalWindowDurationSec * 10000) / 10000,
    horizonSec: Math.max(0, Math.round((latestWindowEndSec - plan.audioNowSec) * 10000) / 10000),
    earliestLeadMs: Number.isFinite(earliestWindowStartSec)
      ? Math.round((earliestWindowStartSec - plan.audioNowSec) * 10000) / 10
      : null,
    densityScale: plan.crisis.densityScale,
    staleWindowMs: plan.crisis.staleWindowMs,
    maxGrainsPerWindow: plan.tuning.maxGrainsPerWindow,
    preservesLegacyMaterialPath: plan.preservesLegacyMaterialPath,
    hasSampleBufferTransfer: plan.hasSampleBufferTransfer,
    activeAudioPath: plan.activeAudioPath,
  };
}

export const ROOT_FOLLOW_GRANULAR_WORKLET_RENDER_PLAN_SHADOW_DEFAULTS = {
  hasSampleBufferTransfer: false,
  activeAudioPath: false,
  preservesLegacyMaterialPath: true,
} as const;
