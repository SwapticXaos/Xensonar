import { useMemo } from "react";
import type { PerformanceCrisisPanelProps } from "./performanceCrisisPanelProps";
import type { StableLaneSabTransportReadinessSnapshot } from "../rootFollow/rootFollowSharedArrayBufferReadiness";
import type { StableLaneResponsibilityReadoutSnapshot } from "./performanceCrisisDiagnosticSurface";
import {
  formatOptionalNumber,
  formatSabReadinessValue,
  formatStableLaneState,
} from "./performanceCrisisPanelModel";
import {
  normalizeRootFollowLegacyReliefGate,
  resolveRootFollowLegacyReliefGateNote,
} from "../rootFollow/rootFollowLegacyReliefGateContract";
import { formatWaveStarterVoicePoolLiveReportUiValue } from "../audio/waveStarterVoicePoolLiveReport";
import { formatWaveStarterWorkletPilotUiValue } from "../audio/waveStarterWorkletPilotBridge";
import { formatWaveStarterParallelMixAbGuardUiValue } from "../audio/waveStarterParallelMixAbGuard";
import { formatWaveStarterParallelPilotPressureScenarioUiValue } from "../audio/waveStarterParallelPilotPressureScenario";
import { formatWaveStarterParallelPilotGainStabilityUiValue } from "../audio/waveStarterParallelPilotGainStabilityReport";
import { formatWaveStarterVoiceSpecFailoverContractUiValue } from "../audio/waveStarterVoiceSpecFailoverContract";
import { formatWaveStarterSynthFailoverCandidateUiValue } from "../audio/waveStarterSynthFailoverCandidate";
import { formatWaveStarterSampleBufferTokenShadowUiValue } from "../audio/waveStarterSampleBufferTokenShadow";
import { formatWaveStarterSampleFailoverCandidateUiValue } from "../audio/waveStarterSampleFailoverCandidate";
import { formatWaveStarterSampleFailoverLegacyParityProbeUiValue } from "../audio/waveStarterSampleFailoverLegacyParityProbe";
import { formatWaveStarterFailoverDecisionGateUiValue } from "../audio/waveStarterFailoverDecisionGate";
import { formatWaveStarterFailoverStressProbeUiValue } from "../audio/waveStarterFailoverStressProbe";
import { formatWaveStarterFailoverDefaultPolicyCandidateUiValue } from "../audio/waveStarterFailoverDefaultPolicyCandidate";
import { formatWaveStarterFailoverLateWindowTuningProbeUiValue } from "../audio/waveStarterFailoverLateWindowTuningProbe";
import { formatWaveStarterFailoverPolicyShadowAbUiValue } from "../audio/waveStarterFailoverPolicyShadowAb";
import { formatWaveStarterWorkletVoicePoolCompactionUiValue } from "../audio/waveStarterWorkletVoicePoolCompactionReport";
import { formatWaveStarterFailoverEventLedgerUiValue } from "../audio/waveStarterFailoverEventLedger";
import { formatWaveStarterSampleFailoverOffsetCropRefineUiValue } from "../audio/waveStarterSampleFailoverOffsetCropRefine";
import { formatWaveStarterSynthFailoverEnvelopeOvertoneRefineUiValue } from "../audio/waveStarterSynthFailoverEnvelopeOvertoneRefine";
import { formatParticleVoicePoolLiveReportUiValue } from "../audio/particleVoicePoolLiveReport";
import type { usePerformanceCrisisWaveStarterReportPipeline } from "./performanceCrisisWaveStarterReportPipeline";

type WaveStarterReportPipeline = ReturnType<
  typeof usePerformanceCrisisWaveStarterReportPipeline
>;

export type PerformanceCrisisStableLaneResponsibilityReadout = {
  currentLegacyReliefGate: ReturnType<typeof normalizeRootFollowLegacyReliefGate>;
  stableLaneReadout: string;
  reliefGateNote: string;
  stableLaneFrameDelta: number;
  stableLaneFrameAdvanceFresh: boolean;
  stableLaneActiveRenderQuantumCount: number;
  stableLanePlanTransportBackendKind: string;
  stableLaneReliefEvents: number;
  sabReadinessReadout: string;
  browserResponsibilityReadout: StableLaneResponsibilityReadoutSnapshot;
};

export function usePerformanceCrisisStableLaneResponsibilityReadout({
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
}: {
  rootFollowVoiceEngineMode: PerformanceCrisisPanelProps["rootFollowVoiceEngineMode"];
  liveSabReadiness: StableLaneSabTransportReadinessSnapshot | null;
  stressComparison: any;
  waveStarterVoicePoolLiveReport: WaveStarterReportPipeline["waveStarterVoicePoolLiveReport"];
  particleVoicePoolLiveReport: WaveStarterReportPipeline["particleVoicePoolLiveReport"];
  waveStarterWorkletPilotReport: WaveStarterReportPipeline["waveStarterWorkletPilotReport"];
  waveStarterWorkletVoicePoolCompactionReport: WaveStarterReportPipeline["waveStarterWorkletVoicePoolCompactionReport"];
  waveStarterParallelMixAbGuardReport: WaveStarterReportPipeline["waveStarterParallelMixAbGuardReport"];
  waveStarterParallelPilotPressureScenarioReport: WaveStarterReportPipeline["waveStarterParallelPilotPressureScenarioReport"];
  waveStarterParallelPilotGainStabilityReport: WaveStarterReportPipeline["waveStarterParallelPilotGainStabilityReport"];
  waveStarterVoiceSpecFailoverContractReport: WaveStarterReportPipeline["waveStarterVoiceSpecFailoverContractReport"];
  waveStarterSynthFailoverCandidateReport: WaveStarterReportPipeline["waveStarterSynthFailoverCandidateReport"];
  waveStarterSampleBufferTokenShadowReport: WaveStarterReportPipeline["waveStarterSampleBufferTokenShadowReport"];
  waveStarterSampleFailoverCandidateReport: WaveStarterReportPipeline["waveStarterSampleFailoverCandidateReport"];
  waveStarterSampleFailoverLegacyParityProbeReport: WaveStarterReportPipeline["waveStarterSampleFailoverLegacyParityProbeReport"];
  waveStarterFailoverDecisionGateReport: WaveStarterReportPipeline["waveStarterFailoverDecisionGateReport"];
  waveStarterFailoverStressProbeReport: WaveStarterReportPipeline["waveStarterFailoverStressProbeReport"];
  waveStarterFailoverDefaultPolicyCandidateReport: WaveStarterReportPipeline["waveStarterFailoverDefaultPolicyCandidateReport"];
  waveStarterFailoverEventLedgerReport: WaveStarterReportPipeline["waveStarterFailoverEventLedgerReport"];
  waveStarterFailoverLateWindowTuningProbeReport: WaveStarterReportPipeline["waveStarterFailoverLateWindowTuningProbeReport"];
  waveStarterFailoverPolicyShadowAbReport: WaveStarterReportPipeline["waveStarterFailoverPolicyShadowAbReport"];
  waveStarterSampleFailoverOffsetCropRefineReport: WaveStarterReportPipeline["waveStarterSampleFailoverOffsetCropRefineReport"];
  waveStarterSynthFailoverEnvelopeOvertoneRefineReport: WaveStarterReportPipeline["waveStarterSynthFailoverEnvelopeOvertoneRefineReport"];
}): PerformanceCrisisStableLaneResponsibilityReadout {
  const sabReadinessReadout = formatSabReadinessValue(
    liveSabReadiness,
    stressComparison,
  );
  const currentLegacyReliefGate = normalizeRootFollowLegacyReliefGate(
    stressComparison?.legacyReliefGate,
  );
  const stableLaneReadout = formatStableLaneState({
    proven: stressComparison?.stableLaneProven,
    reliefReady: stressComparison?.stableLaneReliefReady,
    warmupReason: stressComparison?.stableLaneWarmupReason,
    fallbackReason: stressComparison?.stableLaneFallbackReason,
  });
  const reliefGateNote = resolveRootFollowLegacyReliefGateNote(
    stressComparison?.legacyReliefGate,
    rootFollowVoiceEngineMode,
  );
  const stableLaneFrameDelta =
    stressComparison?.workletStableLaneRenderedFrameDelta ?? 0;
  const stableLaneFrameAdvanceFresh = Boolean(
    stressComparison?.workletStableLaneFrameAdvanceFresh,
  );
  const stableLaneActiveRenderQuantumCount =
    stressComparison?.workletStableLaneActiveRenderQuantumCount ?? 0;
  const stableLanePlanTransportBackendKind =
    stressComparison?.workletStableLanePlanTransportBackendKind ??
    "message-port";
  const stableLanePlanTransportPostedCount =
    stressComparison?.workletStableLanePlanTransportPostedCount ?? 0;
  const stableLanePlanTransportPendingCount =
    stressComparison?.workletStableLanePlanTransportPendingCount ?? 0;
  const stableLanePlanTransportDroppedSupersededCount =
    stressComparison?.workletStableLanePlanTransportDroppedSupersededCount ?? 0;
  const stableLaneReliefEvents = stressComparison?.stableLaneReliefEvents ?? 0;
  const primaryCandidateMuteEvents =
    stressComparison?.primaryCandidateMuteEvents ?? 0;
  const stableLaneLegacyBlend = formatOptionalNumber(
    stressComparison?.stableLaneLegacyBlend,
  );
  const stableLaneBlend = formatOptionalNumber(
    stressComparison?.stableLaneBlend,
  );

  const browserResponsibilityReadout =
    useMemo<StableLaneResponsibilityReadoutSnapshot>(
      () => ({
        rootFollowVoiceEngineMode,
        legacyReliefGate: currentLegacyReliefGate,
        stableLane: stableLaneReadout,
        frameDelta: stableLaneFrameDelta,
        frameAdvanceFresh: stableLaneFrameAdvanceFresh,
        laneQuanta: stableLaneActiveRenderQuantumCount,
        planTransport: `${stableLanePlanTransportBackendKind} · P ${stableLanePlanTransportPostedCount} · Q ${stableLanePlanTransportPendingCount} · S ${stableLanePlanTransportDroppedSupersededCount}`,
        planTransportBackendKind: stableLanePlanTransportBackendKind,
        planTransportPostedCount: stableLanePlanTransportPostedCount,
        planTransportPendingCount: stableLanePlanTransportPendingCount,
        planTransportDroppedSupersededCount:
          stableLanePlanTransportDroppedSupersededCount,
        sabReadiness: sabReadinessReadout,
        reliefEvents: `S ${stableLaneReliefEvents} · P ${primaryCandidateMuteEvents}`,
        blend: `${stableLaneLegacyBlend} / ${stableLaneBlend}`,
        stressHarness: "pending",
        abReport: "pending",
        clickBurstProxy: "pending",
        reliefProof: "pending",
        liveDeliveryProof: "pending",
        holisticVoicePool: "pending",
        waveStarterVoicePool: formatWaveStarterVoicePoolLiveReportUiValue(
          waveStarterVoicePoolLiveReport,
        ),
        waveStarterWorkletPilot: formatWaveStarterWorkletPilotUiValue(
          waveStarterWorkletPilotReport,
        ),
        waveStarterParallelMixAbGuard:
          formatWaveStarterParallelMixAbGuardUiValue(
            waveStarterParallelMixAbGuardReport,
          ),
        waveStarterPressureScenario:
          formatWaveStarterParallelPilotPressureScenarioUiValue(
            waveStarterParallelPilotPressureScenarioReport,
          ),
        waveStarterPilotGainStability:
          formatWaveStarterParallelPilotGainStabilityUiValue(
            waveStarterParallelPilotGainStabilityReport,
          ),
        waveStarterVoiceSpecFailoverContract:
          formatWaveStarterVoiceSpecFailoverContractUiValue(
            waveStarterVoiceSpecFailoverContractReport,
          ),
        waveStarterSynthFailoverCandidate:
          formatWaveStarterSynthFailoverCandidateUiValue(
            waveStarterSynthFailoverCandidateReport,
          ),
        waveStarterSampleBufferTokenShadow:
          formatWaveStarterSampleBufferTokenShadowUiValue(
            waveStarterSampleBufferTokenShadowReport,
          ),
        waveStarterSampleFailoverCandidate:
          formatWaveStarterSampleFailoverCandidateUiValue(
            waveStarterSampleFailoverCandidateReport,
          ),
        waveStarterSampleFailoverLegacyParityProbe:
          formatWaveStarterSampleFailoverLegacyParityProbeUiValue(
            waveStarterSampleFailoverLegacyParityProbeReport,
          ),
        waveStarterFailoverDecisionGate:
          formatWaveStarterFailoverDecisionGateUiValue(
            waveStarterFailoverDecisionGateReport,
          ),
        waveStarterFailoverStressProbe:
          formatWaveStarterFailoverStressProbeUiValue(
            waveStarterFailoverStressProbeReport,
          ),
        waveStarterFailoverDefaultPolicyCandidate:
          formatWaveStarterFailoverDefaultPolicyCandidateUiValue(
            waveStarterFailoverDefaultPolicyCandidateReport,
          ),
        waveStarterFailoverLateWindowTuningProbe:
          formatWaveStarterFailoverLateWindowTuningProbeUiValue(
            waveStarterFailoverLateWindowTuningProbeReport,
          ),
        waveStarterFailoverPolicyShadowAb:
          formatWaveStarterFailoverPolicyShadowAbUiValue(
            waveStarterFailoverPolicyShadowAbReport,
          ),
        waveStarterWorkletVoicePoolCompaction:
          formatWaveStarterWorkletVoicePoolCompactionUiValue(
            waveStarterWorkletVoicePoolCompactionReport,
          ),
        waveStarterFailoverEventLedger:
          formatWaveStarterFailoverEventLedgerUiValue(
            waveStarterFailoverEventLedgerReport,
          ),
        waveStarterSampleFailoverOffsetCropRefine:
          formatWaveStarterSampleFailoverOffsetCropRefineUiValue(
            waveStarterSampleFailoverOffsetCropRefineReport,
          ),
        waveStarterSynthFailoverEnvelopeOvertoneRefine:
          formatWaveStarterSynthFailoverEnvelopeOvertoneRefineUiValue(
            waveStarterSynthFailoverEnvelopeOvertoneRefineReport,
          ),
        particleVoicePool: formatParticleVoicePoolLiveReportUiValue(
          particleVoicePoolLiveReport,
        ),
      }),
      [
        rootFollowVoiceEngineMode,
        currentLegacyReliefGate,
        stableLaneReadout,
        stableLaneFrameDelta,
        stableLaneFrameAdvanceFresh,
        stableLaneActiveRenderQuantumCount,
        stableLanePlanTransportBackendKind,
        stableLanePlanTransportPostedCount,
        stableLanePlanTransportPendingCount,
        stableLanePlanTransportDroppedSupersededCount,
        sabReadinessReadout,
        stableLaneReliefEvents,
        primaryCandidateMuteEvents,
        stableLaneLegacyBlend,
        stableLaneBlend,
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
        waveStarterWorkletVoicePoolCompactionReport,
        waveStarterFailoverEventLedgerReport,
        waveStarterSampleFailoverOffsetCropRefineReport,
        waveStarterSynthFailoverEnvelopeOvertoneRefineReport,
        particleVoicePoolLiveReport,
      ],
    );

  return {
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
  };
}
