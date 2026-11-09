import type { WaveStarterSynthFailoverCandidateReport } from "./waveStarterSynthFailoverCandidate";
import type { WaveStarterWorkletPilotSnapshot } from "./waveStarterWorkletPilotBridge";

export type WaveStarterSynthFailoverEnvelopeOvertoneRefineDecision =
  | "no-synth-candidate"
  | "candidate-ready-no-render"
  | "render-observed"
  | "worklet-rejected";

export type WaveStarterSynthFailoverEnvelopeOvertoneRefineReport = {
  version: 1;
  reportKind: "xensonar-wave-starter-synth-failover-envelope-overtone-refine";
  generatedAtIso: string;
  decision: WaveStarterSynthFailoverEnvelopeOvertoneRefineDecision;
  candidateObserved: boolean;
  tonePlanCount: number;
  presetToneCount: number;
  overtoneToneCount: number;
  swellToneCount: number;
  fallbackToneCount: number;
  renderedFrameCount: number;
  renderedQuantumCount: number;
  peakAbs: number;
  sourceAwareEnvelopeEnabled: true;
  prominenceAwareGainEnabled: true;
  overtoneGainBounded: true;
  mainThreadBodyExciterNotDuplicated: true;
  preservesLegacyPrimaryPath: true;
  detail: string;
};

export const WAVE_STARTER_SYNTH_FAILOVER_ENVELOPE_OVERTONE_REFINE_GLOBAL =
  "__XENSONAR_WAVE_STARTER_SYNTH_FAILOVER_ENVELOPE_OVERTONE_REFINE__";

function n(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function publish(report: WaveStarterSynthFailoverEnvelopeOvertoneRefineReport): WaveStarterSynthFailoverEnvelopeOvertoneRefineReport {
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>)[WAVE_STARTER_SYNTH_FAILOVER_ENVELOPE_OVERTONE_REFINE_GLOBAL] = report;
  }
  return report;
}

export function buildWaveStarterSynthFailoverEnvelopeOvertoneRefineReport(args: {
  synthFailoverReport: WaveStarterSynthFailoverCandidateReport | null;
  pilotReport: WaveStarterWorkletPilotSnapshot | null;
}): WaveStarterSynthFailoverEnvelopeOvertoneRefineReport {
  const candidate = args.synthFailoverReport?.lastCandidate ?? null;
  const tonePlans = candidate?.tonePlans ?? [];
  const rejected = n(args.pilotReport?.synthFailoverCandidateRejectedCount) > 0 || args.synthFailoverReport?.decision === "worklet-unavailable-legacy-drop-remains";
  const renderedFrameCount = n(args.pilotReport?.synthFailoverRenderFrameCount) || n(args.synthFailoverReport?.workletRenderFrameCount);
  const decision: WaveStarterSynthFailoverEnvelopeOvertoneRefineDecision = rejected
    ? "worklet-rejected"
    : !candidate
      ? "no-synth-candidate"
      : renderedFrameCount > 0
        ? "render-observed"
        : "candidate-ready-no-render";
  const countSource = (source: string) => tonePlans.filter((tone) => tone.source === source).length;
  return publish({
    version: 1,
    reportKind: "xensonar-wave-starter-synth-failover-envelope-overtone-refine",
    generatedAtIso: new Date().toISOString(),
    decision,
    candidateObserved: candidate !== null,
    tonePlanCount: tonePlans.length,
    presetToneCount: countSource("preset"),
    overtoneToneCount: countSource("overtone"),
    swellToneCount: countSource("swell"),
    fallbackToneCount: countSource("fallback"),
    renderedFrameCount,
    renderedQuantumCount: n(args.pilotReport?.synthFailoverRenderQuantumCount) || n(args.synthFailoverReport?.workletRenderQuantumCount),
    peakAbs: n(args.pilotReport?.synthFailoverPeakAbs) || n(args.synthFailoverReport?.workletPeakAbs),
    sourceAwareEnvelopeEnabled: true,
    prominenceAwareGainEnabled: true,
    overtoneGainBounded: true,
    mainThreadBodyExciterNotDuplicated: true,
    preservesLegacyPrimaryPath: true,
    detail:
      "Synth failover voices now derive their attack/release and bounded gain from tone source and prominence: preset, overtone, swell and fallback tones remain separate Worklet voices while Legacy admitted Wellenstarter voices stay primary.",
  });
}

export function formatWaveStarterSynthFailoverEnvelopeOvertoneRefineUiValue(
  report: WaveStarterSynthFailoverEnvelopeOvertoneRefineReport | null,
): string {
  if (!report) return "no-report · Legacy primary";
  return `${report.decision} · tones P/O/S/F ${report.presetToneCount}/${report.overtoneToneCount}/${report.swellToneCount}/${report.fallbackToneCount} · frames ${report.renderedFrameCount} · peak ${report.peakAbs.toFixed(3)} · env-src`;
}
