import type { RootFollowMaterialRenderArgs } from "./rootFollowRendererTypes";
import { describeMaterialElasticPitch } from "../../l3lab/canonicalForge/canonicalPreviewMaterialElastic";
import { clamp } from "../rooms/resonanceRuntimeMath";
import { smoothRootFollowMaterialTargetHz } from "./rootFollowMicroCutSafety";
import type { RootFollowVoiceEngineMode } from "../performanceCrisis/performanceCrisisTypes";

function wrapModulo(value: number, modulus: number) {
  if (!Number.isFinite(value) || !Number.isFinite(modulus) || modulus <= 0)
    return 0;
  const wrapped = value % modulus;
  return wrapped < 0 ? wrapped + modulus : wrapped;
}

const STABLE_LANE_RELIEF_MIN_RENDERED_FRAMES = 8192;
const STABLE_LANE_RELIEF_MIN_ACTIVE_QUANTA = 8;
const STABLE_LANE_RELIEF_MAX_FRAME_ADVANCE_AGE_MS = 450;

export function resolveRootFollowSafeVoiceEngineMode(
  mode: NonNullable<RootFollowMaterialRenderArgs["rootFollowPolicy"]>["voiceEngineMode"] | undefined,
): RootFollowVoiceEngineMode {
  if (
    mode === "worklet-stable-lane-pilot" ||
    mode === "worklet-stable-lane-primary-audition" ||
    mode === "worklet-granular-primary-candidate" ||
    mode === "worklet-granular-pilot"
  ) {
    return "shadow-plan" as const;
  }
  return mode ?? "shadow-plan";
}

export type RootFollowStableLaneWorkletPlan = {
  entryId: string;
  planSequence: number;
  loopStartSec: number;
  loopEndSec: number;
  sourceOffsetSec: number;
  playbackRate: number;
  targetHz: number;
  anchorHz: number;
  gain: number;
  densityScale: number;
  stableLaneBlend: number;
  legacyBlend: number;
};

export function buildRootFollowStableLaneStatePlan(args: {
  ctx: AudioContext;
  entryId: string;
  loopStart: number;
  loopEnd: number;
  sourceDuration: number;
  desiredLoopDur: number;
  transportAnchor: number;
  planSequence: number;
  sessionAnchorHz: number | null;
  previousSmoothedRootHz: number | null;
  rawLiveTargetHz: number;
  stepSec: number;
  densityScale: number;
  gainBase: number;
  stableLaneBlend: number;
  legacyBlend: number;
}): {
  plan: RootFollowStableLaneWorkletPlan;
  sessionAnchorHz: number;
  materialSmoothedRootHz: number;
} {
  const liveTargetHz = smoothRootFollowMaterialTargetHz({
    previousHz: args.previousSmoothedRootHz,
    rawHz: args.rawLiveTargetHz,
    stepSec: args.stepSec,
  });
  const anchorHz = Number.isFinite(args.sessionAnchorHz ?? NaN)
    ? Math.max(1, Number(args.sessionAnchorHz))
    : Math.max(1, liveTargetHz);
  const pitchInfo = describeMaterialElasticPitch({
    targetHz: liveTargetHz,
    anchorHz,
  });
  const stateTime =
    args.ctx.currentTime + Math.max(0.012, Math.min(0.08, args.stepSec));
  const loopPhase = wrapModulo(
    stateTime - args.transportAnchor,
    args.desiredLoopDur,
  );
  const phaseRatio = clamp(
    loopPhase / Math.max(0.001, args.desiredLoopDur),
    0,
    1,
  );
  const sourceOffsetSec = args.loopStart + args.sourceDuration * phaseRatio;
  return {
    plan: {
      entryId: args.entryId,
      planSequence: args.planSequence,
      loopStartSec: args.loopStart,
      loopEndSec: args.loopEnd,
      sourceOffsetSec: Math.max(
        args.loopStart,
        Math.min(args.loopEnd - 0.02, sourceOffsetSec),
      ),
      playbackRate: pitchInfo.elasticRate,
      targetHz: liveTargetHz,
      anchorHz,
      gain: args.gainBase * Math.max(0.35, Math.min(1, args.densityScale)),
      densityScale: args.densityScale,
      stableLaneBlend: args.stableLaneBlend,
      legacyBlend: args.legacyBlend,
    },
    sessionAnchorHz: anchorHz,
    materialSmoothedRootHz: liveTargetHz,
  };
}

export function resolveRootFollowStableLaneBlend(args: {
  enabled: boolean;
  stableLanePlanAcked: boolean;
  stableLaneBufferAcked: boolean;
  stableLaneRenderedFrameCount: number;
  stableLaneRenderedFrameDelta: number;
  stableLaneActiveRenderQuantumCount: number;
  activeRenderQuantumCount: number;
  lastStableLaneFrameAdvanceAtMs: number | null;
  processLoopActive: boolean;
  processorErrorCount: number;
  lastMessageAtMs: number | null;
  lastStableLaneAckAtMs: number | null;
  primaryAudition: boolean;
}): {
  legacyBlend: number;
  stableLaneBlend: number;
  stableLaneProven: boolean;
  stableLaneReliefReady: boolean;
  stableLaneWarmupReason: string | null;
  fallbackReason: string | null;
} {
  if (!args.enabled) {
    return {
      legacyBlend: 1,
      stableLaneBlend: 0,
      stableLaneProven: false,
      stableLaneReliefReady: false,
      stableLaneWarmupReason: null,
      fallbackReason: null,
    };
  }
  const now =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  const throughputFresh =
    typeof args.lastMessageAtMs === "number" &&
    now - args.lastMessageAtMs <= 900;
  const ackFresh =
    typeof args.lastStableLaneAckAtMs === "number" &&
    now - args.lastStableLaneAckAtMs <= 2200;
  let fallbackReason: string | null = null;
  if (args.processorErrorCount > 0) fallbackReason = "processor-error";
  else if (!args.processLoopActive) fallbackReason = "process-loop-inactive";
  else if (!throughputFresh) fallbackReason = "throughput-stale";
  else if (!args.stableLaneBufferAcked) fallbackReason = "buffer-ack-missing";
  else if (!args.stableLanePlanAcked) fallbackReason = "plan-ack-missing";
  else if (!ackFresh) fallbackReason = "plan-ack-stale";
  else if (args.stableLaneRenderedFrameCount <= 0)
    fallbackReason = "rendered-frames-missing";
  const stableLaneProven = fallbackReason === null;
  if (!stableLaneProven) {
    return {
      legacyBlend: 1,
      stableLaneBlend: 0.42,
      stableLaneProven,
      stableLaneReliefReady: false,
      stableLaneWarmupReason: null,
      fallbackReason,
    };
  }

  if (args.primaryAudition) {
    return {
      legacyBlend: 0,
      stableLaneBlend: 0.86,
      stableLaneProven,
      stableLaneReliefReady: true,
      stableLaneWarmupReason: null,
      fallbackReason: null,
    };
  }

  // A fresh/proven Stable Lane may participate, but it does not own the
  // Root/Material lane until it has rendered for a small sustained window and
  // keeps advancing in the current throughput window. This is the 9.124 guard
  // against a historic counter falsely muting the live Legacy Root/Material path.
  const frameAdvanceFresh =
    typeof args.lastStableLaneFrameAdvanceAtMs === "number" &&
    now - args.lastStableLaneFrameAdvanceAtMs <=
      STABLE_LANE_RELIEF_MAX_FRAME_ADVANCE_AGE_MS;
  let stableLaneWarmupReason: string | null = null;
  if (
    args.stableLaneRenderedFrameCount < STABLE_LANE_RELIEF_MIN_RENDERED_FRAMES
  ) {
    stableLaneWarmupReason = "stable-lane-rendered-frames-warmup";
  } else if (
    args.stableLaneActiveRenderQuantumCount <
    STABLE_LANE_RELIEF_MIN_ACTIVE_QUANTA
  ) {
    stableLaneWarmupReason = "stable-lane-active-quanta-warmup";
  } else if (args.stableLaneRenderedFrameDelta <= 0 || !frameAdvanceFresh) {
    stableLaneWarmupReason = "stable-lane-frame-advance-window-stale";
  }
  const stableLaneReliefReady = stableLaneWarmupReason === null;
  if (!stableLaneReliefReady) {
    return {
      legacyBlend: 0.68,
      stableLaneBlend: 0.56,
      stableLaneProven,
      stableLaneReliefReady: false,
      stableLaneWarmupReason,
      fallbackReason: null,
    };
  }

  return {
    legacyBlend: 0,
    stableLaneBlend: 0.72,
    stableLaneProven,
    stableLaneReliefReady,
    stableLaneWarmupReason: null,
    fallbackReason: null,
  };
}

export function shouldRelieveLegacyRootFollowMaterialSlice(args: {
  stableLaneEnabled: boolean;
  stableLaneReliefReady: boolean;
  primaryCandidateCanMuteLegacy: boolean;
}) {
  // This is not event restriction. It is renderer ownership transfer:
  // only after the stable-lane Worklet has rendered a short sustained window
  // do we stop scheduling redundant legacy Root/Material micro-slices that
  // create Main-Thread AudioNode pressure. Before sustained proof, legacy stays
  // active, including the proven-but-warming additive state.
  return (
    args.stableLaneEnabled &&
    args.stableLaneReliefReady &&
    !args.primaryCandidateCanMuteLegacy
  );
}

