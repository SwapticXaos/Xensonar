import { getWaveStarterWorkletPilotSnapshot } from "../audio/waveStarterWorkletPilotBridge";
import { readWaveStarterWorkletInstrumentEngineSkeletonReportFromBrowser } from "../audio/waveStarterWorkletInstrumentEngineSkeleton";
import { readWaveStarterWorkletProcessorRuntimeOwnershipReportFromBrowser } from "../audio/waveStarterWorkletProcessorRuntimeOwnership";
import { readWaveStarterSpecialPathIsolationFromBrowser } from "../performanceCrisis/waveStarterSpecialPathIsolationContract";
import {
  readWaveStarterGestureLoopWorkletBridgeReportFromBrowser,
  type WaveStarterGestureLoopWorkletBridgeDecision,
} from "./waveStarterGestureLoopWorkletBridge";
import type {
  WaveStarterHoldGestureLoop,
  WaveStarterHoldGestureLoopFrame,
  WaveStarterHoldGestureLoopLaneState,
  WaveStarterHoldGestureLoopPulse,
  WaveStarterHoldLane,
} from "./waveStarterHoldSegmentClock";

export const WAVE_STARTER_HOLD_PATH_FORENSICS_GLOBAL =
  "__XENSONAR_WAVE_STARTER_HOLD_PATH_FORENSICS__";

export const WAVE_STARTER_HOLD_PATH_FORENSICS_READER_GLOBAL =
  "__xensonarReadWaveStarterHoldPathForensics";

export type WaveStarterHoldPathForensicsPhase =
  | "initial-frame"
  | "repeat-absorbed"
  | "segment-pulse"
  | "segment-idle"
  | "release"
  | "cleanup";

export type WaveStarterHoldGestureForensicsSummary = {
  lane: WaveStarterHoldLane;
  keyId: string;
  active: boolean;
  targetHz: number | null;
  segmentsPerBar: number;
  intervalMs: number;
  pulseCount: number;
  repeatUpdateCount: number;
  nextPulseInMs: number | null;
  articulation: WaveStarterHoldGestureLoop["articulation"];
  extendPolicy: WaveStarterHoldGestureLoop["extendPolicy"];
  sustainExtendActive: boolean;
  sustainExtendLatched: boolean;
};

export type WaveStarterHoldLaneForensicsSummary = {
  immediateHitCount: number;
  loopPulseCount: number;
  repeatAbsorbedCount: number;
  releaseCount: number;
  skippedCatchupCount: number;
  patternMutedPulseCount: number;
  activeGestureCount: number;
  activeByLane: Record<WaveStarterHoldLane, number>;
  gestures: WaveStarterHoldGestureForensicsSummary[];
};

export type WaveStarterHoldPathForensicsSnapshot = {
  version: 1;
  reportKind: "xensonar-wave-starter-hold-path-forensics";
  generatedAtIso: string;
  generatedAtMs: number;
  phase: WaveStarterHoldPathForensicsPhase;
  browserUserAgent: string;
  browserFamily: "firefox" | "opera" | "chromium" | "safari" | "unknown";
  laneState: WaveStarterHoldLaneForensicsSummary;
  lastFrame: WaveStarterHoldGestureLoopFrame | null;
  lastPulse: WaveStarterHoldGestureLoopPulse | null;
  lastBridgeDecision: WaveStarterGestureLoopWorkletBridgeDecision | null;
  specialPathIsolation: ReturnType<typeof readWaveStarterSpecialPathIsolationFromBrowser>;
  bridgeReport: ReturnType<typeof readWaveStarterGestureLoopWorkletBridgeReportFromBrowser>;
  instrumentEngineReport: ReturnType<typeof readWaveStarterWorkletInstrumentEngineSkeletonReportFromBrowser>;
  processorOwnershipReport: ReturnType<typeof readWaveStarterWorkletProcessorRuntimeOwnershipReportFromBrowser>;
  pilotReport: ReturnType<typeof getWaveStarterWorkletPilotSnapshot>;
  inferredHoldPath:
    | "worklet-processor-owned-hold"
    | "worklet-instrument-engine-submission"
    | "gesture-loop-bridge-with-legacy-fallback"
    | "gesture-loop-bridge-worklet-only"
    | "legacy-or-direct-hold-reference"
    | "hold-special-path-disabled"
    | "not-yet-observed";
  detail: string;
};

const n = (value: unknown, fallback = 0) =>
  Number.isFinite(value as number) ? (value as number) : fallback;

function nowMs() {
  return typeof performance !== "undefined" &&
    typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

function resolveBrowserFamily(
  userAgent: string,
): WaveStarterHoldPathForensicsSnapshot["browserFamily"] {
  const ua = userAgent.toLowerCase();
  if (ua.includes("firefox")) return "firefox";
  if (ua.includes("opr/") || ua.includes("opera")) return "opera";
  if (ua.includes("edg/") || ua.includes("chrome") || ua.includes("chromium"))
    return "chromium";
  if (ua.includes("safari")) return "safari";
  return "unknown";
}

function summarizeGesture(
  gesture: WaveStarterHoldGestureLoop,
  generatedAtMs: number,
): WaveStarterHoldGestureForensicsSummary {
  return {
    lane: gesture.lane,
    keyId: gesture.keyId,
    active: gesture.active,
    targetHz: Number.isFinite(gesture.targetHz ?? NaN)
      ? (gesture.targetHz as number)
      : null,
    segmentsPerBar: n(gesture.segmentsPerBar),
    intervalMs: n(gesture.intervalMs),
    pulseCount: n(gesture.pulseCount),
    repeatUpdateCount: n(gesture.repeatUpdateCount),
    nextPulseInMs: Number.isFinite(gesture.nextPulseAtMs)
      ? Math.max(0, gesture.nextPulseAtMs - generatedAtMs)
      : null,
    articulation: gesture.articulation,
    extendPolicy: gesture.extendPolicy,
    sustainExtendActive: gesture.sustainExtendActive,
    sustainExtendLatched: gesture.sustainExtendLatched,
  };
}

export function summarizeWaveStarterHoldLaneStateForensics(
  state: WaveStarterHoldGestureLoopLaneState,
  generatedAtMs = nowMs(),
): WaveStarterHoldLaneForensicsSummary {
  const gestures = (["wellenstart", "klaviatur"] as const).flatMap((lane) =>
    Object.values(state.gestures[lane]).map((gesture) =>
      summarizeGesture(gesture, generatedAtMs),
    ),
  );
  const activeGestures = gestures.filter((gesture) => gesture.active);
  return {
    immediateHitCount: state.immediateHitCount,
    loopPulseCount: state.loopPulseCount,
    repeatAbsorbedCount: state.repeatAbsorbedCount,
    releaseCount: state.releaseCount,
    skippedCatchupCount: state.skippedCatchupCount,
    patternMutedPulseCount: state.patternMutedPulseCount,
    activeGestureCount: activeGestures.length,
    activeByLane: {
      wellenstart: activeGestures.filter((gesture) => gesture.lane === "wellenstart")
        .length,
      klaviatur: activeGestures.filter((gesture) => gesture.lane === "klaviatur")
        .length,
    },
    gestures,
  };
}

function inferHoldPath(args: {
  phase: WaveStarterHoldPathForensicsPhase;
  specialPathAllowed: boolean;
  bridgeDecision: WaveStarterGestureLoopWorkletBridgeDecision | null;
  instrumentEngineReport: ReturnType<typeof readWaveStarterWorkletInstrumentEngineSkeletonReportFromBrowser>;
  processorOwnershipReport: ReturnType<typeof readWaveStarterWorkletProcessorRuntimeOwnershipReportFromBrowser>;
}): WaveStarterHoldPathForensicsSnapshot["inferredHoldPath"] {
  if (!args.specialPathAllowed) return "hold-special-path-disabled";
  if (!args.bridgeDecision && args.phase !== "segment-pulse")
    return "not-yet-observed";
  if (args.bridgeDecision && !args.bridgeDecision.workletBridge)
    return "legacy-or-direct-hold-reference";
  if (
    (args.processorOwnershipReport?.processorOwnedHoldGestureActiveCount ?? 0) > 0 ||
    (args.processorOwnershipReport?.processorOwnedHoldSegmentPulseCount ?? 0) > 0 ||
    (args.processorOwnershipReport?.processorOwnedHoldSynthVoiceCreatedCount ?? 0) > 0
  ) {
    return "worklet-processor-owned-hold";
  }
  if (args.instrumentEngineReport?.lastSubmission?.sourceIntent === "hold-gesture-loop")
    return "worklet-instrument-engine-submission";
  if (args.bridgeDecision?.workletBridge) {
    return args.bridgeDecision.legacyFallbackPreserved
      ? "gesture-loop-bridge-with-legacy-fallback"
      : "gesture-loop-bridge-worklet-only";
  }
  return "legacy-or-direct-hold-reference";
}

function buildDetail(
  snapshot: Pick<
    WaveStarterHoldPathForensicsSnapshot,
    | "phase"
    | "browserFamily"
    | "inferredHoldPath"
    | "lastFrame"
    | "lastPulse"
    | "lastBridgeDecision"
  >,
) {
  const lane =
    snapshot.lastPulse?.lane ?? snapshot.lastFrame?.lane ?? snapshot.lastBridgeDecision?.lane ??
    "none";
  const ext =
    snapshot.lastPulse?.extendPolicy ??
    snapshot.lastFrame?.extendPolicy ??
    snapshot.lastBridgeDecision?.extendPolicy ??
    "none";
  return `${snapshot.browserFamily} · ${snapshot.phase} · ${snapshot.inferredHoldPath} · lane ${lane} · extend ${ext}`;
}

export function buildWaveStarterHoldPathForensicsSnapshot(args: {
  state: WaveStarterHoldGestureLoopLaneState;
  phase: WaveStarterHoldPathForensicsPhase;
  frame?: WaveStarterHoldGestureLoopFrame | null;
  pulse?: WaveStarterHoldGestureLoopPulse | null;
  bridgeDecision?: WaveStarterGestureLoopWorkletBridgeDecision | null;
}): WaveStarterHoldPathForensicsSnapshot {
  const generatedAtMs = nowMs();
  const userAgent =
    typeof navigator !== "undefined" && typeof navigator.userAgent === "string"
      ? navigator.userAgent
      : "unknown";
  const specialPathIsolation = readWaveStarterSpecialPathIsolationFromBrowser();
  const bridgeReport = readWaveStarterGestureLoopWorkletBridgeReportFromBrowser();
  const instrumentEngineReport =
    readWaveStarterWorkletInstrumentEngineSkeletonReportFromBrowser();
  const processorOwnershipReport =
    readWaveStarterWorkletProcessorRuntimeOwnershipReportFromBrowser();
  const pilotReport = getWaveStarterWorkletPilotSnapshot();
  const lastBridgeDecision = args.bridgeDecision ?? bridgeReport?.lastDecision ?? null;
  const browserFamily = resolveBrowserFamily(userAgent);
  const inferredHoldPath = inferHoldPath({
    phase: args.phase,
    specialPathAllowed: specialPathIsolation.holdGestureLoopWorkletBridge,
    bridgeDecision: lastBridgeDecision,
    instrumentEngineReport,
    processorOwnershipReport,
  });
  const snapshot: WaveStarterHoldPathForensicsSnapshot = {
    version: 1,
    reportKind: "xensonar-wave-starter-hold-path-forensics",
    generatedAtIso: new Date().toISOString(),
    generatedAtMs,
    phase: args.phase,
    browserUserAgent: userAgent,
    browserFamily,
    laneState: summarizeWaveStarterHoldLaneStateForensics(
      args.state,
      generatedAtMs,
    ),
    lastFrame: args.frame ?? null,
    lastPulse: args.pulse ?? null,
    lastBridgeDecision,
    specialPathIsolation,
    bridgeReport,
    instrumentEngineReport,
    processorOwnershipReport,
    pilotReport,
    inferredHoldPath,
    detail: "",
  };
  snapshot.detail = buildDetail(snapshot);
  return snapshot;
}

export function publishWaveStarterHoldPathForensicsSnapshot(args: {
  state: WaveStarterHoldGestureLoopLaneState;
  phase: WaveStarterHoldPathForensicsPhase;
  frame?: WaveStarterHoldGestureLoopFrame | null;
  pulse?: WaveStarterHoldGestureLoopPulse | null;
  bridgeDecision?: WaveStarterGestureLoopWorkletBridgeDecision | null;
}): WaveStarterHoldPathForensicsSnapshot {
  const snapshot = buildWaveStarterHoldPathForensicsSnapshot(args);
  if (typeof window !== "undefined") {
    const target = window as unknown as Record<string, unknown>;
    target[WAVE_STARTER_HOLD_PATH_FORENSICS_GLOBAL] = snapshot;
    target[WAVE_STARTER_HOLD_PATH_FORENSICS_READER_GLOBAL] = () =>
      buildWaveStarterHoldPathForensicsSnapshot({
        state: args.state,
        phase: args.phase,
        frame: args.frame ?? null,
        pulse: args.pulse ?? null,
        bridgeDecision: args.bridgeDecision ?? null,
      });
  }
  return snapshot;
}
