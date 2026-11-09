import type { WaveStarterWorkletPilotSnapshot } from "./waveStarterWorkletPilotBridge";
import type { WaveStarterSampleVoiceSpec } from "./waveStarterVoiceSpecFailoverContract";

export type WaveStarterSampleFailoverCandidate = {
  version: 1;
  candidateKind: "wave-starter-sample-failover-candidate";
  voiceSpecId: string;
  sourceIntent: "failover";
  createdAtMs: number;
  deadlineAtMs: number;
  staleAfterMs: number;
  sampleId: string;
  bufferToken: string;
  baseFreqHz: number;
  playbackFreqHz: number;
  gain: number;
  runtimeVolume: number;
  playbackRate: number | null;
  detuneCents: number | null;
  durationMs: number;
  attackMs: number;
  releaseMs: number;
  startOffsetSec: number;
  cropStartSec: number;
  cropEndSec: number | null;
  loop: false;
  originalLoopRequested: boolean | null;
  isSector: boolean;
  candidateGainScale: 1;
  candidateVolumeParity: "voice-spec-gain-bounded-in-pilot";
  renderParity: "sample-buffer-token-one-shot-pilot";
  sampleBacked: true;
  requiresSampleBuffer: true;
  requiresHydratedBufferToken: true;
  forbidsGenericSampleSubstitution: true;
  synthFallbackForbidden: true;
  renderPilotOneShotEnabled: true;
  loopDisabledInPilot: true;
  renderPilotStillNotPrimaryPath: true;
  legacyPathSuppressedBecauseLaneWouldDrop: true;
};

export type WaveStarterSampleFailoverDecision =
  | "no-sample-failover-candidate-observed"
  | "sample-failover-candidate-posted"
  | "sample-failover-candidate-worklet-accepted-renderer-queued"
  | "sample-failover-candidate-worklet-rendered"
  | "sample-failover-candidate-worklet-rejected"
  | "sample-failover-blocked-missing-buffer-token"
  | "sample-failover-blocked-until-hydrated-token";

export type WaveStarterSampleFailoverCandidateReport = {
  version: 1;
  reportKind: "xensonar-wave-starter-sample-failover-candidate";
  generatedAtIso: string;
  decision: WaveStarterSampleFailoverDecision;
  lastCandidate: WaveStarterSampleFailoverCandidate | null;
  lastBlockedSpec: WaveStarterSampleVoiceSpec | null;
  candidatePostedCount: number;
  candidateAcceptedCount: number;
  candidateRejectedCount: number;
  blockedMissingTokenCount: number;
  blockedUntilHydratedCount: number;
  workletHydratedTokenCount: number;
  lastWorkletToken: string | null;
  lastCandidateToken: string | null;
  lastRejectReason: string | null;
  sampleFailoverCandidateContractReady: boolean;
  sampleRenderingStillDisabled: false;
  sampleRendererPilotEnabled: true;
  sampleRendererOneShotOnly: true;
  sampleRendererLoopDisabled: true;
  sampleRenderFrameCount: number;
  sampleRenderQuantumCount: number;
  sampleRenderPeakAbs: number;
  sampleFailoverEligibleOnlyWhenHydrated: true;
  synthFallbackForbiddenForSamples: true;
  forbidsGenericSampleSubstitution: true;
  failoverOnlyForDroppedLegacySlots: true;
  preservesLegacyForAdmittedSlots: true;
  primaryReplacementForbidden: true;
  detail: string;
};

export const WAVE_STARTER_SAMPLE_FAILOVER_CANDIDATE_GLOBAL =
  "__XENSONAR_WAVE_STARTER_SAMPLE_FAILOVER_CANDIDATE__";

let candidatePostedCount = 0;
let blockedMissingTokenCount = 0;
let blockedUntilHydratedCount = 0;
let lastCandidate: WaveStarterSampleFailoverCandidate | null = null;
let lastBlockedSpec: WaveStarterSampleVoiceSpec | null = null;
let lastReport: WaveStarterSampleFailoverCandidateReport | null = null;

function makeReport(args: {
  decision: WaveStarterSampleFailoverDecision;
  pilotReport?: WaveStarterWorkletPilotSnapshot | null;
  detail: string;
}): WaveStarterSampleFailoverCandidateReport {
  const pilot = args.pilotReport;
  return {
    version: 1,
    reportKind: "xensonar-wave-starter-sample-failover-candidate",
    generatedAtIso: new Date().toISOString(),
    decision: args.decision,
    lastCandidate,
    lastBlockedSpec,
    candidatePostedCount,
    candidateAcceptedCount: pilot?.sampleFailoverCandidateAcceptedCount ?? 0,
    candidateRejectedCount: pilot?.sampleFailoverCandidateRejectedCount ?? 0,
    blockedMissingTokenCount,
    blockedUntilHydratedCount,
    workletHydratedTokenCount: pilot?.sampleBufferTokenHydratedCount ?? 0,
    lastWorkletToken: pilot?.sampleBufferLastToken ?? null,
    lastCandidateToken:
      pilot?.sampleFailoverLastToken ?? lastCandidate?.bufferToken ?? null,
    lastRejectReason: pilot?.sampleFailoverLastRejectReason ?? null,
    sampleFailoverCandidateContractReady: lastCandidate !== null,
    sampleRenderingStillDisabled: false,
    sampleRendererPilotEnabled: true,
    sampleRendererOneShotOnly: true,
    sampleRendererLoopDisabled: true,
    sampleRenderFrameCount: pilot?.sampleFailoverRenderFrameCount ?? 0,
    sampleRenderQuantumCount: pilot?.sampleFailoverRenderQuantumCount ?? 0,
    sampleRenderPeakAbs: pilot?.sampleFailoverPeakAbs ?? 0,
    sampleFailoverEligibleOnlyWhenHydrated: true,
    synthFallbackForbiddenForSamples: true,
    forbidsGenericSampleSubstitution: true,
    failoverOnlyForDroppedLegacySlots: true,
    preservesLegacyForAdmittedSlots: true,
    primaryReplacementForbidden: true,
    detail: args.detail,
  };
}

function publishReport(
  report: WaveStarterSampleFailoverCandidateReport,
): WaveStarterSampleFailoverCandidateReport {
  lastReport = report;
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>)[
      WAVE_STARTER_SAMPLE_FAILOVER_CANDIDATE_GLOBAL
    ] = report;
  }
  return report;
}

export function buildWaveStarterSampleFailoverCandidate(
  spec: WaveStarterSampleVoiceSpec,
): WaveStarterSampleFailoverCandidate {
  return {
    version: 1,
    candidateKind: "wave-starter-sample-failover-candidate",
    voiceSpecId: spec.voiceId,
    sourceIntent: "failover",
    createdAtMs: spec.createdAtMs,
    deadlineAtMs: spec.deadlineAtMs,
    staleAfterMs: spec.staleAfterMs,
    sampleId: spec.sampleId,
    bufferToken: spec.bufferToken,
    baseFreqHz: spec.baseFreqHz,
    playbackFreqHz: spec.playbackFreqHz,
    gain: spec.gain,
    runtimeVolume: spec.runtimeVolume,
    playbackRate: spec.playbackRate,
    detuneCents: spec.detuneCents,
    durationMs: spec.durationMs,
    attackMs: spec.attackMs,
    releaseMs: spec.releaseMs,
    startOffsetSec: spec.startOffsetSec,
    cropStartSec: spec.cropStartSec,
    cropEndSec: spec.cropEndSec,
    loop: false,
    originalLoopRequested: spec.loop,
    isSector: spec.isSector,
    candidateGainScale: 1,
    candidateVolumeParity: "voice-spec-gain-bounded-in-pilot",
    renderParity: "sample-buffer-token-one-shot-pilot",
    sampleBacked: true,
    requiresSampleBuffer: true,
    requiresHydratedBufferToken: true,
    forbidsGenericSampleSubstitution: true,
    synthFallbackForbidden: true,
    renderPilotOneShotEnabled: true,
    loopDisabledInPilot: true,
    renderPilotStillNotPrimaryPath: true,
    legacyPathSuppressedBecauseLaneWouldDrop: true,
  };
}

export function publishWaveStarterSampleFailoverCandidatePosted(
  candidate: WaveStarterSampleFailoverCandidate,
  pilotReport?: WaveStarterWorkletPilotSnapshot | null,
): WaveStarterSampleFailoverCandidateReport {
  candidatePostedCount += 1;
  lastCandidate = candidate;
  return publishReport(
    makeReport({
      decision: "sample-failover-candidate-posted",
      pilotReport,
      detail:
        "Sample-Wellenstarter failover candidate was posted as a hydrated sample-token candidate. The Worklet pilot may render a bounded one-shot only; no loop, no primary replacement, no synth substitution.",
    }),
  );
}

export function publishWaveStarterSampleFailoverBlockedMissingToken(
  spec: WaveStarterSampleVoiceSpec,
  pilotReport?: WaveStarterWorkletPilotSnapshot | null,
): WaveStarterSampleFailoverCandidateReport {
  blockedMissingTokenCount += 1;
  lastBlockedSpec = spec;
  return publishReport(
    makeReport({
      decision: "sample-failover-blocked-missing-buffer-token",
      pilotReport,
      detail:
        "Sample-Wellenstarter failover was blocked because the VoiceSpec did not carry a usable buffer token. Legacy sample playback remains the audible reference.",
    }),
  );
}

export function publishWaveStarterSampleFailoverCandidateBlockedUntilHydrated(
  spec: WaveStarterSampleVoiceSpec,
  pilotReport?: WaveStarterWorkletPilotSnapshot | null,
): WaveStarterSampleFailoverCandidateReport {
  blockedUntilHydratedCount += 1;
  lastBlockedSpec = spec;
  return publishReport(
    makeReport({
      decision: "sample-failover-blocked-until-hydrated-token",
      pilotReport,
      detail:
        "Sample-Wellenstarter failover candidate is blocked until the Worklet has hydrated at least one matching sample buffer token. No generic synth fallback is permitted.",
    }),
  );
}

export function buildWaveStarterSampleFailoverCandidateReport(
  pilotReport?: WaveStarterWorkletPilotSnapshot | null,
): WaveStarterSampleFailoverCandidateReport {
  const rendered = (pilotReport?.sampleFailoverRenderFrameCount ?? 0) > 0;
  const accepted = (pilotReport?.sampleFailoverCandidateAcceptedCount ?? 0) > 0;
  const rejected = (pilotReport?.sampleFailoverCandidateRejectedCount ?? 0) > 0;
  const decision: WaveStarterSampleFailoverDecision = rejected
    ? "sample-failover-candidate-worklet-rejected"
    : rendered
      ? "sample-failover-candidate-worklet-rendered"
      : accepted
        ? "sample-failover-candidate-worklet-accepted-renderer-queued"
        : lastReport?.decision ?? "no-sample-failover-candidate-observed";
  return publishReport(
    makeReport({
      decision,
      pilotReport,
      detail:
        lastReport?.detail ??
        "No Sample-Wellenstarter failover candidate has been observed yet; the one-shot pilot renderer only runs after a hydrated token candidate is accepted.",
    }),
  );
}

export function readWaveStarterSampleFailoverCandidateReportFromBrowser(): WaveStarterSampleFailoverCandidateReport | null {
  if (typeof window === "undefined") return null;
  const value = (window as unknown as Record<string, unknown>)[
    WAVE_STARTER_SAMPLE_FAILOVER_CANDIDATE_GLOBAL
  ];
  return value && typeof value === "object"
    ? (value as WaveStarterSampleFailoverCandidateReport)
    : null;
}

export function formatWaveStarterSampleFailoverCandidateUiValue(
  report: WaveStarterSampleFailoverCandidateReport | null,
): string {
  if (!report) return "not-observed · Sample-Failover-Kandidat noch nicht gesehen · OneShot-Pilot bereit, aber nicht gestartet";
  const token = report.lastCandidateToken
    ? report.lastCandidateToken.split(":").slice(-1)[0]
    : "none";
  return `${report.decision} · posted ${report.candidatePostedCount} · W ${report.candidateAcceptedCount}/${report.candidateRejectedCount} · rendered ${report.sampleRenderFrameCount}f/${report.sampleRenderQuantumCount}q · peak ${report.sampleRenderPeakAbs.toFixed(3)} · hydrated ${report.workletHydratedTokenCount} · token ${token} · OneShot · kein Synth-Fake`;
}
