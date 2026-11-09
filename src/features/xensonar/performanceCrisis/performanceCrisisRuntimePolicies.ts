import type {
  CrisisQuantizationGrid,
  CrisisQuantizationGridSelection,
  CrisisQuantizationMode,
  CrisisQuantizationModeSelection,
  CrisisQuantizationPolicy,
  ParticleAmbientMotionMode,
  ParticleAmbientMotionSelection,
  ParticleCrisisMode,
  ParticleCrisisModeSelection,
  ParticleLoadReductionMode,
  ParticleLoadReductionSelection,
  ParticlePerformancePolicy,
  PerformanceCrisisPresetId,
  RootFollowVoiceEngineMode,
  WaveStarterPerformancePolicy,
} from "./performanceCrisisTypes";
import { resolvePerformanceCrisisPreset } from "./performanceCrisisPresetRegistry";

export type ParticleLoadReductionRuntimePolicy = {
  mode: ParticleLoadReductionMode;
  enabled: boolean;
  pressureFloor: number;
  fullEffectPressure: number;
  minAudioIntentScale: number;
  minFlushAdmissionScale: number;
  preserveStrongImpacts: true;
  smoothAfterCrisisDistribution: true;
};

export type ParticleMotionRuntimePolicy = {
  mode: ParticleAmbientMotionMode;
  enabled: boolean;
  minAmbientMotionScale: number;
  attackMs: number;
  releaseMs: number;
  preserveRingWaveMotion: true;
  preserveImpactImpulse: true;
  impactPreserveWindowMs: number;
};

export type CrisisQuantizationRuntimePolicy = CrisisQuantizationPolicy;

export type RootFollowRuntimePolicy = {
  sourcePresetId: PerformanceCrisisPresetId;
  quantization: CrisisQuantizationRuntimePolicy;
  overloadStrategy: "continue-last-valid" | "reduce-density" | "jump-current";
  preserveTransportContinuity: boolean;
  preserveLastValidPitch: boolean;
  densityReductionUnderLoad: number;
  lateGrainStrategy: import("./performanceCrisisTypes").CrisisCatchUpStrategy;
  staleWindowMs: number;
  preventCatchUpStorm: boolean;
  voiceEngineMode: RootFollowVoiceEngineMode;
};

export type ParticleAudioIntentRuntimePolicy = {
  passThroughCount: number;
  denseFrameMaxIntents: number;
  strongGainThreshold: number;
  diversityBonus: number;
  staleWindowMs: number;
  catchUpStrategy: ParticlePerformancePolicy["catchUpStrategy"];
  timeBasis: ParticlePerformancePolicy["timeBasis"];
  intentMode: ParticlePerformancePolicy["intentMode"];
  crisisMode: ParticleCrisisMode;
  smoothBeforeThin: boolean;
  maxMicroDelayMs: number;
  pyramidMaxSubdivision: 1 | 2 | 4;
  liberationMaxEventsPerWindow: number;
  ambientMotion: ParticleMotionRuntimePolicy;
  loadReduction: ParticleLoadReductionRuntimePolicy;
  quantization: CrisisQuantizationRuntimePolicy;
  preserveStrongImpacts: boolean;
  preferDiverseImpacts: boolean;
  sourcePresetId: PerformanceCrisisPresetId;
};

export type WaveStarterRuntimePolicy = WaveStarterPerformancePolicy & {
  sourcePresetId: PerformanceCrisisPresetId;
};

export type PerformanceCrisisRuntimePolicy = {
  stylePresetId: PerformanceCrisisPresetId;
  particlePresetId: PerformanceCrisisPresetId;
  waveStarterPresetId: PerformanceCrisisPresetId;
  rootFollow: RootFollowRuntimePolicy;
  particles: ParticleAudioIntentRuntimePolicy;
  waveStarter: WaveStarterRuntimePolicy;
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));

function resolveParticlePassThrough(policy: ParticlePerformancePolicy): number {
  if (policy.intentMode === "open") return 6;
  if (policy.intentMode === "pressure-safe") return 4;
  if (policy.intentMode === "soloistic") return 3;
  if (policy.intentMode === "textural") return 5;
  return 5;
}

function resolveStrongGainThreshold(policy: ParticlePerformancePolicy): number {
  if (policy.intentMode === "open") return 0.72;
  if (policy.intentMode === "pressure-safe") return 0.62;
  if (policy.intentMode === "soloistic") return 0.58;
  if (policy.intentMode === "textural") return 0.7;
  return 0.68;
}

function resolveDiversityBonus(policy: ParticlePerformancePolicy): number {
  if (!policy.preferDiverseImpacts) return 0.025;
  if (policy.intentMode === "pressure-safe") return 0.11;
  if (policy.intentMode === "soloistic") return 0.09;
  return 0.075;
}

function resolveParticleStaleWindow(policy: ParticlePerformancePolicy): number {
  if (policy.catchUpStrategy === "drop") return 18;
  if (policy.catchUpStrategy === "jump") return 14;
  if (policy.catchUpStrategy === "freeze") return 22;
  if (policy.catchUpStrategy === "short-catch-up") return 28;
  return 32;
}

function resolveCrisisQuantizationPolicy(
  policy: CrisisQuantizationPolicy,
  modeOverride?: CrisisQuantizationModeSelection,
  gridOverride?: CrisisQuantizationGridSelection,
  customSegmentsOverride?: number,
): CrisisQuantizationRuntimePolicy {
  const mode: CrisisQuantizationMode =
    modeOverride && modeOverride !== "preset" ? modeOverride : policy.mode;
  const grid: CrisisQuantizationGrid =
    gridOverride && gridOverride !== "preset" ? gridOverride : policy.grid;
  const customSegmentsPerBar = clampNumber(
    customSegmentsOverride ?? policy.customSegmentsPerBar,
    1,
    256,
  );
  return {
    ...policy,
    mode,
    grid,
    customSegmentsPerBar: Math.round(customSegmentsPerBar),
    fallbackPressureFloor: clampNumber(policy.fallbackPressureFloor, 0, 1),
    fallbackFullPressure: clampNumber(
      policy.fallbackFullPressure,
      policy.fallbackPressureFloor,
      1,
    ),
    holdLastValidUnderLoad: policy.holdLastValidUnderLoad,
    catchUpOnGrid: policy.catchUpOnGrid,
  };
}

function resolveParticleLoadReduction(
  policy: ParticlePerformancePolicy,
  override?: ParticleLoadReductionSelection,
): ParticleLoadReductionRuntimePolicy {
  const base = { ...policy.loadReduction };
  const selectedMode = override && override !== "preset" ? override : base.mode;
  if (selectedMode === "off") {
    return {
      ...base,
      mode: "off",
      enabled: false,
      pressureFloor: 1,
      fullEffectPressure: 1,
      minAudioIntentScale: 1,
      minFlushAdmissionScale: 1,
      preserveStrongImpacts: true,
      smoothAfterCrisisDistribution: true,
    };
  }
  if (selectedMode === "emergency-thin") {
    return {
      ...base,
      mode: "emergency-thin",
      enabled: true,
      pressureFloor: Math.min(base.pressureFloor, 0.66),
      fullEffectPressure: Math.min(base.fullEffectPressure, 0.94),
      minAudioIntentScale: Math.min(base.minAudioIntentScale, 0.48),
      minFlushAdmissionScale: Math.min(base.minFlushAdmissionScale, 0.5),
      preserveStrongImpacts: true,
      smoothAfterCrisisDistribution: true,
    };
  }
  if (selectedMode === "adaptive-thin") {
    return {
      ...base,
      mode: "adaptive-thin",
      enabled: true,
      pressureFloor: Math.min(base.pressureFloor, 0.72),
      fullEffectPressure: Math.min(base.fullEffectPressure, 0.98),
      minAudioIntentScale: Math.min(base.minAudioIntentScale, 0.62),
      minFlushAdmissionScale: Math.min(base.minFlushAdmissionScale, 0.64),
      preserveStrongImpacts: true,
      smoothAfterCrisisDistribution: true,
    };
  }
  return {
    ...base,
    mode: "soft-taper",
    enabled: true,
    pressureFloor: Math.max(0.74, base.pressureFloor),
    fullEffectPressure: Math.max(0.92, base.fullEffectPressure),
    minAudioIntentScale: Math.max(0.72, base.minAudioIntentScale),
    minFlushAdmissionScale: Math.max(0.72, base.minFlushAdmissionScale),
    preserveStrongImpacts: true,
    smoothAfterCrisisDistribution: true,
  };
}

function resolveParticleCrisisMode(
  policy: ParticlePerformancePolicy,
  override?: ParticleCrisisModeSelection,
): ParticleCrisisMode {
  if (override && override !== "preset") return override;
  return policy.crisisMode;
}

function resolveParticleAmbientMotion(
  policy: ParticlePerformancePolicy,
  override?: ParticleAmbientMotionSelection,
): ParticleMotionRuntimePolicy {
  const base = { ...policy.ambientMotion };
  const selectedMode = override && override !== "preset" ? override : base.mode;
  if (selectedMode === "off") {
    return {
      ...base,
      mode: "off",
      enabled: false,
      minAmbientMotionScale: 1,
    };
  }
  if (selectedMode === "viscous") {
    return {
      ...base,
      mode: "viscous",
      enabled: true,
      minAmbientMotionScale: Math.min(base.minAmbientMotionScale, 0.68),
      attackMs: Math.min(base.attackMs, 520),
      releaseMs: Math.max(base.releaseMs, 950),
    };
  }
  return {
    ...base,
    mode: "gentle",
    enabled: true,
    minAmbientMotionScale: Math.max(
      0.74,
      Math.min(0.9, base.minAmbientMotionScale),
    ),
    attackMs: Math.max(520, base.attackMs),
    releaseMs: Math.max(900, base.releaseMs),
  };
}

export function resolvePerformanceCrisisRuntimePolicy(args: {
  stylePresetId: PerformanceCrisisPresetId;
  particlePresetId?: PerformanceCrisisPresetId;
  waveStarterPresetId?: PerformanceCrisisPresetId;
  particleCrisisMode?: ParticleCrisisModeSelection;
  particleAmbientMotionMode?: ParticleAmbientMotionSelection;
  particleLoadReductionMode?: ParticleLoadReductionSelection;
  rootFollowQuantizationMode?: CrisisQuantizationModeSelection;
  rootFollowQuantizationGrid?: CrisisQuantizationGridSelection;
  rootFollowQuantizationCustomSegments?: number;
  particleQuantizationMode?: CrisisQuantizationModeSelection;
  particleQuantizationGrid?: CrisisQuantizationGridSelection;
  particleQuantizationCustomSegments?: number;
  rootFollowVoiceEngineMode?: RootFollowVoiceEngineMode;
}): PerformanceCrisisRuntimePolicy {
  const stylePreset = resolvePerformanceCrisisPreset(args.stylePresetId);
  const particlePreset = resolvePerformanceCrisisPreset(
    args.particlePresetId ?? stylePreset.id,
  );
  const waveStarterPreset = resolvePerformanceCrisisPreset(
    args.waveStarterPresetId ?? stylePreset.id,
  );
  const particlePolicy = particlePreset.particles;
  const particleCrisisMode = resolveParticleCrisisMode(
    particlePolicy,
    args.particleCrisisMode,
  );
  const particleAmbientMotion = resolveParticleAmbientMotion(
    particlePolicy,
    args.particleAmbientMotionMode,
  );
  const particleLoadReduction = resolveParticleLoadReduction(
    particlePolicy,
    args.particleLoadReductionMode,
  );
  const rootFollowQuantization = resolveCrisisQuantizationPolicy(
    stylePreset.granularRootFollow.quantization,
    args.rootFollowQuantizationMode,
    args.rootFollowQuantizationGrid,
    args.rootFollowQuantizationCustomSegments,
  );
  const particleQuantization = resolveCrisisQuantizationPolicy(
    particlePolicy.quantization,
    args.particleQuantizationMode,
    args.particleQuantizationGrid,
    args.particleQuantizationCustomSegments,
  );
  return {
    stylePresetId: stylePreset.id,
    particlePresetId: particlePreset.id,
    waveStarterPresetId: waveStarterPreset.id,
    rootFollow: {
      sourcePresetId: stylePreset.id,
      quantization: rootFollowQuantization,
      overloadStrategy: stylePreset.granularRootFollow.overloadStrategy,
      preserveTransportContinuity:
        stylePreset.granularRootFollow.preserveTransportContinuity,
      preserveLastValidPitch:
        stylePreset.granularRootFollow.preserveLastValidPitch,
      densityReductionUnderLoad: clampNumber(
        stylePreset.granularRootFollow.densityReductionUnderLoad,
        0,
        0.85,
      ),
      lateGrainStrategy: stylePreset.granularRootFollow.lateGrainStrategy,
      staleWindowMs: clampNumber(
        stylePreset.granularRootFollow.staleWindowMs,
        8,
        160,
      ),
      preventCatchUpStorm: stylePreset.granularRootFollow.preventCatchUpStorm,
      voiceEngineMode: args.rootFollowVoiceEngineMode ?? stylePreset.granularRootFollow.voiceEngineMode ?? 'shadow-plan',
    },
    particles: {
      passThroughCount: resolveParticlePassThrough(particlePolicy),
      denseFrameMaxIntents: clampNumber(
        particlePolicy.maxAudioIntentsPerFrame,
        2,
        18,
      ),
      strongGainThreshold: resolveStrongGainThreshold(particlePolicy),
      diversityBonus: resolveDiversityBonus(particlePolicy),
      staleWindowMs: resolveParticleStaleWindow(particlePolicy),
      catchUpStrategy: particlePolicy.catchUpStrategy,
      timeBasis: particlePolicy.timeBasis,
      intentMode: particlePolicy.intentMode,
      crisisMode: particleCrisisMode,
      smoothBeforeThin:
        particlePolicy.smoothBeforeThin &&
        particleCrisisMode !== "stability-first",
      maxMicroDelayMs: clampNumber(particlePolicy.maxMicroDelayMs, 0, 28),
      pyramidMaxSubdivision:
        particleCrisisMode === "quantization-pyramid"
          ? particlePolicy.pyramidMaxSubdivision
          : 1,
      liberationMaxEventsPerWindow: clampNumber(
        particlePolicy.liberationMaxEventsPerWindow,
        0,
        12,
      ),
      ambientMotion: particleAmbientMotion,
      loadReduction: particleLoadReduction,
      quantization: particleQuantization,
      preserveStrongImpacts: particlePolicy.preserveStrongImpacts,
      preferDiverseImpacts: particlePolicy.preferDiverseImpacts,
      sourcePresetId: particlePreset.id,
    },
    waveStarter: {
      ...waveStarterPreset.waveStarter,
      sourcePresetId: waveStarterPreset.id,
    },
  };
}
