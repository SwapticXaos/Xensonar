import type { WaveStarterFailoverDefaultPolicyCandidateReport } from "./waveStarterFailoverDefaultPolicyCandidate";
import type { WaveStarterFailoverDecisionGateReport } from "./waveStarterFailoverDecisionGate";
import type { WaveStarterFailoverEventLedgerReport } from "./waveStarterFailoverEventLedger";
import type { WaveStarterFailoverLateWindowTuningProbeReport } from "./waveStarterFailoverLateWindowTuningProbe";
import type { WaveStarterFailoverPolicyShadowAbReport } from "./waveStarterFailoverPolicyShadowAb";
import type { WaveStarterSampleFailoverLegacyParityProbeReport } from "./waveStarterSampleFailoverLegacyParityProbe";
import type { WaveStarterFailoverStressProbeReport } from "./waveStarterFailoverStressProbe";
import type { WaveStarterWorkletPilotSnapshot } from "./waveStarterWorkletPilotBridge";
import type { WaveStarterWorkletVoicePoolCompactionReport } from "./waveStarterWorkletVoicePoolCompactionReport";

export type WaveStarterFailoverPolicyReadinessLevel =
  | "observe-only"
  | "blocked"
  | "guarded-shadow-ready"
  | "guarded-runtime-candidate";

export type WaveStarterFailoverPolicyReadinessBlocker =
  | "insufficient-ledger-correlation"
  | "insufficient-render-observed"
  | "worklet-not-ready"
  | "sample-token-not-hydrated"
  | "sample-parity-fx-gap"
  | "late-window-not-calibrated"
  | "drop-heavy-gate"
  | "pool-displacement-unreviewed";

export type WaveStarterFailoverPolicyReadinessMatrixReport = {
  version: 1;
  reportKind: "xensonar-wave-starter-failover-policy-readiness-matrix";
  generatedAtIso: string;
  readiness: WaveStarterFailoverPolicyReadinessLevel;
  recommendedMode: "observe-only" | "shadow-ab" | "guarded-candidate-disabled";
  safeToEnableRuntimePolicy: false;
  blockers: WaveStarterFailoverPolicyReadinessBlocker[];
  gatesCovered: boolean;
  ledgerCorrelated: boolean;
  synthRenderedObserved: boolean;
  sampleRenderedObserved: boolean;
  sampleTokenHydrated: boolean;
  sampleBodyTimingCovered: boolean;
  sampleFxLoopPanFilterGapsRemain: true;
  lateWindowCalibrated: boolean;
  shadowAbCompared: boolean;
  poolBehaviorObserved: boolean;
  workletReady: boolean;
  dropRatio: number;
  ledgerAcceptanceRatio: number;
  renderedKinds: "none" | "synth" | "sample" | "mixed";
  doesNotMutateRuntimePolicy: true;
  doesNotEnablePrimaryReplacement: true;
  doesNotEnableSampleToSynthFallback: true;
  legacyPrimaryPreserved: true;
  detail: string;
};

export const WAVE_STARTER_FAILOVER_POLICY_READINESS_MATRIX_GLOBAL =
  "__XENSONAR_WAVE_STARTER_FAILOVER_POLICY_READINESS_MATRIX__";

function nn(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function ratio(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0;
  return Math.max(0, Math.min(1, numerator / denominator));
}

function publish(
  report: WaveStarterFailoverPolicyReadinessMatrixReport,
): WaveStarterFailoverPolicyReadinessMatrixReport {
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>)[WAVE_STARTER_FAILOVER_POLICY_READINESS_MATRIX_GLOBAL] = report;
  }
  return report;
}

export type WaveStarterFailoverPolicyReadinessMatrixInput = {
  defaultPolicyCandidateReport: WaveStarterFailoverDefaultPolicyCandidateReport | null;
  stressProbeReport: WaveStarterFailoverStressProbeReport | null;
  decisionGateReport: WaveStarterFailoverDecisionGateReport | null;
  eventLedgerReport: WaveStarterFailoverEventLedgerReport | null;
  lateWindowProbeReport: WaveStarterFailoverLateWindowTuningProbeReport | null;
  policyShadowAbReport: WaveStarterFailoverPolicyShadowAbReport | null;
  workletReport: WaveStarterWorkletPilotSnapshot | null;
  workletVoicePoolReport: WaveStarterWorkletVoicePoolCompactionReport | null;
  sampleParityReport: WaveStarterSampleFailoverLegacyParityProbeReport | null;
};

export function buildWaveStarterFailoverPolicyReadinessMatrixReport(
  input: WaveStarterFailoverPolicyReadinessMatrixInput,
): WaveStarterFailoverPolicyReadinessMatrixReport {
  const policy = input.defaultPolicyCandidateReport;
  const stress = input.stressProbeReport;
  const gate = input.decisionGateReport;
  const ledger = input.eventLedgerReport;
  const late = input.lateWindowProbeReport;
  const shadow = input.policyShadowAbReport;
  const worklet = input.workletReport;
  const pool = input.workletVoicePoolReport;
  const parity = input.sampleParityReport;

  const workletReady = Boolean(stress?.workletReady ?? (worklet && worklet.keepAliveConnected && worklet.outputConnected && !worklet.errorMessage));
  const gateTotal = nn(gate?.counters.legacyAdmitted) + nn(gate?.counters.synthFailover) + nn(gate?.counters.sampleFailover) + nn(gate?.counters.dropTooLate) + nn(gate?.counters.dropTokenMissing) + nn(gate?.counters.dropTokenNotHydrated) + nn(gate?.counters.dropWorkletNotReady) + nn(gate?.counters.dropInvalidKind);
  const gatesCovered = gateTotal > 0 || Boolean(gate?.decision);
  const ledgerCorrelated = nn(ledger?.gateDecisionCount) > 0 && (nn(ledger?.postedCount) > 0 || nn(ledger?.rejectedCount) > 0 || nn(ledger?.renderObservedCount) > 0);
  const ledgerAcceptanceRatio = ratio(nn(ledger?.acceptedCount), nn(ledger?.postedCount));
  const synthRenderedObserved = nn(stress?.synthRenderedFrames ?? policy?.synthRenderedFrames ?? worklet?.synthFailoverRenderFrameCount) > 0;
  const sampleRenderedObserved = nn(stress?.sampleRenderedFrames ?? policy?.sampleRenderedFrames ?? worklet?.sampleFailoverRenderFrameCount) > 0;
  const sampleTokenHydrated = nn(stress?.sampleTokenHydratedTotal ?? policy?.sampleTokenHydratedTotal ?? worklet?.sampleBufferTokenHydratedCount) > 0;
  const sampleBodyTimingCovered = Boolean(policy?.sampleParityBodyTimingCovered) || Boolean(
    parity?.sampleBodyParity === "body-parity-observed-through-rendered-token" &&
      parity?.timingParity === "worklet-render-frame-observed",
  );
  const explicitDropTotal = nn(stress?.dropTotal) || nn(gate?.counters.dropTooLate) + nn(gate?.counters.dropTokenMissing) + nn(gate?.counters.dropTokenNotHydrated) + nn(gate?.counters.dropWorkletNotReady) + nn(gate?.counters.dropInvalidKind);
  const failoverTotal = nn(stress?.synthFailoverGateTotal ?? gate?.counters.synthFailover) + nn(stress?.sampleFailoverGateTotal ?? gate?.counters.sampleFailover);
  const legacyTotal = nn(stress?.legacyAdmittedTotal ?? gate?.counters.legacyAdmitted);
  const dropRatio = ratio(explicitDropTotal, explicitDropTotal + failoverTotal + legacyTotal);
  const lateWindowCalibrated = Boolean(late && late.ledgerEntryCount > 0 && late.suggestedWindowId !== "hold-current") || Boolean(late && late.dropTooLateTotal > 0 && late.failoverGateTotal > 0);
  const shadowAbCompared = Boolean(shadow && shadow.ledgerEntryCount > 0 && shadow.rows.length >= 4);
  const poolDisplacement = nn(pool?.synthDisplacedCount) + nn(pool?.sampleDisplacedCount);
  const poolPriority = nn(pool?.synthPriorityDisplacedCount) + nn(pool?.samplePriorityDisplacedCount);
  const poolFadeFrames = nn(pool?.synthStealFadeTailRenderFrameCount) + nn(pool?.sampleStealFadeTailRenderFrameCount);
  const poolBehaviorObserved = poolDisplacement > 0 || poolPriority > 0 || poolFadeFrames > 0;
  const renderedKinds: WaveStarterFailoverPolicyReadinessMatrixReport["renderedKinds"] =
    synthRenderedObserved && sampleRenderedObserved ? "mixed" : synthRenderedObserved ? "synth" : sampleRenderedObserved ? "sample" : "none";

  const blockers = new Set<WaveStarterFailoverPolicyReadinessBlocker>();
  if (!workletReady) blockers.add("worklet-not-ready");
  if (!gatesCovered || !ledgerCorrelated) blockers.add("insufficient-ledger-correlation");
  if (!synthRenderedObserved && !sampleRenderedObserved) blockers.add("insufficient-render-observed");
  if (nn(stress?.sampleFailoverGateTotal ?? gate?.counters.sampleFailover) > 0 && !sampleTokenHydrated) blockers.add("sample-token-not-hydrated");
  if (sampleRenderedObserved && !sampleBodyTimingCovered) blockers.add("sample-token-not-hydrated");
  if (sampleRenderedObserved) blockers.add("sample-parity-fx-gap");
  if (!lateWindowCalibrated) blockers.add("late-window-not-calibrated");
  if (dropRatio > 0.55 && explicitDropTotal > failoverTotal) blockers.add("drop-heavy-gate");
  if (poolDisplacement > 0 && poolPriority === 0 && poolFadeFrames === 0) blockers.add("pool-displacement-unreviewed");

  let readiness: WaveStarterFailoverPolicyReadinessLevel = "observe-only";
  let recommendedMode: WaveStarterFailoverPolicyReadinessMatrixReport["recommendedMode"] = "observe-only";
  if (blockers.has("worklet-not-ready") || blockers.has("drop-heavy-gate")) {
    readiness = "blocked";
  } else if (shadowAbCompared && ledgerCorrelated && (synthRenderedObserved || sampleRenderedObserved)) {
    readiness = blockers.size <= 2 ? "guarded-shadow-ready" : "observe-only";
    recommendedMode = blockers.size <= 2 ? "guarded-candidate-disabled" : "shadow-ab";
  } else if (gatesCovered || late || shadow) {
    readiness = "observe-only";
    recommendedMode = "shadow-ab";
  }

  const detail = (() => {
    if (readiness === "blocked") {
      return "Failover policy is blocked for runtime activation: Worklet readiness or drop-heavy distribution must be resolved before any guarded candidate can be exposed.";
    }
    if (readiness === "guarded-shadow-ready") {
      return "Failover policy is ready only as a disabled guarded candidate: Ledger, render observation and Shadow-A/B exist, but Sample parity gaps keep Legacy primary and prevent broad runtime activation.";
    }
    if (recommendedMode === "shadow-ab") {
      return "Failover policy remains observe-only; continue using Shadow-A/B and Late-Window probes until the event ledger correlates gate, post, ack and render observations.";
    }
    return "Failover policy readiness matrix is armed. It condenses Gate, Ledger, Late-Window, Shadow-A/B, Worklet pool and Sample parity reports without changing runtime behavior.";
  })();

  return publish({
    version: 1,
    reportKind: "xensonar-wave-starter-failover-policy-readiness-matrix",
    generatedAtIso: new Date().toISOString(),
    readiness,
    recommendedMode,
    safeToEnableRuntimePolicy: false,
    blockers: Array.from(blockers),
    gatesCovered,
    ledgerCorrelated,
    synthRenderedObserved,
    sampleRenderedObserved,
    sampleTokenHydrated,
    sampleBodyTimingCovered,
    sampleFxLoopPanFilterGapsRemain: true,
    lateWindowCalibrated,
    shadowAbCompared,
    poolBehaviorObserved,
    workletReady,
    dropRatio,
    ledgerAcceptanceRatio,
    renderedKinds,
    doesNotMutateRuntimePolicy: true,
    doesNotEnablePrimaryReplacement: true,
    doesNotEnableSampleToSynthFallback: true,
    legacyPrimaryPreserved: true,
    detail,
  });
}

export function readWaveStarterFailoverPolicyReadinessMatrixFromBrowser(): WaveStarterFailoverPolicyReadinessMatrixReport | null {
  if (typeof window === "undefined") return null;
  const value = (window as unknown as Record<string, unknown>)[WAVE_STARTER_FAILOVER_POLICY_READINESS_MATRIX_GLOBAL];
  return value && typeof value === "object" ? (value as WaveStarterFailoverPolicyReadinessMatrixReport) : null;
}

export function formatWaveStarterFailoverPolicyReadinessMatrixUiValue(
  report: WaveStarterFailoverPolicyReadinessMatrixReport | null,
): string {
  if (!report) return "not-observed · observe-only · keine Runtime-Policy";
  const blockers = report.blockers.length === 0 ? "none" : report.blockers.slice(0, 3).join("/");
  return `${report.readiness} · ${report.recommendedMode} · safe ${report.safeToEnableRuntimePolicy ? "yes" : "no"} · rendered ${report.renderedKinds} · ledger ${report.ledgerCorrelated ? "yes" : "no"} · late ${report.lateWindowCalibrated ? "yes" : "hold"} · blockers ${blockers}`;
}
