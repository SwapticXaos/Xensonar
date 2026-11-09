import { useEffect, useMemo } from "react";
import { publishWaveStarterSpecialPathIsolationToBrowser } from "./waveStarterSpecialPathIsolationContract";
import type { PerformanceCrisisRuntimePolicy } from "./performanceCrisisRuntimePolicies";
import type {
  CrisisQuantizationGrid,
  CrisisQuantizationGridSelection,
  CrisisQuantizationModeSelection,
  ParticleAmbientMotionSelection,
  ParticleCrisisModeSelection,
  ParticleLoadReductionSelection,
  PerformanceCrisisPresetId,
  RootFollowVoiceEngineMode,
} from "./performanceCrisisTypes";

type CanonicalParticleQuantizeGrid = number;

const BALANCED_PRESET_ID: PerformanceCrisisPresetId = "balanced";
const BALANCED_ROOT_FOLLOW_ENGINE: RootFollowVoiceEngineMode = "shadow-plan";

const noopPreset = (_presetId: PerformanceCrisisPresetId) => undefined;
const noopParticleMode = (_mode: ParticleCrisisModeSelection) => undefined;
const noopAmbientMode = (_mode: ParticleAmbientMotionSelection) => undefined;
const noopLoadMode = (_mode: ParticleLoadReductionSelection) => undefined;
const noopQuantizationMode = (_mode: CrisisQuantizationModeSelection) => undefined;
const noopQuantizationGrid = (_grid: CrisisQuantizationGridSelection) => undefined;
const noopSegments = (_segments: number) => undefined;
const noopVoiceEngine = (_mode: RootFollowVoiceEngineMode) => undefined;

function buildBalancedCorePerformancePolicy(
  particleQuantizeGrid?: CanonicalParticleQuantizeGrid,
): PerformanceCrisisRuntimePolicy {
  const particleGrid = ([16, 24, 27, 32, 64].includes(particleQuantizeGrid ?? 16)
    ? String(particleQuantizeGrid ?? 16)
    : "other") as CrisisQuantizationGrid;
  const particleSegments = particleQuantizeGrid ?? 16;

  return {
    stylePresetId: BALANCED_PRESET_ID,
    particlePresetId: BALANCED_PRESET_ID,
    waveStarterPresetId: BALANCED_PRESET_ID,
    rootFollow: {
      sourcePresetId: BALANCED_PRESET_ID,
      quantization: {
        mode: "fallback",
        grid: "32",
        customSegmentsPerBar: 32,
        fallbackPressureFloor: 0.72,
        fallbackFullPressure: 0.94,
        holdLastValidUnderLoad: true,
        catchUpOnGrid: true,
      },
      overloadStrategy: "continue-last-valid",
      preserveTransportContinuity: true,
      preserveLastValidPitch: true,
      densityReductionUnderLoad: 0.12,
      lateGrainStrategy: "smear",
      staleWindowMs: 96,
      preventCatchUpStorm: true,
      voiceEngineMode: BALANCED_ROOT_FOLLOW_ENGINE,
    },
    particles: {
      passThroughCount: 5,
      denseFrameMaxIntents: 10,
      strongGainThreshold: 0.68,
      diversityBonus: 0.075,
      staleWindowMs: 32,
      catchUpStrategy: "smear",
      timeBasis: "hybrid",
      intentMode: "diverse",
      crisisMode: "quantization-loosening",
      smoothBeforeThin: true,
      maxMicroDelayMs: 14,
      pyramidMaxSubdivision: 1,
      liberationMaxEventsPerWindow: 6,
      ambientMotion: {
        mode: "gentle",
        enabled: true,
        minAmbientMotionScale: 0.82,
        attackMs: 650,
        releaseMs: 1100,
        preserveRingWaveMotion: true,
        preserveImpactImpulse: true,
        impactPreserveWindowMs: 180,
      },
      loadReduction: {
        mode: "soft-taper",
        enabled: true,
        pressureFloor: 0.78,
        fullEffectPressure: 0.96,
        minAudioIntentScale: 0.78,
        minFlushAdmissionScale: 0.78,
        preserveStrongImpacts: true,
        smoothAfterCrisisDistribution: true,
      },
      quantization: {
        mode: "fallback",
        grid: particleGrid,
        customSegmentsPerBar: particleSegments,
        fallbackPressureFloor: 0.72,
        fallbackFullPressure: 0.94,
        holdLastValidUnderLoad: true,
        catchUpOnGrid: true,
      },
      preserveStrongImpacts: true,
      preferDiverseImpacts: true,
      sourcePresetId: BALANCED_PRESET_ID,
    },
    waveStarter: {
      sourcePresetId: BALANCED_PRESET_ID,
      admissionMode: "defer",
      maxDeferralMs: 8,
      staleDropMs: 18,
      preserveStrongAttacks: true,
      specialPathIsolation: {
        holdGestureLoopWorkletBridge: true,
        holdGestureLegacyFallback: true,
        deferredSlot: true,
        staleFailoverCandidates: true,
        workletShadowMirroring: false,
        liveReports: true,
      },
    },
  };
}

export function usePerformanceCrisisUiPolicyState(args: {
  particleQuantizeGrid?: CanonicalParticleQuantizeGrid;
} = {}) {
  const performanceCrisisRuntimePolicy = useMemo(
    () => buildBalancedCorePerformancePolicy(args.particleQuantizeGrid),
    [args.particleQuantizeGrid],
  );

  useEffect(() => {
    publishWaveStarterSpecialPathIsolationToBrowser(
      performanceCrisisRuntimePolicy.waveStarter,
    );
  }, [performanceCrisisRuntimePolicy.waveStarter]);

  return {
    performanceCrisisPresetId: BALANCED_PRESET_ID,
    setPerformanceCrisisPresetId: noopPreset,
    particleCrisisPresetId: BALANCED_PRESET_ID,
    setParticleCrisisPresetId: noopPreset,
    waveStarterCrisisPresetId: BALANCED_PRESET_ID,
    setWaveStarterCrisisPresetId: noopPreset,
    particleCrisisMode: "preset" as ParticleCrisisModeSelection,
    setParticleCrisisMode: noopParticleMode,
    particleAmbientMotionMode: "preset" as ParticleAmbientMotionSelection,
    setParticleAmbientMotionMode: noopAmbientMode,
    particleLoadReductionMode: "preset" as ParticleLoadReductionSelection,
    setParticleLoadReductionMode: noopLoadMode,
    rootFollowQuantizationMode: "fallback" as CrisisQuantizationModeSelection,
    setRootFollowQuantizationMode: noopQuantizationMode,
    rootFollowQuantizationGrid: "32" as CrisisQuantizationGridSelection,
    setRootFollowQuantizationGrid: noopQuantizationGrid,
    rootFollowQuantizationCustomSegments: 32,
    setRootFollowQuantizationCustomSegments: noopSegments,
    rootFollowVoiceEngineMode: BALANCED_ROOT_FOLLOW_ENGINE,
    setRootFollowVoiceEngineMode: noopVoiceEngine,
    particleQuantizationMode: "fallback" as CrisisQuantizationModeSelection,
    setParticleQuantizationMode: noopQuantizationMode,
    particleQuantizationGrid: (args.particleQuantizeGrid
      ? String(args.particleQuantizeGrid)
      : "16") as CrisisQuantizationGridSelection,
    setParticleQuantizationGrid: noopQuantizationGrid,
    particleQuantizationCustomSegments: args.particleQuantizeGrid ?? 16,
    setParticleQuantizationCustomSegments: noopSegments,
    performanceCrisisRuntimePolicy,
  };
}
