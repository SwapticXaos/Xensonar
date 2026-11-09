import { useMemo } from "react";
import { buildWaveStarterAttackIntegrityCongestionReport } from "../audio/waveStarterAttackIntegrityCongestionBrake";
import { buildWaveStarterFailoverDefaultPolicyCandidateReport } from "../audio/waveStarterFailoverDefaultPolicyCandidate";
import { buildWaveStarterFailoverEventLedgerReport } from "../audio/waveStarterFailoverEventLedger";
import { buildWaveStarterFailoverLateWindowTuningProbeReport } from "../audio/waveStarterFailoverLateWindowTuningProbe";
import { buildWaveStarterFailoverPolicyReadinessMatrixReport } from "../audio/waveStarterFailoverPolicyReadinessMatrix";
import { buildWaveStarterFailoverPolicyShadowAbReport } from "../audio/waveStarterFailoverPolicyShadowAb";
import { buildWaveStarterFailoverRealTestHarnessHooksReport } from "../audio/waveStarterFailoverRealTestHarnessHooks";
import { buildWaveStarterFailoverStressProbeReport } from "../audio/waveStarterFailoverStressProbe";
import { buildWaveStarterKeyboardGestureCapacityReport } from "../audio/waveStarterKeyboardGestureCapacity";
import { buildWaveStarterParallelMixAbGuardReport } from "../audio/waveStarterParallelMixAbGuard";
import { buildWaveStarterParallelPilotGainStabilityReport } from "../audio/waveStarterParallelPilotGainStabilityReport";
import { buildWaveStarterParallelPilotPressureScenarioReport } from "../audio/waveStarterParallelPilotPressureScenario";
import { buildWaveStarterSampleBufferTokenShadowReport } from "../audio/waveStarterSampleBufferTokenShadow";
import { buildWaveStarterSampleFailoverCandidateReport } from "../audio/waveStarterSampleFailoverCandidate";
import { buildWaveStarterSampleFailoverLegacyParityProbeReport } from "../audio/waveStarterSampleFailoverLegacyParityProbe";
import { buildWaveStarterSampleFailoverOffsetCropRefineReport } from "../audio/waveStarterSampleFailoverOffsetCropRefine";
import { buildWaveStarterSynthFailoverCandidateReport } from "../audio/waveStarterSynthFailoverCandidate";
import { buildWaveStarterSynthFailoverEnvelopeOvertoneRefineReport } from "../audio/waveStarterSynthFailoverEnvelopeOvertoneRefine";
import { buildWaveStarterWorkletVoicePoolCompactionReport } from "../audio/waveStarterWorkletVoicePoolCompactionReport";
import { usePerformanceCrisisBrowserReports } from "./performanceCrisisBrowserReports";

export function usePerformanceCrisisWaveStarterReportPipeline() {
  const {
    waveStarterVoicePoolLiveReport,
    particleVoicePoolLiveReport,
    waveStarterWorkletPilotReport,
    waveStarterWorkletProcessorRuntimeOwnershipReport,
    waveStarterVoiceSpecFailoverContractReport,
    waveStarterSynthFailoverCandidateBaseReport,
    waveStarterSampleBufferTokenShadowBaseReport,
    waveStarterSampleFailoverCandidateBaseReport,
    waveStarterFailoverDecisionGateReport,
  } = usePerformanceCrisisBrowserReports();

  const waveStarterParallelMixAbGuardReport =
    useMemo(
      () =>
        buildWaveStarterParallelMixAbGuardReport(waveStarterWorkletPilotReport),
      [waveStarterWorkletPilotReport],
    );

  const waveStarterParallelPilotPressureScenarioReport =
    useMemo(
      () =>
        buildWaveStarterParallelPilotPressureScenarioReport({
          waveStarterLiveReport: waveStarterVoicePoolLiveReport,
          pilotReport: waveStarterWorkletPilotReport,
          abGuardReport: waveStarterParallelMixAbGuardReport,
        }),
      [
        waveStarterVoicePoolLiveReport,
        waveStarterWorkletPilotReport,
        waveStarterParallelMixAbGuardReport,
      ],
    );

  const waveStarterParallelPilotGainStabilityReport =
    useMemo(
      () =>
        buildWaveStarterParallelPilotGainStabilityReport({
          pilotReport: waveStarterWorkletPilotReport,
          abGuardReport: waveStarterParallelMixAbGuardReport,
        }),
      [waveStarterWorkletPilotReport, waveStarterParallelMixAbGuardReport],
    );

  const waveStarterSynthFailoverCandidateReport =
    useMemo(
      () =>
        buildWaveStarterSynthFailoverCandidateReport(
          waveStarterWorkletPilotReport,
        ),
      [
        waveStarterWorkletPilotReport,
        waveStarterSynthFailoverCandidateBaseReport,
      ],
    );

  const waveStarterSampleBufferTokenShadowReport =
    useMemo(
      () =>
        buildWaveStarterSampleBufferTokenShadowReport(
          waveStarterWorkletPilotReport,
        ),
      [
        waveStarterWorkletPilotReport,
        waveStarterSampleBufferTokenShadowBaseReport,
      ],
    );

  const waveStarterSampleFailoverCandidateReport =
    useMemo(
      () =>
        buildWaveStarterSampleFailoverCandidateReport(
          waveStarterWorkletPilotReport,
        ),
      [
        waveStarterWorkletPilotReport,
        waveStarterSampleFailoverCandidateBaseReport,
      ],
    );

  const waveStarterSampleFailoverLegacyParityProbeReport =
    useMemo(
      () =>
        buildWaveStarterSampleFailoverLegacyParityProbeReport({
          pilotReport: waveStarterWorkletPilotReport,
          sampleFailoverReport: waveStarterSampleFailoverCandidateReport,
          sampleBufferTokenShadowReport: waveStarterSampleBufferTokenShadowReport,
        }),
      [
        waveStarterWorkletPilotReport,
        waveStarterSampleFailoverCandidateReport,
        waveStarterSampleBufferTokenShadowReport,
      ],
    );

  const waveStarterFailoverStressProbeReport =
    useMemo(
      () =>
        buildWaveStarterFailoverStressProbeReport({
          waveStarterLiveReport: waveStarterVoicePoolLiveReport,
          workletReport: waveStarterWorkletPilotReport,
          synthFailoverReport: waveStarterSynthFailoverCandidateReport,
          sampleBufferTokenShadowReport: waveStarterSampleBufferTokenShadowReport,
          sampleFailoverReport: waveStarterSampleFailoverCandidateReport,
          sampleParityReport: waveStarterSampleFailoverLegacyParityProbeReport,
          decisionGateReport: waveStarterFailoverDecisionGateReport,
          particleVoicePoolReport: particleVoicePoolLiveReport,
        }),
      [
        waveStarterVoicePoolLiveReport,
        waveStarterWorkletPilotReport,
        waveStarterSynthFailoverCandidateReport,
        waveStarterSampleBufferTokenShadowReport,
        waveStarterSampleFailoverCandidateReport,
        waveStarterSampleFailoverLegacyParityProbeReport,
        waveStarterFailoverDecisionGateReport,
        particleVoicePoolLiveReport,
      ],
    );

  const waveStarterFailoverDefaultPolicyCandidateReport =
    useMemo(
      () =>
        buildWaveStarterFailoverDefaultPolicyCandidateReport({
          stressProbeReport: waveStarterFailoverStressProbeReport,
          decisionGateReport: waveStarterFailoverDecisionGateReport,
          workletReport: waveStarterWorkletPilotReport,
          sampleParityReport: waveStarterSampleFailoverLegacyParityProbeReport,
          sampleBufferTokenShadowReport: waveStarterSampleBufferTokenShadowReport,
        }),
      [
        waveStarterFailoverStressProbeReport,
        waveStarterFailoverDecisionGateReport,
        waveStarterWorkletPilotReport,
        waveStarterSampleFailoverLegacyParityProbeReport,
        waveStarterSampleBufferTokenShadowReport,
      ],
    );

  const waveStarterFailoverEventLedgerReport =
    useMemo(
      () => buildWaveStarterFailoverEventLedgerReport(waveStarterWorkletPilotReport),
      [waveStarterWorkletPilotReport, waveStarterFailoverDecisionGateReport],
    );

  const waveStarterFailoverLateWindowTuningProbeReport =
    useMemo(
      () =>
        buildWaveStarterFailoverLateWindowTuningProbeReport({
          decisionGateReport: waveStarterFailoverDecisionGateReport,
          stressProbeReport: waveStarterFailoverStressProbeReport,
          eventLedgerReport: waveStarterFailoverEventLedgerReport,
        }),
      [
        waveStarterFailoverDecisionGateReport,
        waveStarterFailoverStressProbeReport,
        waveStarterFailoverEventLedgerReport,
      ],
    );

  const waveStarterFailoverPolicyShadowAbReport =
    useMemo(
      () =>
        buildWaveStarterFailoverPolicyShadowAbReport({
          defaultPolicyCandidateReport: waveStarterFailoverDefaultPolicyCandidateReport,
          stressProbeReport: waveStarterFailoverStressProbeReport,
          decisionGateReport: waveStarterFailoverDecisionGateReport,
          eventLedgerReport: waveStarterFailoverEventLedgerReport,
          lateWindowProbeReport: waveStarterFailoverLateWindowTuningProbeReport,
        }),
      [
        waveStarterFailoverDefaultPolicyCandidateReport,
        waveStarterFailoverStressProbeReport,
        waveStarterFailoverDecisionGateReport,
        waveStarterFailoverEventLedgerReport,
        waveStarterFailoverLateWindowTuningProbeReport,
      ],
    );

  const waveStarterWorkletVoicePoolCompactionReport =
    useMemo(
      () =>
        buildWaveStarterWorkletVoicePoolCompactionReport(
          waveStarterWorkletPilotReport,
        ),
      [waveStarterWorkletPilotReport],
    );


  const waveStarterFailoverPolicyReadinessMatrixReport =
    useMemo(
      () =>
        buildWaveStarterFailoverPolicyReadinessMatrixReport({
          defaultPolicyCandidateReport: waveStarterFailoverDefaultPolicyCandidateReport,
          stressProbeReport: waveStarterFailoverStressProbeReport,
          decisionGateReport: waveStarterFailoverDecisionGateReport,
          eventLedgerReport: waveStarterFailoverEventLedgerReport,
          lateWindowProbeReport: waveStarterFailoverLateWindowTuningProbeReport,
          policyShadowAbReport: waveStarterFailoverPolicyShadowAbReport,
          workletReport: waveStarterWorkletPilotReport,
          workletVoicePoolReport: waveStarterWorkletVoicePoolCompactionReport,
          sampleParityReport: waveStarterSampleFailoverLegacyParityProbeReport,
        }),
      [
        waveStarterFailoverDefaultPolicyCandidateReport,
        waveStarterFailoverStressProbeReport,
        waveStarterFailoverDecisionGateReport,
        waveStarterFailoverEventLedgerReport,
        waveStarterFailoverLateWindowTuningProbeReport,
        waveStarterFailoverPolicyShadowAbReport,
        waveStarterWorkletPilotReport,
        waveStarterWorkletVoicePoolCompactionReport,
        waveStarterSampleFailoverLegacyParityProbeReport,
      ],
    );

  const waveStarterKeyboardGestureCapacityReport =
    useMemo(
      () => buildWaveStarterKeyboardGestureCapacityReport(),
      [waveStarterVoicePoolLiveReport, waveStarterWorkletPilotReport],
    );

  const waveStarterAttackIntegrityCongestionReport =
    useMemo(
      () => buildWaveStarterAttackIntegrityCongestionReport(),
      [waveStarterKeyboardGestureCapacityReport, waveStarterVoicePoolLiveReport],
    );

  const waveStarterFailoverRealTestHarnessHooksReport =
    useMemo(
      () =>
        buildWaveStarterFailoverRealTestHarnessHooksReport({
          stressProbeReport: waveStarterFailoverStressProbeReport,
          eventLedgerReport: waveStarterFailoverEventLedgerReport,
          lateWindowProbeReport: waveStarterFailoverLateWindowTuningProbeReport,
          policyShadowAbReport: waveStarterFailoverPolicyShadowAbReport,
          policyReadinessMatrixReport: waveStarterFailoverPolicyReadinessMatrixReport,
          workletReport: waveStarterWorkletPilotReport,
        }),
      [
        waveStarterFailoverStressProbeReport,
        waveStarterFailoverEventLedgerReport,
        waveStarterFailoverLateWindowTuningProbeReport,
        waveStarterFailoverPolicyShadowAbReport,
        waveStarterFailoverPolicyReadinessMatrixReport,
        waveStarterWorkletPilotReport,
      ],
    );

  const waveStarterSampleFailoverOffsetCropRefineReport =
    useMemo(
      () =>
        buildWaveStarterSampleFailoverOffsetCropRefineReport({
          sampleFailoverReport: waveStarterSampleFailoverCandidateReport,
          parityReport: waveStarterSampleFailoverLegacyParityProbeReport,
        }),
      [
        waveStarterSampleFailoverCandidateReport,
        waveStarterSampleFailoverLegacyParityProbeReport,
      ],
    );

  const waveStarterSynthFailoverEnvelopeOvertoneRefineReport =
    useMemo(
      () =>
        buildWaveStarterSynthFailoverEnvelopeOvertoneRefineReport({
          synthFailoverReport: waveStarterSynthFailoverCandidateReport,
          pilotReport: waveStarterWorkletPilotReport,
        }),
      [waveStarterSynthFailoverCandidateReport, waveStarterWorkletPilotReport],
    );


  return {
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
  };
}
