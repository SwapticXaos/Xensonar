import type { WaveStarterWorkletPilotSnapshot } from "./waveStarterWorkletPilotBridge";
import type { WaveStarterFailoverStressProbeReport } from "./waveStarterFailoverStressProbe";
import type { WaveStarterFailoverDecisionGateReport } from "./waveStarterFailoverDecisionGate";
import type { WaveStarterSampleFailoverLegacyParityProbeReport } from "./waveStarterSampleFailoverLegacyParityProbe";
import type { WaveStarterSampleBufferTokenShadowReport } from "./waveStarterSampleBufferTokenShadow";

export type WaveStarterFailoverDefaultPolicyId =
  | "observe-only-no-pressure"
  | "hold-worklet-not-ready"
  | "hold-sample-token-bottleneck"
  | "hold-drop-heavy-gate"
  | "legacy-primary-synth-failover-candidate"
  | "legacy-primary-synth-sample-token-bound-candidate"
  | "legacy-primary-mixed-failover-candidate";

export type WaveStarterFailoverDefaultPolicyConfidence =
  | "none"
  | "low"
  | "guarded"
  | "candidate";

export type WaveStarterFailoverDefaultPolicyNextAction =
  | "keep-measuring"
  | "stabilize-worklet-readiness"
  | "hydrate-sample-tokens-first"
  | "relax-only-after-drop-ratio-review"
  | "stress-compare-synth-and-sample"
  | "candidate-ready-for-narrow-ab";

export type WaveStarterFailoverDefaultPolicyCandidateReport = {
  version: 1;
  reportKind: "xensonar-wave-starter-failover-default-policy-candidate";
  generatedAtIso: string;
  policyId: WaveStarterFailoverDefaultPolicyId;
  confidence: WaveStarterFailoverDefaultPolicyConfidence;
  nextAction: WaveStarterFailoverDefaultPolicyNextAction;
  legacyPrimaryRemainsDefault: true;
  workletFailoverOnly: true;
  doesNotMutateRuntimePolicy: true;
  doesNotEnablePrimaryReplacement: true;
  doesNotEnableSampleToSynthFallback: true;
  sampleTokenRequired: true;
  samplePilotOneShotOnly: true;
  lateWindowStrict: true;
  noLoopParityClaim: true;
  noPanFilterFxParityClaim: true;
  stressDecision: string;
  stressScenario: string;
  workletReady: boolean;
  pressureSignalPresent: boolean;
  legacyAdmittedTotal: number;
  synthFailoverGateTotal: number;
  sampleFailoverGateTotal: number;
  dropTotal: number;
  dropRatio: number;
  synthRenderedFrames: number;
  sampleRenderedFrames: number;
  sampleTokenHydratedTotal: number;
  sampleParityBodyTimingCovered: boolean;
  sampleParityGapsRemain: true;
  detail: string;
};

export const WAVE_STARTER_FAILOVER_DEFAULT_POLICY_CANDIDATE_GLOBAL =
  "__XENSONAR_WAVE_STARTER_FAILOVER_DEFAULT_POLICY_CANDIDATE__";

function nn(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function ratio(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0;
  return Math.max(0, Math.min(1, numerator / denominator));
}

function publish(
  report: WaveStarterFailoverDefaultPolicyCandidateReport,
): WaveStarterFailoverDefaultPolicyCandidateReport {
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>)[WAVE_STARTER_FAILOVER_DEFAULT_POLICY_CANDIDATE_GLOBAL] = report;
  }
  return report;
}

export type WaveStarterFailoverDefaultPolicyCandidateInput = {
  stressProbeReport: WaveStarterFailoverStressProbeReport | null;
  decisionGateReport: WaveStarterFailoverDecisionGateReport | null;
  workletReport: WaveStarterWorkletPilotSnapshot | null;
  sampleParityReport: WaveStarterSampleFailoverLegacyParityProbeReport | null;
  sampleBufferTokenShadowReport: WaveStarterSampleBufferTokenShadowReport | null;
};

export function buildWaveStarterFailoverDefaultPolicyCandidateReport(
  input: WaveStarterFailoverDefaultPolicyCandidateInput,
): WaveStarterFailoverDefaultPolicyCandidateReport {
  const stress = input.stressProbeReport;
  const gate = input.decisionGateReport;
  const worklet = input.workletReport;
  const parity = input.sampleParityReport;
  const token = input.sampleBufferTokenShadowReport;

  const legacyAdmittedTotal = nn(stress?.legacyAdmittedTotal ?? gate?.counters.legacyAdmitted);
  const synthFailoverGateTotal = nn(stress?.synthFailoverGateTotal ?? gate?.counters.synthFailover);
  const sampleFailoverGateTotal = nn(stress?.sampleFailoverGateTotal ?? gate?.counters.sampleFailover);
  const dropTotal = nn(stress?.dropTotal) ||
    nn(gate?.counters.dropTooLate) +
    nn(gate?.counters.dropTokenMissing) +
    nn(gate?.counters.dropTokenNotHydrated) +
    nn(gate?.counters.dropWorkletNotReady) +
    nn(gate?.counters.dropInvalidKind);
  const synthRenderedFrames = nn(stress?.synthRenderedFrames ?? worklet?.synthFailoverRenderFrameCount);
  const sampleRenderedFrames = nn(stress?.sampleRenderedFrames ?? worklet?.sampleFailoverRenderFrameCount);
  const sampleTokenHydratedTotal = nn(stress?.sampleTokenHydratedTotal ?? token?.workletHydratedTokenCount ?? worklet?.sampleBufferTokenHydratedCount);
  const totalObserved = legacyAdmittedTotal + synthFailoverGateTotal + sampleFailoverGateTotal + dropTotal;
  const dropRatio = ratio(dropTotal, totalObserved);
  const workletReady = Boolean(stress?.workletReady ?? (worklet && worklet.keepAliveConnected && worklet.outputConnected && !worklet.errorMessage));
  const pressureSignalPresent = Boolean(stress?.pressureSignalPresent);
  const sampleParityBodyTimingCovered = Boolean(
    parity?.sampleBodyParity === "body-parity-observed-through-rendered-token" &&
      parity?.timingParity === "worklet-render-frame-observed",
  );

  let policyId: WaveStarterFailoverDefaultPolicyId = "observe-only-no-pressure";
  let confidence: WaveStarterFailoverDefaultPolicyConfidence = "none";
  let nextAction: WaveStarterFailoverDefaultPolicyNextAction = "keep-measuring";

  if (!workletReady && (stress?.decision === "worklet-not-ready-bottleneck-observed" || nn(gate?.counters.dropWorkletNotReady) > 0)) {
    policyId = "hold-worklet-not-ready";
    confidence = "low";
    nextAction = "stabilize-worklet-readiness";
  } else if (stress?.decision === "sample-token-bottleneck-observed" || ((nn(gate?.counters.dropTokenMissing) + nn(gate?.counters.dropTokenNotHydrated)) > 0 && sampleFailoverGateTotal === 0)) {
    policyId = "hold-sample-token-bottleneck";
    confidence = "low";
    nextAction = "hydrate-sample-tokens-first";
  } else if (stress?.decision === "drop-heavy-gate-observed" || (dropRatio > 0.6 && dropTotal > synthFailoverGateTotal + sampleFailoverGateTotal)) {
    policyId = "hold-drop-heavy-gate";
    confidence = "guarded";
    nextAction = "relax-only-after-drop-ratio-review";
  } else if (synthFailoverGateTotal > 0 && sampleFailoverGateTotal > 0 && sampleRenderedFrames > 0 && sampleParityBodyTimingCovered) {
    policyId = "legacy-primary-mixed-failover-candidate";
    confidence = "candidate";
    nextAction = "candidate-ready-for-narrow-ab";
  } else if (sampleFailoverGateTotal > 0 && sampleRenderedFrames > 0 && sampleParityBodyTimingCovered) {
    policyId = "legacy-primary-synth-sample-token-bound-candidate";
    confidence = "candidate";
    nextAction = "stress-compare-synth-and-sample";
  } else if (synthFailoverGateTotal > 0 || synthRenderedFrames > 0) {
    policyId = "legacy-primary-synth-failover-candidate";
    confidence = "guarded";
    nextAction = "stress-compare-synth-and-sample";
  } else if (pressureSignalPresent) {
    policyId = "observe-only-no-pressure";
    confidence = "low";
    nextAction = "keep-measuring";
  }

  const detail = (() => {
    if (policyId === "hold-worklet-not-ready") {
      return "Default policy candidate holds because the Worklet readiness signal is not stable enough; failover must not become a silent runtime dependency before readiness is proven.";
    }
    if (policyId === "hold-sample-token-bottleneck") {
      return "Default policy candidate holds Sample failover until hydrated buffer tokens are consistently present; Sample-to-Synth substitution remains forbidden.";
    }
    if (policyId === "hold-drop-heavy-gate") {
      return "Default policy candidate holds because explicit drops dominate the observed distribution; review late-window and token-readiness balance before changing defaults.";
    }
    if (policyId === "legacy-primary-mixed-failover-candidate") {
      return "Candidate policy can allow Legacy-primary Worklet failover for both Synth and hydrated Sample one-shots under the strict gate; this is still not a primary Worklet mode.";
    }
    if (policyId === "legacy-primary-synth-sample-token-bound-candidate") {
      return "Candidate policy can allow hydrated Sample one-shot failover together with the existing Synth failover contract, but Loop/Pan/Filter/FX parity remain explicit gaps.";
    }
    if (policyId === "legacy-primary-synth-failover-candidate") {
      return "Candidate policy can keep Synth failover available while Sample remains token-bound and not yet promoted; compare mixed pressure before widening the default.";
    }
    return "Policy candidate is observe-only: Legacy remains the primary Wellenstarter path, Worklet failover remains a guarded dropped-slot path, and no default runtime behavior is changed.";
  })();

  return publish({
    version: 1,
    reportKind: "xensonar-wave-starter-failover-default-policy-candidate",
    generatedAtIso: new Date().toISOString(),
    policyId,
    confidence,
    nextAction,
    legacyPrimaryRemainsDefault: true,
    workletFailoverOnly: true,
    doesNotMutateRuntimePolicy: true,
    doesNotEnablePrimaryReplacement: true,
    doesNotEnableSampleToSynthFallback: true,
    sampleTokenRequired: true,
    samplePilotOneShotOnly: true,
    lateWindowStrict: true,
    noLoopParityClaim: true,
    noPanFilterFxParityClaim: true,
    stressDecision: stress?.decision ?? "not-observed",
    stressScenario: stress?.scenario ?? "none",
    workletReady,
    pressureSignalPresent,
    legacyAdmittedTotal,
    synthFailoverGateTotal,
    sampleFailoverGateTotal,
    dropTotal,
    dropRatio,
    synthRenderedFrames,
    sampleRenderedFrames,
    sampleTokenHydratedTotal,
    sampleParityBodyTimingCovered,
    sampleParityGapsRemain: true,
    detail,
  });
}

export function readWaveStarterFailoverDefaultPolicyCandidateFromBrowser(): WaveStarterFailoverDefaultPolicyCandidateReport | null {
  if (typeof window === "undefined") return null;
  const value = (window as unknown as Record<string, unknown>)[WAVE_STARTER_FAILOVER_DEFAULT_POLICY_CANDIDATE_GLOBAL];
  return value && typeof value === "object" ? (value as WaveStarterFailoverDefaultPolicyCandidateReport) : null;
}

export function formatWaveStarterFailoverDefaultPolicyCandidateUiValue(
  report: WaveStarterFailoverDefaultPolicyCandidateReport | null,
): string {
  if (!report) return "not-observed · Legacy-primary · Policy-Kandidat noch leer";
  const dropPct = `${Math.round(report.dropRatio * 100)}%`;
  return `${report.policyId} · ${report.confidence} · next ${report.nextAction} · L/Sy/Sa/D ${report.legacyAdmittedTotal}/${report.synthFailoverGateTotal}/${report.sampleFailoverGateTotal}/${report.dropTotal} · drop ${dropPct} · rendered Sy/Sa ${report.synthRenderedFrames}/${report.sampleRenderedFrames} · Legacy primary`;
}
