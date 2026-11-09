import type { WaveStarterFailoverDecisionGateReport } from "./waveStarterFailoverDecisionGate";
import type { WaveStarterFailoverEventLedgerReport } from "./waveStarterFailoverEventLedger";
import type { WaveStarterFailoverStressProbeReport } from "./waveStarterFailoverStressProbe";

export type WaveStarterFailoverLateWindowCandidateId = "strict-24ms" | "balanced-48ms" | "current-gate" | "loose-96ms";

export type WaveStarterFailoverLateWindowCandidate = {
  id: WaveStarterFailoverLateWindowCandidateId;
  maxLateMs: number;
  wouldAcceptLastObservedAge: boolean | null;
  wouldDropLastObservedAge: boolean | null;
  relativeToActiveGate: "stricter" | "same" | "looser";
};

export type WaveStarterFailoverLateWindowTuningProbeReport = {
  version: 1;
  reportKind: "xensonar-wave-starter-failover-late-window-tuning-probe";
  generatedAtIso: string;
  activeGateMaxLateMs: number | null;
  lastObservedAgeMs: number | null;
  dropTooLateTotal: number;
  explicitDropTotal: number;
  failoverGateTotal: number;
  ledgerEntryCount: number;
  candidates: WaveStarterFailoverLateWindowCandidate[];
  suggestedWindowId: WaveStarterFailoverLateWindowCandidateId | "hold-current";
  comparesOnly: true;
  doesNotChangeRuntimePolicy: true;
  doesNotChangeGateRuntime: true;
  forbidsLateRhythmicReplay: true;
  legacyPrimaryPreserved: true;
  detail: string;
};

export const WAVE_STARTER_FAILOVER_LATE_WINDOW_TUNING_PROBE_GLOBAL =
  "__XENSONAR_WAVE_STARTER_FAILOVER_LATE_WINDOW_TUNING_PROBE__";

function nn(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function publish(
  report: WaveStarterFailoverLateWindowTuningProbeReport,
): WaveStarterFailoverLateWindowTuningProbeReport {
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>)[WAVE_STARTER_FAILOVER_LATE_WINDOW_TUNING_PROBE_GLOBAL] = report;
  }
  return report;
}

export type WaveStarterFailoverLateWindowTuningProbeInput = {
  decisionGateReport: WaveStarterFailoverDecisionGateReport | null;
  stressProbeReport: WaveStarterFailoverStressProbeReport | null;
  eventLedgerReport: WaveStarterFailoverEventLedgerReport | null;
};

export function buildWaveStarterFailoverLateWindowTuningProbeReport(
  input: WaveStarterFailoverLateWindowTuningProbeInput,
): WaveStarterFailoverLateWindowTuningProbeReport {
  const gate = input.decisionGateReport;
  const stress = input.stressProbeReport;
  const ledger = input.eventLedgerReport;
  const activeGateMaxLateMs = finiteOrNull(gate?.maxLateMs);
  const lastObservedAgeMs = finiteOrNull(gate?.ageMs ?? ledger?.lastEntry?.ageMs ?? null);
  const dropTooLateTotal = nn(stress?.dropTooLate ?? gate?.counters.dropTooLate);
  const explicitDropTotal = nn(stress?.dropTotal) ||
    nn(gate?.counters.dropTooLate) +
      nn(gate?.counters.dropTokenMissing) +
      nn(gate?.counters.dropTokenNotHydrated) +
      nn(gate?.counters.dropWorkletNotReady) +
      nn(gate?.counters.dropInvalidKind);
  const failoverGateTotal = nn(stress?.synthFailoverGateTotal ?? gate?.counters.synthFailover) +
    nn(stress?.sampleFailoverGateTotal ?? gate?.counters.sampleFailover);
  const current = activeGateMaxLateMs ?? 72;
  const specs: Array<[WaveStarterFailoverLateWindowCandidateId, number]> = [
    ["strict-24ms", 24],
    ["balanced-48ms", 48],
    ["current-gate", current],
    ["loose-96ms", 96],
  ];
  const candidates: WaveStarterFailoverLateWindowCandidate[] = specs.map(([id, maxLateMs]) => ({
    id,
    maxLateMs,
    wouldAcceptLastObservedAge: lastObservedAgeMs === null ? null : lastObservedAgeMs <= maxLateMs,
    wouldDropLastObservedAge: lastObservedAgeMs === null ? null : lastObservedAgeMs > maxLateMs,
    relativeToActiveGate: maxLateMs < current ? "stricter" : maxLateMs > current ? "looser" : "same",
  }));

  let suggestedWindowId: WaveStarterFailoverLateWindowTuningProbeReport["suggestedWindowId"] = "hold-current";
  if (dropTooLateTotal > 0 && failoverGateTotal === 0 && activeGateMaxLateMs !== null && activeGateMaxLateMs < 96) {
    suggestedWindowId = "loose-96ms";
  } else if (dropTooLateTotal === 0 && failoverGateTotal > 0 && current > 48) {
    suggestedWindowId = "balanced-48ms";
  } else if (explicitDropTotal > failoverGateTotal * 2 && dropTooLateTotal > 0) {
    suggestedWindowId = "current-gate";
  }

  const detail = (() => {
    if (!gate && !stress && !ledger) {
      return "Late-window probe has no gate/stress/ledger data yet; it is a shadow comparison and does not change Wellenstarter behavior.";
    }
    if (dropTooLateTotal > 0 && failoverGateTotal === 0) {
      return "Late-window probe sees late drops before rendered failover decisions; compare strict/balanced/loose windows before changing the runtime gate.";
    }
    if (failoverGateTotal > 0) {
      return "Late-window probe can compare whether current accepted failover pressure would also survive stricter windows; no runtime gate is changed.";
    }
    return "Late-window probe is armed; keep current gate until stress/ledger data makes a narrower or looser window defensible.";
  })();

  return publish({
    version: 1,
    reportKind: "xensonar-wave-starter-failover-late-window-tuning-probe",
    generatedAtIso: new Date().toISOString(),
    activeGateMaxLateMs,
    lastObservedAgeMs,
    dropTooLateTotal,
    explicitDropTotal,
    failoverGateTotal,
    ledgerEntryCount: nn(ledger?.entryCount),
    candidates,
    suggestedWindowId,
    comparesOnly: true,
    doesNotChangeRuntimePolicy: true,
    doesNotChangeGateRuntime: true,
    forbidsLateRhythmicReplay: true,
    legacyPrimaryPreserved: true,
    detail,
  });
}

export function formatWaveStarterFailoverLateWindowTuningProbeUiValue(
  report: WaveStarterFailoverLateWindowTuningProbeReport | null,
): string {
  if (!report) return "not-observed · Gate unverändert";
  const age = report.lastObservedAgeMs === null ? "—" : `${Math.round(report.lastObservedAgeMs)}ms`;
  const windows = report.candidates
    .map((candidate) => `${candidate.id}:${candidate.maxLateMs}${candidate.wouldAcceptLastObservedAge === null ? "?" : candidate.wouldAcceptLastObservedAge ? "✓" : "×"}`)
    .join(" ");
  return `age ${age} · late/drop ${report.dropTooLateTotal}/${report.explicitDropTotal} · fail ${report.failoverGateTotal} · ${windows} · next ${report.suggestedWindowId} · shadow only`;
}
