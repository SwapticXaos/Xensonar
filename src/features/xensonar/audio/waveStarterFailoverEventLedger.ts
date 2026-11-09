import type { WaveStarterFailoverDecisionGateReport } from "./waveStarterFailoverDecisionGate";
import type { WaveStarterWorkletPilotSnapshot } from "./waveStarterWorkletPilotBridge";

export type WaveStarterFailoverLedgerKind = "synth" | "sample";
export type WaveStarterFailoverLedgerStage =
  | "gate"
  | "posted"
  | "accepted"
  | "rejected"
  | "render-observed";

export type WaveStarterFailoverLedgerEntry = {
  version: 1;
  entryKind: "xensonar-wave-starter-failover-ledger-entry";
  atMs: number;
  sequence: number | null;
  stage: WaveStarterFailoverLedgerStage;
  failoverKind: WaveStarterFailoverLedgerKind | null;
  voiceSpecId: string | null;
  bufferToken: string | null;
  gateDecision: string | null;
  gateReason: string | null;
  ageMs: number | null;
  workletTimeSec: number | null;
  rejectReason: string | null;
};

export type WaveStarterFailoverEventLedgerReport = {
  version: 1;
  reportKind: "xensonar-wave-starter-failover-event-ledger";
  generatedAtIso: string;
  entryCount: number;
  maxEntries: number;
  lastEntry: WaveStarterFailoverLedgerEntry | null;
  gateDecisionCount: number;
  postedCount: number;
  acceptedCount: number;
  rejectedCount: number;
  renderObservedCount: number;
  synthPostedCount: number;
  samplePostedCount: number;
  synthAcceptedCount: number;
  sampleAcceptedCount: number;
  synthRejectedCount: number;
  sampleRejectedCount: number;
  synthRenderedFrames: number;
  sampleRenderedFrames: number;
  lastGateDecision: string | null;
  lastRejectReason: string | null;
  correlatesGatePostAckRender: true;
  ringBufferOnly: true;
  doesNotChangeRuntimePolicy: true;
  preservesLegacyPrimaryPath: true;
  detail: string;
};

export const WAVE_STARTER_FAILOVER_EVENT_LEDGER_GLOBAL =
  "__XENSONAR_WAVE_STARTER_FAILOVER_EVENT_LEDGER__";

const MAX_LEDGER_ENTRIES = 80;
const entries: WaveStarterFailoverLedgerEntry[] = [];
let renderObservedCount = 0;
let lastSynthRenderFrames = 0;
let lastSampleRenderFrames = 0;

function nowMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function push(entry: Omit<WaveStarterFailoverLedgerEntry, "version" | "entryKind" | "atMs"> & { atMs?: number }) {
  entries.push({
    version: 1,
    entryKind: "xensonar-wave-starter-failover-ledger-entry",
    atMs: entry.atMs ?? nowMs(),
    sequence: entry.sequence,
    stage: entry.stage,
    failoverKind: entry.failoverKind,
    voiceSpecId: entry.voiceSpecId,
    bufferToken: entry.bufferToken,
    gateDecision: entry.gateDecision,
    gateReason: entry.gateReason,
    ageMs: entry.ageMs,
    workletTimeSec: entry.workletTimeSec,
    rejectReason: entry.rejectReason,
  });
  while (entries.length > MAX_LEDGER_ENTRIES) entries.shift();
}

export function recordWaveStarterFailoverGateLedgerEntry(
  gateReport: WaveStarterFailoverDecisionGateReport,
): void {
  push({
    sequence: null,
    stage: "gate",
    failoverKind:
      gateReport.voiceSpecKind === "synth" || gateReport.voiceSpecKind === "sample"
        ? gateReport.voiceSpecKind
        : null,
    voiceSpecId: gateReport.voiceSpecId,
    bufferToken: gateReport.bufferToken,
    gateDecision: gateReport.decision,
    gateReason: gateReport.reason,
    ageMs: gateReport.ageMs,
    workletTimeSec: null,
    rejectReason: gateReport.decision.startsWith("drop-") ? gateReport.reason : null,
  });
}

export function recordWaveStarterFailoverCandidatePostedLedgerEntry(args: {
  failoverKind: WaveStarterFailoverLedgerKind;
  sequence: number;
  voiceSpecId: string | null;
  bufferToken?: string | null;
}): void {
  push({
    sequence: args.sequence,
    stage: "posted",
    failoverKind: args.failoverKind,
    voiceSpecId: args.voiceSpecId,
    bufferToken: args.bufferToken ?? null,
    gateDecision: args.failoverKind === "sample" ? "sample-failover" : "synth-failover",
    gateReason: null,
    ageMs: null,
    workletTimeSec: null,
    rejectReason: null,
  });
}

export function recordWaveStarterFailoverCandidateAckLedgerEntry(args: {
  failoverKind: WaveStarterFailoverLedgerKind;
  sequence: number | null;
  voiceSpecId: string | null;
  bufferToken?: string | null;
  workletTimeSec?: number | null;
}): void {
  push({
    sequence: args.sequence,
    stage: "accepted",
    failoverKind: args.failoverKind,
    voiceSpecId: args.voiceSpecId,
    bufferToken: args.bufferToken ?? null,
    gateDecision: args.failoverKind === "sample" ? "sample-failover" : "synth-failover",
    gateReason: null,
    ageMs: null,
    workletTimeSec: args.workletTimeSec ?? null,
    rejectReason: null,
  });
}

export function recordWaveStarterFailoverCandidateRejectLedgerEntry(args: {
  failoverKind: WaveStarterFailoverLedgerKind;
  sequence: number | null;
  voiceSpecId: string | null;
  bufferToken?: string | null;
  reason: string;
  workletTimeSec?: number | null;
}): void {
  push({
    sequence: args.sequence,
    stage: "rejected",
    failoverKind: args.failoverKind,
    voiceSpecId: args.voiceSpecId,
    bufferToken: args.bufferToken ?? null,
    gateDecision: "rejected-after-post",
    gateReason: null,
    ageMs: null,
    workletTimeSec: args.workletTimeSec ?? null,
    rejectReason: args.reason,
  });
}

function publish(report: WaveStarterFailoverEventLedgerReport): WaveStarterFailoverEventLedgerReport {
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>)[WAVE_STARTER_FAILOVER_EVENT_LEDGER_GLOBAL] = report;
  }
  return report;
}

function n(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function buildWaveStarterFailoverEventLedgerReport(
  pilotReport: WaveStarterWorkletPilotSnapshot | null,
): WaveStarterFailoverEventLedgerReport {
  const synthFrames = n(pilotReport?.synthFailoverRenderFrameCount);
  const sampleFrames = n(pilotReport?.sampleFailoverRenderFrameCount);
  if (synthFrames > lastSynthRenderFrames) {
    renderObservedCount += 1;
    push({
      sequence: null,
      stage: "render-observed",
      failoverKind: "synth",
      voiceSpecId: pilotReport?.synthFailoverLastSpecId ?? null,
      bufferToken: null,
      gateDecision: "synth-failover",
      gateReason: null,
      ageMs: null,
      workletTimeSec: null,
      rejectReason: null,
    });
  }
  if (sampleFrames > lastSampleRenderFrames) {
    renderObservedCount += 1;
    push({
      sequence: null,
      stage: "render-observed",
      failoverKind: "sample",
      voiceSpecId: pilotReport?.sampleFailoverLastSpecId ?? null,
      bufferToken: pilotReport?.sampleFailoverLastToken ?? null,
      gateDecision: "sample-failover",
      gateReason: null,
      ageMs: null,
      workletTimeSec: null,
      rejectReason: null,
    });
  }
  lastSynthRenderFrames = synthFrames;
  lastSampleRenderFrames = sampleFrames;

  const byStage = (stage: WaveStarterFailoverLedgerStage) => entries.filter((entry) => entry.stage === stage);
  const posted = byStage("posted");
  const accepted = byStage("accepted");
  const rejected = byStage("rejected");
  const gate = byStage("gate");
  const lastEntry = entries[entries.length - 1] ?? null;
  const lastRejected = [...entries].reverse().find((entry) => entry.rejectReason);
  const detail = entries.length === 0
    ? "No failover ledger entries have been observed yet; this report is a ring-buffer scaffold and does not change runtime policy."
    : "Failover ledger correlates gate decisions, posted candidates, Worklet acknowledgements/rejections and render observations in a bounded ring buffer; Legacy remains the primary Wellenstarter path.";

  return publish({
    version: 1,
    reportKind: "xensonar-wave-starter-failover-event-ledger",
    generatedAtIso: new Date().toISOString(),
    entryCount: entries.length,
    maxEntries: MAX_LEDGER_ENTRIES,
    lastEntry,
    gateDecisionCount: gate.length,
    postedCount: posted.length,
    acceptedCount: accepted.length,
    rejectedCount: rejected.length,
    renderObservedCount,
    synthPostedCount: posted.filter((entry) => entry.failoverKind === "synth").length,
    samplePostedCount: posted.filter((entry) => entry.failoverKind === "sample").length,
    synthAcceptedCount: accepted.filter((entry) => entry.failoverKind === "synth").length,
    sampleAcceptedCount: accepted.filter((entry) => entry.failoverKind === "sample").length,
    synthRejectedCount: rejected.filter((entry) => entry.failoverKind === "synth").length,
    sampleRejectedCount: rejected.filter((entry) => entry.failoverKind === "sample").length,
    synthRenderedFrames: synthFrames,
    sampleRenderedFrames: sampleFrames,
    lastGateDecision: [...gate].reverse()[0]?.gateDecision ?? null,
    lastRejectReason: lastRejected?.rejectReason ?? null,
    correlatesGatePostAckRender: true,
    ringBufferOnly: true,
    doesNotChangeRuntimePolicy: true,
    preservesLegacyPrimaryPath: true,
    detail,
  });
}

export function formatWaveStarterFailoverEventLedgerUiValue(
  report: WaveStarterFailoverEventLedgerReport | null,
): string {
  if (!report) return "no-ledger · Legacy primary";
  return `${report.entryCount}/${report.maxEntries} · G/P/A/R ${report.gateDecisionCount}/${report.postedCount}/${report.acceptedCount}/${report.rejectedCount} · Sy ${report.synthPostedCount}/${report.synthAcceptedCount}/${report.synthRenderedFrames} · Sa ${report.samplePostedCount}/${report.sampleAcceptedCount}/${report.sampleRenderedFrames} · last ${report.lastGateDecision ?? "—"}${report.lastRejectReason ? ` · reject ${report.lastRejectReason}` : ""}`;
}
