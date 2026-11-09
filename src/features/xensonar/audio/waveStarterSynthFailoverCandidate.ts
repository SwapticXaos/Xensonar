import type { WaveSoundPreset } from "../domain/instrumentData";
import { buildWaveStarterPresetToneSpecs } from "./waveStarterPresetTonePlan";
import { resolveWaveStarterOvertonePlaybackPlan } from "./waveStarterOvertonePlaybackPlan";
import { resolveWaveStarterSwellReinforcementPlan } from "./waveStarterSwellReinforcementPlan";
import type { WaveStarterWorkletPilotSnapshot } from "./waveStarterWorkletPilotBridge";
import type {
  WaveStarterSampleVoiceSpec,
  WaveStarterSynthVoiceSpec,
} from "./waveStarterVoiceSpecFailoverContract";

export type WaveStarterSynthFailoverTonePlan = {
  frequencyHz: number;
  delaySec: number;
  durationSec: number;
  waveform: OscillatorType;
  gain: number;
  resonance: number;
  cutoffHz: number;
  prominence: number;
  source: "preset" | "overtone" | "swell" | "fallback";
};

export type WaveStarterSynthFailoverCandidate = {
  version: 1;
  candidateKind: "wave-starter-synth-failover-candidate";
  voiceSpecId: string;
  sourceIntent: "failover";
  createdAtMs: number;
  deadlineAtMs: number;
  staleAfterMs: number;
  baseFreqHz: number;
  playbackFreqHz: number;
  gain: number;
  runtimeVolume: number;
  isSector: boolean;
  presetId: WaveSoundPreset;
  tonePlans: WaveStarterSynthFailoverTonePlan[];
  tonePlanCount: number;
  candidateGainScale: 1;
  candidateVolumeParity: "voice-spec-gain";
  renderParity: "synth-parameter-candidate";
  sampleBacked: false;
  requiresSampleBuffer: false;
  legacyPathSuppressedBecauseLaneWouldDrop: true;
  mainThreadBodyExciterNotDuplicated: true;
};

export type WaveStarterSynthFailoverDecision =
  | "no-synth-failover-candidate-observed"
  | "synth-failover-candidate-posted"
  | "synth-failover-candidate-worklet-accepted"
  | "synth-failover-candidate-rendered"
  | "sample-failover-blocked-buffer-token-required"
  | "worklet-unavailable-legacy-drop-remains";

export type WaveStarterSynthFailoverCandidateReport = {
  version: 1;
  reportKind: "xensonar-wave-starter-synth-failover-candidate";
  generatedAtIso: string;
  decision: WaveStarterSynthFailoverDecision;
  lastCandidate: WaveStarterSynthFailoverCandidate | null;
  lastBlockedSampleSpec: WaveStarterSampleVoiceSpec | null;
  postedCandidateCount: number;
  blockedSampleCount: number;
  workletAcceptedCount: number;
  workletRejectedCount: number;
  workletRenderFrameCount: number;
  workletRenderFrameDelta: number;
  workletRenderQuantumCount: number;
  workletPeakAbs: number;
  failoverOnlyForDroppedLegacySlots: true;
  preservesLegacyForAdmittedSlots: true;
  sampleFailoverBlockedUntilBufferToken: true;
  forbidsGenericSampleSubstitution: true;
  primaryReplacementForbidden: true;
  candidateGainScale: number;
  tonePlanCount: number;
  detail: string;
};

export const WAVE_STARTER_SYNTH_FAILOVER_CANDIDATE_GLOBAL =
  "__XENSONAR_WAVE_STARTER_SYNTH_FAILOVER_CANDIDATE__";

const MAX_FAILOVER_TONES = 10;
let postedCandidateCount = 0;
let blockedSampleCount = 0;
let lastCandidate: WaveStarterSynthFailoverCandidate | null = null;
let lastBlockedSampleSpec: WaveStarterSampleVoiceSpec | null = null;
let lastReport: WaveStarterSynthFailoverCandidateReport | null = null;

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function sanitizeWaveform(waveform: OscillatorType): OscillatorType {
  if (
    waveform === "sine" ||
    waveform === "square" ||
    waveform === "sawtooth" ||
    waveform === "triangle"
  ) {
    return waveform;
  }
  return "triangle";
}

function sanitizeTonePlan(
  tone: WaveStarterSynthFailoverTonePlan,
): WaveStarterSynthFailoverTonePlan {
  return {
    frequencyHz: clamp(tone.frequencyHz, 10, 24000),
    delaySec: clamp(tone.delaySec, 0, 0.2),
    durationSec: clamp(tone.durationSec, 0.035, 1.2),
    waveform: sanitizeWaveform(tone.waveform),
    gain: clamp(tone.gain, 0, 1.4),
    resonance: clamp(tone.resonance, 0.2, 8),
    cutoffHz: clamp(tone.cutoffHz, 120, 12000),
    prominence: clamp(tone.prominence, 0, 2),
    source: tone.source,
  };
}

export function buildWaveStarterSynthFailoverCandidate(
  spec: WaveStarterSynthVoiceSpec,
): WaveStarterSynthFailoverCandidate {
  const tonePlans: WaveStarterSynthFailoverTonePlan[] = [];

  for (const tone of buildWaveStarterPresetToneSpecs(spec.presetId, {
    isSector: spec.isSector,
  })) {
    tonePlans.push(
      sanitizeTonePlan({
        frequencyHz: spec.playbackFreqHz * tone.freqMul,
        delaySec: tone.delay,
        durationSec: tone.duration,
        waveform: tone.waveform,
        gain: spec.gain * tone.gainMul,
        resonance: tone.resonance,
        cutoffHz: tone.cutoffHz,
        prominence: tone.prominence,
        source: "preset",
      }),
    );
  }

  const overtonePlan = resolveWaveStarterOvertonePlaybackPlan({
    baseFreq: spec.playbackFreqHz,
    baseVolume: spec.gain,
    isSector: spec.isSector,
    enabled: spec.overtonesEnabled,
    overtoneAmounts: spec.overtoneAmounts,
    waveform: spec.overtoneWaveform,
    mode: spec.overtoneMode,
    globalLevel: spec.overtoneGlobalLevel,
  });
  for (const tone of overtonePlan.directTones) {
    tonePlans.push(
      sanitizeTonePlan({
        frequencyHz: tone.toneFreq,
        delaySec: tone.delay,
        durationSec: tone.duration,
        waveform: tone.waveform,
        gain: tone.gain,
        resonance: tone.resonance,
        cutoffHz: tone.cutoffHz,
        prominence: tone.prominence,
        source: "overtone",
      }),
    );
  }

  const swellTone = resolveWaveStarterSwellReinforcementPlan({
    baseFreq: spec.playbackFreqHz,
    runtimeVolume: spec.runtimeVolume,
    isSector: spec.isSector,
    preset: spec.presetId,
    swellBlend: spec.swellBlend,
  });
  if (swellTone) {
    tonePlans.push(
      sanitizeTonePlan({
        frequencyHz: swellTone.toneFreq,
        delaySec: swellTone.delay,
        durationSec: swellTone.duration,
        waveform: swellTone.waveform,
        gain: swellTone.gain,
        resonance: swellTone.resonance,
        cutoffHz: swellTone.cutoffHz,
        prominence: swellTone.prominence,
        source: "swell",
      }),
    );
  }

  if (tonePlans.length === 0) {
    tonePlans.push(
      sanitizeTonePlan({
        frequencyHz: spec.playbackFreqHz,
        delaySec: 0,
        durationSec: spec.durationMs / 1000,
        waveform: "triangle",
        gain: spec.gain,
        resonance: 1,
        cutoffHz: 1800,
        prominence: 1,
        source: "fallback",
      }),
    );
  }

  const boundedTonePlans = tonePlans.slice(0, MAX_FAILOVER_TONES);

  return {
    version: 1,
    candidateKind: "wave-starter-synth-failover-candidate",
    voiceSpecId: spec.voiceId,
    sourceIntent: "failover",
    createdAtMs: spec.createdAtMs,
    deadlineAtMs: spec.deadlineAtMs,
    staleAfterMs: spec.staleAfterMs,
    baseFreqHz: spec.baseFreqHz,
    playbackFreqHz: spec.playbackFreqHz,
    gain: spec.gain,
    runtimeVolume: spec.runtimeVolume,
    isSector: spec.isSector,
    presetId: spec.presetId,
    tonePlans: boundedTonePlans,
    tonePlanCount: boundedTonePlans.length,
    candidateGainScale: 1,
    candidateVolumeParity: "voice-spec-gain",
    renderParity: "synth-parameter-candidate",
    sampleBacked: false,
    requiresSampleBuffer: false,
    legacyPathSuppressedBecauseLaneWouldDrop: true,
    mainThreadBodyExciterNotDuplicated: true,
  };
}

function makeReport(args: {
  decision: WaveStarterSynthFailoverDecision;
  pilotReport?: WaveStarterWorkletPilotSnapshot | null;
  detail: string;
}): WaveStarterSynthFailoverCandidateReport {
  const pilot = args.pilotReport ?? null;
  return {
    version: 1,
    reportKind: "xensonar-wave-starter-synth-failover-candidate",
    generatedAtIso: new Date().toISOString(),
    decision: args.decision,
    lastCandidate,
    lastBlockedSampleSpec,
    postedCandidateCount,
    blockedSampleCount,
    workletAcceptedCount: pilot?.synthFailoverCandidateAcceptedCount ?? 0,
    workletRejectedCount: pilot?.synthFailoverCandidateRejectedCount ?? 0,
    workletRenderFrameCount: pilot?.synthFailoverRenderFrameCount ?? 0,
    workletRenderFrameDelta: pilot?.synthFailoverRenderFrameDelta ?? 0,
    workletRenderQuantumCount: pilot?.synthFailoverRenderQuantumCount ?? 0,
    workletPeakAbs: pilot?.synthFailoverPeakAbs ?? 0,
    failoverOnlyForDroppedLegacySlots: true,
    preservesLegacyForAdmittedSlots: true,
    sampleFailoverBlockedUntilBufferToken: true,
    forbidsGenericSampleSubstitution: true,
    primaryReplacementForbidden: true,
    candidateGainScale: lastCandidate?.candidateGainScale ?? 0,
    tonePlanCount: lastCandidate?.tonePlanCount ?? 0,
    detail: args.detail,
  };
}

function publishReport(
  report: WaveStarterSynthFailoverCandidateReport,
): WaveStarterSynthFailoverCandidateReport {
  lastReport = report;
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>)[
      WAVE_STARTER_SYNTH_FAILOVER_CANDIDATE_GLOBAL
    ] = report;
  }
  return report;
}

export function publishWaveStarterSynthFailoverCandidatePosted(
  candidate: WaveStarterSynthFailoverCandidate,
  pilotReport?: WaveStarterWorkletPilotSnapshot | null,
): WaveStarterSynthFailoverCandidateReport {
  postedCandidateCount += 1;
  lastCandidate = candidate;
  lastBlockedSampleSpec = null;
  return publishReport(
    makeReport({
      decision: "synth-failover-candidate-posted",
      pilotReport,
      detail:
        "Synth-Wellenstarter was not emitted through the legacy lane; a full-gain synth parameter candidate was handed to the Worklet as a failover candidate.",
    }),
  );
}

export function publishWaveStarterSampleFailoverBlocked(
  spec: WaveStarterSampleVoiceSpec,
  pilotReport?: WaveStarterWorkletPilotSnapshot | null,
): WaveStarterSynthFailoverCandidateReport {
  blockedSampleCount += 1;
  lastBlockedSampleSpec = spec;
  return publishReport(
    makeReport({
      decision: "sample-failover-blocked-buffer-token-required",
      pilotReport,
      detail:
        "Sample-Wellenstarter failover is deliberately blocked until a real buffer/token shadow exists; no generic synth substitution is allowed.",
    }),
  );
}

export function buildWaveStarterSynthFailoverCandidateReport(
  pilotReport?: WaveStarterWorkletPilotSnapshot | null,
): WaveStarterSynthFailoverCandidateReport {
  if (!lastCandidate && !lastBlockedSampleSpec) {
    return publishReport(
      makeReport({
        decision: "no-synth-failover-candidate-observed",
        pilotReport,
        detail:
          "No Wellenstarter drop-slot has produced a synth failover candidate yet.",
      }),
    );
  }

  if (lastBlockedSampleSpec) {
    return publishReport(
      makeReport({
        decision: "sample-failover-blocked-buffer-token-required",
        pilotReport,
        detail:
          "Latest failover attempt was a sample Wellenstarter and remains blocked pending buffer/token shadow.",
      }),
    );
  }

  if (pilotReport?.status === "unsupported" || pilotReport?.status === "failed") {
    return publishReport(
      makeReport({
        decision: "worklet-unavailable-legacy-drop-remains",
        pilotReport,
        detail:
          "A synth failover candidate exists, but the Worklet is unavailable or failed; the overload drop remains explicit.",
      }),
    );
  }

  if ((pilotReport?.synthFailoverRenderFrameDelta ?? 0) > 0) {
    return publishReport(
      makeReport({
        decision: "synth-failover-candidate-rendered",
        pilotReport,
        detail:
          "The Worklet rendered frames for the latest synth failover candidate.",
      }),
    );
  }

  if ((pilotReport?.synthFailoverCandidateAcceptedCount ?? 0) > 0) {
    return publishReport(
      makeReport({
        decision: "synth-failover-candidate-worklet-accepted",
        pilotReport,
        detail:
          "The Worklet accepted the synth failover candidate; render-frame proof is still pending or stale.",
      }),
    );
  }

  return publishReport(
    makeReport({
      decision: "synth-failover-candidate-posted",
      pilotReport,
      detail:
        "A synth failover candidate was posted from the dropped legacy slot; Worklet acknowledgement is still pending.",
    }),
  );
}

export function readWaveStarterSynthFailoverCandidateReportFromBrowser(): WaveStarterSynthFailoverCandidateReport | null {
  if (typeof window === "undefined") return lastReport;
  const value = (window as unknown as Record<string, unknown>)[
    WAVE_STARTER_SYNTH_FAILOVER_CANDIDATE_GLOBAL
  ];
  return value && typeof value === "object"
    ? (value as WaveStarterSynthFailoverCandidateReport)
    : lastReport;
}

export function formatWaveStarterSynthFailoverCandidateUiValue(
  report: WaveStarterSynthFailoverCandidateReport | null,
): string {
  if (!report)
    return "no-synth-failover-candidate-observed · Kandidat noch nicht gesehen";
  const worklet = `W ${report.workletAcceptedCount}/${report.workletRejectedCount} · ${report.workletRenderFrameDelta}Δ/${report.workletRenderQuantumCount}Q · peak ${report.workletPeakAbs.toFixed(4)}`;
  const source = `posted ${report.postedCandidateCount} · sample-blocked ${report.blockedSampleCount}`;
  return `${report.decision} · ${source} · tones ${report.tonePlanCount} · gain×${report.candidateGainScale.toFixed(1)} · ${worklet} · nur Drop-Slots`;
}
