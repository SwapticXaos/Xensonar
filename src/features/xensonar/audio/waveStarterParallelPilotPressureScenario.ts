import type { WaveStarterVoicePoolLiveReport } from "./waveStarterVoicePoolLiveReport";
import type { WaveStarterWorkletPilotSnapshot } from "./waveStarterWorkletPilotBridge";
import type { WaveStarterParallelMixAbGuardReport } from "./waveStarterParallelMixAbGuard";

export type WaveStarterParallelPilotPressureScenarioDecision =
  | "no-wave-pressure-observed"
  | "pressure-legacy-only-no-worklet-report"
  | "pressure-legacy-only-precondition-blocked"
  | "pressure-pilot-armed-no-mix-yet"
  | "pressure-pilot-fresh-legacy-dominant"
  | "pressure-pilot-stale-legacy-only"
  | "pressure-shape-proof-missing"
  | "pressure-processor-error-fallback";

export type WaveStarterParallelPilotPressureScenarioReport = {
  version: 1;
  reportKind: "xensonar-wave-starter-parallel-pilot-pressure-scenario";
  generatedAtIso: string;
  decision: WaveStarterParallelPilotPressureScenarioDecision;
  scenarioKind: "wave-starter-parallel-pilot-pressure-scenario";
  reportOnly: true;
  legacyReferenceDominant: true;
  primaryReplacementForbidden: true;
  pressureObserved: boolean;
  pressureSource: "live-report" | "ab-guard" | "none";
  waveRequestTotal: number;
  waveAdmittedTotal: number;
  waveDeferredTotal: number;
  waveMicroReleasedTotal: number;
  waveStaleDroppedTotal: number;
  waveLatestIntentReplacedTotal: number;
  wavePendingSlotCount: number;
  wavePendingSlotAgeMs: number | null;
  pilotStatus: string;
  pilotDecision: string;
  pilotPostedIntentCount: number;
  pilotAckedIntentCount: number;
  pilotProcessorErrorCount: number;
  pilotShapeCompletedCount: number;
  pilotShapeFrameDelta: number;
  pilotParallelRenderFrameDelta: number;
  pilotParallelRenderQuantumCount: number;
  pilotParallelPeakAbs: number;
  pilotParallelAutoMuteReason: string | null;
  abGuardDecision: string;
  fallbackMode: string;
  capacityFirstInvariant: "legacy-dominant-parallel-pilot-only";
  autoFallbackReason: string | null;
  nextRequiredProof: string | null;
  blockers: string[];
};

export const WAVE_STARTER_PARALLEL_PILOT_PRESSURE_SCENARIO_GLOBAL =
  "__XENSONAR_WAVE_STARTER_PARALLEL_PILOT_PRESSURE_SCENARIO__";

function nowIso() {
  return new Date().toISOString();
}

function readCount(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function buildWaveStarterParallelPilotPressureScenarioReport(args: {
  waveStarterLiveReport: WaveStarterVoicePoolLiveReport | null;
  pilotReport: WaveStarterWorkletPilotSnapshot | null;
  abGuardReport: WaveStarterParallelMixAbGuardReport | null;
}): WaveStarterParallelPilotPressureScenarioReport {
  const live = args.waveStarterLiveReport;
  const pilot = args.pilotReport;
  const ab = args.abGuardReport;
  const waveRequestTotal = readCount(live?.counters.requestTotal);
  const waveDeferredTotal = readCount(live?.counters.deferredTotal);
  const waveMicroReleasedTotal = readCount(live?.counters.microReleasedTotal);
  const waveStaleDroppedTotal = readCount(live?.counters.staleDroppedTotal);
  const waveLatestIntentReplacedTotal = readCount(live?.counters.latestIntentReplacedTotal);
  const pressureObserved = Boolean(
    waveRequestTotal > 0 ||
      waveDeferredTotal > 0 ||
      waveMicroReleasedTotal > 0 ||
      waveStaleDroppedTotal > 0 ||
      waveLatestIntentReplacedTotal > 0 ||
      ab?.workletPilotContributionObserved,
  );
  const pressureSource = live
    ? "live-report"
    : ab?.workletPilotContributionObserved
      ? "ab-guard"
      : "none";

  const blockers: string[] = [];
  if (!pressureObserved) blockers.push("no-wave-pressure-observed");
  if (!pilot) blockers.push("missing-worklet-pilot-report");
  if (pilot?.status === "unsupported") blockers.push("worklet-unsupported");
  if (pilot?.status === "loading" || pilot?.status === "unstarted") blockers.push("worklet-not-loaded");
  if ((pilot?.processorErrorCount ?? 0) > 0 || pilot?.status === "failed") blockers.push("processor-error");
  if ((pilot?.audioShapeProbeCompletedCount ?? 0) <= 0) blockers.push("shape-proof-missing");
  if ((pilot?.parallelPilotRenderFrameDelta ?? 0) <= 0 && pressureObserved) blockers.push("parallel-pilot-frame-delta-missing");
  if (ab?.autoFallbackReason) blockers.push(ab.autoFallbackReason);

  let decision: WaveStarterParallelPilotPressureScenarioDecision = "no-wave-pressure-observed";
  let autoFallbackReason: string | null = null;
  let nextRequiredProof: string | null = null;

  if (!pressureObserved) {
    decision = "no-wave-pressure-observed";
    nextRequiredProof = "trigger-wave-starter-intents";
  } else if (!pilot) {
    decision = "pressure-legacy-only-no-worklet-report";
    autoFallbackReason = "missing-worklet-pilot-report";
    nextRequiredProof = "worklet-pilot-report";
  } else if ((pilot.processorErrorCount ?? 0) > 0 || pilot.status === "failed") {
    decision = "pressure-processor-error-fallback";
    autoFallbackReason = "processor-error";
    nextRequiredProof = "new-worklet-instance-without-processor-error";
  } else if (pilot.status !== "loaded") {
    decision = "pressure-legacy-only-precondition-blocked";
    autoFallbackReason = pilot.detail ?? "worklet-pilot-not-loaded";
    nextRequiredProof = "worklet-loaded";
  } else if ((pilot.audioShapeProbeCompletedCount ?? 0) <= 0 || ab?.shapeProofReady === false) {
    decision = "pressure-shape-proof-missing";
    autoFallbackReason = pilot.parallelPilotAutoMuteReason ?? "shape-proof-required";
    nextRequiredProof = "shape-proof";
  } else if (ab?.workletPilotContributionFresh) {
    decision = "pressure-pilot-fresh-legacy-dominant";
    autoFallbackReason = null;
    nextRequiredProof = null;
  } else if (ab?.workletPilotContributionObserved || (pilot.parallelPilotRenderFrameCount ?? 0) > 0) {
    decision = "pressure-pilot-stale-legacy-only";
    autoFallbackReason = "parallel-pilot-not-fresh";
    nextRequiredProof = "fresh-parallel-pilot-frame-delta";
  } else {
    decision = "pressure-pilot-armed-no-mix-yet";
    autoFallbackReason = "parallel-pilot-not-yet-rendered-in-pressure-window";
    nextRequiredProof = "parallel-pilot-mix-render-frame-delta";
  }

  const report: WaveStarterParallelPilotPressureScenarioReport = {
    version: 1,
    reportKind: "xensonar-wave-starter-parallel-pilot-pressure-scenario",
    generatedAtIso: nowIso(),
    decision,
    scenarioKind: "wave-starter-parallel-pilot-pressure-scenario",
    reportOnly: true,
    legacyReferenceDominant: true,
    primaryReplacementForbidden: true,
    pressureObserved,
    pressureSource,
    waveRequestTotal,
    waveAdmittedTotal: readCount(live?.counters.admittedTotal),
    waveDeferredTotal,
    waveMicroReleasedTotal,
    waveStaleDroppedTotal,
    waveLatestIntentReplacedTotal,
    wavePendingSlotCount: readCount(live?.pendingSlotCount),
    wavePendingSlotAgeMs: live?.pendingSlotAgeMs ?? null,
    pilotStatus: pilot?.status ?? "unstarted",
    pilotDecision: pilot?.decision ?? "not-requested",
    pilotPostedIntentCount: readCount(pilot?.postedIntentCount),
    pilotAckedIntentCount: readCount(pilot?.ackedIntentCount),
    pilotProcessorErrorCount: readCount(pilot?.processorErrorCount),
    pilotShapeCompletedCount: readCount(pilot?.audioShapeProbeCompletedCount),
    pilotShapeFrameDelta: readCount(pilot?.audioShapeProbeFrameDelta),
    pilotParallelRenderFrameDelta: readCount(pilot?.parallelPilotRenderFrameDelta),
    pilotParallelRenderQuantumCount: readCount(pilot?.parallelPilotRenderQuantumCount),
    pilotParallelPeakAbs: pilot?.parallelPilotPeakAbs ?? 0,
    pilotParallelAutoMuteReason: pilot?.parallelPilotAutoMuteReason ?? null,
    abGuardDecision: ab?.decision ?? "legacy-only-no-worklet-report",
    fallbackMode: ab?.fallbackMode ?? "legacy-only",
    capacityFirstInvariant: "legacy-dominant-parallel-pilot-only",
    autoFallbackReason,
    nextRequiredProof,
    blockers: [...new Set(blockers)],
  };

  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>)[
      WAVE_STARTER_PARALLEL_PILOT_PRESSURE_SCENARIO_GLOBAL
    ] = report;
  }
  return report;
}

export function formatWaveStarterParallelPilotPressureScenarioUiValue(
  report: WaveStarterParallelPilotPressureScenarioReport | null,
) {
  if (!report) return "no-wave-pressure-observed · Legacy dominant · report-only";
  const pressure = report.pressureObserved
    ? `req ${report.waveRequestTotal} · μ ${report.waveMicroReleasedTotal} · stale ${report.waveStaleDroppedTotal}`
    : "no pressure";
  const pilot = `pilot Δ ${report.pilotParallelRenderFrameDelta}/${report.pilotParallelRenderQuantumCount}Q · peak ${report.pilotParallelPeakAbs.toFixed(4)}`;
  const fallback = report.autoFallbackReason ? ` · ${report.autoFallbackReason}` : "";
  return `${report.decision} · ${pressure} · ${pilot} · Legacy dominant${fallback}`;
}
