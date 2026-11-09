import type { RootFollowGranularSettings } from '../rootFollow/rootFollowGranularSettings';

export type PerformanceCrisisPresetId =
  | 'open-687'
  | 'balanced'
  | 'pressure-safe-6879'
  | 'live-protection'
  | 'studio-density'
  | 'diagnostic-strict';

export type ParticleIntentMode = 'open' | 'diverse' | 'pressure-safe' | 'soloistic' | 'textural';
export type ParticleCrisisMode = 'off' | 'quantization-loosening' | 'quantization-pyramid' | 'quantization-liberation' | 'stability-first';
export type ParticleCrisisModeSelection = 'preset' | ParticleCrisisMode;
export type ParticleAmbientMotionMode = 'off' | 'gentle' | 'viscous';
export type ParticleAmbientMotionSelection = 'preset' | ParticleAmbientMotionMode;
export type ParticleLoadReductionMode = 'off' | 'soft-taper' | 'adaptive-thin' | 'emergency-thin';
export type ParticleLoadReductionSelection = 'preset' | ParticleLoadReductionMode;
export type CrisisQuantizationMode = 'off' | 'fallback' | 'strict';
export type CrisisQuantizationModeSelection = 'preset' | CrisisQuantizationMode;
export type CrisisQuantizationGrid = '16' | '24' | '27' | '32' | '64' | 'other';
export type CrisisQuantizationGridSelection = 'preset' | CrisisQuantizationGrid;
export type CrisisTimeBasis = 'frame' | 'audio-context' | 'global-transport' | 'hybrid';
export type CrisisCatchUpStrategy = 'drop' | 'short-catch-up' | 'jump' | 'smear' | 'freeze';
export type WaveStarterAdmissionMode = 'open' | 'defer' | 'pressure-gated';
export type RootFollowOverloadStrategy = 'continue-last-valid' | 'reduce-density' | 'jump-current';
export type RootFollowVoiceEngineMode = 'legacy' | 'shadow-plan' | 'main-thread-pool' | 'worklet-shadow' | 'worklet-direct-pilot' | 'worklet-granular-shadow' | 'worklet-buffer-shadow' | 'worklet-granular-pilot' | 'worklet-stable-lane-pilot' | 'worklet-stable-lane-primary-audition' | 'worklet-granular-primary-candidate';

export const XENSONAR_AUDIO_WORKLET_BRANCH_TEST_ROOT_FOLLOW_VOICE_ENGINE_MODE: RootFollowVoiceEngineMode =
  'shadow-plan';

export type CrisisQuantizationPolicy = {
  mode: CrisisQuantizationMode;
  grid: CrisisQuantizationGrid;
  customSegmentsPerBar: number;
  fallbackPressureFloor: number;
  fallbackFullPressure: number;
  holdLastValidUnderLoad: boolean;
  catchUpOnGrid: boolean;
};

export type GranularRootFollowCrisisPolicy = {
  mode: 'flowing' | 'grainy';
  settings: RootFollowGranularSettings;
  quantization: CrisisQuantizationPolicy;
  densityReductionUnderLoad: number;
  lateGrainStrategy: CrisisCatchUpStrategy;
  staleWindowMs: number;
  preventCatchUpStorm: boolean;
  overloadStrategy: RootFollowOverloadStrategy;
  preserveTransportContinuity: boolean;
  preserveLastValidPitch: boolean;
  voiceEngineMode: RootFollowVoiceEngineMode;
};

export type ParticleAmbientMotionPolicy = {
  mode: ParticleAmbientMotionMode;
  enabled: boolean;
  minAmbientMotionScale: number;
  attackMs: number;
  releaseMs: number;
  preserveRingWaveMotion: true;
  preserveImpactImpulse: true;
  impactPreserveWindowMs: number;
};

export type ParticleLoadReductionPolicy = {
  mode: ParticleLoadReductionMode;
  enabled: boolean;
  pressureFloor: number;
  fullEffectPressure: number;
  minAudioIntentScale: number;
  minFlushAdmissionScale: number;
  preserveStrongImpacts: true;
  smoothAfterCrisisDistribution: true;
};

export type ParticlePerformancePolicy = {
  intentMode: ParticleIntentMode;
  timeBasis: CrisisTimeBasis;
  catchUpStrategy: CrisisCatchUpStrategy;
  crisisMode: ParticleCrisisMode;
  smoothBeforeThin: boolean;
  maxMicroDelayMs: number;
  pyramidMaxSubdivision: 1 | 2 | 4;
  liberationMaxEventsPerWindow: number;
  maxAudioIntentsPerFrame: number;
  preserveStrongImpacts: boolean;
  preferDiverseImpacts: boolean;
  ambientMotion: ParticleAmbientMotionPolicy;
  loadReduction: ParticleLoadReductionPolicy;
  quantization: CrisisQuantizationPolicy;
};

export type WaveStarterSpecialPathIsolationPolicy = {
  holdGestureLoopWorkletBridge: boolean;
  holdGestureLegacyFallback: boolean;
  deferredSlot: boolean;
  staleFailoverCandidates: boolean;
  workletShadowMirroring: boolean;
  liveReports: boolean;
};

export type WaveStarterPerformancePolicy = {
  admissionMode: WaveStarterAdmissionMode;
  maxDeferralMs: number;
  staleDropMs: number;
  preserveStrongAttacks: boolean;
  specialPathIsolation: WaveStarterSpecialPathIsolationPolicy;
};

export type StableLanePerformancePolicy = {
  protectMaterialTrack: boolean;
  protectDrums: boolean;
  protectBass: boolean;
  avoidCatchUpBursts: boolean;
};

export type DiagnosticsPerformancePolicy = {
  burstRecorderSensitivity: 'normal' | 'strict';
  exposeBrowserAppTherapist: boolean;
  exposeRejectedEvents: boolean;
};

export type PerformanceCrisisPreset = {
  id: PerformanceCrisisPresetId;
  label: string;
  lineage: string;
  summary: string;
  granularRootFollow: GranularRootFollowCrisisPolicy;
  particles: ParticlePerformancePolicy;
  waveStarter: WaveStarterPerformancePolicy;
  stableLanes: StableLanePerformancePolicy;
  diagnostics: DiagnosticsPerformancePolicy;
};

export type PerformanceCrisisPresetRegistry = Record<PerformanceCrisisPresetId, PerformanceCrisisPreset>;
