import type { StationaryRhythmWorkletSnapshot } from "./stationaryRhythmWorkletLaneContracts";

export type StationaryRhythmWorkletPressureReason =
  | "clear"
  | "late-step-delta"
  | "frame-continuity-gap-delta"
  | "missed-step-window-delta"
  | "processor-state-watch"
  | "processor-state-brake"
  | "processor-state-critical"
  | "processor-error";

export type StationaryRhythmWorkletPressureReport = {
  version: 1;
  generatedAtMs: number;
  activePressureHint: number;
  reason: StationaryRhythmWorkletPressureReason;
  expiresAtMs: number;
  bridgeSessionId: number | null;
  heartbeatCount: number;
  lateStepDelta: number;
  frameContinuityGapDelta: number;
  missedStepWindowDelta: number;
  maxRecentStepLatenessFrames: number;
  processorState: StationaryRhythmWorkletSnapshot["processorState"];
  pressureHintFeedsGlobalAudioTrafficPolicy: true;
  allTimeCountersRemainDiagnosticOnly: true;
};

const STATIONARY_RHYTHM_WORKLET_PRESSURE_GLOBAL =
  "__XENSONAR_STATIONARY_RHYTHM_WORKLET_PRESSURE__";

const PRESSURE_TTL_MS = 900;
const PRESSURE_DECAY_MS = 650;

type SnapshotCounters = {
  bridgeSessionId: number;
  heartbeatCount: number;
  lateStepCount: number;
  frameContinuityGapCount: number;
  missedStepWindowCount: number;
  maxStepLatenessFrames: number;
};

let lastCounters: SnapshotCounters | null = null;
let currentReport: StationaryRhythmWorkletPressureReport = {
  version: 1,
  generatedAtMs: 0,
  activePressureHint: 0,
  reason: "clear",
  expiresAtMs: 0,
  bridgeSessionId: null,
  heartbeatCount: 0,
  lateStepDelta: 0,
  frameContinuityGapDelta: 0,
  missedStepWindowDelta: 0,
  maxRecentStepLatenessFrames: 0,
  processorState: "idle",
  pressureHintFeedsGlobalAudioTrafficPolicy: true,
  allTimeCountersRemainDiagnosticOnly: true,
};

const nowMs = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const publishBrowserReport = (
  report: StationaryRhythmWorkletPressureReport,
) => {
  if (typeof window === "undefined") return;
  (window as unknown as Record<string, unknown>)[
    STATIONARY_RHYTHM_WORKLET_PRESSURE_GLOBAL
  ] = report;
};

const decayedPressure = (
  report: StationaryRhythmWorkletPressureReport,
  atMs: number,
) => {
  if (report.activePressureHint <= 0 || atMs >= report.expiresAtMs) return 0;
  const age = Math.max(0, atMs - report.generatedAtMs);
  if (age <= 0) return report.activePressureHint;
  return clamp01(
    report.activePressureHint * Math.max(0, 1 - age / PRESSURE_DECAY_MS),
  );
};

export function publishStationaryRhythmWorkletPressureFromSnapshot(
  snapshot: StationaryRhythmWorkletSnapshot,
  atMs = nowMs(),
): StationaryRhythmWorkletPressureReport {
  const previous =
    lastCounters && lastCounters.bridgeSessionId === snapshot.bridgeSessionId
      ? lastCounters
      : null;

  const lateStepDelta = Math.max(
    0,
    snapshot.lateStepCount -
      (previous?.lateStepCount ?? snapshot.lateStepCount),
  );
  const frameContinuityGapDelta = Math.max(
    0,
    snapshot.frameContinuityGapCount -
      (previous?.frameContinuityGapCount ?? snapshot.frameContinuityGapCount),
  );
  const missedStepWindowDelta = Math.max(
    0,
    snapshot.missedStepWindowCount -
      (previous?.missedStepWindowCount ?? snapshot.missedStepWindowCount),
  );
  const maxRecentStepLatenessFrames = Math.max(
    0,
    snapshot.maxStepLatenessFrames -
      (previous?.maxStepLatenessFrames ?? snapshot.maxStepLatenessFrames),
  );

  lastCounters = {
    bridgeSessionId: snapshot.bridgeSessionId,
    heartbeatCount: snapshot.heartbeatCount,
    lateStepCount: snapshot.lateStepCount,
    frameContinuityGapCount: snapshot.frameContinuityGapCount,
    missedStepWindowCount: snapshot.missedStepWindowCount,
    maxStepLatenessFrames: snapshot.maxStepLatenessFrames,
  };

  let reason: StationaryRhythmWorkletPressureReason = "clear";
  let severity = 0;

  if (
    snapshot.processorState === "processor-error" ||
    snapshot.status === "failed"
  ) {
    reason = "processor-error";
    severity = 1;
  } else if (missedStepWindowDelta > 0) {
    reason = "missed-step-window-delta";
    severity = Math.max(0.86, Math.min(1, 0.86 + missedStepWindowDelta * 0.04));
  } else if (snapshot.processorState === "critical") {
    reason = "processor-state-critical";
    severity = 0.9;
  } else if (snapshot.processorState === "brake") {
    reason = "processor-state-brake";
    severity = 0.78;
  } else if (frameContinuityGapDelta > 0) {
    reason = "frame-continuity-gap-delta";
    severity = Math.max(
      0.72,
      Math.min(0.9, 0.72 + frameContinuityGapDelta * 0.05),
    );
  } else if (lateStepDelta > 0) {
    reason = "late-step-delta";
    const latenessBias = Math.min(0.2, maxRecentStepLatenessFrames / 4096);
    severity = Math.max(
      0.48,
      Math.min(0.78, 0.48 + lateStepDelta * 0.035 + latenessBias),
    );
  } else if (snapshot.processorState === "watch") {
    reason = "processor-state-watch";
    severity = 0.32;
  }

  const decayedPrevious = decayedPressure(currentReport, atMs);
  const activePressureHint = clamp01(
    Math.max(severity, decayedPrevious * 0.82),
  );

  currentReport = {
    version: 1,
    generatedAtMs: atMs,
    activePressureHint,
    reason: activePressureHint > 0 ? reason : "clear",
    expiresAtMs: atMs + PRESSURE_TTL_MS,
    bridgeSessionId: snapshot.bridgeSessionId,
    heartbeatCount: snapshot.heartbeatCount,
    lateStepDelta,
    frameContinuityGapDelta,
    missedStepWindowDelta,
    maxRecentStepLatenessFrames,
    processorState: snapshot.processorState,
    pressureHintFeedsGlobalAudioTrafficPolicy: true,
    allTimeCountersRemainDiagnosticOnly: true,
  };

  publishBrowserReport(currentReport);
  return currentReport;
}

export function readStationaryRhythmWorkletPressureHint(
  atMs = nowMs(),
): number {
  return decayedPressure(currentReport, atMs);
}

export function readStationaryRhythmWorkletPressureReportFromBrowser(): StationaryRhythmWorkletPressureReport | null {
  if (typeof window === "undefined") return null;
  const value = (window as unknown as Record<string, unknown>)[
    STATIONARY_RHYTHM_WORKLET_PRESSURE_GLOBAL
  ];
  return value && typeof value === "object"
    ? (value as StationaryRhythmWorkletPressureReport)
    : null;
}

export function resetStationaryRhythmWorkletPressureFeedback(): void {
  lastCounters = null;
  currentReport = {
    ...currentReport,
    generatedAtMs: nowMs(),
    activePressureHint: 0,
    reason: "clear",
    expiresAtMs: 0,
    bridgeSessionId: null,
    heartbeatCount: 0,
    lateStepDelta: 0,
    frameContinuityGapDelta: 0,
    missedStepWindowDelta: 0,
    maxRecentStepLatenessFrames: 0,
    processorState: "idle",
  };
  publishBrowserReport(currentReport);
}
