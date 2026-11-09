import { useMemo } from "react";
import type { PerformanceCrisisPanelProps } from "./performanceCrisisPanelProps";
import type { StableLaneSabTransportReadinessSnapshot } from "../rootFollow/rootFollowSharedArrayBufferReadiness";
import {
  detectStableLaneAudioContextUserGestureProbe,
  type StableLaneAudioContextUserGestureProbeSnapshot,
} from "../rootFollow/rootFollowAudioContextUserGestureProbe";
import type { RootFollowStableLaneSyntheticSilentProbeResult } from "../rootFollow/rootFollowWorkletShadowBridge";
import {
  buildStableLaneClickBurstProxyReport,
  buildStableLaneExpressivePressureAddOnReport,
  buildStableLaneRootMaterialReliefProofReport,
  buildStableLaneSabReadinessDifferentialReport,
  buildStableLaneStressScenarioHarnessReport,
  type StableLaneClickBurstProxyReport,
  type StableLaneExpressivePressureAddOnReport,
  type StableLaneRootMaterialReliefProofReport,
  type StableLaneSabReadinessDifferentialReport,
  type StableLaneStressScenarioHarnessReport,
} from "../diagnostics/stableLaneStressHarness";
import {
  buildStableLaneLiveDeliveryProofReport,
  type StableLaneLiveDeliveryProofReport,
} from "../diagnostics/stableLaneLiveDeliveryProof";
import {
  buildHolisticVoicePoolFallbackReport,
  type HolisticVoicePoolFallbackReport,
} from "../audio/holisticVoicePoolFallback";
import {
  buildHolisticPressureBudgetPolicy,
  type HolisticPressureBudgetPolicy,
} from "../audio/holisticPressureBudgetPolicy";
import {
  buildHolisticCapacityFirstAdmissionGuard,
  type HolisticCapacityFirstAdmissionGuard,
} from "../audio/holisticCapacityFirstAdmissionGuard";
import {
  inferStableLaneProofState,
  type StableLaneResponsibilityReadoutSnapshot,
} from "./performanceCrisisDiagnosticSurface";
import type { usePerformanceCrisisWaveStarterReportPipeline } from "./performanceCrisisWaveStarterReportPipeline";

type WaveStarterReportPipeline = ReturnType<
  typeof usePerformanceCrisisWaveStarterReportPipeline
>;

export type PerformanceCrisisStableLaneProofReports = {
  audioContextUserGestureProbe: StableLaneAudioContextUserGestureProbeSnapshot;
  stableLaneProofState: ReturnType<typeof inferStableLaneProofState>;
  stableLaneStressHarnessReport: StableLaneStressScenarioHarnessReport;
  stableLaneABReport: StableLaneStressScenarioHarnessReport["abReport"];
  stableLaneClickBurstProxyReport: StableLaneClickBurstProxyReport;
  stableLaneRootMaterialReliefProofReport: StableLaneRootMaterialReliefProofReport;
  stableLaneExpressivePressureAddOnReport: StableLaneExpressivePressureAddOnReport;
  stableLaneSabReadinessDifferentialReport: StableLaneSabReadinessDifferentialReport;
  stableLaneLiveDeliveryProofReport: StableLaneLiveDeliveryProofReport;
  holisticVoicePoolFallbackReport: HolisticVoicePoolFallbackReport;
  holisticPressureBudgetPolicy: HolisticPressureBudgetPolicy;
  holisticCapacityFirstAdmissionGuard: HolisticCapacityFirstAdmissionGuard;
};

export function usePerformanceCrisisStableLaneProofReports({
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
}: {
  rootFollowVoiceEngineMode: PerformanceCrisisPanelProps["rootFollowVoiceEngineMode"];
  stressComparison: any;
  liveSabReadiness: StableLaneSabTransportReadinessSnapshot | null;
  currentLegacyReliefGate: string;
  stableLaneFrameDelta: number;
  stableLaneFrameAdvanceFresh: boolean;
  stableLaneActiveRenderQuantumCount: number;
  stableLaneReliefEvents: number;
  browserResponsibilityReadout: StableLaneResponsibilityReadoutSnapshot;
  syntheticSilentProbe: RootFollowStableLaneSyntheticSilentProbeResult | null;
  waveStarterVoicePoolLiveReport: WaveStarterReportPipeline["waveStarterVoicePoolLiveReport"];
  particleVoicePoolLiveReport: WaveStarterReportPipeline["particleVoicePoolLiveReport"];
}): PerformanceCrisisStableLaneProofReports {
  const stableLaneProofState = useMemo(
    () =>
      inferStableLaneProofState({
        responsibilityReadout: browserResponsibilityReadout,
        stressComparisonPresent: !!stressComparison,
      }),
    [browserResponsibilityReadout, stressComparison],
  );

  const audioContextUserGestureProbe =
    useMemo<StableLaneAudioContextUserGestureProbeSnapshot>(
      () =>
        detectStableLaneAudioContextUserGestureProbe({
          rootFollowVoiceEngineMode,
          stableLaneProofState,
          stressComparisonPresent: !!stressComparison,
          frameDelta: stableLaneFrameDelta,
          laneQuanta: stableLaneActiveRenderQuantumCount,
          planTransportPostedCount:
            browserResponsibilityReadout.planTransportPostedCount,
          planTransportPendingCount:
            browserResponsibilityReadout.planTransportPendingCount,
        }),
      [
        rootFollowVoiceEngineMode,
        stableLaneProofState,
        stressComparison,
        stableLaneFrameDelta,
        stableLaneActiveRenderQuantumCount,
        browserResponsibilityReadout.planTransportPostedCount,
        browserResponsibilityReadout.planTransportPendingCount,
      ],
    );

  const stableLaneStressHarnessReport =
    useMemo<StableLaneStressScenarioHarnessReport>(
      () =>
        buildStableLaneStressScenarioHarnessReport({
          currentVoiceEngineMode: rootFollowVoiceEngineMode,
          stressComparison,
          responsibility: browserResponsibilityReadout,
          audioProbe: audioContextUserGestureProbe,
          syntheticSilentProbe,
        }),
      [
        rootFollowVoiceEngineMode,
        stressComparison,
        browserResponsibilityReadout,
        audioContextUserGestureProbe,
        syntheticSilentProbe,
      ],
    );

  const stableLaneABReport = stableLaneStressHarnessReport.abReport;

  const stableLaneClickBurstProxyReport =
    useMemo<StableLaneClickBurstProxyReport>(
      () =>
        buildStableLaneClickBurstProxyReport({
          currentVoiceEngineMode: rootFollowVoiceEngineMode,
          stressComparison,
          responsibility: browserResponsibilityReadout,
          syntheticSilentProbe,
        }),
      [
        rootFollowVoiceEngineMode,
        stressComparison,
        browserResponsibilityReadout,
        syntheticSilentProbe,
      ],
    );

  const stableLaneRootMaterialReliefProofReport =
    useMemo<StableLaneRootMaterialReliefProofReport>(
      () =>
        buildStableLaneRootMaterialReliefProofReport({
          currentVoiceEngineMode: rootFollowVoiceEngineMode,
          stressComparison,
          responsibility: browserResponsibilityReadout,
          audioProbe: audioContextUserGestureProbe,
        }),
      [
        rootFollowVoiceEngineMode,
        stressComparison,
        browserResponsibilityReadout,
        audioContextUserGestureProbe,
      ],
    );

  const stableLaneExpressivePressureAddOnReport =
    useMemo<StableLaneExpressivePressureAddOnReport>(
      () =>
        buildStableLaneExpressivePressureAddOnReport({
          currentVoiceEngineMode: rootFollowVoiceEngineMode,
          stressComparison,
          responsibility: browserResponsibilityReadout,
          audioProbe: audioContextUserGestureProbe,
          syntheticSilentProbe,
        }),
      [
        rootFollowVoiceEngineMode,
        stressComparison,
        browserResponsibilityReadout,
        audioContextUserGestureProbe,
        syntheticSilentProbe,
      ],
    );

  const stableLaneSabReadinessDifferentialReport =
    useMemo<StableLaneSabReadinessDifferentialReport>(
      () => buildStableLaneSabReadinessDifferentialReport(liveSabReadiness),
      [liveSabReadiness],
    );

  const stableLaneLiveDeliveryProofReport =
    useMemo<StableLaneLiveDeliveryProofReport>(
      () =>
        buildStableLaneLiveDeliveryProofReport({
          currentVoiceEngineMode: rootFollowVoiceEngineMode,
          stressComparison,
          responsibility: browserResponsibilityReadout,
          audioProbe: audioContextUserGestureProbe,
          syntheticSilentProbe,
        }),
      [
        rootFollowVoiceEngineMode,
        stressComparison,
        browserResponsibilityReadout,
        audioContextUserGestureProbe,
        syntheticSilentProbe,
      ],
    );

  const holisticVoicePoolFallbackReport =
    useMemo<HolisticVoicePoolFallbackReport>(
      () =>
        buildHolisticVoicePoolFallbackReport({
          currentVoiceEngineMode: rootFollowVoiceEngineMode,
          audioContextState: audioContextUserGestureProbe.audioContextState,
          stableLaneReliefGate: currentLegacyReliefGate,
          stableLaneFrameDelta,
          stableLaneFrameFresh: stableLaneFrameAdvanceFresh,
          stableLaneQuanta: stableLaneActiveRenderQuantumCount,
          rootMaterialReliefEvents: stableLaneReliefEvents,
          waveStarterEvents16:
            stressComparison?.maxWaveStarterEventsPer16Ms ?? 0,
          particleEvents16: stressComparison?.maxParticleEventsPer16Ms ?? 0,
          workletProcessorErrorCount:
            stressComparison?.workletProcessorErrorCount ?? 0,
          planTransportForcedPosts:
            stressComparison?.workletStableLanePlanTransportForcedPostCount ??
            0,
          planTransportDroppedSupersededCount:
            browserResponsibilityReadout.planTransportDroppedSupersededCount,
          waveStarterLiveReport: waveStarterVoicePoolLiveReport,
          particleVoicePoolLiveReport,
        }),
      [
        rootFollowVoiceEngineMode,
        audioContextUserGestureProbe.audioContextState,
        currentLegacyReliefGate,
        stableLaneFrameDelta,
        stableLaneFrameAdvanceFresh,
        stableLaneActiveRenderQuantumCount,
        stableLaneReliefEvents,
        stressComparison,
        browserResponsibilityReadout.planTransportDroppedSupersededCount,
        waveStarterVoicePoolLiveReport,
        particleVoicePoolLiveReport,
      ],
    );

  const holisticPressureBudgetPolicy = useMemo<HolisticPressureBudgetPolicy>(
    () => buildHolisticPressureBudgetPolicy(holisticVoicePoolFallbackReport),
    [holisticVoicePoolFallbackReport],
  );

  const holisticCapacityFirstAdmissionGuard =
    useMemo<HolisticCapacityFirstAdmissionGuard>(
      () =>
        buildHolisticCapacityFirstAdmissionGuard({
          policy: holisticPressureBudgetPolicy,
          report: holisticVoicePoolFallbackReport,
        }),
      [holisticPressureBudgetPolicy, holisticVoicePoolFallbackReport],
    );

  return {
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
  };
}
