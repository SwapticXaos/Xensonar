import type { WaveStarterFailoverDefaultPolicyCandidateReport } from "./waveStarterFailoverDefaultPolicyCandidate";
import type { WaveStarterFailoverDecisionGateReport } from "./waveStarterFailoverDecisionGate";
import type { WaveStarterFailoverEventLedgerReport } from "./waveStarterFailoverEventLedger";
import type { WaveStarterFailoverLateWindowTuningProbeReport } from "./waveStarterFailoverLateWindowTuningProbe";
import type { WaveStarterFailoverStressProbeReport } from "./waveStarterFailoverStressProbe";

export type WaveStarterFailoverPolicyShadowId =
  | "current-observed"
  | "strict-late-window-shadow"
  | "balanced-late-window-shadow"
  | "token-bound-mixed-shadow";

export type WaveStarterFailoverPolicyShadowRow = {
  id: WaveStarterFailoverPolicyShadowId;
  wouldKeepLegacyPrimary: true;
  wouldEnableWorkletPrimary: false;
  wouldAllowSampleToSynthFallback: false;
  wouldRequireSampleToken: true;
  projectedFailoverTotal: number;
  projectedDropTotal: number;
  projectedRisk: "unknown" | "low" | "guarded" | "high";
  note: string;
};

export type WaveStarterFailoverPolicyShadowAbReport = {
  version: 1;
  reportKind: "xensonar-wave-starter-failover-policy-shadow-ab";
  generatedAtIso: string;
  rows: WaveStarterFailoverPolicyShadowRow[];
  preferredShadowId: WaveStarterFailoverPolicyShadowId | "hold-current";
  defaultPolicyId: string;
  stressDecision: string;
  lateWindowSuggestion: string;
  ledgerEntryCount: number;
  shadowOnly: true;
  doesNotMutateRuntimePolicy: true;
  doesNotEnablePrimaryReplacement: true;
  doesNotEnableSampleToSynthFallback: true;
  sampleTokenRequired: true;
  legacyPrimaryPreserved: true;
  detail: string;
};

export const WAVE_STARTER_FAILOVER_POLICY_SHADOW_AB_GLOBAL =
  "__XENSONAR_WAVE_STARTER_FAILOVER_POLICY_SHADOW_AB__";

function nn(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function publish(report: WaveStarterFailoverPolicyShadowAbReport): WaveStarterFailoverPolicyShadowAbReport {
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>)[WAVE_STARTER_FAILOVER_POLICY_SHADOW_AB_GLOBAL] = report;
  }
  return report;
}

export type WaveStarterFailoverPolicyShadowAbInput = {
  defaultPolicyCandidateReport: WaveStarterFailoverDefaultPolicyCandidateReport | null;
  stressProbeReport: WaveStarterFailoverStressProbeReport | null;
  decisionGateReport: WaveStarterFailoverDecisionGateReport | null;
  eventLedgerReport: WaveStarterFailoverEventLedgerReport | null;
  lateWindowProbeReport: WaveStarterFailoverLateWindowTuningProbeReport | null;
};

export function buildWaveStarterFailoverPolicyShadowAbReport(
  input: WaveStarterFailoverPolicyShadowAbInput,
): WaveStarterFailoverPolicyShadowAbReport {
  const policy = input.defaultPolicyCandidateReport;
  const stress = input.stressProbeReport;
  const gate = input.decisionGateReport;
  const ledger = input.eventLedgerReport;
  const late = input.lateWindowProbeReport;
  const synthFailover = nn(stress?.synthFailoverGateTotal ?? gate?.counters.synthFailover);
  const sampleFailover = nn(stress?.sampleFailoverGateTotal ?? gate?.counters.sampleFailover);
  const dropTotal = nn(stress?.dropTotal) ||
    nn(gate?.counters.dropTooLate) +
      nn(gate?.counters.dropTokenMissing) +
      nn(gate?.counters.dropTokenNotHydrated) +
      nn(gate?.counters.dropWorkletNotReady) +
      nn(gate?.counters.dropInvalidKind);
  const failoverTotal = synthFailover + sampleFailover;
  const sampleTokenReady = nn(stress?.sampleTokenHydratedTotal) > 0 || nn(policy?.sampleTokenHydratedTotal) > 0;
  const sampleRendered = nn(stress?.sampleRenderedFrames ?? policy?.sampleRenderedFrames) > 0;
  const lateSuggestsLooser = late?.suggestedWindowId === "loose-96ms";
  const lateSuggestsBalanced = late?.suggestedWindowId === "balanced-48ms";

  const rows: WaveStarterFailoverPolicyShadowRow[] = [
    {
      id: "current-observed",
      wouldKeepLegacyPrimary: true,
      wouldEnableWorkletPrimary: false,
      wouldAllowSampleToSynthFallback: false,
      wouldRequireSampleToken: true,
      projectedFailoverTotal: failoverTotal,
      projectedDropTotal: dropTotal,
      projectedRisk: failoverTotal === 0 && dropTotal === 0 ? "unknown" : "low",
      note: "Current observed gate distribution; no runtime policy change.",
    },
    {
      id: "strict-late-window-shadow",
      wouldKeepLegacyPrimary: true,
      wouldEnableWorkletPrimary: false,
      wouldAllowSampleToSynthFallback: false,
      wouldRequireSampleToken: true,
      projectedFailoverTotal: Math.max(0, failoverTotal - (lateSuggestsBalanced || lateSuggestsLooser ? 1 : 0)),
      projectedDropTotal: dropTotal + (lateSuggestsBalanced || lateSuggestsLooser ? 1 : 0),
      projectedRisk: "guarded",
      note: "Shadow only: stricter late windows may reduce rhythmic smearing but can drop more attacks.",
    },
    {
      id: "balanced-late-window-shadow",
      wouldKeepLegacyPrimary: true,
      wouldEnableWorkletPrimary: false,
      wouldAllowSampleToSynthFallback: false,
      wouldRequireSampleToken: true,
      projectedFailoverTotal: lateSuggestsBalanced ? Math.max(1, failoverTotal) : failoverTotal,
      projectedDropTotal: lateSuggestsBalanced ? Math.max(0, dropTotal - 1) : dropTotal,
      projectedRisk: "low",
      note: "Shadow only: balanced late window remains strict but may rescue bounded attacks when the current gate appears overly loose or overly stale.",
    },
    {
      id: "token-bound-mixed-shadow",
      wouldKeepLegacyPrimary: true,
      wouldEnableWorkletPrimary: false,
      wouldAllowSampleToSynthFallback: false,
      wouldRequireSampleToken: true,
      projectedFailoverTotal: sampleTokenReady && sampleRendered ? Math.max(failoverTotal, synthFailover + Math.max(1, sampleFailover)) : failoverTotal,
      projectedDropTotal: sampleTokenReady ? Math.max(0, dropTotal - (sampleRendered ? 1 : 0)) : dropTotal,
      projectedRisk: sampleTokenReady && sampleRendered ? "guarded" : "high",
      note: "Shadow only: mixed Synth/Sample failover is only plausible when hydrated sample tokens have actually rendered.",
    },
  ];

  let preferredShadowId: WaveStarterFailoverPolicyShadowAbReport["preferredShadowId"] = "hold-current";
  if (policy?.policyId === "legacy-primary-mixed-failover-candidate" && sampleTokenReady && sampleRendered) {
    preferredShadowId = "token-bound-mixed-shadow";
  } else if (lateSuggestsBalanced && dropTotal > 0) {
    preferredShadowId = "balanced-late-window-shadow";
  } else if (failoverTotal > 0 && dropTotal === 0) {
    preferredShadowId = "current-observed";
  }

  return publish({
    version: 1,
    reportKind: "xensonar-wave-starter-failover-policy-shadow-ab",
    generatedAtIso: new Date().toISOString(),
    rows,
    preferredShadowId,
    defaultPolicyId: policy?.policyId ?? "not-observed",
    stressDecision: stress?.decision ?? "not-observed",
    lateWindowSuggestion: late?.suggestedWindowId ?? "hold-current",
    ledgerEntryCount: nn(ledger?.entryCount),
    shadowOnly: true,
    doesNotMutateRuntimePolicy: true,
    doesNotEnablePrimaryReplacement: true,
    doesNotEnableSampleToSynthFallback: true,
    sampleTokenRequired: true,
    legacyPrimaryPreserved: true,
    detail: "Policy Shadow-A/B compares conservative failover policies without switching runtime behavior; Legacy remains the primary Wellenstarter path.",
  });
}

export function formatWaveStarterFailoverPolicyShadowAbUiValue(
  report: WaveStarterFailoverPolicyShadowAbReport | null,
): string {
  if (!report) return "not-observed · Shadow-A/B auswertungsbereit";
  const compactRows = report.rows
    .map((row) => `${row.id}:${row.projectedFailoverTotal}/${row.projectedDropTotal}/${row.projectedRisk}`)
    .join(" ");
  return `${report.preferredShadowId} · policy ${report.defaultPolicyId} · stress ${report.stressDecision} · late ${report.lateWindowSuggestion} · ${compactRows} · no runtime switch`;
}
