import type { WaveStarterSampleBufferTokenShadowReport } from "./waveStarterSampleBufferTokenShadow";
import type { WaveStarterSampleFailoverCandidateReport } from "./waveStarterSampleFailoverCandidate";
import type { WaveStarterWorkletPilotSnapshot } from "./waveStarterWorkletPilotBridge";

export type WaveStarterSampleFailoverLegacyParityDecision =
  | "not-observed"
  | "token-hydrated-no-sample-failover-render-yet"
  | "sample-failover-one-shot-body-parity-observed"
  | "sample-failover-candidate-rejected"
  | "sample-failover-parity-gap-known";

export type WaveStarterSampleFailoverLegacyParityProbeReport = {
  version: 1;
  reportKind: "xensonar-wave-starter-sample-failover-legacy-parity-probe";
  generatedAtIso: string;
  decision: WaveStarterSampleFailoverLegacyParityDecision;
  sampleBodyParity:
    | "not-proven-no-hydrated-token"
    | "hydrated-token-body-available"
    | "body-parity-observed-through-rendered-token";
  timingParity:
    | "not-proven"
    | "candidate-accepted-queued"
    | "worklet-render-frame-observed";
  playbackRateParity: "pilot-supported-with-source-context-samplerate-compensation";
  cropOffsetParity:
    | "pilot-supported-start-offset-and-crop-window"
    | "not-observed-yet";
  loopParity: "not-supported-loop-disabled-in-pilot";
  panParity: "not-supported-yet-legacy-routing-remains-reference";
  filterParity: "not-supported-yet-legacy-routing-remains-reference";
  fxRoutingParity: "not-supported-yet-legacy-routing-remains-reference";
  envelopeParity: "pilot-bounded-attack-release-only";
  primaryReplacementParity: "forbidden-failover-only";
  genericSampleSubstitution: "forbidden";
  synthFallbackForSamples: "forbidden";
  hydratedTokenCount: number;
  candidatePostedCount: number;
  candidateAcceptedCount: number;
  candidateRejectedCount: number;
  renderFrameCount: number;
  renderQuantumCount: number;
  renderPeakAbs: number;
  lastToken: string | null;
  lastRejectReason: string | null;
  oneShotPilotReady: boolean;
  bodyParityObserved: boolean;
  knownParityGaps: readonly [
    "loop",
    "pan",
    "filter",
    "fx-routing",
    "primary-replacement",
  ];
  detail: string;
};

export const WAVE_STARTER_SAMPLE_FAILOVER_LEGACY_PARITY_PROBE_GLOBAL =
  "__XENSONAR_WAVE_STARTER_SAMPLE_FAILOVER_LEGACY_PARITY_PROBE__";

function publishReport(
  report: WaveStarterSampleFailoverLegacyParityProbeReport,
): WaveStarterSampleFailoverLegacyParityProbeReport {
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>)[
      WAVE_STARTER_SAMPLE_FAILOVER_LEGACY_PARITY_PROBE_GLOBAL
    ] = report;
  }
  return report;
}

export function buildWaveStarterSampleFailoverLegacyParityProbeReport(args: {
  pilotReport?: WaveStarterWorkletPilotSnapshot | null;
  sampleFailoverReport?: WaveStarterSampleFailoverCandidateReport | null;
  sampleBufferTokenShadowReport?: WaveStarterSampleBufferTokenShadowReport | null;
}): WaveStarterSampleFailoverLegacyParityProbeReport {
  const pilot = args.pilotReport;
  const candidate = args.sampleFailoverReport;
  const token = args.sampleBufferTokenShadowReport;
  const hydratedTokenCount =
    pilot?.sampleBufferTokenHydratedCount ?? token?.workletHydratedTokenCount ?? 0;
  const candidatePostedCount =
    candidate?.candidatePostedCount ?? pilot?.sampleFailoverCandidatePostedCount ?? 0;
  const candidateAcceptedCount =
    candidate?.candidateAcceptedCount ??
    pilot?.sampleFailoverCandidateAcceptedCount ??
    0;
  const candidateRejectedCount =
    candidate?.candidateRejectedCount ??
    pilot?.sampleFailoverCandidateRejectedCount ??
    0;
  const renderFrameCount =
    candidate?.sampleRenderFrameCount ?? pilot?.sampleFailoverRenderFrameCount ?? 0;
  const renderQuantumCount =
    candidate?.sampleRenderQuantumCount ??
    pilot?.sampleFailoverRenderQuantumCount ??
    0;
  const renderPeakAbs =
    candidate?.sampleRenderPeakAbs ?? pilot?.sampleFailoverPeakAbs ?? 0;
  const lastToken =
    candidate?.lastCandidateToken ??
    pilot?.sampleFailoverLastToken ??
    token?.lastWorkletToken ??
    null;
  const lastRejectReason =
    candidate?.lastRejectReason ?? pilot?.sampleFailoverLastRejectReason ?? null;
  const bodyParityObserved =
    hydratedTokenCount > 0 && renderFrameCount > 0 && renderPeakAbs > 0;
  const oneShotPilotReady =
    pilot?.sampleFailoverPilotRendererEnabled === true ||
    candidate?.sampleRendererPilotEnabled === true;
  const sampleBodyParity: WaveStarterSampleFailoverLegacyParityProbeReport["sampleBodyParity"] =
    bodyParityObserved
      ? "body-parity-observed-through-rendered-token"
      : hydratedTokenCount > 0
        ? "hydrated-token-body-available"
        : "not-proven-no-hydrated-token";
  const timingParity: WaveStarterSampleFailoverLegacyParityProbeReport["timingParity"] =
    renderFrameCount > 0
      ? "worklet-render-frame-observed"
      : candidateAcceptedCount > 0
        ? "candidate-accepted-queued"
        : "not-proven";
  const cropOffsetParity: WaveStarterSampleFailoverLegacyParityProbeReport["cropOffsetParity"] =
    candidatePostedCount > 0 || renderFrameCount > 0
      ? "pilot-supported-start-offset-and-crop-window"
      : "not-observed-yet";
  const decision: WaveStarterSampleFailoverLegacyParityDecision = bodyParityObserved
    ? "sample-failover-one-shot-body-parity-observed"
    : candidateRejectedCount > 0
      ? "sample-failover-candidate-rejected"
      : hydratedTokenCount > 0
        ? "token-hydrated-no-sample-failover-render-yet"
        : candidatePostedCount > 0
          ? "sample-failover-parity-gap-known"
          : "not-observed";

  return publishReport({
    version: 1,
    reportKind: "xensonar-wave-starter-sample-failover-legacy-parity-probe",
    generatedAtIso: new Date().toISOString(),
    decision,
    sampleBodyParity,
    timingParity,
    playbackRateParity:
      "pilot-supported-with-source-context-samplerate-compensation",
    cropOffsetParity,
    loopParity: "not-supported-loop-disabled-in-pilot",
    panParity: "not-supported-yet-legacy-routing-remains-reference",
    filterParity: "not-supported-yet-legacy-routing-remains-reference",
    fxRoutingParity: "not-supported-yet-legacy-routing-remains-reference",
    envelopeParity: "pilot-bounded-attack-release-only",
    primaryReplacementParity: "forbidden-failover-only",
    genericSampleSubstitution: "forbidden",
    synthFallbackForSamples: "forbidden",
    hydratedTokenCount,
    candidatePostedCount,
    candidateAcceptedCount,
    candidateRejectedCount,
    renderFrameCount,
    renderQuantumCount,
    renderPeakAbs,
    lastToken,
    lastRejectReason,
    oneShotPilotReady,
    bodyParityObserved,
    knownParityGaps: [
      "loop",
      "pan",
      "filter",
      "fx-routing",
      "primary-replacement",
    ],
    detail: bodyParityObserved
      ? "Sample-Failover parity probe observed a rendered one-shot from a hydrated Worklet buffer token. Body/timing/playback-rate/crop-window are pilot-covered; loop, pan, filter, FX routing, and primary replacement remain explicit gaps."
      : "Sample-Failover parity probe is active. It separates hydrated-token body readiness from rendered body proof and keeps loop, pan, filter, FX routing, and primary replacement marked as gaps.",
  });
}

export function readWaveStarterSampleFailoverLegacyParityProbeReportFromBrowser(): WaveStarterSampleFailoverLegacyParityProbeReport | null {
  if (typeof window === "undefined") return null;
  const value = (window as unknown as Record<string, unknown>)[
    WAVE_STARTER_SAMPLE_FAILOVER_LEGACY_PARITY_PROBE_GLOBAL
  ];
  return value && typeof value === "object"
    ? (value as WaveStarterSampleFailoverLegacyParityProbeReport)
    : null;
}

export function formatWaveStarterSampleFailoverLegacyParityProbeUiValue(
  report: WaveStarterSampleFailoverLegacyParityProbeReport | null,
): string {
  if (!report)
    return "not-observed · Körper/Timing noch nicht bewiesen · Loop/Fx/Pan/Filter weiterhin Lücken";
  const token = report.lastToken
    ? report.lastToken.split(":").slice(-1)[0]
    : "none";
  return `${report.decision} · body ${report.sampleBodyParity} · timing ${report.timingParity} · rendered ${report.renderFrameCount}f/${report.renderQuantumCount}q · peak ${report.renderPeakAbs.toFixed(3)} · token ${token} · gaps loop/pan/filter/fx · primary nein`;
}
