import {
  buildMaterialElasticSlicePlan,
  describeMaterialElasticPitch,
  executeMaterialElasticSlicePlan,
  type MaterialElasticSlicePlan,
} from '../../l3lab/canonicalForge/canonicalPreviewMaterialElastic';
import { clamp } from '../rooms/resonanceRuntimeMath';
import type { RootFollowGranularRenderTuning } from './rootFollowGranularSettings';
import { smoothRootFollowMaterialTargetHz } from './rootFollowMicroCutSafety';

export const ROOT_FOLLOW_MATERIAL_RENDER_PLAN_VERSION = 1 as const;

export type RootFollowMaterialRenderMode = 'flowing' | 'fragment';

export type RootFollowMaterialCrisisPlan = {
  densityScale: number;
  densityReduction: number;
  lateGrainStrategy: string;
  staleWindowMs: number;
};

export type RootFollowMaterialImpulsePlan = {
  globalSlot: number;
  cycleSlotIndex: number;
  counterIndex: number;
  counterDiv: number;
  cycleDiv: number;
  slotStartSec: number;
  slotEndSec: number;
  rootFollowWindowStartSec: number;
  rootFollowWindowEndSec: number;
  rootFollowWindowDurSec: number;
  clockMode: string;
  sourceCycleDurSec: number;
  renderLoopDurSec: number;
  speedFactor: number;
  clockInterpretation: string;
} | null;

export type RootFollowMaterialSlicePlan = {
  noteStartSec: number;
  noteEndSec: number;
  sourceOffsetSec: number;
  sourceDurationSec: number;
  elastic: MaterialElasticSlicePlan;
};

export type RootFollowMaterialWindowRenderPlan = {
  version: typeof ROOT_FOLLOW_MATERIAL_RENDER_PLAN_VERSION;
  mode: RootFollowMaterialRenderMode;
  quality: 'base' | 'fragment';
  windowStartSec: number;
  windowDurationSec: number;
  transportAnchorSec: number;
  desiredLoopDurationSec: number;
  loopStartSec: number;
  loopEndSec: number;
  targetHz: number;
  rawTargetHz: number;
  anchorHz: number;
  playbackRate: number;
  nextSmoothedRootHz: number;
  nextSessionAnchorHz: number;
  stepSec: number;
  minimumScheduleLeadSec: number;
  crisis: RootFollowMaterialCrisisPlan;
  impulse: RootFollowMaterialImpulsePlan;
  routing: {
    masterRole: 'rhythm';
    auxDomains: readonly ['forge'];
  };
  slices: RootFollowMaterialSlicePlan[];
};

function wrapModulo(value: number, modulus: number) {
  if (!Number.isFinite(value) || !Number.isFinite(modulus) || modulus <= 0) return 0;
  const wrapped = value % modulus;
  return wrapped < 0 ? wrapped + modulus : wrapped;
}

export function buildRootFollowMaterialWindowRenderPlan(args: {
  buffer: AudioBuffer;
  currentTimeSec: number;
  mode: RootFollowMaterialRenderMode;
  windowStartSec: number;
  windowDurationSec: number;
  transportAnchorSec: number;
  desiredLoopDurationSec: number;
  loopStartSec: number;
  loopEndSec: number;
  previousSmoothedRootHz: number | null | undefined;
  rawTargetHz: number;
  entryRootHz: number | null | undefined;
  sessionAnchorHz: number | null | undefined;
  stepSec: number;
  tuning: RootFollowGranularRenderTuning;
  minimumScheduleLeadSec: number;
  crisis: RootFollowMaterialCrisisPlan;
  impulse: RootFollowMaterialImpulsePlan;
}): RootFollowMaterialWindowRenderPlan | null {
  const sourceDurationSec = Math.max(0.01, args.loopEndSec - args.loopStartSec);
  const desiredLoopDurationSec = Math.max(0.001, args.desiredLoopDurationSec);
  const windowDurationSec = Math.max(
    0,
    Math.min(args.windowDurationSec, desiredLoopDurationSec > 0 ? Math.max(args.windowDurationSec, 0) : 0),
  );
  if (windowDurationSec <= 0.006 || sourceDurationSec <= 0.008) return null;

  const rawTargetHz = clamp(Number.isFinite(args.rawTargetHz) ? args.rawTargetHz : 110, 27.5, 3520);
  const targetHz = smoothRootFollowMaterialTargetHz({
    previousHz: args.previousSmoothedRootHz,
    rawHz: rawTargetHz,
    stepSec: args.stepSec,
  });
  const anchorHz = Number.isFinite(args.entryRootHz ?? NaN)
    ? Math.max(1, Number(args.entryRootHz))
    : Number.isFinite(args.sessionAnchorHz ?? NaN)
      ? Math.max(1, Number(args.sessionAnchorHz))
      : Math.max(1, targetHz);
  const pitchInfo = describeMaterialElasticPitch({ targetHz, anchorHz });
  const quality = args.mode === 'fragment' ? 'fragment' as const : 'base' as const;
  const slices: RootFollowMaterialSlicePlan[] = [];

  if (args.mode === 'flowing') {
    const loopPhase = wrapModulo(args.windowStartSec - args.transportAnchorSec, desiredLoopDurationSec);
    const progress = clamp(loopPhase / desiredLoopDurationSec, 0, 1);
    const sourceOffsetSec = args.loopStartSec + sourceDurationSec * progress;
    const sourceDurationForWindow = Math.max(
      0.018,
      sourceDurationSec * (windowDurationSec / desiredLoopDurationSec) + 0.012,
    );
    const safeOffsetSec = Math.max(
      args.loopStartSec,
      Math.min(args.loopEndSec - 0.02, sourceOffsetSec),
    );
    const sourceDurationSecBounded = Math.min(sourceDurationSec, sourceDurationForWindow);
    const elastic = buildMaterialElasticSlicePlan({
      buffer: args.buffer,
      currentTime: args.currentTimeSec,
      noteStart: args.windowStartSec,
      noteEnd: args.windowStartSec + windowDurationSec,
      nominalDur: windowDurationSec,
      safeOffsetSec,
      sliceDurationSec: sourceDurationSecBounded,
      playbackRate: pitchInfo.elasticRate,
      quality,
      tuning: args.tuning,
      minimumScheduleLeadSec: args.minimumScheduleLeadSec,
    });
    slices.push({
      noteStartSec: args.windowStartSec,
      noteEndSec: args.windowStartSec + windowDurationSec,
      sourceOffsetSec: safeOffsetSec,
      sourceDurationSec: sourceDurationSecBounded,
      elastic,
    });
  } else {
    let remainingDurationSec = windowDurationSec;
    let segmentStartSec = args.windowStartSec;
    let loopPhase = wrapModulo(args.windowStartSec - args.transportAnchorSec, desiredLoopDurationSec);
    let guard = 0;
    while (remainingDurationSec > 0.006 && guard < 32) {
      guard += 1;
      const safePhase = clamp(loopPhase, 0, desiredLoopDurationSec);
      const untilWrapSec = Math.max(0.006, desiredLoopDurationSec - safePhase);
      const segmentDurationSec = Math.min(remainingDurationSec, untilWrapSec);
      const progress = clamp(safePhase / desiredLoopDurationSec, 0, 1);
      const sourceOffsetSec = args.loopStartSec + sourceDurationSec * progress;
      const remainingSourceSec = Math.max(0.008, sourceDurationSec - sourceDurationSec * progress);
      const sourceWindowSec = Math.max(
        0.008,
        Math.min(
          remainingSourceSec,
          sourceDurationSec * (segmentDurationSec / desiredLoopDurationSec),
        ),
      );
      const elastic = buildMaterialElasticSlicePlan({
        buffer: args.buffer,
        currentTime: args.currentTimeSec,
        noteStart: segmentStartSec,
        noteEnd: segmentStartSec + segmentDurationSec,
        nominalDur: segmentDurationSec,
        safeOffsetSec: sourceOffsetSec,
        sliceDurationSec: sourceWindowSec,
        playbackRate: pitchInfo.elasticRate,
        quality,
        tuning: args.tuning,
        minimumScheduleLeadSec: 0.006,
      });
      slices.push({
        noteStartSec: segmentStartSec,
        noteEndSec: segmentStartSec + segmentDurationSec,
        sourceOffsetSec,
        sourceDurationSec: sourceWindowSec,
        elastic,
      });
      remainingDurationSec -= segmentDurationSec;
      segmentStartSec += segmentDurationSec;
      loopPhase = 0;
    }
    // Existing product bounds make >32 segments unreachable. Refuse rather than truncate.
    if (remainingDurationSec > 0.006) return null;
  }

  return {
    version: ROOT_FOLLOW_MATERIAL_RENDER_PLAN_VERSION,
    mode: args.mode,
    quality,
    windowStartSec: args.windowStartSec,
    windowDurationSec,
    transportAnchorSec: args.transportAnchorSec,
    desiredLoopDurationSec,
    loopStartSec: args.loopStartSec,
    loopEndSec: args.loopEndSec,
    targetHz,
    rawTargetHz,
    anchorHz,
    playbackRate: pitchInfo.elasticRate,
    nextSmoothedRootHz: targetHz,
    nextSessionAnchorHz: anchorHz,
    stepSec: args.stepSec,
    minimumScheduleLeadSec: args.minimumScheduleLeadSec,
    crisis: args.crisis,
    impulse: args.impulse,
    routing: { masterRole: 'rhythm', auxDomains: ['forge'] },
    slices,
  };
}

export function executeRootFollowMaterialWindowRenderPlan(args: {
  ctx: AudioContext;
  destination: GainNode;
  buffer: AudioBuffer;
  plan: RootFollowMaterialWindowRenderPlan;
  registerNode: (node: AudioNode) => void;
}) {
  for (const slice of args.plan.slices) {
    executeMaterialElasticSlicePlan({
      ctx: args.ctx,
      destination: args.destination,
      buffer: args.buffer,
      plan: slice.elastic,
      noteEnd: slice.noteEndSec,
      registerNode: args.registerNode,
      pressureSource: 'root-follow-material-grain',
    });
  }
}
