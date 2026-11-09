import type { WaveStarterEmitOptions } from "./waveStarterLaneRuntimeBridge";
import type { WaveStarterWorkletPilotSnapshot } from "./waveStarterWorkletPilotBridge";
import type { WaveStarterVoiceSpec } from "./waveStarterVoiceSpecFailoverContract";

export type WaveStarterWorkletInstrumentEngineLane =
  | "wellenstart"
  | "klaviatur"
  | "direct";

export type WaveStarterWorkletInstrumentEngineSubmitMode =
  | "synth-voice-pool-candidate"
  | "sample-voice-pool-candidate"
  | "sample-token-pending-legacy-reference"
  | "pilot-unready-legacy-reference"
  | "legacy-reference";

export type WaveStarterWorkletInstrumentEngineSkeletonSubmission = {
  version: 1;
  engineKind: "wave-starter-worklet-instrument-engine-skeleton";
  generatedAtIso: string;
  voiceSpecId: string;
  voiceKind: WaveStarterVoiceSpec["kind"];
  lane: WaveStarterWorkletInstrumentEngineLane;
  sourceIntent:
    | "hold-gesture-loop"
    | "keyboard-glissando"
    | "direct-wave-starter";
  submitMode: WaveStarterWorkletInstrumentEngineSubmitMode;
  pilotReady: boolean;
  legacyFallbackPreserved: boolean;
  workletFirst: boolean;
  segmentClockOwnedByEngine: boolean;
  gestureQueueOwner: "worklet-instrument-engine-skeleton";
  articulationOwner: "worklet-instrument-engine-skeleton";
  voicePoolOwner: "synth" | "sample" | "pending";
  segmentsPerBar: number | null;
  pulseIndex: number | null;
  extendPolicy: "none" | "apostrophe-safe-extend";
  forceSustainExtend: boolean;
  baseFreqHz: number;
  playbackFreqHz: number;
  gain: number;
  sampleBufferToken: string | null;
  sampleTokenHydrated: boolean;
  reason: string;
};

export type WaveStarterWorkletInstrumentEngineSkeletonReport = {
  version: 1;
  reportKind: "xensonar-wave-starter-worklet-instrument-engine-skeleton";
  generatedAtIso: string;
  lastSubmission: WaveStarterWorkletInstrumentEngineSkeletonSubmission | null;
  lastSubmissionAgeMs: number | null;
  totalSubmissionCount: number;
  holdGestureSubmissionCount: number;
  keyboardGlissandoSubmissionCount: number;
  synthVoicePoolCandidateCount: number;
  sampleVoicePoolCandidateCount: number;
  sampleTokenPendingLegacyReferenceCount: number;
  pilotUnreadyLegacyReferenceCount: number;
  apostropheSafeExtendSubmissionCount: number;
  segmentClockOwnedByEngine: true;
  legacyFallbackPreservedUntilEngineAudible: true;
  synthAndSampleParityTracked: true;
  detail: string;
};

export const WAVE_STARTER_WORKLET_INSTRUMENT_ENGINE_SKELETON_GLOBAL =
  "__XENSONAR_WAVE_STARTER_WORKLET_INSTRUMENT_ENGINE_SKELETON__";

let lastSubmission: WaveStarterWorkletInstrumentEngineSkeletonSubmission | null =
  null;
let lastSubmissionAtMs: number | null = null;
let totalSubmissionCount = 0;
let holdGestureSubmissionCount = 0;
let keyboardGlissandoSubmissionCount = 0;
let synthVoicePoolCandidateCount = 0;
let sampleVoicePoolCandidateCount = 0;
let sampleTokenPendingLegacyReferenceCount = 0;
let pilotUnreadyLegacyReferenceCount = 0;
let apostropheSafeExtendSubmissionCount = 0;

function nowMs() {
  return typeof performance !== "undefined" &&
    typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function isPilotReady(pilotSnapshot: WaveStarterWorkletPilotSnapshot | null) {
  return !!(
    pilotSnapshot &&
    pilotSnapshot.keepAliveConnected &&
    pilotSnapshot.outputConnected &&
    !pilotSnapshot.errorMessage
  );
}

function resolveLane(
  options?: WaveStarterEmitOptions,
): WaveStarterWorkletInstrumentEngineLane {
  if (options?.waveStarterGestureLoopLane === "wellenstart") return "wellenstart";
  if (options?.waveStarterGestureLoopLane === "klaviatur") return "klaviatur";
  if (options?.keyboardGestureSource === "keyboard-direct") return "klaviatur";
  if (options?.keyboardGestureSource === "keyboard-glissando") return "klaviatur";
  return "direct";
}

function resolveSourceIntent(
  options?: WaveStarterEmitOptions,
): WaveStarterWorkletInstrumentEngineSkeletonSubmission["sourceIntent"] {
  if (options?.waveStarterGestureLoopWorkletBridge) return "hold-gesture-loop";
  if (options?.keyboardGlissandoWorkletDirect) return "keyboard-glissando";
  return "direct-wave-starter";
}

function resolveSampleTokenHydrated(args: {
  voiceSpec: WaveStarterVoiceSpec;
  pilotSnapshot: WaveStarterWorkletPilotSnapshot | null;
}) {
  if (args.voiceSpec.kind !== "sample") return false;
  const token = args.voiceSpec.bufferToken || null;
  const pilot = args.pilotSnapshot;
  return !!(
    token &&
    pilot &&
    (pilot.sampleBufferTokenHydratedCount ?? 0) > 0 &&
    (!pilot.sampleBufferLastToken ||
      pilot.sampleBufferLastToken === token ||
      (pilot.sampleBufferTokenHydratedCount ?? 0) > 1)
  );
}

export function buildWaveStarterWorkletInstrumentEngineSkeletonSubmission(args: {
  voiceSpec: WaveStarterVoiceSpec;
  options?: WaveStarterEmitOptions;
  pilotSnapshot: WaveStarterWorkletPilotSnapshot | null;
}): WaveStarterWorkletInstrumentEngineSkeletonSubmission | null {
  const sourceIntent = resolveSourceIntent(args.options);
  if (sourceIntent === "direct-wave-starter") return null;

  const pilotReady = isPilotReady(args.pilotSnapshot);
  const sampleTokenHydrated = resolveSampleTokenHydrated(args);
  const voiceSpec = args.voiceSpec;
  let submitMode: WaveStarterWorkletInstrumentEngineSubmitMode =
    "legacy-reference";
  let reason = "legacy-reference-preserved";

  if (!pilotReady) {
    submitMode = "pilot-unready-legacy-reference";
    reason = "pilot-unready-legacy-reference-preserved";
  } else if (voiceSpec.kind === "synth") {
    submitMode = "synth-voice-pool-candidate";
    reason = "synth-voice-pool-candidate-owned-by-engine-skeleton";
  } else if (sampleTokenHydrated) {
    submitMode = "sample-voice-pool-candidate";
    reason = "sample-voice-pool-candidate-owned-by-engine-skeleton";
  } else {
    submitMode = "sample-token-pending-legacy-reference";
    reason = "sample-token-pending-legacy-reference-preserved";
  }

  const segmentsPerBar = Number.isFinite(
    args.options?.waveStarterGestureLoopSegmentsPerBar ?? NaN,
  )
    ? clamp(args.options?.waveStarterGestureLoopSegmentsPerBar as number, 1, 256)
    : null;
  const pulseIndex = Number.isFinite(
    args.options?.waveStarterGestureLoopPulseIndex ?? NaN,
  )
    ? Math.max(0, Math.floor(args.options?.waveStarterGestureLoopPulseIndex as number))
    : null;
  const extendPolicy =
    args.options?.waveStarterGestureLoopExtendPolicy === "apostrophe-safe-extend"
      ? "apostrophe-safe-extend"
      : "none";

  return {
    version: 1,
    engineKind: "wave-starter-worklet-instrument-engine-skeleton",
    generatedAtIso: new Date().toISOString(),
    voiceSpecId: voiceSpec.voiceId,
    voiceKind: voiceSpec.kind,
    lane: resolveLane(args.options),
    sourceIntent,
    submitMode,
    pilotReady,
    legacyFallbackPreserved:
      args.options?.waveStarterGestureLoopWorkletOnly !== true &&
      args.options?.keyboardGlissandoWorkletOnly !== true,
    workletFirst: true,
    segmentClockOwnedByEngine:
      args.options?.waveStarterGestureLoopWorkletBridge === true,
    gestureQueueOwner: "worklet-instrument-engine-skeleton",
    articulationOwner: "worklet-instrument-engine-skeleton",
    voicePoolOwner:
      submitMode === "synth-voice-pool-candidate"
        ? "synth"
        : submitMode === "sample-voice-pool-candidate"
          ? "sample"
          : "pending",
    segmentsPerBar,
    pulseIndex,
    extendPolicy,
    forceSustainExtend: args.options?.forceSustainExtend === true,
    baseFreqHz: voiceSpec.baseFreqHz,
    playbackFreqHz: voiceSpec.playbackFreqHz,
    gain: voiceSpec.gain,
    sampleBufferToken: voiceSpec.kind === "sample" ? voiceSpec.bufferToken : null,
    sampleTokenHydrated,
    reason,
  };
}

export function publishWaveStarterWorkletInstrumentEngineSkeletonSubmission(
  submission: WaveStarterWorkletInstrumentEngineSkeletonSubmission | null,
): WaveStarterWorkletInstrumentEngineSkeletonReport {
  if (submission) {
    lastSubmission = submission;
    lastSubmissionAtMs = nowMs();
    totalSubmissionCount += 1;
    if (submission.sourceIntent === "hold-gesture-loop")
      holdGestureSubmissionCount += 1;
    if (submission.sourceIntent === "keyboard-glissando")
      keyboardGlissandoSubmissionCount += 1;
    if (submission.submitMode === "synth-voice-pool-candidate")
      synthVoicePoolCandidateCount += 1;
    if (submission.submitMode === "sample-voice-pool-candidate")
      sampleVoicePoolCandidateCount += 1;
    if (submission.submitMode === "sample-token-pending-legacy-reference")
      sampleTokenPendingLegacyReferenceCount += 1;
    if (submission.submitMode === "pilot-unready-legacy-reference")
      pilotUnreadyLegacyReferenceCount += 1;
    if (submission.forceSustainExtend)
      apostropheSafeExtendSubmissionCount += 1;
  }
  return buildWaveStarterWorkletInstrumentEngineSkeletonReport();
}

export function buildWaveStarterWorkletInstrumentEngineSkeletonReport(): WaveStarterWorkletInstrumentEngineSkeletonReport {
  const ageMs =
    lastSubmissionAtMs === null ? null : Math.max(0, nowMs() - lastSubmissionAtMs);
  const report: WaveStarterWorkletInstrumentEngineSkeletonReport = {
    version: 1,
    reportKind: "xensonar-wave-starter-worklet-instrument-engine-skeleton",
    generatedAtIso: new Date().toISOString(),
    lastSubmission,
    lastSubmissionAgeMs: ageMs,
    totalSubmissionCount,
    holdGestureSubmissionCount,
    keyboardGlissandoSubmissionCount,
    synthVoicePoolCandidateCount,
    sampleVoicePoolCandidateCount,
    sampleTokenPendingLegacyReferenceCount,
    pilotUnreadyLegacyReferenceCount,
    apostropheSafeExtendSubmissionCount,
    segmentClockOwnedByEngine: true,
    legacyFallbackPreservedUntilEngineAudible: true,
    synthAndSampleParityTracked: true,
    detail:
      "Hold-/Keyboard-Gesten werden nach VoiceSpec-Aufbau als Worklet-Instrument-Engine-Skeleton-Submissions klassifiziert: Gesture-Queue, Segment-Clock, Artikulation und Voice-Pool-Ownership liegen damit an einem Engine-Körper, während Legacy bis zum hörbaren Worklet-Körper erhalten bleibt.",
  };
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>)[
      WAVE_STARTER_WORKLET_INSTRUMENT_ENGINE_SKELETON_GLOBAL
    ] = report;
  }
  return report;
}

export function readWaveStarterWorkletInstrumentEngineSkeletonReportFromBrowser(): WaveStarterWorkletInstrumentEngineSkeletonReport | null {
  if (typeof window === "undefined") return null;
  const value = (window as unknown as Record<string, unknown>)[
    WAVE_STARTER_WORKLET_INSTRUMENT_ENGINE_SKELETON_GLOBAL
  ];
  return value && typeof value === "object"
    ? (value as WaveStarterWorkletInstrumentEngineSkeletonReport)
    : null;
}

export function formatWaveStarterWorkletInstrumentEngineSkeletonUiValue(
  report: WaveStarterWorkletInstrumentEngineSkeletonReport | null,
): string {
  if (!report?.lastSubmission)
    return "not-observed · Worklet-Instrument-Engine-Skeleton noch nicht berührt";
  const s = report.lastSubmission;
  return `${s.sourceIntent}/${s.lane} · ${s.voiceKind} · ${s.submitMode} · seg ${s.segmentsPerBar ?? "—"} · pulse ${s.pulseIndex ?? "—"} · extend ${report.apostropheSafeExtendSubmissionCount} · legacy ref ${s.legacyFallbackPreserved ? "on" : "off"}`;
}
