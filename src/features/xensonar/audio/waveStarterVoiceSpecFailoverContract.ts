import type {
  WaveSoundPreset,
  WaveOvertoneWaveform,
  WaveTimbreGradientPreset,
  WaveVolumeGradientPreset,
} from "../domain/instrumentData";
import type { WaveStarterPlaybackSelection } from "../../soundLibrary/waveStarterSoundAdapter";
import type { WaveStarterOvertoneMode } from "./waveStarterOvertonePlaybackPlan";
import { resolveWaveStarterSampleBufferToken } from "./waveStarterSampleBufferTokenShadow";

export type WaveStarterVoiceSpecKind = "synth" | "sample";
export type WaveStarterVoiceSpecSourceIntent =
  | "direct"
  | "deferred"
  | "microrelease"
  | "failover";
export type WaveStarterVoiceSpecExactnessLevel =
  | "unknown"
  | "structural"
  | "parameter-parity"
  | "render-parity"
  | "sample-contract-only";

export type WaveStarterVoiceSpecBase = {
  version: 1;
  specKind: "wave-starter-voice-spec";
  kind: WaveStarterVoiceSpecKind;
  voiceId: string;
  createdAtMs: number;
  deadlineAtMs: number;
  staleAfterMs: number;
  sourceIntent: WaveStarterVoiceSpecSourceIntent;
  baseFreqHz: number;
  playbackFreqHz: number;
  gain: number;
  runtimeVolume: number;
  isSector: boolean;
  durationMs: number;
  attackMs: number;
  releaseMs: number;
  microGainScale: number | null;
  microVoiceDemandMul: number | null;
  exactnessLevel: WaveStarterVoiceSpecExactnessLevel;
};

export type WaveStarterSynthVoiceSpec = WaveStarterVoiceSpecBase & {
  kind: "synth";
  presetId: WaveSoundPreset;
  waveformStrategy: "harmonic-preset-graph";
  timbreGradientEnabled: boolean;
  timbreGradientX: WaveTimbreGradientPreset;
  volumeGradientEnabled: boolean;
  volumeGradientX: WaveVolumeGradientPreset;
  gradientAmount: number;
  overtonesEnabled: boolean;
  overtoneWaveform: WaveOvertoneWaveform;
  overtoneMode: WaveStarterOvertoneMode;
  overtoneGlobalLevel: number;
  overtoneAmounts: Partial<Record<string, number>>;
  swellBlend: number;
  bodyExciterExpected: boolean;
  workletFailoverParity: "synth-parameter-spec-ready";
};

export type WaveStarterSampleVoiceSpec = WaveStarterVoiceSpecBase & {
  kind: "sample";
  sampleId: string;
  bufferToken: string;
  playbackRate: number | null;
  detuneCents: number | null;
  startOffsetSec: number;
  cropStartSec: number;
  cropEndSec: number | null;
  loop: boolean | null;
  workletFailoverParity: "sample-buffer-transfer-required";
};

export type WaveStarterVoiceSpec =
  | WaveStarterSynthVoiceSpec
  | WaveStarterSampleVoiceSpec;

export type WaveStarterVoiceSpecFailoverDecision =
  | "no-voice-spec-observed"
  | "synth-spec-structural-parity-ready"
  | "sample-spec-contract-ready-buffer-missing"
  | "mixed-synth-sample-contract-observed";

export type WaveStarterVoiceSpecFailoverContractReport = {
  version: 1;
  reportKind: "xensonar-wave-starter-voice-spec-failover-contract";
  generatedAtIso: string;
  decision: WaveStarterVoiceSpecFailoverDecision;
  lastSpec: WaveStarterVoiceSpec | null;
  lastSpecKind: WaveStarterVoiceSpecKind | null;
  observedSynthSpecCount: number;
  observedSampleSpecCount: number;
  legacySpecObserved: boolean;
  workletSpecObserved: boolean;
  workletSpecMirrorAcceptedCount: number;
  specParityReady: boolean;
  workletSynthParityPossible: boolean;
  workletSampleParityBlockedByBufferTransfer: boolean;
  failoverEligible: boolean;
  doubleTriggerPrevented: boolean;
  forbidsGenericSampleSubstitution: true;
  primaryReplacementForbidden: true;
  parallelMixIsProofOnly: true;
  exactnessLevel: WaveStarterVoiceSpecExactnessLevel;
  recommendedNextStep:
    | "synth-failover-candidate"
    | "sample-buffer-token-shadow"
    | "observe-voice-specs";
  detail: string;
};

export const WAVE_STARTER_VOICE_SPEC_FAILOVER_CONTRACT_GLOBAL =
  "__XENSONAR_WAVE_STARTER_VOICE_SPEC_FAILOVER_CONTRACT__";

const DEFAULT_SYNTH_DURATION_MS = 220;
const DEFAULT_SAMPLE_DURATION_MS = 520;
const DEFAULT_ATTACK_MS = 5;
const DEFAULT_SYNTH_RELEASE_MS = 90;
const DEFAULT_SAMPLE_RELEASE_MS = 80;
const DEFAULT_STALE_AFTER_MS = 34;
const DEFAULT_DEADLINE_MS = 18;

let observedSynthSpecCount = 0;
let observedSampleSpecCount = 0;
let lastReport: WaveStarterVoiceSpecFailoverContractReport | null = null;
let lastVoiceSpecSeq = 0;

function nowMs() {
  if (
    typeof performance !== "undefined" &&
    typeof performance.now === "function"
  )
    return performance.now();
  return Date.now();
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function resolveWaveStarterVoiceSpecSourceIntent(options?: {
  fromDeferredSlot?: boolean;
  microOrchestrated?: boolean;
  synthWorkletFailoverCandidate?: boolean;
  sampleWorkletFailoverCandidate?: boolean;
}): WaveStarterVoiceSpecSourceIntent {
  if (options?.synthWorkletFailoverCandidate || options?.sampleWorkletFailoverCandidate) return "failover";
  if (options?.fromDeferredSlot && options.microOrchestrated)
    return "microrelease";
  if (options?.fromDeferredSlot) return "deferred";
  return "direct";
}

export function buildWaveStarterVoiceSpec(args: {
  selection: WaveStarterPlaybackSelection;
  runtimePresetId: string;
  runtimeVolume: number;
  baseFreqHz: number;
  playbackFreqHz: number;
  gain: number;
  isSector: boolean;
  createdAtMs?: number;
  sourceIntent: WaveStarterVoiceSpecSourceIntent;
  microGainScale?: number | null;
  microVoiceDemandMul?: number | null;
  timbreGradientEnabled: boolean;
  timbreGradientX: WaveTimbreGradientPreset;
  volumeGradientEnabled: boolean;
  volumeGradientX: WaveVolumeGradientPreset;
  gradientAmount: number;
  overtonesEnabled: boolean;
  overtoneWaveform: WaveOvertoneWaveform;
  overtoneMode: WaveStarterOvertoneMode;
  overtoneGlobalLevel?: number;
  overtoneAmounts?: Partial<Record<string, number>>;
  swellBlend?: number;
}): WaveStarterVoiceSpec {
  const createdAtMs = args.createdAtMs ?? nowMs();
  const base = {
    version: 1 as const,
    specKind: "wave-starter-voice-spec" as const,
    voiceId: `wave-${Math.round(createdAtMs)}-${(lastVoiceSpecSeq += 1)}`,
    createdAtMs,
    deadlineAtMs: createdAtMs + DEFAULT_DEADLINE_MS,
    staleAfterMs: createdAtMs + DEFAULT_STALE_AFTER_MS,
    sourceIntent: args.sourceIntent,
    baseFreqHz: clamp(args.baseFreqHz, 10, 24000),
    playbackFreqHz: clamp(args.playbackFreqHz, 10, 24000),
    gain: clamp(args.gain, 0, 2),
    runtimeVolume: clamp(args.runtimeVolume, 0, 2),
    isSector: args.isSector,
    microGainScale: args.microGainScale ?? null,
    microVoiceDemandMul: args.microVoiceDemandMul ?? null,
  };

  if (args.selection.kind === "sample") {
    return {
      ...base,
      kind: "sample",
      durationMs: DEFAULT_SAMPLE_DURATION_MS,
      attackMs: DEFAULT_ATTACK_MS,
      releaseMs: DEFAULT_SAMPLE_RELEASE_MS,
      exactnessLevel: "sample-contract-only",
      sampleId: args.selection.sampleId,
      bufferToken: resolveWaveStarterSampleBufferToken(args.selection.sampleId),
      playbackRate: null,
      detuneCents: null,
      startOffsetSec: 0,
      cropStartSec: 0,
      cropEndSec: null,
      loop: null,
      workletFailoverParity: "sample-buffer-transfer-required",
    };
  }

  return {
    ...base,
    kind: "synth",
    durationMs: args.isSector ? 260 : DEFAULT_SYNTH_DURATION_MS,
    attackMs: DEFAULT_ATTACK_MS,
    releaseMs: DEFAULT_SYNTH_RELEASE_MS,
    exactnessLevel: "structural",
    presetId: args.selection.presetId,
    waveformStrategy: "harmonic-preset-graph",
    timbreGradientEnabled: args.timbreGradientEnabled,
    timbreGradientX: args.timbreGradientX,
    volumeGradientEnabled: args.volumeGradientEnabled,
    volumeGradientX: args.volumeGradientX,
    gradientAmount: clamp(args.gradientAmount, 0, 1),
    overtonesEnabled: args.overtonesEnabled,
    overtoneWaveform: args.overtoneWaveform,
    overtoneMode: args.overtoneMode,
    overtoneGlobalLevel: clamp(args.overtoneGlobalLevel ?? 1, 0, 2),
    overtoneAmounts: { ...(args.overtoneAmounts ?? {}) },
    swellBlend: clamp(args.swellBlend ?? 0, 0, 1),
    bodyExciterExpected: true,
    workletFailoverParity: "synth-parameter-spec-ready",
  };
}

export function publishWaveStarterVoiceSpecFailoverContract(args: {
  spec: WaveStarterVoiceSpec;
  workletSpecMirrorAcceptedCount?: number;
}): WaveStarterVoiceSpecFailoverContractReport {
  if (args.spec.kind === "synth") observedSynthSpecCount += 1;
  else observedSampleSpecCount += 1;

  const mixed = observedSynthSpecCount > 0 && observedSampleSpecCount > 0;
  const workletSpecMirrorAcceptedCount =
    args.workletSpecMirrorAcceptedCount ?? 0;
  const workletSpecObserved = workletSpecMirrorAcceptedCount > 0;
  const isSynth = args.spec.kind === "synth";
  const isSample = args.spec.kind === "sample";
  const decision: WaveStarterVoiceSpecFailoverDecision = mixed
    ? "mixed-synth-sample-contract-observed"
    : isSynth
      ? "synth-spec-structural-parity-ready"
      : "sample-spec-contract-ready-buffer-missing";
  const report: WaveStarterVoiceSpecFailoverContractReport = {
    version: 1,
    reportKind: "xensonar-wave-starter-voice-spec-failover-contract",
    generatedAtIso: new Date().toISOString(),
    decision,
    lastSpec: args.spec,
    lastSpecKind: args.spec.kind,
    observedSynthSpecCount,
    observedSampleSpecCount,
    legacySpecObserved: true,
    workletSpecObserved,
    workletSpecMirrorAcceptedCount,
    specParityReady: isSynth,
    workletSynthParityPossible: isSynth,
    workletSampleParityBlockedByBufferTransfer: isSample,
    failoverEligible: false,
    doubleTriggerPrevented: true,
    forbidsGenericSampleSubstitution: true,
    primaryReplacementForbidden: true,
    parallelMixIsProofOnly: true,
    exactnessLevel: args.spec.exactnessLevel,
    recommendedNextStep: isSynth
      ? "synth-failover-candidate"
      : isSample
        ? "sample-buffer-token-shadow"
        : "observe-voice-specs",
    detail: isSynth
      ? "Synth-Wellenstarter has a structural VoiceSpec; next step may build a failover candidate from the same synth spec, still without replacing normal legacy playback."
      : "Sample-Wellenstarter VoiceSpec is observed, but Worklet failover is blocked until a real sample buffer/token transfer exists; no generic synth substitution is allowed.",
  };
  lastReport = report;
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>)[
      WAVE_STARTER_VOICE_SPEC_FAILOVER_CONTRACT_GLOBAL
    ] = report;
  }
  return report;
}

export function readWaveStarterVoiceSpecFailoverContractFromBrowser(): WaveStarterVoiceSpecFailoverContractReport | null {
  if (typeof window === "undefined") return lastReport;
  const value = (window as unknown as Record<string, unknown>)[
    WAVE_STARTER_VOICE_SPEC_FAILOVER_CONTRACT_GLOBAL
  ];
  return value && typeof value === "object"
    ? (value as WaveStarterVoiceSpecFailoverContractReport)
    : lastReport;
}

export function getWaveStarterVoiceSpecFailoverContractReport(): WaveStarterVoiceSpecFailoverContractReport {
  return (
    lastReport ?? {
      version: 1,
      reportKind: "xensonar-wave-starter-voice-spec-failover-contract",
      generatedAtIso: new Date().toISOString(),
      decision: "no-voice-spec-observed",
      lastSpec: null,
      lastSpecKind: null,
      observedSynthSpecCount,
      observedSampleSpecCount,
      legacySpecObserved: false,
      workletSpecObserved: false,
      workletSpecMirrorAcceptedCount: 0,
      specParityReady: false,
      workletSynthParityPossible: false,
      workletSampleParityBlockedByBufferTransfer: false,
      failoverEligible: false,
      doubleTriggerPrevented: true,
      forbidsGenericSampleSubstitution: true,
      primaryReplacementForbidden: true,
      parallelMixIsProofOnly: true,
      exactnessLevel: "unknown",
      recommendedNextStep: "observe-voice-specs",
      detail:
        "No Wellenstarter VoiceSpec has been observed yet; legacy remains the only sound truth.",
    }
  );
}

export function formatWaveStarterVoiceSpecFailoverContractUiValue(
  report: WaveStarterVoiceSpecFailoverContractReport | null,
): string {
  if (!report)
    return "no-voice-spec-observed · Synth/Sample-Vertrag noch nicht beobachtet";
  const counts = `S ${report.observedSynthSpecCount} · Sample ${report.observedSampleSpecCount}`;
  const parity = report.workletSynthParityPossible
    ? "Synth strukturell workletfähig"
    : report.workletSampleParityBlockedByBufferTransfer
      ? "Sample wartet auf Buffer-Token"
      : "Parity offen";
  const mirror = report.workletSpecObserved
    ? `mirror ${report.workletSpecMirrorAcceptedCount}`
    : "mirror offen";
  return `${report.decision} · ${counts} · ${parity} · ${mirror} · kein Generic-Ersatz`;
}
