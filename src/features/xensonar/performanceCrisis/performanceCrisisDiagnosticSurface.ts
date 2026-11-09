import type { RootFollowVoiceEngineMode } from "./performanceCrisisTypes";
import type { HolisticCapacityFirstAdmissionGuard } from "../audio/holisticCapacityFirstAdmissionGuard";
import type { HolisticPressureBudgetPolicy } from "../audio/holisticPressureBudgetPolicy";
import type { HolisticVoicePoolFallbackReport } from "../audio/holisticVoicePoolFallback";
import type { ParticleVoicePoolLiveReport } from "../audio/particleVoicePoolLiveReport";
import type { WaveStarterAttackIntegrityCongestionReport } from "../audio/waveStarterAttackIntegrityCongestionBrake";
import type { WaveStarterFailoverDecisionGateReport } from "../audio/waveStarterFailoverDecisionGate";
import type { WaveStarterFailoverDefaultPolicyCandidateReport } from "../audio/waveStarterFailoverDefaultPolicyCandidate";
import type { WaveStarterFailoverEventLedgerReport } from "../audio/waveStarterFailoverEventLedger";
import type { WaveStarterFailoverLateWindowTuningProbeReport } from "../audio/waveStarterFailoverLateWindowTuningProbe";
import type { WaveStarterFailoverPolicyReadinessMatrixReport } from "../audio/waveStarterFailoverPolicyReadinessMatrix";
import type { WaveStarterFailoverPolicyShadowAbReport } from "../audio/waveStarterFailoverPolicyShadowAb";
import type { WaveStarterFailoverRealTestHarnessHooksReport } from "../audio/waveStarterFailoverRealTestHarnessHooks";
import type { WaveStarterFailoverStressProbeReport } from "../audio/waveStarterFailoverStressProbe";
import type { WaveStarterKeyboardGestureCapacityReport } from "../audio/waveStarterKeyboardGestureCapacity";
import type { WaveStarterParallelMixAbGuardReport } from "../audio/waveStarterParallelMixAbGuard";
import type { WaveStarterParallelPilotGainStabilityReport } from "../audio/waveStarterParallelPilotGainStabilityReport";
import type { WaveStarterParallelPilotPressureScenarioReport } from "../audio/waveStarterParallelPilotPressureScenario";
import type { WaveStarterSampleBufferTokenShadowReport } from "../audio/waveStarterSampleBufferTokenShadow";
import type { WaveStarterSampleFailoverCandidateReport } from "../audio/waveStarterSampleFailoverCandidate";
import type { WaveStarterSampleFailoverLegacyParityProbeReport } from "../audio/waveStarterSampleFailoverLegacyParityProbe";
import type { WaveStarterSampleFailoverOffsetCropRefineReport } from "../audio/waveStarterSampleFailoverOffsetCropRefine";
import type { WaveStarterSynthFailoverCandidateReport } from "../audio/waveStarterSynthFailoverCandidate";
import type { WaveStarterSynthFailoverEnvelopeOvertoneRefineReport } from "../audio/waveStarterSynthFailoverEnvelopeOvertoneRefine";
import type { WaveStarterVoicePoolLiveReport } from "../audio/waveStarterVoicePoolLiveReport";
import type { WaveStarterVoiceSpecFailoverContractReport } from "../audio/waveStarterVoiceSpecFailoverContract";
import type { WaveStarterWorkletPilotSnapshot } from "../audio/waveStarterWorkletPilotBridge";
import type { WaveStarterWorkletProcessorRuntimeOwnershipReport } from "../audio/waveStarterWorkletProcessorRuntimeOwnership";
import type { WaveStarterWorkletVoicePoolCompactionReport } from "../audio/waveStarterWorkletVoicePoolCompactionReport";
import type { StableLaneLiveDeliveryProofReport } from "../diagnostics/stableLaneLiveDeliveryProof";
import type {
  StableLaneABReport,
  StableLaneClickBurstProxyReport,
  StableLaneExpressivePressureAddOnReport,
  StableLaneRootMaterialReliefProofReport,
  StableLaneSabReadinessDifferentialReport,
  StableLaneStressScenarioHarnessReport,
} from "../diagnostics/stableLaneStressHarness";
import type { StableLaneAudioContextUserGestureProbeSnapshot } from "../rootFollow/rootFollowAudioContextUserGestureProbe";
import type { StableLaneSabTransportReadinessSnapshot } from "../rootFollow/rootFollowSharedArrayBufferReadiness";
import type { RootFollowStableLaneSyntheticSilentProbeResult } from "../rootFollow/rootFollowWorkletShadowBridge";

export const STABLE_LANE_BOOT_PROBE_STORAGE_KEY =
  "xensonar:stable-lane-boot-probe:last";
export const STABLE_LANE_BOOT_PROBE_SAMPLE_WINDOW_MS = 4200;
export const STABLE_LANE_BOOT_PROBE_SAMPLE_INTERVAL_MS = 350;

export function nowMs() {
  if (
    typeof performance !== "undefined" &&
    typeof performance.now === "function"
  ) {
    return Math.round(performance.now());
  }
  return Date.now();
}

export type StableLaneResponsibilityReadoutSnapshot = {
  rootFollowVoiceEngineMode: RootFollowVoiceEngineMode;
  legacyReliefGate: string;
  stableLane: string;
  frameDelta: number;
  frameAdvanceFresh: boolean;
  laneQuanta: number;
  planTransport: string;
  planTransportBackendKind: string;
  planTransportPostedCount: number;
  planTransportPendingCount: number;
  planTransportDroppedSupersededCount: number;
  sabReadiness: string;
  reliefEvents: string;
  blend: string;
  stressHarness: string;
  abReport: string;
  clickBurstProxy: string;
  reliefProof: string;
  liveDeliveryProof: string;
  holisticVoicePool: string;
  waveStarterVoicePool: string;
  waveStarterWorkletPilot: string;
  waveStarterParallelMixAbGuard: string;
  waveStarterPressureScenario: string;
  waveStarterPilotGainStability: string;
  waveStarterVoiceSpecFailoverContract: string;
  waveStarterSynthFailoverCandidate: string;
  waveStarterSampleBufferTokenShadow: string;
  waveStarterSampleFailoverCandidate: string;
  waveStarterSampleFailoverLegacyParityProbe: string;
  waveStarterFailoverDecisionGate: string;
  waveStarterFailoverStressProbe: string;
  waveStarterFailoverDefaultPolicyCandidate: string;
  waveStarterFailoverLateWindowTuningProbe: string;
  waveStarterFailoverPolicyShadowAb: string;
  waveStarterWorkletVoicePoolCompaction: string;
  waveStarterFailoverEventLedger: string;
  waveStarterSampleFailoverOffsetCropRefine: string;
  waveStarterSynthFailoverEnvelopeOvertoneRefine: string;
  particleVoicePool: string;
};

export type StableLaneBootProbeSample = {
  atMs: number;
  rootFollowVoiceEngineMode: RootFollowVoiceEngineMode;
  legacyReliefGate: string;
  stableLane: string;
  frameDelta: number;
  frameAdvanceFresh: boolean;
  laneQuanta: number;
  planTransportBackendKind: string;
  sabReadiness: string;
  stressComparisonPresent: boolean;
  audioContextState: string;
  userActivationState: string;
  audioProbeBlocker: string;
  syntheticSilentProbeStatus: string;
  syntheticSilentProbeBlocker: string | null;
};

export type StableLaneBootProbeSnapshot = {
  version: 1;
  probeKind: "stable-lane-boot-responsibility";
  startedAtIso: string;
  updatedAtIso: string;
  elapsedMs: number;
  sampleCount: number;
  rootFollowVoiceEngineMode: RootFollowVoiceEngineMode;
  audioContextState: string;
  documentVisibilityState: string;
  userActivationState: string;
  sabReadiness: string;
  stableLaneProofState: string;
  audioProbeBlocker: string;
  audioProbe: StableLaneAudioContextUserGestureProbeSnapshot;
  syntheticSilentProbe: RootFollowStableLaneSyntheticSilentProbeResult | null;
  syntheticSilentProbeStatus: string;
  syntheticSilentProbeBlocker: string | null;
  syntheticSilentProbeFrameDelta: number;
  syntheticSilentProbeLaneQuantaDelta: number;
  frameDelta: number;
  frameAdvanceFresh: boolean;
  laneQuanta: number;
  legacyReliefGate: string;
  planTransportBackendKind: string;
  planTransportPostedCount: number;
  planTransportPendingCount: number;
  planTransportDroppedSupersededCount: number;
  reliefEvents: string;
  blend: string;
  stressComparisonPresent: boolean;
  samples: StableLaneBootProbeSample[];
};

export type PerformanceCrisisDiagnosticWindow = Window & {
  __XENSONAR_STABLE_LANE_SAB_READINESS__?: StableLaneSabTransportReadinessSnapshot;
  __XENSONAR_STABLE_LANE_RESPONSIBILITY_READOUT__?: StableLaneResponsibilityReadoutSnapshot;
  __XENSONAR_STABLE_LANE_BOOT_PROBE__?: StableLaneBootProbeSnapshot;
  __XENSONAR_STABLE_LANE_AUDIO_CONTEXT_USER_GESTURE_PROBE__?: StableLaneAudioContextUserGestureProbeSnapshot;
  __XENSONAR_STABLE_LANE_SYNTHETIC_SILENT_PLAN_PROBE__?: RootFollowStableLaneSyntheticSilentProbeResult;
  __XENSONAR_STABLE_LANE_STRESS_SCENARIO_HARNESS__?: StableLaneStressScenarioHarnessReport;
  __XENSONAR_STABLE_LANE_AB_REPORT__?: StableLaneABReport;
  __XENSONAR_STABLE_LANE_CLICK_BURST_PROXY_REPORT__?: StableLaneClickBurstProxyReport;
  __XENSONAR_STABLE_LANE_ROOT_MATERIAL_RELIEF_PROOF_REPORT__?: StableLaneRootMaterialReliefProofReport;
  __XENSONAR_STABLE_LANE_EXPRESSIVE_PRESSURE_ADDON_REPORT__?: StableLaneExpressivePressureAddOnReport;
  __XENSONAR_STABLE_LANE_SAB_DIFFERENTIAL_REPORT__?: StableLaneSabReadinessDifferentialReport;
  __XENSONAR_STABLE_LANE_LIVE_DELIVERY_PROOF__?: StableLaneLiveDeliveryProofReport;
  __XENSONAR_HOLISTIC_VOICE_POOL_FALLBACK_REPORT__?: HolisticVoicePoolFallbackReport;
  __XENSONAR_HOLISTIC_PRESSURE_BUDGET_POLICY__?: HolisticPressureBudgetPolicy;
  __XENSONAR_HOLISTIC_CAPACITY_FIRST_ADMISSION_GUARD__?: HolisticCapacityFirstAdmissionGuard;
  __XENSONAR_WAVE_STARTER_VOICE_POOL_LIVE_REPORT__?: WaveStarterVoicePoolLiveReport;
  __XENSONAR_WAVE_STARTER_WORKLET_PILOT_REPORT__?: WaveStarterWorkletPilotSnapshot;
  __XENSONAR_WAVE_STARTER_WORKLET_PROCESSOR_RUNTIME_OWNERSHIP__?: WaveStarterWorkletProcessorRuntimeOwnershipReport;
  __XENSONAR_WAVE_STARTER_PARALLEL_MIX_AB_GUARD__?: WaveStarterParallelMixAbGuardReport;
  __XENSONAR_WAVE_STARTER_PARALLEL_PILOT_PRESSURE_SCENARIO__?: WaveStarterParallelPilotPressureScenarioReport;
  __XENSONAR_WAVE_STARTER_PARALLEL_PILOT_GAIN_STABILITY_REPORT__?: WaveStarterParallelPilotGainStabilityReport;
  __XENSONAR_WAVE_STARTER_VOICE_SPEC_FAILOVER_CONTRACT__?: WaveStarterVoiceSpecFailoverContractReport;
  __XENSONAR_WAVE_STARTER_SYNTH_FAILOVER_CANDIDATE__?: WaveStarterSynthFailoverCandidateReport;
  __XENSONAR_WAVE_STARTER_SAMPLE_BUFFER_TOKEN_SHADOW__?: WaveStarterSampleBufferTokenShadowReport;
  __XENSONAR_WAVE_STARTER_SAMPLE_FAILOVER_CANDIDATE__?: WaveStarterSampleFailoverCandidateReport;
  __XENSONAR_WAVE_STARTER_SAMPLE_FAILOVER_LEGACY_PARITY_PROBE__?: WaveStarterSampleFailoverLegacyParityProbeReport;
  __XENSONAR_WAVE_STARTER_FAILOVER_DECISION_GATE__?: WaveStarterFailoverDecisionGateReport;
  __XENSONAR_WAVE_STARTER_FAILOVER_STRESS_PROBE__?: WaveStarterFailoverStressProbeReport;
  __XENSONAR_WAVE_STARTER_FAILOVER_DEFAULT_POLICY_CANDIDATE__?: WaveStarterFailoverDefaultPolicyCandidateReport;
  __XENSONAR_WAVE_STARTER_FAILOVER_LATE_WINDOW_TUNING_PROBE__?: WaveStarterFailoverLateWindowTuningProbeReport;
  __XENSONAR_WAVE_STARTER_FAILOVER_POLICY_SHADOW_AB__?: WaveStarterFailoverPolicyShadowAbReport;
  __XENSONAR_WAVE_STARTER_FAILOVER_POLICY_READINESS_MATRIX__?: WaveStarterFailoverPolicyReadinessMatrixReport;
  __XENSONAR_WAVE_STARTER_FAILOVER_REAL_TEST_HARNESS_HOOKS__?: WaveStarterFailoverRealTestHarnessHooksReport;
  __XENSONAR_WAVE_STARTER_KEYBOARD_GESTURE_CAPACITY__?: WaveStarterKeyboardGestureCapacityReport;
  __XENSONAR_WAVE_STARTER_ATTACK_INTEGRITY_CONGESTION__?: WaveStarterAttackIntegrityCongestionReport;
  __XENSONAR_WAVE_STARTER_WORKLET_VOICE_POOL_COMPACTION__?: WaveStarterWorkletVoicePoolCompactionReport;
  __XENSONAR_WAVE_STARTER_FAILOVER_EVENT_LEDGER__?: WaveStarterFailoverEventLedgerReport;
  __XENSONAR_WAVE_STARTER_SAMPLE_FAILOVER_OFFSET_CROP_REFINE__?: WaveStarterSampleFailoverOffsetCropRefineReport;
  __XENSONAR_WAVE_STARTER_SYNTH_FAILOVER_ENVELOPE_OVERTONE_REFINE__?: WaveStarterSynthFailoverEnvelopeOvertoneRefineReport;
  __XENSONAR_PARTICLE_VOICE_POOL_LIVE_REPORT__?: ParticleVoicePoolLiveReport;
  __XENSONAR_AUDIO_CONTEXT__?: BaseAudioContext;
  __XENSONAR_ROOT_FOLLOW_AUDIO_CONTEXT__?: BaseAudioContext;
};

export function getPerformanceCrisisDiagnosticWindow(): PerformanceCrisisDiagnosticWindow | null {
  if (typeof window === "undefined") return null;
  return window as PerformanceCrisisDiagnosticWindow;
}

export function inferStableLaneProofState(args: {
  responsibilityReadout: StableLaneResponsibilityReadoutSnapshot;
  stressComparisonPresent: boolean;
}) {
  if (args.responsibilityReadout.stableLane.includes("sustained"))
    return "relief-ready";
  if (args.responsibilityReadout.stableLane.includes("warmup")) return "warmup";
  if (args.responsibilityReadout.stableLane.includes("fallback"))
    return "fallback";
  if (
    args.responsibilityReadout.frameDelta > 0 ||
    args.responsibilityReadout.laneQuanta > 0
  )
    return "frame-activity-without-relief";
  return args.stressComparisonPresent
    ? "no-proof-in-window"
    : "no-recorder-window-yet";
}

export function buildStableLaneBootProbeSnapshot(args: {
  startedAtMs: number;
  startedAtIso: string;
  responsibilityReadout: StableLaneResponsibilityReadoutSnapshot;
  stressComparisonPresent: boolean;
  samples: StableLaneBootProbeSample[];
  audioProbe: StableLaneAudioContextUserGestureProbeSnapshot;
  syntheticSilentProbe: RootFollowStableLaneSyntheticSilentProbeResult | null;
}): StableLaneBootProbeSnapshot {
  return {
    version: 1,
    probeKind: "stable-lane-boot-responsibility",
    startedAtIso: args.startedAtIso,
    updatedAtIso: new Date().toISOString(),
    elapsedMs: Math.max(0, nowMs() - args.startedAtMs),
    sampleCount: args.samples.length,
    rootFollowVoiceEngineMode:
      args.responsibilityReadout.rootFollowVoiceEngineMode,
    audioContextState: args.audioProbe.audioContextState,
    documentVisibilityState: args.audioProbe.documentVisibilityState,
    userActivationState: args.audioProbe.userActivationState,
    sabReadiness: args.responsibilityReadout.sabReadiness,
    stableLaneProofState: args.audioProbe.stableLaneProofState,
    audioProbeBlocker: args.audioProbe.blockerReason,
    audioProbe: args.audioProbe,
    syntheticSilentProbe: args.syntheticSilentProbe,
    syntheticSilentProbeStatus: args.syntheticSilentProbe?.status ?? "not-run",
    syntheticSilentProbeBlocker:
      args.syntheticSilentProbe?.blockerReason ?? null,
    syntheticSilentProbeFrameDelta:
      args.syntheticSilentProbe?.renderedFrameDelta ?? 0,
    syntheticSilentProbeLaneQuantaDelta:
      args.syntheticSilentProbe?.laneQuantaDelta ?? 0,
    frameDelta: args.responsibilityReadout.frameDelta,
    frameAdvanceFresh: args.responsibilityReadout.frameAdvanceFresh,
    laneQuanta: args.responsibilityReadout.laneQuanta,
    legacyReliefGate: args.responsibilityReadout.legacyReliefGate,
    planTransportBackendKind:
      args.responsibilityReadout.planTransportBackendKind,
    planTransportPostedCount:
      args.responsibilityReadout.planTransportPostedCount,
    planTransportPendingCount:
      args.responsibilityReadout.planTransportPendingCount,
    planTransportDroppedSupersededCount:
      args.responsibilityReadout.planTransportDroppedSupersededCount,
    reliefEvents: args.responsibilityReadout.reliefEvents,
    blend: args.responsibilityReadout.blend,
    stressComparisonPresent: args.stressComparisonPresent,
    samples: args.samples.slice(-16),
  };
}

export function publishStableLaneSabReadinessSnapshot(
  readinessSnapshot: StableLaneSabTransportReadinessSnapshot,
) {
  const runtimeWindow = getPerformanceCrisisDiagnosticWindow();
  if (!runtimeWindow) return;
  runtimeWindow.__XENSONAR_STABLE_LANE_SAB_READINESS__ = readinessSnapshot;
}

export function publishStableLaneSyntheticSilentProbe(
  result: RootFollowStableLaneSyntheticSilentProbeResult,
) {
  const runtimeWindow = getPerformanceCrisisDiagnosticWindow();
  if (!runtimeWindow) return;
  runtimeWindow.__XENSONAR_STABLE_LANE_SYNTHETIC_SILENT_PLAN_PROBE__ = result;
}

export function publishStableLaneBootProbeSnapshot(
  snapshot: StableLaneBootProbeSnapshot,
) {
  const runtimeWindow = getPerformanceCrisisDiagnosticWindow();
  if (!runtimeWindow) return;
  runtimeWindow.__XENSONAR_STABLE_LANE_BOOT_PROBE__ = snapshot;
  try {
    runtimeWindow.localStorage.setItem(
      STABLE_LANE_BOOT_PROBE_STORAGE_KEY,
      JSON.stringify(snapshot),
    );
  } catch {}
}

export function publishPerformanceCrisisDiagnosticReports(args: {
  browserResponsibilityReadout: StableLaneResponsibilityReadoutSnapshot;
  audioContextUserGestureProbe: StableLaneAudioContextUserGestureProbeSnapshot;
  stableLaneStressHarnessReport: StableLaneStressScenarioHarnessReport;
  stableLaneABReport: StableLaneABReport;
  stableLaneClickBurstProxyReport: StableLaneClickBurstProxyReport;
  stableLaneRootMaterialReliefProofReport: StableLaneRootMaterialReliefProofReport;
  stableLaneExpressivePressureAddOnReport: StableLaneExpressivePressureAddOnReport;
  stableLaneSabReadinessDifferentialReport: StableLaneSabReadinessDifferentialReport;
  stableLaneLiveDeliveryProofReport: StableLaneLiveDeliveryProofReport;
  holisticVoicePoolFallbackReport: HolisticVoicePoolFallbackReport;
  holisticPressureBudgetPolicy: HolisticPressureBudgetPolicy;
  holisticCapacityFirstAdmissionGuard: HolisticCapacityFirstAdmissionGuard;
  waveStarterVoicePoolLiveReport: WaveStarterVoicePoolLiveReport | null;
  waveStarterWorkletPilotReport: WaveStarterWorkletPilotSnapshot | null;
  waveStarterParallelMixAbGuardReport: WaveStarterParallelMixAbGuardReport;
  waveStarterParallelPilotPressureScenarioReport: WaveStarterParallelPilotPressureScenarioReport;
  waveStarterParallelPilotGainStabilityReport: WaveStarterParallelPilotGainStabilityReport;
  waveStarterVoiceSpecFailoverContractReport: WaveStarterVoiceSpecFailoverContractReport | null;
  waveStarterSynthFailoverCandidateReport: WaveStarterSynthFailoverCandidateReport;
  waveStarterSampleBufferTokenShadowReport: WaveStarterSampleBufferTokenShadowReport;
  waveStarterSampleFailoverCandidateReport: WaveStarterSampleFailoverCandidateReport;
  waveStarterSampleFailoverLegacyParityProbeReport: WaveStarterSampleFailoverLegacyParityProbeReport;
  waveStarterFailoverDecisionGateReport: WaveStarterFailoverDecisionGateReport | null;
  waveStarterFailoverStressProbeReport: WaveStarterFailoverStressProbeReport;
  waveStarterFailoverDefaultPolicyCandidateReport: WaveStarterFailoverDefaultPolicyCandidateReport;
  waveStarterFailoverLateWindowTuningProbeReport: WaveStarterFailoverLateWindowTuningProbeReport;
  waveStarterFailoverPolicyShadowAbReport: WaveStarterFailoverPolicyShadowAbReport;
  particleVoicePoolLiveReport: ParticleVoicePoolLiveReport | null;
}) {
  const runtimeWindow = getPerformanceCrisisDiagnosticWindow();
  if (!runtimeWindow) return;
  runtimeWindow.__XENSONAR_STABLE_LANE_RESPONSIBILITY_READOUT__ =
    args.browserResponsibilityReadout;
  runtimeWindow.__XENSONAR_STABLE_LANE_AUDIO_CONTEXT_USER_GESTURE_PROBE__ =
    args.audioContextUserGestureProbe;
  runtimeWindow.__XENSONAR_STABLE_LANE_STRESS_SCENARIO_HARNESS__ =
    args.stableLaneStressHarnessReport;
  runtimeWindow.__XENSONAR_STABLE_LANE_AB_REPORT__ = args.stableLaneABReport;
  runtimeWindow.__XENSONAR_STABLE_LANE_CLICK_BURST_PROXY_REPORT__ =
    args.stableLaneClickBurstProxyReport;
  runtimeWindow.__XENSONAR_STABLE_LANE_ROOT_MATERIAL_RELIEF_PROOF_REPORT__ =
    args.stableLaneRootMaterialReliefProofReport;
  runtimeWindow.__XENSONAR_STABLE_LANE_EXPRESSIVE_PRESSURE_ADDON_REPORT__ =
    args.stableLaneExpressivePressureAddOnReport;
  runtimeWindow.__XENSONAR_STABLE_LANE_SAB_DIFFERENTIAL_REPORT__ =
    args.stableLaneSabReadinessDifferentialReport;
  runtimeWindow.__XENSONAR_STABLE_LANE_LIVE_DELIVERY_PROOF__ =
    args.stableLaneLiveDeliveryProofReport;
  runtimeWindow.__XENSONAR_HOLISTIC_VOICE_POOL_FALLBACK_REPORT__ =
    args.holisticVoicePoolFallbackReport;
  runtimeWindow.__XENSONAR_HOLISTIC_PRESSURE_BUDGET_POLICY__ =
    args.holisticPressureBudgetPolicy;
  runtimeWindow.__XENSONAR_HOLISTIC_CAPACITY_FIRST_ADMISSION_GUARD__ =
    args.holisticCapacityFirstAdmissionGuard;
  runtimeWindow.__XENSONAR_WAVE_STARTER_VOICE_POOL_LIVE_REPORT__ =
    args.waveStarterVoicePoolLiveReport ?? undefined;
  runtimeWindow.__XENSONAR_WAVE_STARTER_WORKLET_PILOT_REPORT__ =
    args.waveStarterWorkletPilotReport ?? undefined;
  runtimeWindow.__XENSONAR_WAVE_STARTER_PARALLEL_MIX_AB_GUARD__ =
    args.waveStarterParallelMixAbGuardReport;
  runtimeWindow.__XENSONAR_WAVE_STARTER_PARALLEL_PILOT_PRESSURE_SCENARIO__ =
    args.waveStarterParallelPilotPressureScenarioReport;
  runtimeWindow.__XENSONAR_WAVE_STARTER_PARALLEL_PILOT_GAIN_STABILITY_REPORT__ =
    args.waveStarterParallelPilotGainStabilityReport;
  runtimeWindow.__XENSONAR_WAVE_STARTER_VOICE_SPEC_FAILOVER_CONTRACT__ =
    args.waveStarterVoiceSpecFailoverContractReport ?? undefined;
  runtimeWindow.__XENSONAR_WAVE_STARTER_SYNTH_FAILOVER_CANDIDATE__ =
    args.waveStarterSynthFailoverCandidateReport;
  runtimeWindow.__XENSONAR_WAVE_STARTER_SAMPLE_BUFFER_TOKEN_SHADOW__ =
    args.waveStarterSampleBufferTokenShadowReport;
  runtimeWindow.__XENSONAR_WAVE_STARTER_SAMPLE_FAILOVER_CANDIDATE__ =
    args.waveStarterSampleFailoverCandidateReport;
  runtimeWindow.__XENSONAR_WAVE_STARTER_SAMPLE_FAILOVER_LEGACY_PARITY_PROBE__ =
    args.waveStarterSampleFailoverLegacyParityProbeReport;
  runtimeWindow.__XENSONAR_WAVE_STARTER_FAILOVER_DECISION_GATE__ =
    args.waveStarterFailoverDecisionGateReport ?? undefined;
  runtimeWindow.__XENSONAR_WAVE_STARTER_FAILOVER_STRESS_PROBE__ =
    args.waveStarterFailoverStressProbeReport;
  runtimeWindow.__XENSONAR_WAVE_STARTER_FAILOVER_DEFAULT_POLICY_CANDIDATE__ =
    args.waveStarterFailoverDefaultPolicyCandidateReport;
  runtimeWindow.__XENSONAR_WAVE_STARTER_FAILOVER_LATE_WINDOW_TUNING_PROBE__ =
    args.waveStarterFailoverLateWindowTuningProbeReport;
  runtimeWindow.__XENSONAR_WAVE_STARTER_FAILOVER_POLICY_SHADOW_AB__ =
    args.waveStarterFailoverPolicyShadowAbReport;
  runtimeWindow.__XENSONAR_PARTICLE_VOICE_POOL_LIVE_REPORT__ =
    args.particleVoicePoolLiveReport ?? undefined;
}
