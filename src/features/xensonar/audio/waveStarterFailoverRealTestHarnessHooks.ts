import type { WaveStarterFailoverEventLedgerReport } from "./waveStarterFailoverEventLedger";
import type { WaveStarterFailoverLateWindowTuningProbeReport } from "./waveStarterFailoverLateWindowTuningProbe";
import type { WaveStarterFailoverPolicyReadinessMatrixReport } from "./waveStarterFailoverPolicyReadinessMatrix";
import type { WaveStarterFailoverPolicyShadowAbReport } from "./waveStarterFailoverPolicyShadowAb";
import type { WaveStarterFailoverStressProbeReport } from "./waveStarterFailoverStressProbe";
import type { WaveStarterWorkletPilotSnapshot } from "./waveStarterWorkletPilotBridge";

export type WaveStarterFailoverHarnessScenarioId =
  | "synth-only-failover-pressure"
  | "sample-token-failover-pressure"
  | "mixed-synth-sample-pressure"
  | "late-window-pressure"
  | "worklet-pool-saturation"
  | "root-follow-wave-starter-pressure";

export type WaveStarterFailoverHarnessScenario = {
  id: WaveStarterFailoverHarnessScenarioId;
  status: "idle" | "observable" | "needs-manual-trigger" | "blocked";
  observedSignal: boolean;
  primaryMetric: string;
  note: string;
};

export type WaveStarterFailoverHarnessSnapshot = {
  atIso: string;
  stressDecision: string;
  stressScenario: string;
  readiness: string;
  renderedKinds: string;
  ledgerEntries: number;
  posted: number;
  accepted: number;
  rejected: number;
  synthFrames: number;
  sampleFrames: number;
  lateWindowSuggestion: string;
  shadowPreference: string;
  workletReady: boolean;
};

export type WaveStarterFailoverRealTestHarnessHooksReport = {
  version: 1;
  reportKind: "xensonar-wave-starter-failover-real-test-harness-hooks";
  generatedAtIso: string;
  scenarios: WaveStarterFailoverHarnessScenario[];
  snapshot: WaveStarterFailoverHarnessSnapshot;
  manualHarnessOnly: true;
  exposesBrowserSnapshot: true;
  doesNotTriggerAudio: true;
  doesNotMutateRuntimePolicy: true;
  doesNotEnablePrimaryReplacement: true;
  doesNotEnableSampleToSynthFallback: true;
  legacyPrimaryPreserved: true;
  suggestedManualPass: WaveStarterFailoverHarnessScenarioId;
  detail: string;
};

export const WAVE_STARTER_FAILOVER_REAL_TEST_HARNESS_HOOKS_GLOBAL =
  "__XENSONAR_WAVE_STARTER_FAILOVER_REAL_TEST_HARNESS_HOOKS__";

function nn(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function publish(report: WaveStarterFailoverRealTestHarnessHooksReport): WaveStarterFailoverRealTestHarnessHooksReport {
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>)[WAVE_STARTER_FAILOVER_REAL_TEST_HARNESS_HOOKS_GLOBAL] = report;
  }
  return report;
}

export type WaveStarterFailoverRealTestHarnessHooksInput = {
  stressProbeReport: WaveStarterFailoverStressProbeReport | null;
  eventLedgerReport: WaveStarterFailoverEventLedgerReport | null;
  lateWindowProbeReport: WaveStarterFailoverLateWindowTuningProbeReport | null;
  policyShadowAbReport: WaveStarterFailoverPolicyShadowAbReport | null;
  policyReadinessMatrixReport: WaveStarterFailoverPolicyReadinessMatrixReport | null;
  workletReport: WaveStarterWorkletPilotSnapshot | null;
};

export function buildWaveStarterFailoverRealTestHarnessHooksReport(
  input: WaveStarterFailoverRealTestHarnessHooksInput,
): WaveStarterFailoverRealTestHarnessHooksReport {
  const stress = input.stressProbeReport;
  const ledger = input.eventLedgerReport;
  const late = input.lateWindowProbeReport;
  const shadow = input.policyShadowAbReport;
  const readiness = input.policyReadinessMatrixReport;
  const worklet = input.workletReport;

  const synthFrames = nn(stress?.synthRenderedFrames ?? worklet?.synthFailoverRenderFrameCount);
  const sampleFrames = nn(stress?.sampleRenderedFrames ?? worklet?.sampleFailoverRenderFrameCount);
  const sampleTokenPressure = nn(stress?.samplePostedTotal) + nn(stress?.sampleAcceptedTotal) + nn(stress?.dropTokenMissing) + nn(stress?.dropTokenNotHydrated);
  const synthPressure = nn(stress?.synthPostedTotal) + nn(stress?.synthAcceptedTotal) + nn(stress?.synthFailoverGateTotal);
  const mixedPressure = synthPressure > 0 && sampleTokenPressure > 0;
  const latePressure = nn(stress?.dropTooLate) > 0 || late?.suggestedWindowId !== "hold-current";
  const poolSaturation = nn(worklet?.synthFailoverVoicePoolDisplacedCount) + nn(worklet?.sampleFailoverVoicePoolDisplacedCount) + nn(worklet?.synthFailoverVoicePoolPriorityDisplacedCount) + nn(worklet?.sampleFailoverVoicePoolPriorityDisplacedCount) > 0;
  const fullContext = stress?.scenario === "full-context-pressure-candidate" || stress?.scenario === "mixed-synth-sample-pressure";

  const scenarios: WaveStarterFailoverHarnessScenario[] = [
    {
      id: "synth-only-failover-pressure",
      status: synthPressure > 0 ? "observable" : "needs-manual-trigger",
      observedSignal: synthPressure > 0 || synthFrames > 0,
      primaryMetric: "synth posted/accepted/rendered frames",
      note: "Use a dense Synth-Wellenstarter gesture and compare gate, ledger and Worklet render counters before/after.",
    },
    {
      id: "sample-token-failover-pressure",
      status: sampleTokenPressure > 0 ? "observable" : "needs-manual-trigger",
      observedSignal: sampleTokenPressure > 0 || sampleFrames > 0,
      primaryMetric: "sample token hydrated/posted/accepted/rendered",
      note: "Use a Sample-Wellenstarter after token hydration; missing-token drops indicate setup, not renderer failure.",
    },
    {
      id: "mixed-synth-sample-pressure",
      status: mixedPressure ? "observable" : "needs-manual-trigger",
      observedSignal: mixedPressure,
      primaryMetric: "mixed Synth+Sample failover distribution",
      note: "Switch between Synth and Sample Wellenstarter pressure in one window; no Sample-to-Synth substitution is allowed.",
    },
    {
      id: "late-window-pressure",
      status: latePressure ? "observable" : "needs-manual-trigger",
      observedSignal: latePressure,
      primaryMetric: "drop-too-late and late-window suggestion",
      note: "Move quickly enough to create stale slots; evaluate strict/balanced/loose window shadows without changing runtime.",
    },
    {
      id: "worklet-pool-saturation",
      status: poolSaturation ? "observable" : "needs-manual-trigger",
      observedSignal: poolSaturation,
      primaryMetric: "pool displacement / priority displacement / fade-tail frames",
      note: "Create enough failover voices to fill the Worklet pool; confirm priority steal and fade-tail counters rather than hard kill assumptions.",
    },
    {
      id: "root-follow-wave-starter-pressure",
      status: fullContext ? "observable" : "needs-manual-trigger",
      observedSignal: fullContext,
      primaryMetric: "full-context pressure with Root-Follow/Material protected",
      note: "Run Wellenstarter pressure while Root-Follow/Material context is active; the hook only snapshots reports and does not trigger audio.",
    },
  ];

  const snapshot: WaveStarterFailoverHarnessSnapshot = {
    atIso: new Date().toISOString(),
    stressDecision: stress?.decision ?? "not-observed",
    stressScenario: stress?.scenario ?? "none",
    readiness: readiness?.readiness ?? "not-observed",
    renderedKinds: readiness?.renderedKinds ?? "none",
    ledgerEntries: nn(ledger?.entryCount),
    posted: nn(ledger?.postedCount),
    accepted: nn(ledger?.acceptedCount),
    rejected: nn(ledger?.rejectedCount),
    synthFrames,
    sampleFrames,
    lateWindowSuggestion: late?.suggestedWindowId ?? "not-observed",
    shadowPreference: shadow?.preferredShadowId ?? "not-observed",
    workletReady: Boolean(stress?.workletReady ?? (worklet && worklet.keepAliveConnected && worklet.outputConnected && !worklet.errorMessage)),
  };

  const suggestedManualPass = scenarios.find((scenario) => scenario.status === "needs-manual-trigger")?.id ?? "mixed-synth-sample-pressure";
  const detail = "Harness hooks expose before/after-style browser snapshots for manual stress passes. They never trigger audio, never change policy, and keep Legacy primary while Failover reports are compared.";

  return publish({
    version: 1,
    reportKind: "xensonar-wave-starter-failover-real-test-harness-hooks",
    generatedAtIso: new Date().toISOString(),
    scenarios,
    snapshot,
    manualHarnessOnly: true,
    exposesBrowserSnapshot: true,
    doesNotTriggerAudio: true,
    doesNotMutateRuntimePolicy: true,
    doesNotEnablePrimaryReplacement: true,
    doesNotEnableSampleToSynthFallback: true,
    legacyPrimaryPreserved: true,
    suggestedManualPass,
    detail,
  });
}

export function readWaveStarterFailoverRealTestHarnessHooksFromBrowser(): WaveStarterFailoverRealTestHarnessHooksReport | null {
  if (typeof window === "undefined") return null;
  const value = (window as unknown as Record<string, unknown>)[WAVE_STARTER_FAILOVER_REAL_TEST_HARNESS_HOOKS_GLOBAL];
  return value && typeof value === "object" ? (value as WaveStarterFailoverRealTestHarnessHooksReport) : null;
}

export function formatWaveStarterFailoverRealTestHarnessHooksUiValue(
  report: WaveStarterFailoverRealTestHarnessHooksReport | null,
): string {
  if (!report) return "not-observed · manual hooks only · no audio trigger";
  const observable = report.scenarios.filter((scenario) => scenario.status === "observable").length;
  const pending = report.scenarios.filter((scenario) => scenario.status === "needs-manual-trigger").length;
  return `${observable}/${report.scenarios.length} observable · pending ${pending} · next ${report.suggestedManualPass} · Ldg ${report.snapshot.ledgerEntries}/${report.snapshot.posted}/${report.snapshot.accepted}/${report.snapshot.rejected} · Sy/Sa ${report.snapshot.synthFrames}/${report.snapshot.sampleFrames}`;
}
