import {
  WAVE_STARTER_WORKLET_PARALLEL_PILOT_GAIN,
  WAVE_STARTER_WORKLET_PARALLEL_PILOT_GAIN_DB,
  WAVE_STARTER_WORKLET_PARALLEL_PILOT_REQUIRED_COMPLETED_SHAPES,
  type WaveStarterWorkletPilotSnapshot,
} from "./waveStarterWorkletPilotBridge";

export type WaveStarterParallelMixAbGuardDecision =
  | "legacy-only-no-worklet-report"
  | "legacy-only-unsupported"
  | "legacy-only-loading"
  | "legacy-only-processor-error"
  | "legacy-only-shape-proof-missing"
  | "legacy-dominant-pilot-armed"
  | "legacy-dominant-pilot-mix-observed"
  | "legacy-dominant-pilot-stale";

export type WaveStarterParallelMixAbGuardReport = {
  version: 1;
  reportKind: "xensonar-wave-starter-parallel-mix-ab-guard";
  generatedAtIso: string;
  decision: WaveStarterParallelMixAbGuardDecision;
  fallbackMode: "legacy-only" | "legacy-dominant-parallel-pilot";
  legacyReferenceDominant: true;
  legacyReferencePreserved: boolean;
  workletPilotAudibleContributionAllowed: boolean;
  workletPilotContributionObserved: boolean;
  workletPilotContributionFresh: boolean;
  shapeProofReady: boolean;
  frameProofReady: boolean;
  processorErrorFallback: boolean;
  autoFallbackReason: string | null;
  pilotStatus: string;
  pilotDecision: string;
  pilotGain: number;
  pilotGainDb: number;
  pilotRequiredCompletedShapes: number;
  pilotPeakAbs: number;
  pilotRenderFrameDelta: number;
  pilotRenderQuantumCount: number;
  pilotMutedFrameCount: number;
  audioShapeCompletedCount: number;
  audioShapeFrameDelta: number;
  audioShapeQuantumCount: number;
  detail: string;
};

export const WAVE_STARTER_PARALLEL_MIX_AB_GUARD_GLOBAL =
  "__XENSONAR_WAVE_STARTER_PARALLEL_MIX_AB_GUARD__";

const FRESH_PARALLEL_RENDER_FRAME_DELTA_MIN = 1;
const FRESH_PARALLEL_RENDER_QUANTA_MIN = 1;

function nowIso() {
  return new Date().toISOString();
}

function isFreshParallelContribution(report: WaveStarterWorkletPilotSnapshot | null) {
  if (!report) return false;
  return (
    report.parallelPilotRenderFrameDelta >= FRESH_PARALLEL_RENDER_FRAME_DELTA_MIN &&
    report.parallelPilotRenderQuantumCount >= FRESH_PARALLEL_RENDER_QUANTA_MIN &&
    report.parallelPilotPeakAbs > 0 &&
    report.parallelPilotAutoMuteReason === null
  );
}

export function buildWaveStarterParallelMixAbGuardReport(
  pilotReport: WaveStarterWorkletPilotSnapshot | null,
): WaveStarterParallelMixAbGuardReport {
  const shapeProofReady =
    (pilotReport?.audioShapeProbeCompletedCount ?? 0) >=
    WAVE_STARTER_WORKLET_PARALLEL_PILOT_REQUIRED_COMPLETED_SHAPES;
  const frameProofReady = (pilotReport?.renderedFrameDelta ?? 0) > 0;
  const processorErrorFallback =
    (pilotReport?.processorErrorCount ?? 0) > 0 || pilotReport?.status === "failed";
  const contributionFresh = isFreshParallelContribution(pilotReport);
  const contributionObserved = (pilotReport?.parallelPilotRenderFrameCount ?? 0) > 0;
  const status = pilotReport?.status ?? "unstarted";
  const pilotDecision = pilotReport?.decision ?? "not-requested";

  let decision: WaveStarterParallelMixAbGuardDecision = "legacy-only-no-worklet-report";
  let autoFallbackReason: string | null = "no-worklet-pilot-report";
  let detail = "Legacy remains the only audible Wellenstarter path because no Worklet pilot report is available.";

  if (pilotReport) {
    if (status === "unsupported") {
      decision = "legacy-only-unsupported";
      autoFallbackReason = pilotReport.detail ?? "worklet-unsupported";
      detail = "Wellenstarter Worklet is unsupported in this browser/context; legacy remains the only audible path.";
    } else if (status === "loading" || status === "unstarted") {
      decision = "legacy-only-loading";
      autoFallbackReason = "worklet-pilot-not-loaded";
      detail = "Wellenstarter Worklet pilot is not loaded yet; legacy remains dominant and effectively solo.";
    } else if (processorErrorFallback) {
      decision = "legacy-only-processor-error";
      autoFallbackReason = "processor-error";
      detail = "Wellenstarter Worklet reported a processor error; fallback is legacy-only.";
    } else if (!shapeProofReady) {
      decision = "legacy-only-shape-proof-missing";
      autoFallbackReason = pilotReport.parallelPilotAutoMuteReason ?? "shape-proof-required";
      detail = "Parallel pilot mix is muted until at least one internal shape probe has completed.";
    } else if (contributionFresh) {
      decision = "legacy-dominant-pilot-mix-observed";
      autoFallbackReason = null;
      detail = "Ultra-low Worklet pilot contribution is fresh; legacy remains the dominant audible reference.";
    } else if (contributionObserved) {
      decision = "legacy-dominant-pilot-stale";
      autoFallbackReason = "parallel-pilot-not-fresh";
      detail = "A Worklet pilot contribution was observed before, but it is not fresh in the current window; legacy remains dominant.";
    } else {
      decision = "legacy-dominant-pilot-armed";
      autoFallbackReason = null;
      detail = "Shape proof is ready, but no fresh parallel pilot contribution has been observed yet; legacy remains dominant.";
    }
  }

  const workletPilotAudibleContributionAllowed =
    Boolean(pilotReport) &&
    shapeProofReady &&
    !processorErrorFallback &&
    status === "loaded";
  const fallbackMode =
    workletPilotAudibleContributionAllowed && autoFallbackReason === null
      ? "legacy-dominant-parallel-pilot"
      : "legacy-only";

  const report: WaveStarterParallelMixAbGuardReport = {
    version: 1,
    reportKind: "xensonar-wave-starter-parallel-mix-ab-guard",
    generatedAtIso: nowIso(),
    decision,
    fallbackMode,
    legacyReferenceDominant: true,
    legacyReferencePreserved: pilotReport?.preservesMainThreadReferencePath ?? true,
    workletPilotAudibleContributionAllowed,
    workletPilotContributionObserved: contributionObserved,
    workletPilotContributionFresh: contributionFresh,
    shapeProofReady,
    frameProofReady,
    processorErrorFallback,
    autoFallbackReason,
    pilotStatus: status,
    pilotDecision,
    pilotGain: pilotReport?.parallelPilotGain ?? WAVE_STARTER_WORKLET_PARALLEL_PILOT_GAIN,
    pilotGainDb: pilotReport?.parallelPilotGainDb ?? WAVE_STARTER_WORKLET_PARALLEL_PILOT_GAIN_DB,
    pilotRequiredCompletedShapes:
      pilotReport?.parallelPilotRequiredCompletedShapes ??
      WAVE_STARTER_WORKLET_PARALLEL_PILOT_REQUIRED_COMPLETED_SHAPES,
    pilotPeakAbs: pilotReport?.parallelPilotPeakAbs ?? 0,
    pilotRenderFrameDelta: pilotReport?.parallelPilotRenderFrameDelta ?? 0,
    pilotRenderQuantumCount: pilotReport?.parallelPilotRenderQuantumCount ?? 0,
    pilotMutedFrameCount: pilotReport?.parallelPilotMutedFrameCount ?? 0,
    audioShapeCompletedCount: pilotReport?.audioShapeProbeCompletedCount ?? 0,
    audioShapeFrameDelta: pilotReport?.audioShapeProbeFrameDelta ?? 0,
    audioShapeQuantumCount: pilotReport?.audioShapeProbeQuantumCount ?? 0,
    detail,
  };

  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>)[
      WAVE_STARTER_PARALLEL_MIX_AB_GUARD_GLOBAL
    ] = report;
  }
  return report;
}

export function readWaveStarterParallelMixAbGuardFromBrowser():
  | WaveStarterParallelMixAbGuardReport
  | null {
  if (typeof window === "undefined") return null;
  const value = (window as unknown as Record<string, unknown>)[
    WAVE_STARTER_PARALLEL_MIX_AB_GUARD_GLOBAL
  ];
  return value && typeof value === "object"
    ? (value as WaveStarterParallelMixAbGuardReport)
    : null;
}

export function formatWaveStarterParallelMixAbGuardUiValue(
  report: WaveStarterParallelMixAbGuardReport | null,
) {
  if (!report) return "legacy-only-no-worklet-report · Legacy dominant";
  const contribution = report.workletPilotContributionFresh
    ? "pilot fresh"
    : report.workletPilotContributionObserved
      ? "pilot stale"
      : report.workletPilotAudibleContributionAllowed
        ? "pilot armed"
        : "pilot muted";
  const fallback = report.autoFallbackReason ? ` · ${report.autoFallbackReason}` : "";
  return `${report.decision} · ${contribution} · ${report.pilotGainDb.toFixed(1)}dB · Legacy dominant${fallback}`;
}
