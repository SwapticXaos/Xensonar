import {
  ROOT_FOLLOW_GRANULAR_PRESETS,
  normalizeRootFollowGranularSettings,
} from "../rootFollow/rootFollowGranularSettings";
import type {
  CrisisCatchUpStrategy,
  CrisisQuantizationGrid,
  CrisisQuantizationMode,
  CrisisQuantizationPolicy,
  DiagnosticsPerformancePolicy,
  GranularRootFollowCrisisPolicy,
  ParticleAmbientMotionMode,
  ParticleAmbientMotionPolicy,
  ParticleCrisisMode,
  ParticleIntentMode,
  ParticleLoadReductionMode,
  ParticleLoadReductionPolicy,
  ParticlePerformancePolicy,
  PerformanceCrisisPreset,
  PerformanceCrisisPresetId,
  PerformanceCrisisPresetRegistry,
  RootFollowOverloadStrategy,
  StableLanePerformancePolicy,
  WaveStarterAdmissionMode,
  WaveStarterPerformancePolicy,
  WaveStarterSpecialPathIsolationPolicy,
} from "./performanceCrisisTypes";

const granular = {
  open: normalizeRootFollowGranularSettings(
    {
      ...ROOT_FOLLOW_GRANULAR_PRESETS.grainy,
      preset: "custom",
      powerMode: "rich",
      windowMs: 46,
      stepMs: 18,
      leadMs: 76,
      startLeadMs: 26,
      microDensity: 1.42,
      sourceSpread: 1.14,
      jitter: 0.46,
      maxGrainsPerWindow: 58,
    },
    "grainy",
  ),
  balanced: normalizeRootFollowGranularSettings(
    {
      ...ROOT_FOLLOW_GRANULAR_PRESETS.flowing,
      preset: "custom",
      powerMode: "balanced",
      // Electron/reference guard: schedule farther ahead than the dev-server
      // default so Root-Follow material does not chop when the renderer ticks late.
      leadMs: 108,
      startLeadMs: 34,
      stepMs: 34,
      maxGrainsPerWindow: 18,
    },
    "flowing",
  ),
  pressureSafe: normalizeRootFollowGranularSettings(
    {
      ...ROOT_FOLLOW_GRANULAR_PRESETS.flowing,
      preset: "custom",
      powerMode: "safe",
      windowMs: 72,
      stepMs: 34,
      leadMs: 92,
      startLeadMs: 34,
      microDensity: 0.84,
      sourceSpread: 0.82,
      jitter: 0.16,
      maxGrainsPerWindow: 22,
    },
    "flowing",
  ),
  studioDensity: normalizeRootFollowGranularSettings(
    {
      ...ROOT_FOLLOW_GRANULAR_PRESETS.grainy,
      preset: "custom",
      powerMode: "rich",
      windowMs: 44,
      stepMs: 16,
      leadMs: 90,
      startLeadMs: 30,
      microDensity: 1.66,
      sourceSpread: 1.18,
      jitter: 0.54,
      maxGrainsPerWindow: 64,
    },
    "grainy",
  ),
  diagnosticStrict: normalizeRootFollowGranularSettings(
    {
      ...ROOT_FOLLOW_GRANULAR_PRESETS.flowing,
      preset: "custom",
      powerMode: "safe",
      windowMs: 78,
      stepMs: 38,
      leadMs: 104,
      startLeadMs: 38,
      microDensity: 0.76,
      sourceSpread: 0.78,
      jitter: 0.08,
      maxGrainsPerWindow: 18,
    },
    "flowing",
  ),
} as const;

const stableLanesProtected: StableLanePerformancePolicy = {
  protectMaterialTrack: true,
  protectDrums: true,
  protectBass: true,
  avoidCatchUpBursts: true,
};

const diagnosticsNormal: DiagnosticsPerformancePolicy = {
  burstRecorderSensitivity: "normal",
  exposeBrowserAppTherapist: true,
  exposeRejectedEvents: true,
};

const diagnosticsStrict: DiagnosticsPerformancePolicy = {
  ...diagnosticsNormal,
  burstRecorderSensitivity: "strict",
};

const fullSpecialPathIsolation: WaveStarterSpecialPathIsolationPolicy = {
  holdGestureLoopWorkletBridge: true,
  holdGestureLegacyFallback: true,
  deferredSlot: true,
  staleFailoverCandidates: true,
  workletShadowMirroring: true,
  liveReports: true,
};

const balancedSpecialPathIsolation: WaveStarterSpecialPathIsolationPolicy = {
  ...fullSpecialPathIsolation,
  // The visible standard preset does not prime or mirror Worklet diagnostics invisibly.
  // Explicit Hold/keyboard/failover special paths remain available through their own flags.
  workletShadowMirroring: false,
};

const pressureSpecialPathIsolation: WaveStarterSpecialPathIsolationPolicy = {
  holdGestureLoopWorkletBridge: true,
  holdGestureLegacyFallback: false,
  deferredSlot: false,
  staleFailoverCandidates: false,
  workletShadowMirroring: false,
  liveReports: false,
};

const diagnosticSpecialPathIsolation: WaveStarterSpecialPathIsolationPolicy = {
  ...pressureSpecialPathIsolation,
  holdGestureLoopWorkletBridge: false,
  liveReports: true,
};

function quantization(
  mode: CrisisQuantizationMode,
  grid: CrisisQuantizationGrid,
  fallbackPressureFloor: number,
  fallbackFullPressure: number,
  holdLastValidUnderLoad: boolean,
  catchUpOnGrid: boolean,
): CrisisQuantizationPolicy {
  return {
    mode,
    grid,
    customSegmentsPerBar: Number(grid),
    fallbackPressureFloor,
    fallbackFullPressure,
    holdLastValidUnderLoad,
    catchUpOnGrid,
  };
}

const q = {
  off64: quantization("off", "64", 0.9, 1, false, false),
  fallback32Balanced: quantization("fallback", "32", 0.72, 0.94, true, true),
  fallback32Pressure: quantization("fallback", "32", 0.66, 0.92, true, true),
  fallback32ParticlePressure: quantization("fallback", "32", 0.68, 0.92, true, true),
  fallback16Live: quantization("fallback", "16", 0.62, 0.88, true, true),
  fallback32LiveParticle: quantization("fallback", "32", 0.62, 0.88, true, true),
  fallback64BalancedParticle: quantization("fallback", "64", 0.72, 0.94, true, true),
  fallback64StudioParticle: quantization("fallback", "64", 0.78, 0.98, true, true),
  strict16: quantization("strict", "16", 0.5, 0.82, true, true),
} as const;

function rootFollow(args: {
  mode: "flowing" | "grainy";
  settings: GranularRootFollowCrisisPolicy["settings"];
  quantization: CrisisQuantizationPolicy;
  densityReductionUnderLoad: number;
  lateGrainStrategy: CrisisCatchUpStrategy;
  staleWindowMs: number;
  overloadStrategy: RootFollowOverloadStrategy;
}): GranularRootFollowCrisisPolicy {
  return {
    ...args,
    preventCatchUpStorm: true,
    preserveTransportContinuity: true,
    preserveLastValidPitch: true,
    voiceEngineMode: "shadow-plan",
  };
}

function ambientMotion(
  mode: ParticleAmbientMotionMode,
  enabled: boolean,
  minAmbientMotionScale: number,
  attackMs: number,
  releaseMs: number,
  impactPreserveWindowMs: number,
): ParticleAmbientMotionPolicy {
  return {
    mode,
    enabled,
    minAmbientMotionScale,
    attackMs,
    releaseMs,
    preserveRingWaveMotion: true,
    preserveImpactImpulse: true,
    impactPreserveWindowMs,
  };
}

function loadReduction(
  mode: ParticleLoadReductionMode,
  enabled: boolean,
  pressureFloor: number,
  fullEffectPressure: number,
  minAudioIntentScale: number,
  minFlushAdmissionScale: number,
): ParticleLoadReductionPolicy {
  return {
    mode,
    enabled,
    pressureFloor,
    fullEffectPressure,
    minAudioIntentScale,
    minFlushAdmissionScale,
    preserveStrongImpacts: true,
    smoothAfterCrisisDistribution: true,
  };
}

function particles(args: {
  intentMode: ParticleIntentMode;
  catchUpStrategy: CrisisCatchUpStrategy;
  crisisMode: ParticleCrisisMode;
  smoothBeforeThin: boolean;
  maxMicroDelayMs: number;
  pyramidMaxSubdivision: ParticlePerformancePolicy["pyramidMaxSubdivision"];
  liberationMaxEventsPerWindow: number;
  maxAudioIntentsPerFrame: number;
  ambientMotion: ParticleAmbientMotionPolicy;
  loadReduction: ParticleLoadReductionPolicy;
  quantization: CrisisQuantizationPolicy;
  preserveStrongImpacts?: boolean;
  preferDiverseImpacts: boolean;
}): ParticlePerformancePolicy {
  return {
    timeBasis: "hybrid",
    preserveStrongImpacts: true,
    ...args,
  };
}

function waveStarter(
  admissionMode: WaveStarterAdmissionMode,
  maxDeferralMs: number,
  staleDropMs: number,
  preserveStrongAttacks: boolean,
  specialPathIsolation: WaveStarterSpecialPathIsolationPolicy,
): WaveStarterPerformancePolicy {
  return {
    admissionMode,
    maxDeferralMs,
    staleDropMs,
    preserveStrongAttacks,
    specialPathIsolation,
  };
}

function preset(args: Omit<PerformanceCrisisPreset, "stableLanes" | "diagnostics"> & {
  diagnostics?: DiagnosticsPerformancePolicy;
}): PerformanceCrisisPreset {
  return {
    ...args,
    stableLanes: stableLanesProtected,
    diagnostics: args.diagnostics ?? diagnosticsNormal,
  };
}

export const PERFORMANCE_CRISIS_PRESETS: PerformanceCrisisPresetRegistry = {
  "open-687": preset({
    id: "open-687",
    label: "Offen",
    lineage: "6.8.7-artige Durchlässigkeit",
    summary:
      "Mehr Ereignisse dürfen sprechen; geeignet, wenn musikalische Dichte wichtiger ist als harte Drucksicherheit.",
    granularRootFollow: rootFollow({
      mode: "grainy",
      settings: granular.open,
      quantization: q.off64,
      densityReductionUnderLoad: 0.12,
      lateGrainStrategy: "short-catch-up",
      staleWindowMs: 42,
      overloadStrategy: "reduce-density",
    }),
    particles: particles({
      intentMode: "open",
      catchUpStrategy: "smear",
      crisisMode: "off",
      smoothBeforeThin: true,
      maxMicroDelayMs: 18,
      pyramidMaxSubdivision: 2,
      liberationMaxEventsPerWindow: 8,
      maxAudioIntentsPerFrame: 14,
      ambientMotion: ambientMotion("off", false, 1, 600, 900, 180),
      loadReduction: loadReduction("off", false, 1, 1, 1, 1),
      quantization: q.off64,
      preferDiverseImpacts: false,
    }),
    waveStarter: waveStarter("open", 14, 30, true, fullSpecialPathIsolation),
  }),
  balanced: preset({
    id: "balanced",
    label: "Balanciert",
    lineage: "gemeinsamer Ausgangspunkt",
    summary:
      "Bewahrt Root-Follow-Fluss und schützt Partikel/Wellenstarter ohne starkes Ausdünnen.",
    granularRootFollow: rootFollow({
      mode: "flowing",
      settings: granular.balanced,
      quantization: q.fallback32Balanced,
      densityReductionUnderLoad: 0.12,
      lateGrainStrategy: "smear",
      staleWindowMs: 96,
      overloadStrategy: "continue-last-valid",
    }),
    particles: particles({
      intentMode: "diverse",
      catchUpStrategy: "smear",
      crisisMode: "quantization-loosening",
      smoothBeforeThin: true,
      maxMicroDelayMs: 14,
      pyramidMaxSubdivision: 2,
      liberationMaxEventsPerWindow: 6,
      maxAudioIntentsPerFrame: 10,
      ambientMotion: ambientMotion("gentle", true, 0.82, 650, 1100, 180),
      loadReduction: loadReduction("soft-taper", true, 0.78, 0.96, 0.78, 0.78),
      quantization: q.fallback64BalancedParticle,
      preferDiverseImpacts: true,
    }),
    waveStarter: waveStarter("defer", 8, 18, true, balancedSpecialPathIsolation),
  }),
  "pressure-safe-6879": preset({
    id: "pressure-safe-6879",
    label: "Drucksicher",
    lineage: "6.8.79-artige Entlastung",
    summary:
      "Reduziert Druck und Catch-up-Wellen; Partikel werden stärker als Audio-Intents geformt.",
    granularRootFollow: rootFollow({
      mode: "flowing",
      settings: granular.pressureSafe,
      quantization: q.fallback32Pressure,
      densityReductionUnderLoad: 0.42,
      lateGrainStrategy: "drop",
      staleWindowMs: 22,
      overloadStrategy: "continue-last-valid",
    }),
    particles: particles({
      intentMode: "pressure-safe",
      catchUpStrategy: "drop",
      crisisMode: "quantization-pyramid",
      smoothBeforeThin: true,
      maxMicroDelayMs: 12,
      pyramidMaxSubdivision: 4,
      liberationMaxEventsPerWindow: 4,
      maxAudioIntentsPerFrame: 7,
      ambientMotion: ambientMotion("gentle", true, 0.76, 520, 950, 190),
      loadReduction: loadReduction("adaptive-thin", true, 0.72, 0.96, 0.62, 0.64),
      quantization: q.fallback32ParticlePressure,
      preferDiverseImpacts: true,
    }),
    waveStarter: waveStarter("pressure-gated", 7, 14, true, pressureSpecialPathIsolation),
  }),
  "live-protection": preset({
    id: "live-protection",
    label: "Live-Schutz",
    lineage: "Stabile Lanes zuerst",
    summary:
      "Materialspur, Drum/Bass und Root-Follow-Kontinuität werden geschützt; Partikel opfern früh Details.",
    granularRootFollow: rootFollow({
      mode: "flowing",
      settings: granular.pressureSafe,
      quantization: q.fallback16Live,
      densityReductionUnderLoad: 0.48,
      lateGrainStrategy: "freeze",
      staleWindowMs: 20,
      overloadStrategy: "continue-last-valid",
    }),
    particles: particles({
      intentMode: "soloistic",
      catchUpStrategy: "jump",
      crisisMode: "stability-first",
      smoothBeforeThin: false,
      maxMicroDelayMs: 8,
      pyramidMaxSubdivision: 2,
      liberationMaxEventsPerWindow: 3,
      maxAudioIntentsPerFrame: 5,
      ambientMotion: ambientMotion("viscous", true, 0.66, 420, 900, 220),
      loadReduction: loadReduction("adaptive-thin", true, 0.68, 0.94, 0.58, 0.6),
      quantization: q.fallback32LiveParticle,
      preferDiverseImpacts: true,
    }),
    waveStarter: waveStarter("pressure-gated", 6, 12, true, pressureSpecialPathIsolation),
  }),
  "studio-density": preset({
    id: "studio-density",
    label: "Studio-Dichte",
    lineage: "Dichte bewusst erlauben",
    summary:
      "Erlaubt mehr Grains und Partikel, warnt aber diagnostisch früher vor Browser-/App-Druck.",
    granularRootFollow: rootFollow({
      mode: "grainy",
      settings: granular.studioDensity,
      quantization: q.off64,
      densityReductionUnderLoad: 0.16,
      lateGrainStrategy: "short-catch-up",
      staleWindowMs: 38,
      overloadStrategy: "reduce-density",
    }),
    particles: particles({
      intentMode: "textural",
      catchUpStrategy: "smear",
      crisisMode: "quantization-liberation",
      smoothBeforeThin: true,
      maxMicroDelayMs: 20,
      pyramidMaxSubdivision: 2,
      liberationMaxEventsPerWindow: 9,
      maxAudioIntentsPerFrame: 15,
      ambientMotion: ambientMotion("gentle", true, 0.86, 700, 1250, 170),
      loadReduction: loadReduction("soft-taper", true, 0.84, 0.99, 0.82, 0.84),
      quantization: q.fallback64StudioParticle,
      preferDiverseImpacts: true,
    }),
    waveStarter: waveStarter("defer", 10, 22, true, fullSpecialPathIsolation),
  }),
  "diagnostic-strict": preset({
    id: "diagnostic-strict",
    label: "Diagnose-Streng",
    lineage: "Strict-Test-/Vergleichsmodus",
    summary:
      "Strenge Drop-/Reject-Sichtbarkeit für Harness- und Browser/App-Vergleiche.",
    granularRootFollow: rootFollow({
      mode: "flowing",
      settings: granular.diagnosticStrict,
      quantization: q.strict16,
      densityReductionUnderLoad: 0.55,
      lateGrainStrategy: "drop",
      staleWindowMs: 16,
      overloadStrategy: "continue-last-valid",
    }),
    particles: particles({
      intentMode: "pressure-safe",
      catchUpStrategy: "drop",
      crisisMode: "stability-first",
      smoothBeforeThin: false,
      maxMicroDelayMs: 6,
      pyramidMaxSubdivision: 1,
      liberationMaxEventsPerWindow: 2,
      maxAudioIntentsPerFrame: 4,
      ambientMotion: ambientMotion("viscous", true, 0.6, 360, 820, 240),
      loadReduction: loadReduction("emergency-thin", true, 0.62, 0.9, 0.44, 0.46),
      quantization: q.strict16,
      preferDiverseImpacts: true,
    }),
    waveStarter: waveStarter("pressure-gated", 5, 10, false, diagnosticSpecialPathIsolation),
    diagnostics: diagnosticsStrict,
  }),
};

export const PERFORMANCE_CRISIS_PRESET_ORDER: readonly PerformanceCrisisPresetId[] = [
  "open-687",
  "balanced",
  "pressure-safe-6879",
  "live-protection",
  "studio-density",
  "diagnostic-strict",
];

export function resolvePerformanceCrisisPreset(
  id: PerformanceCrisisPresetId | string | null | undefined,
): PerformanceCrisisPreset {
  return (
    PERFORMANCE_CRISIS_PRESETS[(id ?? "balanced") as PerformanceCrisisPresetId] ??
    PERFORMANCE_CRISIS_PRESETS.balanced
  );
}
