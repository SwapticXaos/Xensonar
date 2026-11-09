import type {
  RootFollowMaterialRenderArgs,
  RootFollowMaterialRenderResult,
  RootFollowPlaybackRefs,
} from "./rootFollowRendererTypes";
import {
  describeMaterialElasticPitch,
} from "../../l3lab/canonicalForge/canonicalPreviewMaterialElastic";
import {
  buildRootFollowMaterialWindowRenderPlan,
  executeRootFollowMaterialWindowRenderPlan,
  type RootFollowMaterialWindowRenderPlan,
} from "./rootFollowMaterialRenderPlan";
import { getEffectiveMaterialLoopBars } from "../material/materialLoopMath";
import { clamp } from "../rooms/resonanceRuntimeMath";
import { markAudioTrafficEvent } from "../audioTraffic/audioTrafficForensics";
import { recordAudioPressureAdaptiveAction } from "../../../core/audio/audioPressureMap";
import {
  buildRootFollowGranularRenderTuning,
  resolveRootFollowGranularSettings,
} from "./rootFollowGranularSettings";
import {
  firstRootFollowSliceOnGridAtOrAfter,
  smoothRootFollowMaterialTargetHz,
} from "./rootFollowMicroCutSafety";
import { makeRootFollowMaterialAudioNodeRegistrar } from "./rootFollowAudioNodeRegistry";
import {
  applyRootFollowCrisisDensityToGranularSettings,
  buildRootFollowCrisisRenderEnvelope,
  resolveRootFollowLateWindowStart,
  type RootFollowCrisisRenderEnvelope,
} from "./rootFollowCrisisRenderPolicy";
import {
  appendRootFollowGranularWorkletPlanWindow,
  createRootFollowGranularWorkletRenderPlan,
  type RootFollowGranularWorkletRenderPlan,
} from "./rootFollowGranularWorkletRenderPlan";
import { createRootFollowSampleBufferWorkletShadowTransfer } from "./rootFollowSampleBufferWorkletShadowTransfer";
import {
  getRootFollowWorkletShadowBridgeSnapshot,
  publishRootFollowWorkletBufferShadowTransfer,
  publishRootFollowWorkletGranularPilotBufferAndPlan,
  publishRootFollowWorkletGranularRenderPlan,
  publishRootFollowWorkletStableLaneBufferAndPlan,
  summarizeRootFollowWorkletPilotHealth,
} from "./rootFollowWorkletShadowBridge";
import { resolveRootFollowLegacyReliefGate } from "./rootFollowLegacyReliefGateContract";
import {
  getDirtyRootFollowWalze,
  peekDirtyRootFollowWalze,
} from "./rootFollowDirtyMaschine";
import { resolveRootFollowMaterialImpulseRasterRuntime } from "./rootFollowMaterialImpulseRasterRuntime";
import type { RootFollowVoiceEngineMode } from "../performanceCrisis/performanceCrisisTypes";
import { tryNativeRootFollowMaterialWindows, type NativeRootFollowMaterialWindowRequest } from './nativeRootFollowMaterialBridge';
import { executeNativeOwnedRootFollowForgeAux } from './nativeRootFollowMaterialForgeAux';

function wrapModulo(value: number, modulus: number) {
  if (!Number.isFinite(value) || !Number.isFinite(modulus) || modulus <= 0)
    return 0;
  const wrapped = value % modulus;
  return wrapped < 0 ? wrapped + modulus : wrapped;
}

const STABLE_LANE_RELIEF_MIN_RENDERED_FRAMES = 8192;
const STABLE_LANE_RELIEF_MIN_ACTIVE_QUANTA = 8;
const STABLE_LANE_RELIEF_MAX_FRAME_ADVANCE_AGE_MS = 450;

function resolveRootFollowSafeVoiceEngineMode(
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

type RootFollowStableLaneWorkletPlan = {
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

function buildRootFollowStableLaneStatePlan(args: {
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

function resolveRootFollowStableLaneBlend(args: {
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

function shouldRelieveLegacyRootFollowMaterialSlice(args: {
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

function markStableLaneLegacyRelief(args: {
  refs: RootFollowPlaybackRefs;
  ctx: AudioContext;
  mode: "flowing" | "fragment";
  reason: string;
  targetHz: number;
  anchorHz: number;
  playbackRate: number;
  windowStart: number;
  windowDur: number;
  stableLaneBlend: number;
  legacyBlend: number;
  stableLaneReliefReady: boolean;
  stableLaneRenderedFrameCount: number;
  stableLaneRenderedFrameDelta: number;
  stableLaneActiveRenderQuantumCount: number;
  activeRenderQuantumCount: number;
  lastStableLaneFrameAdvanceAtMs: number | null;
}) {
  markAudioTrafficEvent(args.refs.trafficRef?.current, {
    subsystem: "root-follow",
    kind: "worklet-stable-lane-relieves-legacy-slice",
    audioNowSec: args.ctx.currentTime,
    detail: {
      mode: args.mode,
      reason: args.reason,
      targetHz: args.targetHz,
      anchorHz: args.anchorHz,
      playbackRate: args.playbackRate,
      windowStart: args.windowStart,
      windowDur: args.windowDur,
      stableLaneBlend: args.stableLaneBlend,
      legacyBlend: args.legacyBlend,
      stableLaneReliefReady: args.stableLaneReliefReady,
      legacyReliefGate: "stable-lane-sustained-relief",
      stableLaneRenderedFrameCount: args.stableLaneRenderedFrameCount,
      stableLaneRenderedFrameDelta: args.stableLaneRenderedFrameDelta,
      stableLaneActiveRenderQuantumCount:
        args.stableLaneActiveRenderQuantumCount,
      activeRenderQuantumCount: args.activeRenderQuantumCount,
      lastStableLaneFrameAdvanceAtMs: args.lastStableLaneFrameAdvanceAtMs,
      expectedEffect:
        "less-main-thread-root-material-slice-spawning-after-sustained-worklet-proof",
    },
  });
}

function applyMaterialLateSliceResync(args: {
  ctx: AudioContext;
  refs: RootFollowPlaybackRefs;
  nextSliceStart: number;
  transportAnchor: number;
  sliceStepSec: number;
  minimumLeadInSec: number;
  mode: "flowing" | "fragment";
  envelope: RootFollowCrisisRenderEnvelope;
}) {
  const result = resolveRootFollowLateWindowStart({
    nextSliceStart: args.nextSliceStart,
    currentTime: args.ctx.currentTime,
    transportAnchor: args.transportAnchor,
    stepSec: args.sliceStepSec,
    minimumLeadInSec: args.minimumLeadInSec,
    envelope: args.envelope,
  });
  if (result.action !== "on-time") {
    markAudioTrafficEvent(args.refs.trafficRef?.current, {
      subsystem: "root-follow",
      kind: "late-slice-resync",
      audioNowSec: args.ctx.currentTime,
      detail: {
        mode: args.mode,
        action: result.action,
        stale: result.stale,
        lateByMs: result.lateByMs,
        previousNextSliceStart: args.nextSliceStart,
        resyncedNextSliceStart: result.nextSliceStart,
        staleWindowMs: args.envelope.staleWindowMs,
        lateGrainStrategy: args.envelope.lateGrainStrategy,
        densityScale: args.envelope.densityScale,
      },
    });
    recordAudioPressureAdaptiveAction("root-follow-late-slice-resync");
  }
  return result.nextSliceStart;
}

export async function scheduleRootFollowMaterialWindow(
  args: RootFollowMaterialRenderArgs,
): Promise<RootFollowMaterialRenderResult> {
  const {
    ctx,
    entry,
    quantizeBpm,
    rootFollowLoopTimeMode,
    refs,
    dynamicRefs,
    transportAnchor,
  } = args;
  const buffer = refs.cacheRef.current.get(entry.id);
  if (!buffer || !refs.gainRef.current) {
    return {
      nextSliceStart: args.nextSliceStart,
      sessionAnchorHz: args.sessionAnchorHz,
      materialSmoothedRootHz: args.materialSmoothedRootHz ?? null,
      delayMs: 16,
    };
  }

  let scheduledGainCleanupMs = 1200;
  const registerNode = makeRootFollowMaterialAudioNodeRegistrar({
    refs,
    getCleanupDelayMs: () => scheduledGainCleanupMs,
  });

  const barDur = (60 / Math.max(40, quantizeBpm || 108)) * 4;
  const interpretedBars = getEffectiveMaterialLoopBars(
    entry,
    rootFollowLoopTimeMode,
  );
  const baseDesiredLoopDur = Math.max(0.25, barDur * interpretedBars);
  const impulseRasterRuntime = resolveRootFollowMaterialImpulseRasterRuntime({
    baseDesiredLoopDur,
    transportAnchor,
    impulseRasterWindow: args.impulseRasterWindow ?? null,
  });
  const {
    impulseRasterWindow,
    desiredLoopDur,
    materialTransportAnchor,
    materialRenderHorizonEnd,
    impulseRasterSpeedFactor,
    clockInterpretation: impulseRasterClockInterpretation,
  } = impulseRasterRuntime;
  const loopStart = Math.max(
    0,
    Math.min(buffer.duration - 0.01, entry.loopStartSec ?? 0),
  );
  const loopEnd = Math.max(
    loopStart + 0.01,
    Math.min(buffer.duration, entry.loopEndSec ?? buffer.duration),
  );
  const sourceDuration = Math.max(0.01, loopEnd - loopStart);

  const granulationMode = dynamicRefs.granulationModeRef.current;
  const crisisEnvelope = buildRootFollowCrisisRenderEnvelope({
    policy: args.rootFollowPolicy,
    pressureBias: args.audioPressureBias ?? 0,
  });
  const granularSettings = applyRootFollowCrisisDensityToGranularSettings({
    settings: resolveRootFollowGranularSettings(
      dynamicRefs.granularSettingsRef.current,
      granulationMode,
    ),
    envelope: crisisEnvelope,
  });
  const granularTuning = buildRootFollowGranularRenderTuning(granularSettings);
  const dirtyDrosselDefaultEnabled = true;

  const requestedRootFollowVoiceEngineMode =
    args.rootFollowPolicy?.voiceEngineMode ?? "shadow-plan";
  const safeRootFollowVoiceEngineMode = resolveRootFollowSafeVoiceEngineMode(
    requestedRootFollowVoiceEngineMode,
  );
  const granularWorkletPrimaryCandidateEnabled =
    safeRootFollowVoiceEngineMode ===
    "worklet-granular-primary-candidate";
  const stableLanePrimaryAuditionEnabled =
    safeRootFollowVoiceEngineMode ===
    "worklet-stable-lane-primary-audition";
  const stableLaneWorkletPilotEnabled =
    safeRootFollowVoiceEngineMode === "worklet-stable-lane-pilot" ||
    stableLanePrimaryAuditionEnabled;
  const granularWorkletPilotEnabled =
    safeRootFollowVoiceEngineMode === "worklet-granular-pilot" ||
    stableLaneWorkletPilotEnabled ||
    granularWorkletPrimaryCandidateEnabled;
  const granularWorkletBufferShadowEnabled =
    safeRootFollowVoiceEngineMode === "worklet-buffer-shadow";
  const granularWorkletShadowEnabled =
    safeRootFollowVoiceEngineMode === "worklet-granular-shadow" ||
    granularWorkletBufferShadowEnabled ||
    granularWorkletPilotEnabled;
  if (requestedRootFollowVoiceEngineMode !== safeRootFollowVoiceEngineMode) {
    markAudioTrafficEvent(refs.trafficRef?.current, {
      subsystem: "root-follow",
      kind: "worklet-material-engine-demoted",
      audioNowSec: ctx.currentTime,
      detail: {
        requestedRootFollowVoiceEngineMode,
        safeRootFollowVoiceEngineMode,
        reason: "electron-browser-reference-restore-keeps-worklet-auditions-out-of-default-material-path",
      },
    });
  }
  const granularWorkletPilotHealth = summarizeRootFollowWorkletPilotHealth(
    getRootFollowWorkletShadowBridgeSnapshot(ctx),
  );
  const stableLaneBlend = resolveRootFollowStableLaneBlend({
    enabled: stableLaneWorkletPilotEnabled,
    stableLanePlanAcked: granularWorkletPilotHealth.stableLanePlanAcked,
    stableLaneBufferAcked: granularWorkletPilotHealth.stableLaneBufferAcked,
    stableLaneRenderedFrameCount:
      granularWorkletPilotHealth.stableLaneRenderedFrameCount,
    stableLaneRenderedFrameDelta:
      granularWorkletPilotHealth.stableLaneRenderedFrameDelta,
    stableLaneActiveRenderQuantumCount:
      granularWorkletPilotHealth.stableLaneActiveRenderQuantumCount,
    activeRenderQuantumCount:
      granularWorkletPilotHealth.activeRenderQuantumCount,
    lastStableLaneFrameAdvanceAtMs:
      granularWorkletPilotHealth.lastStableLaneFrameAdvanceAtMs,
    processLoopActive: granularWorkletPilotHealth.processLoopActive,
    processorErrorCount: granularWorkletPilotHealth.processorErrorCount,
    lastMessageAtMs: granularWorkletPilotHealth.lastMessageAtMs,
    lastStableLaneAckAtMs: granularWorkletPilotHealth.lastStableLaneAckAtMs,
    primaryAudition: stableLanePrimaryAuditionEnabled,
  });
  const granularWorkletPrimaryCanMuteLegacy =
    granularWorkletPrimaryCandidateEnabled &&
    granularWorkletPilotHealth.pilotHealth === "pilot-ready" &&
    granularWorkletPilotHealth.granularAccepted > 0 &&
    granularWorkletPilotHealth.granularBufferAvailable;
  const legacyReliefGate = resolveRootFollowLegacyReliefGate({
    stableLaneEnabled: stableLaneWorkletPilotEnabled,
    stableLaneProven: stableLaneBlend.stableLaneProven,
    stableLaneReliefReady: stableLaneBlend.stableLaneReliefReady,
    stableLaneWarmupReason: stableLaneBlend.stableLaneWarmupReason,
    fallbackReason: stableLaneBlend.fallbackReason,
    primaryCandidateCanMuteLegacy: granularWorkletPrimaryCanMuteLegacy,
    stableLanePrimaryAuditionReady:
      stableLanePrimaryAuditionEnabled &&
      stableLaneBlend.stableLaneProven &&
      stableLaneBlend.legacyBlend <= 0.001,
  });
  const legacyBaseDestination =
    stableLaneWorkletPilotEnabled && stableLaneBlend.legacyBlend < 0.999
      ? (() => {
          const legacyBlendGain = ctx.createGain();
          legacyBlendGain.gain.value = 1;
          if (typeof legacyBlendGain.gain.setTargetAtTime === "function") {
            legacyBlendGain.gain.setTargetAtTime(
              stableLaneBlend.legacyBlend,
              ctx.currentTime,
              0.055,
            );
          } else {
            legacyBlendGain.gain.value = stableLaneBlend.legacyBlend;
          }
          legacyBlendGain.connect(refs.gainRef.current!);
          registerNode(legacyBlendGain);
          markAudioTrafficEvent(refs.trafficRef?.current, {
            subsystem: "root-follow",
            kind: "worklet-stable-lane-blend",
            audioNowSec: ctx.currentTime,
            detail: {
              legacyBlend: stableLaneBlend.legacyBlend,
              stableLaneBlend: stableLaneBlend.stableLaneBlend,
              stableLaneProven: stableLaneBlend.stableLaneProven,
              stableLaneReliefReady: stableLaneBlend.stableLaneReliefReady,
              stableLaneWarmupReason: stableLaneBlend.stableLaneWarmupReason,
              stableLaneFallbackReason: stableLaneBlend.fallbackReason,
              stableLaneRenderedFrameCount:
                granularWorkletPilotHealth.stableLaneRenderedFrameCount,
              stableLaneRenderedFrameDelta:
                granularWorkletPilotHealth.stableLaneRenderedFrameDelta,
              stableLaneActiveRenderQuantumCount:
                granularWorkletPilotHealth.stableLaneActiveRenderQuantumCount,
              activeRenderQuantumCount:
                granularWorkletPilotHealth.activeRenderQuantumCount,
              lastStableLaneFrameAdvanceAtMs:
                granularWorkletPilotHealth.lastStableLaneFrameAdvanceAtMs,
              rootFollowVoiceEngineMode: safeRootFollowVoiceEngineMode,
              requestedRootFollowVoiceEngineMode,
              legacyReliefGate,
              legacyReliefGateSource:
                legacyReliefGate === "stable-lane-primary-audition"
                  ? "stable-lane-primary-audition"
                  : legacyReliefGate === "stable-lane-sustained-relief"
                    ? "stable-lane-sustained-relief"
                    : legacyReliefGate === "stable-lane-warmup"
                      ? "stable-lane-warmup"
                      : legacyReliefGate === "stable-lane-fallback"
                        ? "stable-lane-fallback"
                        : "no-relief",
              stableLanePlanAcked:
                granularWorkletPilotHealth.stableLanePlanAcked,
              stableLaneBufferAcked:
                granularWorkletPilotHealth.stableLaneBufferAcked,
            },
          });
          return legacyBlendGain;
        })()
      : refs.gainRef.current;
  const dirtyDrossel =
    dirtyDrosselDefaultEnabled && legacyBaseDestination
      ? getDirtyRootFollowWalze(ctx, legacyBaseDestination)
      : null;
  if (dirtyDrossel) {
    // Default path is the original Root-Follow granular renderer through a dirty
    // drossel bus. The Crazy Flutter walze bed stays muted unless a future variant
    // explicitly calls feuern(...).
    dirtyDrossel.drosselnWalzeBedOnly();
    dirtyDrossel.setElasticGain(
      Math.max(0.0001, Math.min(0.32, dynamicRefs.volumeRef.current * 0.92)),
      0.038,
    );
  } else {
    peekDirtyRootFollowWalze(ctx)?.drosseln();
  }
  const legacyDestination = dirtyDrossel
    ? dirtyDrossel.getElasticDestination()
    : legacyBaseDestination;
  let stableLanePlanSequence = Math.max(1, Math.floor(ctx.currentTime * 1000));
  let stableLanePlan: RootFollowStableLaneWorkletPlan | null = null;
  let granularWorkletPlan: RootFollowGranularWorkletRenderPlan | null =
    granularWorkletShadowEnabled
      ? createRootFollowGranularWorkletRenderPlan({
          mode:
            granularSettings.qualityMode === "fragment"
              ? "fragment"
              : "flowing",
          entryId: entry.id,
          audioNowSec: ctx.currentTime,
          transportAnchorSec: materialTransportAnchor,
          desiredLoopDurationSec: desiredLoopDur,
          sourceDurationSec: sourceDuration,
          loopStartSec: loopStart,
          loopEndSec: loopEnd,
          envelope: crisisEnvelope,
          settings: granularSettings,
          hasSampleBufferTransfer:
            granularWorkletBufferShadowEnabled || granularWorkletPilotEnabled,
          activeAudioPath: granularWorkletPilotEnabled,
        })
      : null;

  const granularWorkletBufferTransfer =
    granularWorkletBufferShadowEnabled || granularWorkletPilotEnabled
      ? createRootFollowSampleBufferWorkletShadowTransfer({
          entryId: entry.id,
          audioNowSec: ctx.currentTime,
          buffer,
          loopStartSec: loopStart,
          loopEndSec: loopEnd,
        })
      : null;

  if (granularWorkletBufferShadowEnabled && granularWorkletBufferTransfer) {
    publishRootFollowWorkletBufferShadowTransfer({
      ctx,
      audioNowSec: ctx.currentTime,
      transfer: granularWorkletBufferTransfer,
      trafficRef: refs.trafficRef,
    });
  }

  if (granularSettings.qualityMode !== "fragment") {
    const leadTimeSec = granularSettings.leadMs / 1000;
    // Flowing Root Follow is aligned with the earlier live-anchor renderer that did
    // not crackle: short, evenly admitted micro-slices, one continuous transport
    // phase, and a fresh root read for every admitted slice. The newer diagnostic
    // events stay intact, but the audio window geometry is deliberately reverted
    // from broad overlapping windows to the older stable 28/56 ms cadence.
    const sliceStepSec = granularSettings.stepMs / 1000;
    const sliceDurSec = granularSettings.windowMs / 1000;
    const minimumLeadInSec = granularSettings.startLeadMs / 1000;
    const minStart = Math.max(
      ctx.currentTime + minimumLeadInSec,
      materialTransportAnchor,
    );

    let nextSliceStart = Math.max(
      args.nextSliceStart,
      firstRootFollowSliceOnGridAtOrAfter({
        transportAnchor: materialTransportAnchor,
        stepSec: sliceStepSec,
        earliestStart: minStart,
      }),
    );
    if (nextSliceStart < ctx.currentTime - sliceDurSec) {
      nextSliceStart = firstRootFollowSliceOnGridAtOrAfter({
        transportAnchor: materialTransportAnchor,
        stepSec: sliceStepSec,
        earliestStart: ctx.currentTime + minimumLeadInSec,
      });
    }
    nextSliceStart = applyMaterialLateSliceResync({
      ctx,
      refs,
      nextSliceStart,
      transportAnchor: materialTransportAnchor,
      sliceStepSec,
      minimumLeadInSec,
      mode: "flowing",
      envelope: crisisEnvelope,
    });

    let sessionAnchorHz = args.sessionAnchorHz;
    let materialSmoothedRootHz = args.materialSmoothedRootHz ?? null;
    if (stableLaneWorkletPilotEnabled) {
      const statePlan = buildRootFollowStableLaneStatePlan({
        ctx,
        entryId: entry.id,
        loopStart,
        loopEnd,
        sourceDuration,
        desiredLoopDur,
        transportAnchor: materialTransportAnchor,
        planSequence: stableLanePlanSequence++,
        sessionAnchorHz,
        previousSmoothedRootHz: materialSmoothedRootHz,
        rawLiveTargetHz: clamp(
          dynamicRefs.getCurrentRootHzRef.current(),
          27.5,
          3520,
        ),
        stepSec: sliceStepSec,
        densityScale: crisisEnvelope.densityScale,
        gainBase: stableLaneBlend.stableLaneProven ? 0.058 : 0.042,
        stableLaneBlend: stableLaneBlend.stableLaneBlend,
        legacyBlend: stableLaneBlend.legacyBlend,
      });
      stableLanePlan = statePlan.plan;
      sessionAnchorHz = statePlan.sessionAnchorHz;
      materialSmoothedRootHz = statePlan.materialSmoothedRootHz;
      markAudioTrafficEvent(refs.trafficRef?.current, {
        subsystem: "root-follow",
        kind: "worklet-shadow-bridge",
        audioNowSec: ctx.currentTime,
        detail: {
          mode: "flowing-state-plan",
          source: "root-follow-material-renderer",
          eventType: "worklet-stable-lane-state-plan",
          planSequence: stableLanePlan.planSequence,
          targetHz: stableLanePlan.targetHz,
          anchorHz: stableLanePlan.anchorHz,
          playbackRate: stableLanePlan.playbackRate,
          densityScale: stableLanePlan.densityScale,
          stableLaneBlend: stableLanePlan.stableLaneBlend,
          legacyBlend: stableLanePlan.legacyBlend,
          stableLaneProven: stableLaneBlend.stableLaneProven,
          stableLaneReliefReady: stableLaneBlend.stableLaneReliefReady,
          stableLaneWarmupReason: stableLaneBlend.stableLaneWarmupReason,
          stableLaneFallbackReason: stableLaneBlend.fallbackReason,
          stableLaneRenderedFrameCount:
            granularWorkletPilotHealth.stableLaneRenderedFrameCount,
          stableLaneRenderedFrameDelta:
            granularWorkletPilotHealth.stableLaneRenderedFrameDelta,
          stableLaneActiveRenderQuantumCount:
            granularWorkletPilotHealth.stableLaneActiveRenderQuantumCount,
          activeRenderQuantumCount:
            granularWorkletPilotHealth.activeRenderQuantumCount,
          lastStableLaneFrameAdvanceAtMs:
            granularWorkletPilotHealth.lastStableLaneFrameAdvanceAtMs,
        },
      });
    }
    scheduledGainCleanupMs = 1200;
    const renderHorizon = Math.min(
      ctx.currentTime + leadTimeSec,
      materialRenderHorizonEnd,
    );
    const pendingNativeWindows: Array<{ plan: RootFollowMaterialWindowRenderPlan; request: NativeRootFollowMaterialWindowRequest }> = [];
    while (nextSliceStart < renderHorizon) {
      const loopPhase = wrapModulo(
        nextSliceStart - materialTransportAnchor,
        desiredLoopDur,
      );
      const remainingInCycleSec = Math.max(0.001, desiredLoopDur - loopPhase);
      const remainingInImpulseSlotSec = Math.max(
        0.001,
        materialRenderHorizonEnd - nextSliceStart,
      );
      const chunkDurSec = Math.min(
        sliceDurSec,
        remainingInCycleSec,
        remainingInImpulseSlotSec,
      );
      const rawLiveTargetHz = clamp(
        dynamicRefs.getCurrentRootHzRef.current(),
        27.5,
        3520,
      );
      const windowPlan = buildRootFollowMaterialWindowRenderPlan({
        buffer,
        currentTimeSec: ctx.currentTime,
        mode: "flowing",
        windowStartSec: nextSliceStart,
        windowDurationSec: chunkDurSec,
        transportAnchorSec: materialTransportAnchor,
        desiredLoopDurationSec: desiredLoopDur,
        loopStartSec: loopStart,
        loopEndSec: loopEnd,
        previousSmoothedRootHz: materialSmoothedRootHz,
        rawTargetHz: rawLiveTargetHz,
        entryRootHz: entry.rootHz ?? null,
        sessionAnchorHz,
        stepSec: sliceStepSec,
        tuning: granularTuning,
        minimumScheduleLeadSec: Math.min(
          0.018,
          Math.max(0.004, sliceStepSec * 0.5),
        ),
        crisis: {
          densityScale: crisisEnvelope.densityScale,
          densityReduction: crisisEnvelope.densityReduction,
          lateGrainStrategy: crisisEnvelope.lateGrainStrategy,
          staleWindowMs: crisisEnvelope.staleWindowMs,
        },
        impulse: impulseRasterWindow
          ? {
              globalSlot: impulseRasterWindow.globalSlot,
              cycleSlotIndex: impulseRasterWindow.cycleSlotIndex,
              counterIndex: impulseRasterWindow.counterIndex,
              counterDiv: impulseRasterWindow.policy.counterDiv,
              cycleDiv: impulseRasterWindow.policy.cycleDiv,
              slotStartSec: impulseRasterWindow.slotStartSec,
              slotEndSec: impulseRasterWindow.slotEndSec,
              rootFollowWindowStartSec: impulseRasterWindow.rootFollowWindowStartSec,
              rootFollowWindowEndSec: impulseRasterWindow.rootFollowWindowEndSec,
              rootFollowWindowDurSec: impulseRasterWindow.rootFollowWindowDurationSec,
              clockMode: impulseRasterWindow.clockMode,
              sourceCycleDurSec: baseDesiredLoopDur,
              renderLoopDurSec: desiredLoopDur,
              speedFactor: impulseRasterSpeedFactor,
              clockInterpretation: impulseRasterClockInterpretation,
            }
          : null,
      });
      if (!windowPlan) {
        nextSliceStart += sliceStepSec;
        continue;
      }
      materialSmoothedRootHz = windowPlan.nextSmoothedRootHz;
      sessionAnchorHz = windowPlan.nextSessionAnchorHz;
      const liveTargetHz = windowPlan.targetHz;
      const anchorHz = windowPlan.anchorHz;
      const pitchInfo = { elasticRate: windowPlan.playbackRate };
      const primarySlice = windowPlan.slices[0];
      const chunkOffsetSec = primarySlice?.sourceOffsetSec ?? loopStart;
      const chunkSourceDurSec = primarySlice?.sourceDurationSec ?? sourceDuration;

      markAudioTrafficEvent(refs.trafficRef?.current, {
        subsystem: "root-follow",
        kind: "render-window",
        audioNowSec: ctx.currentTime,
        detail: {
          mode:
            granularSettings.preset === "custom"
              ? "custom-live-anchor-slice"
              : "flowing-live-anchor-slice",
          targetHz: liveTargetHz,
          anchorHz,
          playbackRate: pitchInfo.elasticRate,
          windowStart: nextSliceStart,
          windowDur: chunkDurSec,
          granular: {
            powerMode: granularSettings.powerMode,
            microDensity: granularSettings.microDensity,
            sourceSpread: granularSettings.sourceSpread,
            jitter: granularSettings.jitter,
            maxGrainsPerWindow: granularSettings.maxGrainsPerWindow,
            impulseRaster: impulseRasterWindow
              ? {
                  globalSlot: impulseRasterWindow.globalSlot,
                  cycleSlotIndex: impulseRasterWindow.cycleSlotIndex,
                  counterIndex: impulseRasterWindow.counterIndex,
                  counterDiv: impulseRasterWindow.policy.counterDiv,
                  cycleDiv: impulseRasterWindow.policy.cycleDiv,
                  slotStartSec: impulseRasterWindow.slotStartSec,
                  slotEndSec: impulseRasterWindow.slotEndSec,
                  rootFollowWindowStartSec:
                    impulseRasterWindow.rootFollowWindowStartSec,
                  rootFollowWindowEndSec:
                    impulseRasterWindow.rootFollowWindowEndSec,
                  rootFollowWindowDurSec:
                    impulseRasterWindow.rootFollowWindowDurationSec,
                  clockMode: impulseRasterWindow.clockMode,
                  sourceCycleDurSec: baseDesiredLoopDur,
                  renderLoopDurSec: desiredLoopDur,
                  renderFragmentDurSec: desiredLoopDur,
                  speedFactor: impulseRasterSpeedFactor,
                  clockInterpretation: impulseRasterClockInterpretation,
                }
              : null,
            crisis: {
              densityScale: crisisEnvelope.densityScale,
              densityReduction: crisisEnvelope.densityReduction,
              lateGrainStrategy: crisisEnvelope.lateGrainStrategy,
              staleWindowMs: crisisEnvelope.staleWindowMs,
            },
          },
        },
      });
      markAudioTrafficEvent(refs.trafficRef?.current, {
        subsystem: "root-follow",
        kind: "retune-sample",
        audioNowSec: ctx.currentTime,
        detail: {
          targetHz: liveTargetHz,
          rawTargetHz: rawLiveTargetHz,
          anchorHz,
          playbackRate: pitchInfo.elasticRate,
        },
      });
      if (granularWorkletPlan) {
        appendRootFollowGranularWorkletPlanWindow(granularWorkletPlan, {
          mode: "flowing",
          quality: "base",
          windowStartSec: nextSliceStart,
          windowDurationSec: chunkDurSec,
          sourceOffsetSec: Math.max(
            loopStart,
            Math.min(loopEnd - 0.02, chunkOffsetSec),
          ),
          sourceDurationSec: Math.min(sourceDuration, chunkSourceDurSec),
          playbackRate: pitchInfo.elasticRate,
          targetHz: liveTargetHz,
          anchorHz,
          densityScale: crisisEnvelope.densityScale,
        });
      }
      if (stableLaneWorkletPilotEnabled) {
        stableLanePlan = {
          entryId: entry.id,
          planSequence: stableLanePlanSequence++,
          loopStartSec: loopStart,
          loopEndSec: loopEnd,
          sourceOffsetSec: Math.max(
            loopStart,
            Math.min(loopEnd - 0.02, chunkOffsetSec),
          ),
          playbackRate: pitchInfo.elasticRate,
          targetHz: liveTargetHz,
          anchorHz,
          gain:
            (stableLaneBlend.stableLaneProven ? 0.062 : 0.055) *
            Math.max(0.35, Math.min(1, crisisEnvelope.densityScale)),
          densityScale: crisisEnvelope.densityScale,
          stableLaneBlend: stableLaneBlend.stableLaneBlend,
          legacyBlend: stableLaneBlend.legacyBlend,
        };
      }
      if (granularWorkletPrimaryCanMuteLegacy) {
        markAudioTrafficEvent(refs.trafficRef?.current, {
          subsystem: "root-follow",
          kind: "worklet-primary-candidate-mutes-legacy-slice",
          audioNowSec: ctx.currentTime,
          detail: {
            mode: "flowing",
            reason: "pilot-health-ready",
            legacyReliefGate: "granular-primary-health",
            stableLaneReliefReady: stableLaneBlend.stableLaneReliefReady,
            stableLaneWarmupReason: stableLaneBlend.stableLaneWarmupReason,
            stableLaneFallbackReason: stableLaneBlend.fallbackReason,
            targetHz: liveTargetHz,
            anchorHz,
            playbackRate: pitchInfo.elasticRate,
            windowStart: nextSliceStart,
            windowDur: chunkDurSec,
            pilotHealth: granularWorkletPilotHealth,
          },
        });
      } else if (
        shouldRelieveLegacyRootFollowMaterialSlice({
          stableLaneEnabled: stableLaneWorkletPilotEnabled,
          stableLaneReliefReady: stableLaneBlend.stableLaneReliefReady,
          primaryCandidateCanMuteLegacy: granularWorkletPrimaryCanMuteLegacy,
        })
      ) {
        markStableLaneLegacyRelief({
          refs,
          ctx,
          mode: "flowing",
          reason: "stable-lane-sustained-replaces-legacy-material-slice",
          targetHz: liveTargetHz,
          anchorHz,
          playbackRate: pitchInfo.elasticRate,
          windowStart: nextSliceStart,
          windowDur: chunkDurSec,
          stableLaneBlend: stableLaneBlend.stableLaneBlend,
          legacyBlend: stableLaneBlend.legacyBlend,
          stableLaneReliefReady: stableLaneBlend.stableLaneReliefReady,
          stableLaneRenderedFrameCount:
            granularWorkletPilotHealth.stableLaneRenderedFrameCount,
          stableLaneRenderedFrameDelta:
            granularWorkletPilotHealth.stableLaneRenderedFrameDelta,
          stableLaneActiveRenderQuantumCount:
            granularWorkletPilotHealth.stableLaneActiveRenderQuantumCount,
          activeRenderQuantumCount:
            granularWorkletPilotHealth.activeRenderQuantumCount,
          lastStableLaneFrameAdvanceAtMs:
            granularWorkletPilotHealth.lastStableLaneFrameAdvanceAtMs,
        });
      } else {
        pendingNativeWindows.push({
          plan: windowPlan,
          request: {
            entryId: entry.id,
            buffer,
            plan: windowPlan,
            audioNowSec: ctx.currentTime,
            requestedAtMs: typeof performance !== 'undefined' ? performance.now() : Date.now(),
            volume: dynamicRefs.volumeRef.current,
          },
        });
      }

      nextSliceStart += sliceStepSec;
    }

    for (let batchStart = 0; batchStart < pendingNativeWindows.length; batchStart += 8) {
      const chunk = pendingNativeWindows.slice(batchStart, batchStart + 8);
      const results = await tryNativeRootFollowMaterialWindows(chunk.map(item => item.request));
      for (let i = 0; i < chunk.length; i++) {
        const item = chunk[i];
        const nativeResult = results[i] ?? { owned: false, reason: 'missing-native-result' };
        if (nativeResult.owned) {
          executeNativeOwnedRootFollowForgeAux({ ctx, forgeSend: dynamicRefs.getForgeSendRef.current(), volume: dynamicRefs.volumeRef.current, buffer, plan: item.plan, registerNode });
          markAudioTrafficEvent(refs.trafficRef?.current, { subsystem: 'root-follow', kind: 'grain-window', audioNowSec: ctx.currentTime, detail: { mode: 'flowing', entryId: entry.id, routing: 'native-rhythm+browser-forge-aux', reason: nativeResult.reason ?? null } });
        } else {
          executeRootFollowMaterialWindowRenderPlan({ ctx, destination: legacyDestination, buffer, plan: item.plan, registerNode });
        }
      }
    }

    if (
      stableLaneWorkletPilotEnabled &&
      granularWorkletBufferTransfer &&
      stableLanePlan
    ) {
      publishRootFollowWorkletStableLaneBufferAndPlan({
        ctx,
        audioNowSec: ctx.currentTime,
        transfer: granularWorkletBufferTransfer,
        lanePlan: stableLanePlan,
        trafficRef: refs.trafficRef,
      });
    } else if (granularWorkletPlan && granularWorkletPlan.windows.length > 0) {
      if (granularWorkletPilotEnabled && granularWorkletBufferTransfer) {
        publishRootFollowWorkletGranularPilotBufferAndPlan({
          ctx,
          audioNowSec: ctx.currentTime,
          transfer: granularWorkletBufferTransfer,
          plan: granularWorkletPlan,
          trafficRef: refs.trafficRef,
        });
      } else {
        publishRootFollowWorkletGranularRenderPlan({
          ctx,
          audioNowSec: ctx.currentTime,
          plan: granularWorkletPlan,
          trafficRef: refs.trafficRef,
        });
      }
    }
    const delayFloorMs = impulseRasterWindow ? 8 : 16;
    const leadGuardSec = impulseRasterWindow
      ? Math.min(leadTimeSec, 0.06)
      : leadTimeSec;
    const delayMs = Math.max(
      delayFloorMs,
      Math.min(
        250,
        (nextSliceStart - ctx.currentTime - leadGuardSec) * 1000,
      ),
    );
    return {
      nextSliceStart,
      sessionAnchorHz,
      materialSmoothedRootHz,
      delayMs,
    };
  }

  const leadTimeSec = granularSettings.leadMs / 1000;
  const sliceStepSec = granularSettings.stepMs / 1000;
  const sliceDurSec = granularSettings.windowMs / 1000;
  const minimumLeadInSec = granularSettings.startLeadMs / 1000;
  const minStart = Math.max(
    ctx.currentTime + minimumLeadInSec,
    materialTransportAnchor,
  );

  let nextSliceStart = Math.max(
    args.nextSliceStart,
    firstRootFollowSliceOnGridAtOrAfter({
      transportAnchor: materialTransportAnchor,
      stepSec: sliceStepSec,
      earliestStart: minStart,
    }),
  );
  if (nextSliceStart < ctx.currentTime - sliceDurSec) {
    nextSliceStart = firstRootFollowSliceOnGridAtOrAfter({
      transportAnchor: materialTransportAnchor,
      stepSec: sliceStepSec,
      earliestStart: ctx.currentTime + minimumLeadInSec,
    });
  }
  nextSliceStart = applyMaterialLateSliceResync({
    ctx,
    refs,
    nextSliceStart,
    transportAnchor: materialTransportAnchor,
    sliceStepSec,
    minimumLeadInSec,
    mode: "fragment",
    envelope: crisisEnvelope,
  });

  let sessionAnchorHz = args.sessionAnchorHz;
  let materialSmoothedRootHz = args.materialSmoothedRootHz ?? null;
  if (stableLaneWorkletPilotEnabled) {
    const statePlan = buildRootFollowStableLaneStatePlan({
      ctx,
      entryId: entry.id,
      loopStart,
      loopEnd,
      sourceDuration,
      desiredLoopDur,
      transportAnchor: materialTransportAnchor,
      planSequence: stableLanePlanSequence++,
      sessionAnchorHz,
      previousSmoothedRootHz: materialSmoothedRootHz,
      rawLiveTargetHz: clamp(
        dynamicRefs.getCurrentRootHzRef.current(),
        27.5,
        3520,
      ),
      stepSec: sliceStepSec,
      densityScale: crisisEnvelope.densityScale,
      gainBase: stableLaneBlend.stableLaneProven ? 0.052 : 0.038,
      stableLaneBlend: stableLaneBlend.stableLaneBlend,
      legacyBlend: stableLaneBlend.legacyBlend,
    });
    stableLanePlan = statePlan.plan;
    sessionAnchorHz = statePlan.sessionAnchorHz;
    materialSmoothedRootHz = statePlan.materialSmoothedRootHz;
    markAudioTrafficEvent(refs.trafficRef?.current, {
      subsystem: "root-follow",
      kind: "worklet-shadow-bridge",
      audioNowSec: ctx.currentTime,
      detail: {
        mode: "fragment-state-plan",
        source: "root-follow-material-renderer",
        eventType: "worklet-stable-lane-state-plan",
        planSequence: stableLanePlan.planSequence,
        targetHz: stableLanePlan.targetHz,
        anchorHz: stableLanePlan.anchorHz,
        playbackRate: stableLanePlan.playbackRate,
        densityScale: stableLanePlan.densityScale,
        stableLaneBlend: stableLanePlan.stableLaneBlend,
        legacyBlend: stableLanePlan.legacyBlend,
      },
    });
  }
  scheduledGainCleanupMs = 1200;
  const renderHorizon = Math.min(
    ctx.currentTime + leadTimeSec,
    materialRenderHorizonEnd,
  );
  const pendingNativeWindows: Array<{ plan: RootFollowMaterialWindowRenderPlan; request: NativeRootFollowMaterialWindowRequest }> = [];
  while (nextSliceStart < renderHorizon) {
    const rawLiveTargetHz = clamp(
      dynamicRefs.getCurrentRootHzRef.current(),
      27.5,
      3520,
    );
    const fragmentWindowDurationSec = Math.min(
      sliceDurSec,
      desiredLoopDur,
      Math.max(0.001, materialRenderHorizonEnd - nextSliceStart),
    );
    const windowPlan = buildRootFollowMaterialWindowRenderPlan({
      buffer,
      currentTimeSec: ctx.currentTime,
      mode: "fragment",
      windowStartSec: nextSliceStart,
      windowDurationSec: fragmentWindowDurationSec,
      transportAnchorSec: materialTransportAnchor,
      desiredLoopDurationSec: desiredLoopDur,
      loopStartSec: loopStart,
      loopEndSec: loopEnd,
      previousSmoothedRootHz: materialSmoothedRootHz,
      rawTargetHz: rawLiveTargetHz,
      entryRootHz: entry.rootHz ?? null,
      sessionAnchorHz,
      stepSec: sliceStepSec,
      tuning: granularTuning,
      minimumScheduleLeadSec: 0.006,
      crisis: {
        densityScale: crisisEnvelope.densityScale,
        densityReduction: crisisEnvelope.densityReduction,
        lateGrainStrategy: crisisEnvelope.lateGrainStrategy,
        staleWindowMs: crisisEnvelope.staleWindowMs,
      },
      impulse: impulseRasterWindow
        ? {
            globalSlot: impulseRasterWindow.globalSlot,
            cycleSlotIndex: impulseRasterWindow.cycleSlotIndex,
            counterIndex: impulseRasterWindow.counterIndex,
            counterDiv: impulseRasterWindow.policy.counterDiv,
            cycleDiv: impulseRasterWindow.policy.cycleDiv,
            slotStartSec: impulseRasterWindow.slotStartSec,
            slotEndSec: impulseRasterWindow.slotEndSec,
            rootFollowWindowStartSec: impulseRasterWindow.rootFollowWindowStartSec,
            rootFollowWindowEndSec: impulseRasterWindow.rootFollowWindowEndSec,
            rootFollowWindowDurSec: impulseRasterWindow.rootFollowWindowDurationSec,
            clockMode: impulseRasterWindow.clockMode,
            sourceCycleDurSec: baseDesiredLoopDur,
            renderLoopDurSec: desiredLoopDur,
            speedFactor: impulseRasterSpeedFactor,
            clockInterpretation: impulseRasterClockInterpretation,
          }
        : null,
    });
    if (!windowPlan) {
      nextSliceStart += sliceStepSec;
      continue;
    }
    materialSmoothedRootHz = windowPlan.nextSmoothedRootHz;
    sessionAnchorHz = windowPlan.nextSessionAnchorHz;
    const liveTargetHz = windowPlan.targetHz;
    const anchorHz = windowPlan.anchorHz;
    const pitchInfo = { elasticRate: windowPlan.playbackRate };

    markAudioTrafficEvent(refs.trafficRef?.current, {
      subsystem: "root-follow",
      kind: "grain-window",
      audioNowSec: ctx.currentTime,
      detail: {
        mode:
          granularSettings.preset === "custom" ? "custom-fragment" : "grainy",
        targetHz: liveTargetHz,
        rawTargetHz: rawLiveTargetHz,
        anchorHz,
        playbackRate: pitchInfo.elasticRate,
        windowStart: nextSliceStart,
        windowDur: Math.min(
          sliceDurSec,
          desiredLoopDur,
          Math.max(0.001, materialRenderHorizonEnd - nextSliceStart),
        ),
        granular: {
          powerMode: granularSettings.powerMode,
          microDensity: granularSettings.microDensity,
          sourceSpread: granularSettings.sourceSpread,
          jitter: granularSettings.jitter,
          maxGrainsPerWindow: granularSettings.maxGrainsPerWindow,
          impulseRaster: impulseRasterWindow
            ? {
                globalSlot: impulseRasterWindow.globalSlot,
                cycleSlotIndex: impulseRasterWindow.cycleSlotIndex,
                counterIndex: impulseRasterWindow.counterIndex,
                counterDiv: impulseRasterWindow.policy.counterDiv,
                cycleDiv: impulseRasterWindow.policy.cycleDiv,
                slotStartSec: impulseRasterWindow.slotStartSec,
                slotEndSec: impulseRasterWindow.slotEndSec,
                rootFollowWindowStartSec:
                  impulseRasterWindow.rootFollowWindowStartSec,
                rootFollowWindowEndSec:
                  impulseRasterWindow.rootFollowWindowEndSec,
                rootFollowWindowDurSec:
                  impulseRasterWindow.rootFollowWindowDurationSec,
                clockMode: impulseRasterWindow.clockMode,
                sourceCycleDurSec: baseDesiredLoopDur,
                renderLoopDurSec: desiredLoopDur,
                renderFragmentDurSec: desiredLoopDur,
                speedFactor: impulseRasterSpeedFactor,
                clockInterpretation: impulseRasterClockInterpretation,
              }
            : null,
          crisis: {
            densityScale: crisisEnvelope.densityScale,
            densityReduction: crisisEnvelope.densityReduction,
            lateGrainStrategy: crisisEnvelope.lateGrainStrategy,
            staleWindowMs: crisisEnvelope.staleWindowMs,
          },
        },
      },
    });
    markAudioTrafficEvent(refs.trafficRef?.current, {
      subsystem: "root-follow",
      kind: "retune-sample",
      audioNowSec: ctx.currentTime,
      detail: {
        targetHz: liveTargetHz,
        rawTargetHz: rawLiveTargetHz,
        anchorHz,
        playbackRate: pitchInfo.elasticRate,
      },
    });
    if (granularWorkletPlan) {
      appendRootFollowGranularWorkletPlanWindow(granularWorkletPlan, {
        mode: "fragment",
        quality: "fragment",
        windowStartSec: nextSliceStart,
        windowDurationSec: Math.min(
          sliceDurSec,
          desiredLoopDur,
          Math.max(0.001, materialRenderHorizonEnd - nextSliceStart),
        ),
        sourceOffsetSec: loopStart,
        sourceDurationSec: sourceDuration,
        playbackRate: pitchInfo.elasticRate,
        targetHz: liveTargetHz,
        anchorHz,
        densityScale: crisisEnvelope.densityScale,
      });
    }
    if (stableLaneWorkletPilotEnabled) {
      stableLanePlan = {
        entryId: entry.id,
        planSequence: stableLanePlanSequence++,
        loopStartSec: loopStart,
        loopEndSec: loopEnd,
        sourceOffsetSec: loopStart,
        playbackRate: pitchInfo.elasticRate,
        targetHz: liveTargetHz,
        anchorHz,
        gain:
          (stableLaneBlend.stableLaneProven ? 0.056 : 0.048) *
          Math.max(0.35, Math.min(1, crisisEnvelope.densityScale)),
        densityScale: crisisEnvelope.densityScale,
        stableLaneBlend: stableLaneBlend.stableLaneBlend,
        legacyBlend: stableLaneBlend.legacyBlend,
      };
    }
    if (granularWorkletPrimaryCanMuteLegacy) {
      markAudioTrafficEvent(refs.trafficRef?.current, {
        subsystem: "root-follow",
        kind: "worklet-primary-candidate-mutes-legacy-slice",
        audioNowSec: ctx.currentTime,
        detail: {
          mode: "fragment",
          reason: "pilot-health-ready",
          legacyReliefGate: "granular-primary-health",
          stableLaneReliefReady: stableLaneBlend.stableLaneReliefReady,
          stableLaneWarmupReason: stableLaneBlend.stableLaneWarmupReason,
          stableLaneFallbackReason: stableLaneBlend.fallbackReason,
          targetHz: liveTargetHz,
          anchorHz,
          playbackRate: pitchInfo.elasticRate,
          windowStart: nextSliceStart,
          windowDur: Math.min(
            sliceDurSec,
            desiredLoopDur,
            Math.max(0.001, materialRenderHorizonEnd - nextSliceStart),
          ),
          pilotHealth: granularWorkletPilotHealth,
        },
      });
    } else if (
      shouldRelieveLegacyRootFollowMaterialSlice({
        stableLaneEnabled: stableLaneWorkletPilotEnabled,
        stableLaneReliefReady: stableLaneBlend.stableLaneReliefReady,
        primaryCandidateCanMuteLegacy: granularWorkletPrimaryCanMuteLegacy,
      })
    ) {
      markStableLaneLegacyRelief({
        refs,
        ctx,
        mode: "fragment",
        reason: "stable-lane-sustained-replaces-legacy-material-slice",
        targetHz: liveTargetHz,
        anchorHz,
        playbackRate: pitchInfo.elasticRate,
        windowStart: nextSliceStart,
        windowDur: Math.min(
          sliceDurSec,
          desiredLoopDur,
          Math.max(0.001, materialRenderHorizonEnd - nextSliceStart),
        ),
        stableLaneBlend: stableLaneBlend.stableLaneBlend,
        legacyBlend: stableLaneBlend.legacyBlend,
        stableLaneReliefReady: stableLaneBlend.stableLaneReliefReady,
        stableLaneRenderedFrameCount:
          granularWorkletPilotHealth.stableLaneRenderedFrameCount,
        stableLaneRenderedFrameDelta:
          granularWorkletPilotHealth.stableLaneRenderedFrameDelta,
        stableLaneActiveRenderQuantumCount:
          granularWorkletPilotHealth.stableLaneActiveRenderQuantumCount,
        activeRenderQuantumCount:
          granularWorkletPilotHealth.activeRenderQuantumCount,
        lastStableLaneFrameAdvanceAtMs:
          granularWorkletPilotHealth.lastStableLaneFrameAdvanceAtMs,
      });
    } else {
      pendingNativeWindows.push({
        plan: windowPlan,
        request: {
          entryId: entry.id,
          buffer,
          plan: windowPlan,
          audioNowSec: ctx.currentTime,
          requestedAtMs: typeof performance !== 'undefined' ? performance.now() : Date.now(),
          volume: dynamicRefs.volumeRef.current,
        },
      });
    }

    nextSliceStart += sliceStepSec;
  }

  for (let batchStart = 0; batchStart < pendingNativeWindows.length; batchStart += 8) {
    const chunk = pendingNativeWindows.slice(batchStart, batchStart + 8);
    const results = await tryNativeRootFollowMaterialWindows(chunk.map(item => item.request));
    for (let i = 0; i < chunk.length; i++) {
      const item = chunk[i];
      const nativeResult = results[i] ?? { owned: false, reason: 'missing-native-result' };
      if (nativeResult.owned) {
        executeNativeOwnedRootFollowForgeAux({ ctx, forgeSend: dynamicRefs.getForgeSendRef.current(), volume: dynamicRefs.volumeRef.current, buffer, plan: item.plan, registerNode });
        markAudioTrafficEvent(refs.trafficRef?.current, { subsystem: 'root-follow', kind: 'grain-window', audioNowSec: ctx.currentTime, detail: { mode: 'fragment', entryId: entry.id, routing: 'native-rhythm+browser-forge-aux', reason: nativeResult.reason ?? null } });
      } else {
        executeRootFollowMaterialWindowRenderPlan({ ctx, destination: legacyDestination, buffer, plan: item.plan, registerNode });
      }
    }
  }

  if (
    stableLaneWorkletPilotEnabled &&
    granularWorkletBufferTransfer &&
    stableLanePlan
  ) {
    publishRootFollowWorkletStableLaneBufferAndPlan({
      ctx,
      audioNowSec: ctx.currentTime,
      transfer: granularWorkletBufferTransfer,
      lanePlan: stableLanePlan,
      trafficRef: refs.trafficRef,
    });
  } else if (granularWorkletPlan && granularWorkletPlan.windows.length > 0) {
    if (granularWorkletPilotEnabled && granularWorkletBufferTransfer) {
      publishRootFollowWorkletGranularPilotBufferAndPlan({
        ctx,
        audioNowSec: ctx.currentTime,
        transfer: granularWorkletBufferTransfer,
        plan: granularWorkletPlan,
        trafficRef: refs.trafficRef,
      });
    } else {
      publishRootFollowWorkletGranularRenderPlan({
        ctx,
        audioNowSec: ctx.currentTime,
        plan: granularWorkletPlan,
        trafficRef: refs.trafficRef,
      });
    }
  }
  const delayFloorMs = impulseRasterWindow ? 8 : 16;
  const leadGuardSec = impulseRasterWindow
    ? Math.min(leadTimeSec, 0.06)
    : leadTimeSec;
  const delayMs = Math.max(
    delayFloorMs,
    Math.min(
      250,
      (nextSliceStart - ctx.currentTime - leadGuardSec) * 1000,
    ),
  );
  return {
    nextSliceStart,
    sessionAnchorHz,
    materialSmoothedRootHz,
    delayMs,
  };
}
