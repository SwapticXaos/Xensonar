import type { WaveStarterSampleFailoverCandidateReport } from "./waveStarterSampleFailoverCandidate";
import type { WaveStarterSampleFailoverLegacyParityProbeReport } from "./waveStarterSampleFailoverLegacyParityProbe";

export type WaveStarterSampleFailoverOffsetCropRefineDecision =
  | "no-sample-candidate"
  | "offset-crop-ready-no-render"
  | "offset-crop-render-observed"
  | "offset-crop-blocked-by-missing-token";

export type WaveStarterSampleFailoverOffsetCropRefineReport = {
  version: 1;
  reportKind: "xensonar-wave-starter-sample-failover-offset-crop-refine";
  generatedAtIso: string;
  decision: WaveStarterSampleFailoverOffsetCropRefineDecision;
  candidateObserved: boolean;
  renderedFrameCount: number;
  renderPeakAbs: number;
  startOffsetSec: number | null;
  cropStartSec: number | null;
  cropEndSec: number | null;
  usesCropStartPlusOffset: true;
  clampsToCropWindow: true;
  oneShotOnly: true;
  loopStillDisabled: true;
  noPanFilterFxParityClaim: true;
  preservesLegacyPrimaryPath: true;
  detail: string;
};

export const WAVE_STARTER_SAMPLE_FAILOVER_OFFSET_CROP_REFINE_GLOBAL =
  "__XENSONAR_WAVE_STARTER_SAMPLE_FAILOVER_OFFSET_CROP_REFINE__";

function n(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function publish(report: WaveStarterSampleFailoverOffsetCropRefineReport): WaveStarterSampleFailoverOffsetCropRefineReport {
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>)[WAVE_STARTER_SAMPLE_FAILOVER_OFFSET_CROP_REFINE_GLOBAL] = report;
  }
  return report;
}

export function buildWaveStarterSampleFailoverOffsetCropRefineReport(args: {
  sampleFailoverReport: WaveStarterSampleFailoverCandidateReport | null;
  parityReport: WaveStarterSampleFailoverLegacyParityProbeReport | null;
}): WaveStarterSampleFailoverOffsetCropRefineReport {
  const candidate = args.sampleFailoverReport?.lastCandidate ?? null;
  const renderedFrameCount = n(args.sampleFailoverReport?.sampleRenderFrameCount) || n(args.parityReport?.renderFrameCount);
  const renderPeakAbs = n(args.sampleFailoverReport?.sampleRenderPeakAbs) || n(args.parityReport?.renderPeakAbs);
  const tokenMissing = args.sampleFailoverReport?.decision === "sample-failover-blocked-missing-buffer-token" || args.sampleFailoverReport?.decision === "sample-failover-blocked-until-hydrated-token";
  const decision: WaveStarterSampleFailoverOffsetCropRefineDecision = !candidate
    ? tokenMissing
      ? "offset-crop-blocked-by-missing-token"
      : "no-sample-candidate"
    : renderedFrameCount > 0
      ? "offset-crop-render-observed"
      : "offset-crop-ready-no-render";
  return publish({
    version: 1,
    reportKind: "xensonar-wave-starter-sample-failover-offset-crop-refine",
    generatedAtIso: new Date().toISOString(),
    decision,
    candidateObserved: candidate !== null,
    renderedFrameCount,
    renderPeakAbs,
    startOffsetSec: candidate?.startOffsetSec ?? null,
    cropStartSec: candidate?.cropStartSec ?? null,
    cropEndSec: candidate?.cropEndSec ?? null,
    usesCropStartPlusOffset: true,
    clampsToCropWindow: true,
    oneShotOnly: true,
    loopStillDisabled: true,
    noPanFilterFxParityClaim: true,
    preservesLegacyPrimaryPath: true,
    detail:
      "Sample failover renderer now interprets startOffsetSec inside the crop window, clamps start/end to the hydrated buffer, and keeps the one-shot/no-loop pilot contract. This refines sample body parity without enabling primary replacement or FX parity claims.",
  });
}

export function formatWaveStarterSampleFailoverOffsetCropRefineUiValue(
  report: WaveStarterSampleFailoverOffsetCropRefineReport | null,
): string {
  if (!report) return "no-report · one-shot · Legacy primary";
  const offset = report.startOffsetSec === null ? "—" : report.startOffsetSec.toFixed(3);
  const cropStart = report.cropStartSec === null ? "—" : report.cropStartSec.toFixed(3);
  const cropEnd = report.cropEndSec === null ? "—" : report.cropEndSec.toFixed(3);
  return `${report.decision} · off ${offset} · crop ${cropStart}-${cropEnd} · frames ${report.renderedFrameCount} · peak ${report.renderPeakAbs.toFixed(3)} · one-shot`;
}
