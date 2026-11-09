import { useEffect, useMemo, useRef, useState } from "react";
import type { PerformanceCrisisPanelProps } from "./performanceCrisisPanelProps";
import {
  detectStableLaneSabTransportReadiness,
  type StableLaneSabTransportReadinessSnapshot,
} from "../rootFollow/rootFollowSharedArrayBufferReadiness";
import {
  runRootFollowStableLaneSyntheticSilentPlanProbe,
  type RootFollowStableLaneSyntheticSilentProbeResult,
} from "../rootFollow/rootFollowWorkletShadowBridge";
import { usePerformanceCrisisWaveStarterReportPipeline } from "./performanceCrisisWaveStarterReportPipeline";
import { usePerformanceCrisisStableLaneResponsibilityReadout } from "./performanceCrisisStableLaneReadout";
import { usePerformanceCrisisStableLaneProofReports } from "./usePerformanceCrisisStableLaneProofReports";
import {
  STABLE_LANE_BOOT_PROBE_SAMPLE_INTERVAL_MS,
  STABLE_LANE_BOOT_PROBE_SAMPLE_WINDOW_MS,
  buildStableLaneBootProbeSnapshot,
  getPerformanceCrisisDiagnosticWindow,
  nowMs,
  publishPerformanceCrisisDiagnosticReports,
  publishStableLaneBootProbeSnapshot,
  publishStableLaneSabReadinessSnapshot,
  publishStableLaneSyntheticSilentProbe,
  type StableLaneBootProbeSample,
} from "./performanceCrisisDiagnosticSurface";

export function usePerformanceCrisisStableLaneDiagnostics({
  rootFollowVoiceEngineMode,
  audioBurstRecorder,
}: {
  rootFollowVoiceEngineMode: PerformanceCrisisPanelProps["rootFollowVoiceEngineMode"];
  audioBurstRecorder: PerformanceCrisisPanelProps["audioBurstRecorder"];
}) {
  const [liveSabReadiness, setLiveSabReadiness] =
    useState<StableLaneSabTransportReadinessSnapshot | null>(null);
  const [syntheticSilentProbe, setSyntheticSilentProbe] =
    useState<RootFollowStableLaneSyntheticSilentProbeResult | null>(null);
  const syntheticSilentProbeRunKeyRef = useRef<string | null>(null);
  const bootProbeStartedAtMsRef = useRef(nowMs());
  const bootProbeStartedAtIsoRef = useRef(new Date().toISOString());
  const bootProbeSamplesRef = useRef<StableLaneBootProbeSample[]>([]);

  useEffect(() => {
    const readinessSnapshot = detectStableLaneSabTransportReadiness();
    setLiveSabReadiness(readinessSnapshot);
    publishStableLaneSabReadinessSnapshot(readinessSnapshot);
  }, []);

  const latestAudioTraffic = useMemo(() => {
    const entries = Array.isArray(audioBurstRecorder?.entries)
      ? audioBurstRecorder.entries
      : [];
    return (
      [...entries].reverse().find((entry: any) => entry?.audioTraffic)
        ?.audioTraffic ?? null
    );
  }, [audioBurstRecorder]);
  const stressComparison = latestAudioTraffic?.stressComparison ?? null;
  const {
    waveStarterVoicePoolLiveReport,
    particleVoicePoolLiveReport,
    waveStarterWorkletPilotReport,
    waveStarterWorkletProcessorRuntimeOwnershipReport,
    waveStarterVoiceSpecFailoverContractReport,
    waveStarterParallelMixAbGuardReport,
    waveStarterParallelPilotPressureScenarioReport,
    waveStarterParallelPilotGainStabilityReport,
    waveStarterSynthFailoverCandidateReport,
    waveStarterSampleBufferTokenShadowReport,
    waveStarterSampleFailoverCandidateReport,
    waveStarterSampleFailoverLegacyParityProbeReport,
    waveStarterFailoverDecisionGateReport,
    waveStarterFailoverStressProbeReport,
    waveStarterFailoverDefaultPolicyCandidateReport,
    waveStarterFailoverEventLedgerReport,
    waveStarterFailoverLateWindowTuningProbeReport,
    waveStarterFailoverPolicyShadowAbReport,
    waveStarterWorkletVoicePoolCompactionReport,
    waveStarterFailoverPolicyReadinessMatrixReport,
    waveStarterKeyboardGestureCapacityReport,
    waveStarterAttackIntegrityCongestionReport,
    waveStarterFailoverRealTestHarnessHooksReport,
    waveStarterSampleFailoverOffsetCropRefineReport,
    waveStarterSynthFailoverEnvelopeOvertoneRefineReport,
  } = usePerformanceCrisisWaveStarterReportPipeline();

  const {
    currentLegacyReliefGate,
    stableLaneReadout,
    reliefGateNote,
    stableLaneFrameDelta,
    stableLaneFrameAdvanceFresh,
    stableLaneActiveRenderQuantumCount,
    stableLanePlanTransportBackendKind,
    stableLaneReliefEvents,
    sabReadinessReadout,
    browserResponsibilityReadout,
  } = usePerformanceCrisisStableLaneResponsibilityReadout({
    rootFollowVoiceEngineMode,
    liveSabReadiness,
    stressComparison,
    waveStarterVoicePoolLiveReport,
    particleVoicePoolLiveReport,
    waveStarterWorkletPilotReport,
    waveStarterWorkletVoicePoolCompactionReport,
    waveStarterParallelMixAbGuardReport,
    waveStarterParallelPilotPressureScenarioReport,
    waveStarterParallelPilotGainStabilityReport,
    waveStarterVoiceSpecFailoverContractReport,
    waveStarterSynthFailoverCandidateReport,
    waveStarterSampleBufferTokenShadowReport,
    waveStarterSampleFailoverCandidateReport,
    waveStarterSampleFailoverLegacyParityProbeReport,
    waveStarterFailoverDecisionGateReport,
    waveStarterFailoverStressProbeReport,
    waveStarterFailoverDefaultPolicyCandidateReport,
    waveStarterFailoverEventLedgerReport,
    waveStarterFailoverLateWindowTuningProbeReport,
    waveStarterFailoverPolicyShadowAbReport,
    waveStarterSampleFailoverOffsetCropRefineReport,
    waveStarterSynthFailoverEnvelopeOvertoneRefineReport,
  });

  const {
    audioContextUserGestureProbe,
    stableLaneProofState,
    stableLaneStressHarnessReport,
    stableLaneABReport,
    stableLaneClickBurstProxyReport,
    stableLaneRootMaterialReliefProofReport,
    stableLaneExpressivePressureAddOnReport,
    stableLaneSabReadinessDifferentialReport,
    stableLaneLiveDeliveryProofReport,
    holisticVoicePoolFallbackReport,
    holisticPressureBudgetPolicy,
    holisticCapacityFirstAdmissionGuard,
  } = usePerformanceCrisisStableLaneProofReports({
    rootFollowVoiceEngineMode,
    stressComparison,
    liveSabReadiness,
    currentLegacyReliefGate,
    stableLaneFrameDelta,
    stableLaneFrameAdvanceFresh,
    stableLaneActiveRenderQuantumCount,
    stableLaneReliefEvents,
    browserResponsibilityReadout,
    syntheticSilentProbe,
    waveStarterVoicePoolLiveReport,
    particleVoicePoolLiveReport,
  });

  useEffect(() => {
    if (rootFollowVoiceEngineMode !== "worklet-stable-lane-pilot") return;
    const runtimeWindow = getPerformanceCrisisDiagnosticWindow();
    if (!runtimeWindow) return;
    const ctx =
      runtimeWindow.__XENSONAR_ROOT_FOLLOW_AUDIO_CONTEXT__ ??
      runtimeWindow.__XENSONAR_AUDIO_CONTEXT__ ??
      null;
    const runKey = `${rootFollowVoiceEngineMode}:${audioContextUserGestureProbe.audioContextState}:${audioContextUserGestureProbe.userActivationState}`;
    if (syntheticSilentProbeRunKeyRef.current === runKey) return;
    syntheticSilentProbeRunKeyRef.current = runKey;
    let cancelled = false;
    void runRootFollowStableLaneSyntheticSilentPlanProbe({
      ctx,
      audioNowSec:
        ctx && "currentTime" in ctx ? Number((ctx as any).currentTime) : 0,
    }).then((result) => {
      if (cancelled) return;
      setSyntheticSilentProbe(result);
      publishStableLaneSyntheticSilentProbe(result);
    });
    return () => {
      cancelled = true;
    };
  }, [
    rootFollowVoiceEngineMode,
    audioContextUserGestureProbe.audioContextState,
    audioContextUserGestureProbe.userActivationState,
  ]);

  useEffect(() => {
    publishPerformanceCrisisDiagnosticReports({
      browserResponsibilityReadout,
      audioContextUserGestureProbe,
      stableLaneStressHarnessReport,
      stableLaneABReport,
      stableLaneClickBurstProxyReport,
      stableLaneRootMaterialReliefProofReport,
      stableLaneExpressivePressureAddOnReport,
      stableLaneSabReadinessDifferentialReport,
      stableLaneLiveDeliveryProofReport,
      holisticVoicePoolFallbackReport,
      holisticPressureBudgetPolicy,
      holisticCapacityFirstAdmissionGuard,
      waveStarterVoicePoolLiveReport,
      waveStarterWorkletPilotReport,
      waveStarterParallelMixAbGuardReport,
      waveStarterParallelPilotPressureScenarioReport,
      waveStarterParallelPilotGainStabilityReport,
      waveStarterVoiceSpecFailoverContractReport,
      waveStarterSynthFailoverCandidateReport,
      waveStarterSampleBufferTokenShadowReport,
      waveStarterSampleFailoverCandidateReport,
      waveStarterSampleFailoverLegacyParityProbeReport,
      waveStarterFailoverDecisionGateReport,
      waveStarterFailoverStressProbeReport,
      waveStarterFailoverDefaultPolicyCandidateReport,
      waveStarterFailoverLateWindowTuningProbeReport,
      waveStarterFailoverPolicyShadowAbReport,
      particleVoicePoolLiveReport,
    });
  }, [
    browserResponsibilityReadout,
    audioContextUserGestureProbe,
    stableLaneStressHarnessReport,
    stableLaneABReport,
    stableLaneClickBurstProxyReport,
    stableLaneRootMaterialReliefProofReport,
    stableLaneExpressivePressureAddOnReport,
    stableLaneSabReadinessDifferentialReport,
    stableLaneLiveDeliveryProofReport,
    holisticVoicePoolFallbackReport,
    holisticPressureBudgetPolicy,
    holisticCapacityFirstAdmissionGuard,
    waveStarterVoicePoolLiveReport,
    waveStarterWorkletPilotReport,
    waveStarterParallelMixAbGuardReport,
    waveStarterParallelPilotPressureScenarioReport,
    waveStarterParallelPilotGainStabilityReport,
    waveStarterVoiceSpecFailoverContractReport,
    waveStarterSynthFailoverCandidateReport,
    waveStarterSampleBufferTokenShadowReport,
    waveStarterSampleFailoverCandidateReport,
    waveStarterSampleFailoverLegacyParityProbeReport,
    waveStarterFailoverDecisionGateReport,
    waveStarterFailoverStressProbeReport,
    waveStarterFailoverDefaultPolicyCandidateReport,
    waveStarterFailoverLateWindowTuningProbeReport,
    waveStarterFailoverPolicyShadowAbReport,
    particleVoicePoolLiveReport,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    let cancelled = false;
    const writeBootProbe = () => {
      if (cancelled) return;
      const sample: StableLaneBootProbeSample = {
        atMs: Math.max(0, nowMs() - bootProbeStartedAtMsRef.current),
        rootFollowVoiceEngineMode,
        legacyReliefGate: browserResponsibilityReadout.legacyReliefGate,
        stableLane: browserResponsibilityReadout.stableLane,
        frameDelta: browserResponsibilityReadout.frameDelta,
        frameAdvanceFresh: browserResponsibilityReadout.frameAdvanceFresh,
        laneQuanta: browserResponsibilityReadout.laneQuanta,
        planTransportBackendKind:
          browserResponsibilityReadout.planTransportBackendKind,
        sabReadiness: browserResponsibilityReadout.sabReadiness,
        stressComparisonPresent: !!stressComparison,
        audioContextState: audioContextUserGestureProbe.audioContextState,
        userActivationState: audioContextUserGestureProbe.userActivationState,
        audioProbeBlocker: audioContextUserGestureProbe.blockerReason,
        syntheticSilentProbeStatus: syntheticSilentProbe?.status ?? "not-run",
        syntheticSilentProbeBlocker:
          syntheticSilentProbe?.blockerReason ?? null,
      };
      bootProbeSamplesRef.current = [
        ...bootProbeSamplesRef.current,
        sample,
      ].slice(-16);
      const snapshot = buildStableLaneBootProbeSnapshot({
        startedAtMs: bootProbeStartedAtMsRef.current,
        startedAtIso: bootProbeStartedAtIsoRef.current,
        responsibilityReadout: browserResponsibilityReadout,
        stressComparisonPresent: !!stressComparison,
        samples: bootProbeSamplesRef.current,
        audioProbe: audioContextUserGestureProbe,
        syntheticSilentProbe,
      });
      publishStableLaneBootProbeSnapshot(snapshot);
    };
    writeBootProbe();
    const intervalId = window.setInterval(
      writeBootProbe,
      STABLE_LANE_BOOT_PROBE_SAMPLE_INTERVAL_MS,
    );
    const stopId = window.setTimeout(
      () => window.clearInterval(intervalId),
      STABLE_LANE_BOOT_PROBE_SAMPLE_WINDOW_MS,
    );
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.clearTimeout(stopId);
    };
  }, [
    browserResponsibilityReadout,
    rootFollowVoiceEngineMode,
    stressComparison,
    audioContextUserGestureProbe,
    syntheticSilentProbe,
  ]);

  const waveTraffic = latestAudioTraffic?.waveOvertoneArp ?? null;
  const recentWaveTraffic = latestAudioTraffic?.recent?.waveOvertoneArp ?? null;


  return {
    currentLegacyReliefGate,
    liveSabReadiness,
    audioContextUserGestureProbe,
    syntheticSilentProbe,
    stableLaneStressHarnessReport,
    stableLaneABReport,
    stableLaneLiveDeliveryProofReport,
    holisticVoicePoolFallbackReport,
    waveStarterVoicePoolLiveReport,
    waveStarterWorkletPilotReport,
    waveStarterWorkletVoicePoolCompactionReport,
    waveStarterParallelMixAbGuardReport,
    particleVoicePoolLiveReport,
    stableLaneReadout,
    stableLaneFrameDelta,
    stableLaneFrameAdvanceFresh,
    stableLaneActiveRenderQuantumCount,
    stableLanePlanTransportBackendKind,
    browserResponsibilityReadout,
    sabReadinessReadout,
    stableLaneProofState,
    stableLaneClickBurstProxyReport,
    stableLaneRootMaterialReliefProofReport,
    stableLaneExpressivePressureAddOnReport,
    stableLaneSabReadinessDifferentialReport,
    holisticPressureBudgetPolicy,
    holisticCapacityFirstAdmissionGuard,
    waveStarterWorkletProcessorRuntimeOwnershipReport,
    waveStarterFailoverEventLedgerReport,
    waveStarterSampleFailoverOffsetCropRefineReport,
    waveStarterSynthFailoverEnvelopeOvertoneRefineReport,
    waveStarterParallelPilotPressureScenarioReport,
    waveStarterParallelPilotGainStabilityReport,
    waveStarterVoiceSpecFailoverContractReport,
    waveStarterSynthFailoverCandidateReport,
    waveStarterSampleBufferTokenShadowReport,
    waveStarterSampleFailoverCandidateReport,
    waveStarterSampleFailoverLegacyParityProbeReport,
    waveStarterFailoverDecisionGateReport,
    waveStarterFailoverStressProbeReport,
    waveStarterFailoverLateWindowTuningProbeReport,
    waveStarterFailoverPolicyShadowAbReport,
    waveStarterKeyboardGestureCapacityReport,
    waveStarterAttackIntegrityCongestionReport,
    waveStarterFailoverPolicyReadinessMatrixReport,
    waveStarterFailoverRealTestHarnessHooksReport,
    waveStarterFailoverDefaultPolicyCandidateReport,
    reliefGateNote,
    waveTraffic,
    recentWaveTraffic,
  };
}
