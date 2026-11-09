import type { WaveStarterVoicePoolLiveReport } from "./waveStarterVoicePoolLiveReport";
import type { WaveStarterWorkletPilotSnapshot } from "./waveStarterWorkletPilotBridge";
import type { WaveStarterSynthFailoverCandidateReport } from "./waveStarterSynthFailoverCandidate";
import type { WaveStarterSampleBufferTokenShadowReport } from "./waveStarterSampleBufferTokenShadow";
import type { WaveStarterSampleFailoverCandidateReport } from "./waveStarterSampleFailoverCandidate";
import type { WaveStarterSampleFailoverLegacyParityProbeReport } from "./waveStarterSampleFailoverLegacyParityProbe";
import type { WaveStarterFailoverDecisionGateReport } from "./waveStarterFailoverDecisionGate";
import type { ParticleVoicePoolLiveReport } from "./particleVoicePoolLiveReport";

export type WaveStarterFailoverStressProbeDecision =
  | "not-observed"
  | "idle-no-stress-signal"
  | "legacy-only-observed"
  | "synth-failover-observed"
  | "sample-failover-observed"
  | "mixed-synth-sample-failover-observed"
  | "drop-heavy-gate-observed"
  | "sample-token-bottleneck-observed"
  | "worklet-not-ready-bottleneck-observed";

export type WaveStarterFailoverStressProbeScenario =
  | "none"
  | "synth-only-pressure"
  | "sample-token-pressure"
  | "mixed-synth-sample-pressure"
  | "full-context-pressure-candidate";

export type WaveStarterFailoverStressProbeReport = {
  version: 1;
  reportKind: "xensonar-wave-starter-failover-stress-probe";
  generatedAtIso: string;
  decision: WaveStarterFailoverStressProbeDecision;
  scenario: WaveStarterFailoverStressProbeScenario;
  legacyPrimaryStillDefault: true;
  measuresDistributionOnly: true;
  doesNotChangeDefaultPolicy: true;
  sampleTokenRequired: true;
  genericSampleSubstitutionForbidden: true;
  lateWindowStrict: boolean;
  workletReady: boolean;
  pressureSignalPresent: boolean;
  pendingSlotCount: number;
  staleDroppedTotal: number;
  overloadSlotTotal: number;
  emittedFromDeferredTotal: number;
  legacyAdmittedTotal: number;
  synthFailoverGateTotal: number;
  sampleFailoverGateTotal: number;
  dropTotal: number;
  dropTooLate: number;
  dropTokenMissing: number;
  dropTokenNotHydrated: number;
  dropWorkletNotReady: number;
  dropInvalidKind: number;
  synthPostedTotal: number;
  synthAcceptedTotal: number;
  synthRenderedFrames: number;
  sampleTokenHydratedTotal: number;
  samplePostedTotal: number;
  sampleAcceptedTotal: number;
  sampleRenderedFrames: number;
  samplePeakAbs: number;
  particleActiveVoiceCount: number;
  rootLikeContextProtected: true;
  suggestedNextProbe: "measure-before-default-policy" | "hydrate-sample-token-before-pressure" | "worklet-readiness-before-pressure" | "stress-window-ready";
  detail: string;
};

export const WAVE_STARTER_FAILOVER_STRESS_PROBE_GLOBAL =
  "__XENSONAR_WAVE_STARTER_FAILOVER_STRESS_PROBE__";

function nn(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function publish(report: WaveStarterFailoverStressProbeReport): WaveStarterFailoverStressProbeReport {
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>)[WAVE_STARTER_FAILOVER_STRESS_PROBE_GLOBAL] = report;
  }
  return report;
}

export type WaveStarterFailoverStressProbeInput = {
  waveStarterLiveReport: WaveStarterVoicePoolLiveReport | null;
  workletReport: WaveStarterWorkletPilotSnapshot | null;
  synthFailoverReport: WaveStarterSynthFailoverCandidateReport | null;
  sampleBufferTokenShadowReport: WaveStarterSampleBufferTokenShadowReport | null;
  sampleFailoverReport: WaveStarterSampleFailoverCandidateReport | null;
  sampleParityReport: WaveStarterSampleFailoverLegacyParityProbeReport | null;
  decisionGateReport: WaveStarterFailoverDecisionGateReport | null;
  particleVoicePoolReport?: ParticleVoicePoolLiveReport | null;
};

export function buildWaveStarterFailoverStressProbeReport(
  input: WaveStarterFailoverStressProbeInput,
): WaveStarterFailoverStressProbeReport {
  const live = input.waveStarterLiveReport;
  const worklet = input.workletReport;
  const gate = input.decisionGateReport;
  const synth = input.synthFailoverReport;
  const sample = input.sampleFailoverReport;
  const token = input.sampleBufferTokenShadowReport;
  const parity = input.sampleParityReport;
  const particle = input.particleVoicePoolReport ?? null;

  const legacyAdmittedTotal = nn(gate?.counters.legacyAdmitted);
  const synthFailoverGateTotal = nn(gate?.counters.synthFailover);
  const sampleFailoverGateTotal = nn(gate?.counters.sampleFailover);
  const dropTooLate = nn(gate?.counters.dropTooLate);
  const dropTokenMissing = nn(gate?.counters.dropTokenMissing);
  const dropTokenNotHydrated = nn(gate?.counters.dropTokenNotHydrated);
  const dropWorkletNotReady = nn(gate?.counters.dropWorkletNotReady);
  const dropInvalidKind = nn(gate?.counters.dropInvalidKind);
  const dropTotal = dropTooLate + dropTokenMissing + dropTokenNotHydrated + dropWorkletNotReady + dropInvalidKind;
  const staleDroppedTotal = nn(live?.counters.staleDroppedTotal);
  const overloadSlotTotal = nn(live?.counters.overloadSlotTotal);
  const emittedFromDeferredTotal = nn(live?.counters.emittedFromDeferredTotal);
  const pendingSlotCount = nn(live?.pendingSlotCount);
  const pressureSignalPresent = staleDroppedTotal > 0 || overloadSlotTotal > 0 || pendingSlotCount > 0 || emittedFromDeferredTotal > 0 || dropTotal > 0;
  const workletReady = !!worklet && worklet.keepAliveConnected && worklet.outputConnected && !worklet.errorMessage;
  const synthPostedTotal = nn(worklet?.synthFailoverCandidatePostedCount) || nn(synth?.postedCandidateCount);
  const synthAcceptedTotal = nn(worklet?.synthFailoverCandidateAcceptedCount) || nn(synth?.workletAcceptedCount);
  const synthRenderedFrames = nn(worklet?.synthFailoverRenderFrameCount) || nn(synth?.workletRenderFrameCount);
  const sampleTokenHydratedTotal = nn(worklet?.sampleBufferTokenHydratedCount) || nn(token?.workletHydratedTokenCount);
  const samplePostedTotal = nn(worklet?.sampleFailoverCandidatePostedCount) || nn(sample?.candidatePostedCount);
  const sampleAcceptedTotal = nn(worklet?.sampleFailoverCandidateAcceptedCount) || nn(sample?.candidateAcceptedCount);
  const sampleRenderedFrames = nn(worklet?.sampleFailoverRenderFrameCount) || nn(parity?.renderFrameCount);
  const samplePeakAbs = nn(worklet?.sampleFailoverPeakAbs) || nn(parity?.renderPeakAbs);
  const particleActiveVoiceCount = nn(particle?.counters.admittedTotal) + nn(particle?.counters.thinnedTotal) + nn(particle?.counters.deferredTotal);

  let scenario: WaveStarterFailoverStressProbeScenario = "none";
  if (synthFailoverGateTotal > 0 && sampleFailoverGateTotal > 0) {
    scenario = particleActiveVoiceCount > 0 ? "full-context-pressure-candidate" : "mixed-synth-sample-pressure";
  } else if (samplePostedTotal > 0 || sampleAcceptedTotal > 0 || sampleRenderedFrames > 0 || dropTokenMissing > 0 || dropTokenNotHydrated > 0) {
    scenario = "sample-token-pressure";
  } else if (synthPostedTotal > 0 || synthAcceptedTotal > 0 || synthRenderedFrames > 0 || synthFailoverGateTotal > 0) {
    scenario = "synth-only-pressure";
  }

  let decision: WaveStarterFailoverStressProbeDecision = "not-observed";
  if (!gate && !worklet && !live) decision = "not-observed";
  else if (!pressureSignalPresent) decision = legacyAdmittedTotal > 0 ? "legacy-only-observed" : "idle-no-stress-signal";
  else if (!workletReady && dropWorkletNotReady > 0) decision = "worklet-not-ready-bottleneck-observed";
  else if (dropTokenMissing + dropTokenNotHydrated > 0 && sampleFailoverGateTotal === 0) decision = "sample-token-bottleneck-observed";
  else if (dropTotal > synthFailoverGateTotal + sampleFailoverGateTotal && dropTotal > 0) decision = "drop-heavy-gate-observed";
  else if (synthFailoverGateTotal > 0 && sampleFailoverGateTotal > 0) decision = "mixed-synth-sample-failover-observed";
  else if (sampleFailoverGateTotal > 0 || sampleRenderedFrames > 0) decision = "sample-failover-observed";
  else if (synthFailoverGateTotal > 0 || synthRenderedFrames > 0) decision = "synth-failover-observed";
  else decision = "legacy-only-observed";

  const suggestedNextProbe: WaveStarterFailoverStressProbeReport["suggestedNextProbe"] =
    decision === "worklet-not-ready-bottleneck-observed"
      ? "worklet-readiness-before-pressure"
      : decision === "sample-token-bottleneck-observed"
        ? "hydrate-sample-token-before-pressure"
        : decision === "not-observed" || decision === "idle-no-stress-signal"
          ? "stress-window-ready"
          : "measure-before-default-policy";

  const detail = (() => {
    if (decision === "sample-token-bottleneck-observed") {
      return "Stress probe observed sample failover pressure before a hydrated Worklet token was available; this confirms the token shadow is the bottleneck to solve before any sample default policy.";
    }
    if (decision === "worklet-not-ready-bottleneck-observed") {
      return "Stress probe observed failover pressure while the Worklet pilot was not ready; readiness must be stabilized before interpreting pressure distribution.";
    }
    if (decision === "drop-heavy-gate-observed") {
      return "Stress probe observed more explicit gate drops than rendered failovers; this is a measurement signal, not yet a default-policy failure.";
    }
    if (decision === "mixed-synth-sample-failover-observed") {
      return "Stress probe observed both Synth and Sample failover decisions under pressure; the next step should compare rendered frames and late/drop balance before changing defaults.";
    }
    if (decision === "sample-failover-observed") {
      return "Stress probe observed Sample failover distribution; Sample remains token-bound, one-shot pilot only, and not a primary Legacy replacement.";
    }
    if (decision === "synth-failover-observed") {
      return "Stress probe observed Synth failover distribution; Sample pressure has not yet been demonstrated in the same window.";
    }
    return "Stress probe is armed. It measures Legacy/Synth/Sample/Drop distribution without changing the current Wellenstarter policy.";
  })();

  return publish({
    version: 1,
    reportKind: "xensonar-wave-starter-failover-stress-probe",
    generatedAtIso: new Date().toISOString(),
    decision,
    scenario,
    legacyPrimaryStillDefault: true,
    measuresDistributionOnly: true,
    doesNotChangeDefaultPolicy: true,
    sampleTokenRequired: true,
    genericSampleSubstitutionForbidden: true,
    lateWindowStrict: gate?.lateWindowStrict ?? true,
    workletReady,
    pressureSignalPresent,
    pendingSlotCount,
    staleDroppedTotal,
    overloadSlotTotal,
    emittedFromDeferredTotal,
    legacyAdmittedTotal,
    synthFailoverGateTotal,
    sampleFailoverGateTotal,
    dropTotal,
    dropTooLate,
    dropTokenMissing,
    dropTokenNotHydrated,
    dropWorkletNotReady,
    dropInvalidKind,
    synthPostedTotal,
    synthAcceptedTotal,
    synthRenderedFrames,
    sampleTokenHydratedTotal,
    samplePostedTotal,
    sampleAcceptedTotal,
    sampleRenderedFrames,
    samplePeakAbs,
    particleActiveVoiceCount,
    rootLikeContextProtected: true,
    suggestedNextProbe,
    detail,
  });
}

export function readWaveStarterFailoverStressProbeFromBrowser(): WaveStarterFailoverStressProbeReport | null {
  if (typeof window === "undefined") return null;
  const value = (window as unknown as Record<string, unknown>)[WAVE_STARTER_FAILOVER_STRESS_PROBE_GLOBAL];
  return value && typeof value === "object" ? (value as WaveStarterFailoverStressProbeReport) : null;
}

export function formatWaveStarterFailoverStressProbeUiValue(
  report: WaveStarterFailoverStressProbeReport | null,
): string {
  if (!report) return "not-observed · Messfenster noch leer · keine Default-Policy geändert";
  return `${report.decision} · ${report.scenario} · L/Sy/Sa/D ${report.legacyAdmittedTotal}/${report.synthFailoverGateTotal}/${report.sampleFailoverGateTotal}/${report.dropTotal} · WS stale/over ${report.staleDroppedTotal}/${report.overloadSlotTotal} · rendered Sy/Sa ${report.synthRenderedFrames}/${report.sampleRenderedFrames} · next ${report.suggestedNextProbe}`;
}
