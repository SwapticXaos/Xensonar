import {
  WAVE_STARTER_WORKLET_PARALLEL_PILOT_GAIN,
  WAVE_STARTER_WORKLET_PARALLEL_PILOT_GAIN_DB,
  WAVE_STARTER_WORKLET_PARALLEL_PILOT_REQUIRED_COMPLETED_SHAPES,
  type WaveStarterWorkletPilotSnapshot,
} from "./waveStarterWorkletPilotBridge";
import type { WaveStarterParallelMixAbGuardReport } from "./waveStarterParallelMixAbGuard";

export type WaveStarterParallelPilotGainStabilityDecision =
  | "legacy-only-no-pilot"
  | "pilot-armed-waiting-for-shape"
  | "pilot-stable-legacy-dominant"
  | "pilot-stale-legacy-only"
  | "pilot-peak-too-high-fallback"
  | "pilot-ramp-not-observed-fallback"
  | "processor-error-legacy-only";

export type WaveStarterParallelPilotGainStabilityReport = {
  version: 1;
  reportKind: "xensonar-wave-starter-parallel-pilot-gain-stability-report";
  generatedAtIso: string;
  decision: WaveStarterParallelPilotGainStabilityDecision;
  reportOnly: true;
  legacyReferenceDominant: true;
  primaryReplacementForbidden: true;
  gainIncreaseForbidden: true;
  expectedGain: number;
  expectedGainDb: number;
  maxAllowedPilotPeakAbs: number;
  pilotGain: number;
  pilotGainDb: number;
  pilotPeakAbs: number;
  pilotPeakWithinExpectedRange: boolean;
  pilotGainWithinExpectedRange: boolean;
  pilotMixFresh: boolean;
  pilotMixObserved: boolean;
  rampGuardObserved: boolean;
  rampGuardFresh: boolean;
  rampGuardPeakGain: number;
  rampGuardAttackFrames: number;
  rampGuardReleaseFrames: number;
  shapeProofValid: boolean;
  processorErrorFree: boolean;
  legacyDominant: true;
  fallbackMode: "legacy-only" | "legacy-dominant-parallel-pilot";
  fallbackDecision: string | null;
  blockers: string[];
  nextRequiredProof: string | null;
  detail: string;
};

export const WAVE_STARTER_PARALLEL_PILOT_GAIN_STABILITY_GLOBAL =
  "__XENSONAR_WAVE_STARTER_PARALLEL_PILOT_GAIN_STABILITY_REPORT__";

export const WAVE_STARTER_PARALLEL_PILOT_MAX_ALLOWED_PEAK_ABS = 0.018;
const FRESH_PARALLEL_RENDER_FRAME_DELTA_MIN = 1;
const FRESH_PARALLEL_RENDER_QUANTA_MIN = 1;
const RAMP_GUARD_FRAME_MIN = 1;
const RAMP_GUARD_QUANTA_MIN = 1;
const PILOT_GAIN_TOLERANCE = 0.000001;

function readFinite(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nowIso() {
  return new Date().toISOString();
}

export function buildWaveStarterParallelPilotGainStabilityReport(args: {
  pilotReport: WaveStarterWorkletPilotSnapshot | null;
  abGuardReport: WaveStarterParallelMixAbGuardReport | null;
}): WaveStarterParallelPilotGainStabilityReport {
  const pilot = args.pilotReport;
  const ab = args.abGuardReport;
  const pilotGain = readFinite(pilot?.parallelPilotGain, WAVE_STARTER_WORKLET_PARALLEL_PILOT_GAIN);
  const pilotGainDb = readFinite(pilot?.parallelPilotGainDb, WAVE_STARTER_WORKLET_PARALLEL_PILOT_GAIN_DB);
  const pilotPeakAbs = readFinite(pilot?.parallelPilotPeakAbs, 0);
  const rampFrameCount = readFinite(pilot?.parallelPilotRampGuardFrameCount, 0);
  const rampQuantumCount = readFinite(pilot?.parallelPilotRampGuardQuantumCount, 0);
  const rampPeakGain = readFinite(pilot?.parallelPilotRampGuardPeakGain, 0);
  const shapeProofValid =
    readFinite(pilot?.audioShapeProbeCompletedCount, 0) >=
    WAVE_STARTER_WORKLET_PARALLEL_PILOT_REQUIRED_COMPLETED_SHAPES;
  const processorErrorFree = !pilot || ((pilot.processorErrorCount ?? 0) <= 0 && pilot.status !== "failed");
  const pilotMixFresh = Boolean(
    pilot &&
      pilot.parallelPilotRenderFrameDelta >= FRESH_PARALLEL_RENDER_FRAME_DELTA_MIN &&
      pilot.parallelPilotRenderQuantumCount >= FRESH_PARALLEL_RENDER_QUANTA_MIN &&
      pilot.parallelPilotAutoMuteReason === null,
  );
  const pilotMixObserved = readFinite(pilot?.parallelPilotRenderFrameCount, 0) > 0;
  const rampGuardObserved = rampFrameCount >= RAMP_GUARD_FRAME_MIN && rampQuantumCount >= RAMP_GUARD_QUANTA_MIN;
  const rampGuardFresh = Boolean(
    pilot &&
      pilotMixFresh &&
      rampGuardObserved &&
      readFinite(pilot.parallelPilotRampGuardPeakGain, 0) > 0,
  );
  const pilotPeakWithinExpectedRange = pilotPeakAbs <= WAVE_STARTER_PARALLEL_PILOT_MAX_ALLOWED_PEAK_ABS;
  const pilotGainWithinExpectedRange = Math.abs(pilotGain - WAVE_STARTER_WORKLET_PARALLEL_PILOT_GAIN) <= PILOT_GAIN_TOLERANCE;

  const blockers: string[] = [];
  if (!pilot) blockers.push("missing-worklet-pilot-report");
  if (pilot?.status === "unsupported") blockers.push("worklet-unsupported");
  if (pilot?.status === "loading" || pilot?.status === "unstarted") blockers.push("worklet-not-loaded");
  if (!processorErrorFree) blockers.push("processor-error");
  if (!shapeProofValid) blockers.push("shape-proof-missing");
  if (pilotMixObserved && !pilotMixFresh) blockers.push("parallel-pilot-stale");
  if (pilotMixFresh && !rampGuardObserved) blockers.push("ramp-guard-not-observed");
  if (pilotMixFresh && !rampGuardFresh) blockers.push("ramp-guard-not-fresh");
  if (!pilotPeakWithinExpectedRange) blockers.push("pilot-peak-too-high");
  if (!pilotGainWithinExpectedRange) blockers.push("pilot-gain-changed");
  if (ab?.autoFallbackReason) blockers.push(ab.autoFallbackReason);

  let decision: WaveStarterParallelPilotGainStabilityDecision = "legacy-only-no-pilot";
  let fallbackMode: "legacy-only" | "legacy-dominant-parallel-pilot" = "legacy-only";
  let fallbackDecision: string | null = null;
  let nextRequiredProof: string | null = "worklet-pilot-report";
  let detail = "No Wellenstarter Worklet pilot report is available; legacy remains the only audible reference.";

  if (!pilot) {
    decision = "legacy-only-no-pilot";
    fallbackDecision = "missing-worklet-pilot-report";
  } else if (!processorErrorFree) {
    decision = "processor-error-legacy-only";
    fallbackDecision = "processor-error";
    nextRequiredProof = "new-worklet-instance-without-processor-error";
    detail = "Wellenstarter Worklet reported a processor error; legacy-only remains mandatory.";
  } else if (!shapeProofValid) {
    decision = "pilot-armed-waiting-for-shape";
    fallbackDecision = pilot.parallelPilotAutoMuteReason ?? "shape-proof-required";
    nextRequiredProof = "completed-shape-proof";
    detail = "Parallel pilot stays muted until the Worklet has completed its internal shape proof.";
  } else if (!pilotGainWithinExpectedRange || !pilotPeakWithinExpectedRange) {
    decision = "pilot-peak-too-high-fallback";
    fallbackDecision = !pilotGainWithinExpectedRange ? "pilot-gain-changed" : "pilot-peak-too-high";
    nextRequiredProof = "pilot-gain-and-peak-within-expected-range";
    detail = "Parallel pilot output exceeded the conservative gain/peak envelope; legacy-only remains the safe decision.";
  } else if (pilotMixFresh && !rampGuardFresh) {
    decision = "pilot-ramp-not-observed-fallback";
    fallbackDecision = "ramp-guard-not-fresh";
    nextRequiredProof = "fresh-ramp-guard-frames";
    detail = "Pilot mix was observed, but the gain-ramp guard was not proven fresh; legacy remains dominant.";
  } else if (pilotMixFresh && rampGuardFresh) {
    decision = "pilot-stable-legacy-dominant";
    fallbackMode = "legacy-dominant-parallel-pilot";
    fallbackDecision = null;
    nextRequiredProof = null;
    detail = "Ultra-low Wellenstarter Worklet pilot is fresh, ramped, low-peak, processor-error free, and legacy-dominant.";
  } else if (pilotMixObserved) {
    decision = "pilot-stale-legacy-only";
    fallbackDecision = "parallel-pilot-stale";
    nextRequiredProof = "fresh-parallel-pilot-frame-delta";
    detail = "A pilot mix was observed before, but not freshly enough for stability credit; legacy-only remains the safe report.";
  } else {
    decision = "pilot-armed-waiting-for-shape";
    fallbackDecision = "parallel-pilot-not-yet-rendered";
    nextRequiredProof = "fresh-parallel-pilot-mix-with-ramp";
    detail = "Shape proof is ready, but a fresh ramped parallel pilot mix has not been observed yet.";
  }

  const report: WaveStarterParallelPilotGainStabilityReport = {
    version: 1,
    reportKind: "xensonar-wave-starter-parallel-pilot-gain-stability-report",
    generatedAtIso: nowIso(),
    decision,
    reportOnly: true,
    legacyReferenceDominant: true,
    primaryReplacementForbidden: true,
    gainIncreaseForbidden: true,
    expectedGain: WAVE_STARTER_WORKLET_PARALLEL_PILOT_GAIN,
    expectedGainDb: WAVE_STARTER_WORKLET_PARALLEL_PILOT_GAIN_DB,
    maxAllowedPilotPeakAbs: WAVE_STARTER_PARALLEL_PILOT_MAX_ALLOWED_PEAK_ABS,
    pilotGain,
    pilotGainDb,
    pilotPeakAbs,
    pilotPeakWithinExpectedRange,
    pilotGainWithinExpectedRange,
    pilotMixFresh,
    pilotMixObserved,
    rampGuardObserved,
    rampGuardFresh,
    rampGuardPeakGain: rampPeakGain,
    rampGuardAttackFrames: pilot?.parallelPilotRampGuardAttackFrames ?? 0,
    rampGuardReleaseFrames: pilot?.parallelPilotRampGuardReleaseFrames ?? 0,
    shapeProofValid,
    processorErrorFree,
    legacyDominant: true,
    fallbackMode,
    fallbackDecision,
    blockers: [...new Set(blockers)],
    nextRequiredProof,
    detail,
  };

  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>)[
      WAVE_STARTER_PARALLEL_PILOT_GAIN_STABILITY_GLOBAL
    ] = report;
  }
  return report;
}

export function readWaveStarterParallelPilotGainStabilityReportFromBrowser():
  | WaveStarterParallelPilotGainStabilityReport
  | null {
  if (typeof window === "undefined") return null;
  const value = (window as unknown as Record<string, unknown>)[
    WAVE_STARTER_PARALLEL_PILOT_GAIN_STABILITY_GLOBAL
  ];
  return value && typeof value === "object"
    ? (value as WaveStarterParallelPilotGainStabilityReport)
    : null;
}

export function formatWaveStarterParallelPilotGainStabilityUiValue(
  report: WaveStarterParallelPilotGainStabilityReport | null,
) {
  if (!report) return "legacy-only-no-pilot · Stabilität nicht beobachtet";
  const mix = report.pilotMixFresh ? "mix frisch" : report.pilotMixObserved ? "mix stale" : "mix fehlt";
  const ramp = report.rampGuardFresh ? "ramp frisch" : report.rampGuardObserved ? "ramp stale" : "ramp fehlt";
  const peak = `peak ${report.pilotPeakAbs.toFixed(4)}/${report.maxAllowedPilotPeakAbs.toFixed(3)}`;
  const fallback = report.fallbackDecision ? ` · ${report.fallbackDecision}` : "";
  return `${report.decision} · ${mix} · ${ramp} · ${peak} · ${report.expectedGainDb.toFixed(1)}dB · Legacy dominant${fallback}`;
}
