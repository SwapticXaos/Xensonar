import type { WaveStarterEmitOptions } from "./waveStarterLaneRuntimeBridge";
import type { WaveStarterVoiceSpec } from "./waveStarterVoiceSpecFailoverContract";
import type { WaveStarterWorkletPilotSnapshot } from "./waveStarterWorkletPilotBridge";

export type WaveStarterFailoverGateDecision =
  | "no-failover-decision-observed"
  | "legacy-admitted"
  | "synth-failover"
  | "sample-failover"
  | "drop-too-late"
  | "drop-token-missing"
  | "drop-token-not-hydrated"
  | "drop-worklet-not-ready"
  | "drop-invalid-kind";

export type WaveStarterFailoverGateReason =
  | "normal-legacy-path"
  | "dropped-legacy-slot-synth-worklet-candidate"
  | "dropped-legacy-slot-sample-worklet-candidate"
  | "failover-candidate-arrived-after-late-window"
  | "sample-failover-missing-buffer-token"
  | "sample-failover-token-not-hydrated"
  | "worklet-pilot-not-ready"
  | "sample-cannot-use-synth-failover"
  | "synth-cannot-use-sample-failover"
  | "missing-voice-spec";

export type WaveStarterFailoverDecisionGateReport = {
  version: 1;
  reportKind: "xensonar-wave-starter-failover-decision-gate";
  generatedAtIso: string;
  decision: WaveStarterFailoverGateDecision;
  reason: WaveStarterFailoverGateReason;
  voiceSpecKind: WaveStarterVoiceSpec["kind"] | null;
  voiceSpecId: string | null;
  bufferToken: string | null;
  sampleTokenHydrated: boolean;
  sampleHydratedTokenRequired: true;
  synthFailoverCandidateRequested: boolean;
  sampleFailoverCandidateRequested: boolean;
  failoverOnlyForDroppedLegacySlots: true;
  forbidsGenericSampleSubstitution: true;
  primaryReplacementForbidden: true;
  lateWindowStrict: true;
  ageMs: number | null;
  maxLateMs: number;
  pilotReady: boolean;
  workletAcceptedCount: number;
  sampleHydratedCount: number;
  counters: {
    legacyAdmitted: number;
    synthFailover: number;
    sampleFailover: number;
    dropTooLate: number;
    dropTokenMissing: number;
    dropTokenNotHydrated: number;
    dropWorkletNotReady: number;
    dropInvalidKind: number;
  };
  detail: string;
};

export const WAVE_STARTER_FAILOVER_DECISION_GATE_GLOBAL =
  "__XENSONAR_WAVE_STARTER_FAILOVER_DECISION_GATE__";

const DEFAULT_MAX_LATE_MS = 72;

let lastReport: WaveStarterFailoverDecisionGateReport | null = null;
const counters = {
  legacyAdmitted: 0,
  synthFailover: 0,
  sampleFailover: 0,
  dropTooLate: 0,
  dropTokenMissing: 0,
  dropTokenNotHydrated: 0,
  dropWorkletNotReady: 0,
  dropInvalidKind: 0,
};

function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function bump(decision: WaveStarterFailoverGateDecision) {
  if (decision === "legacy-admitted") counters.legacyAdmitted += 1;
  else if (decision === "synth-failover") counters.synthFailover += 1;
  else if (decision === "sample-failover") counters.sampleFailover += 1;
  else if (decision === "drop-too-late") counters.dropTooLate += 1;
  else if (decision === "drop-token-missing") counters.dropTokenMissing += 1;
  else if (decision === "drop-token-not-hydrated") counters.dropTokenNotHydrated += 1;
  else if (decision === "drop-worklet-not-ready") counters.dropWorkletNotReady += 1;
  else if (decision === "drop-invalid-kind") counters.dropInvalidKind += 1;
}

function nowMsFallback() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") return performance.now();
  return Date.now();
}

export type WaveStarterFailoverDecisionGateInput = {
  voiceSpec: WaveStarterVoiceSpec | null;
  options?: WaveStarterEmitOptions;
  pilotSnapshot?: WaveStarterWorkletPilotSnapshot | null;
  nowMs?: number;
  maxLateMs?: number;
};

export function resolveWaveStarterFailoverDecisionGate(input: WaveStarterFailoverDecisionGateInput): Omit<WaveStarterFailoverDecisionGateReport, "generatedAtIso" | "counters"> {
  const voiceSpec = input.voiceSpec;
  const options = input.options;
  const pilotSnapshot = input.pilotSnapshot ?? null;
  const synthRequested = options?.synthWorkletFailoverCandidate === true;
  const sampleRequested = options?.sampleWorkletFailoverCandidate === true;
  const requested = synthRequested || sampleRequested;
  const nowMs = finiteOrNull(input.nowMs) ?? nowMsFallback();
  const maxLateMs = clamp(input.maxLateMs ?? DEFAULT_MAX_LATE_MS, 40, 120);
  const ageMs = voiceSpec ? Math.max(0, nowMs - voiceSpec.createdAtMs) : null;
  const pilotReady = !!pilotSnapshot && pilotSnapshot.keepAliveConnected && pilotSnapshot.outputConnected && !pilotSnapshot.errorMessage;
  const sampleHydratedCount = pilotSnapshot?.sampleBufferTokenHydratedCount ?? 0;
  const workletAcceptedCount = (pilotSnapshot?.synthFailoverCandidateAcceptedCount ?? 0) + (pilotSnapshot?.sampleFailoverCandidateAcceptedCount ?? 0);
  const token = voiceSpec?.kind === "sample" ? voiceSpec.bufferToken || null : null;
  const sampleTokenHydrated = !!token && sampleHydratedCount > 0 && (!pilotSnapshot?.sampleBufferLastToken || pilotSnapshot.sampleBufferLastToken === token || sampleHydratedCount > 1);

  if (!voiceSpec) {
    return {
      version: 1,
      reportKind: "xensonar-wave-starter-failover-decision-gate",
      decision: "drop-invalid-kind",
      reason: "missing-voice-spec",
      voiceSpecKind: null,
      voiceSpecId: null,
      bufferToken: null,
      sampleTokenHydrated: false,
      sampleHydratedTokenRequired: true,
      synthFailoverCandidateRequested: synthRequested,
      sampleFailoverCandidateRequested: sampleRequested,
      failoverOnlyForDroppedLegacySlots: true,
      forbidsGenericSampleSubstitution: true,
      primaryReplacementForbidden: true,
      lateWindowStrict: true,
      ageMs: null,
      maxLateMs,
      pilotReady,
      workletAcceptedCount,
      sampleHydratedCount,
      detail: "Failover decision gate could not inspect a WaveStarter VoiceSpec; event is not eligible for Worklet failover.",
    };
  }

  if (!requested) {
    return {
      version: 1,
      reportKind: "xensonar-wave-starter-failover-decision-gate",
      decision: "legacy-admitted",
      reason: "normal-legacy-path",
      voiceSpecKind: voiceSpec.kind,
      voiceSpecId: voiceSpec.voiceId,
      bufferToken: token,
      sampleTokenHydrated,
      sampleHydratedTokenRequired: true,
      synthFailoverCandidateRequested: false,
      sampleFailoverCandidateRequested: false,
      failoverOnlyForDroppedLegacySlots: true,
      forbidsGenericSampleSubstitution: true,
      primaryReplacementForbidden: true,
      lateWindowStrict: true,
      ageMs,
      maxLateMs,
      pilotReady,
      workletAcceptedCount,
      sampleHydratedCount,
      detail: "WaveStarter event remains on the legacy path; Worklet failover is only for dropped/deferred legacy slots.",
    };
  }

  if (ageMs !== null && ageMs > maxLateMs) {
    return {
      version: 1,
      reportKind: "xensonar-wave-starter-failover-decision-gate",
      decision: "drop-too-late",
      reason: "failover-candidate-arrived-after-late-window",
      voiceSpecKind: voiceSpec.kind,
      voiceSpecId: voiceSpec.voiceId,
      bufferToken: token,
      sampleTokenHydrated,
      sampleHydratedTokenRequired: true,
      synthFailoverCandidateRequested: synthRequested,
      sampleFailoverCandidateRequested: sampleRequested,
      failoverOnlyForDroppedLegacySlots: true,
      forbidsGenericSampleSubstitution: true,
      primaryReplacementForbidden: true,
      lateWindowStrict: true,
      ageMs,
      maxLateMs,
      pilotReady,
      workletAcceptedCount,
      sampleHydratedCount,
      detail: "Failover candidate exceeded the strict late window; Xensonar drops it instead of replaying a rhythmically false Wellenstarter impulse.",
    };
  }

  if (!pilotReady) {
    return {
      version: 1,
      reportKind: "xensonar-wave-starter-failover-decision-gate",
      decision: "drop-worklet-not-ready",
      reason: "worklet-pilot-not-ready",
      voiceSpecKind: voiceSpec.kind,
      voiceSpecId: voiceSpec.voiceId,
      bufferToken: token,
      sampleTokenHydrated,
      sampleHydratedTokenRequired: true,
      synthFailoverCandidateRequested: synthRequested,
      sampleFailoverCandidateRequested: sampleRequested,
      failoverOnlyForDroppedLegacySlots: true,
      forbidsGenericSampleSubstitution: true,
      primaryReplacementForbidden: true,
      lateWindowStrict: true,
      ageMs,
      maxLateMs,
      pilotReady,
      workletAcceptedCount,
      sampleHydratedCount,
      detail: "Worklet failover was requested, but the Wellenstarter Worklet pilot is not ready; event remains an explicit drop rather than a hidden fallback.",
    };
  }

  if (voiceSpec.kind === "sample") {
    if (!sampleRequested) {
      return {
        version: 1,
        reportKind: "xensonar-wave-starter-failover-decision-gate",
        decision: "drop-invalid-kind",
        reason: "sample-cannot-use-synth-failover",
        voiceSpecKind: voiceSpec.kind,
        voiceSpecId: voiceSpec.voiceId,
        bufferToken: token,
        sampleTokenHydrated,
        sampleHydratedTokenRequired: true,
        synthFailoverCandidateRequested: synthRequested,
        sampleFailoverCandidateRequested: sampleRequested,
        failoverOnlyForDroppedLegacySlots: true,
        forbidsGenericSampleSubstitution: true,
        primaryReplacementForbidden: true,
        lateWindowStrict: true,
        ageMs,
        maxLateMs,
        pilotReady,
        workletAcceptedCount,
        sampleHydratedCount,
        detail: "Sample-Wellenstarter cannot use the synth failover branch; generic sample-to-synth substitution remains forbidden.",
      };
    }
    if (!token) {
      return {
        version: 1,
        reportKind: "xensonar-wave-starter-failover-decision-gate",
        decision: "drop-token-missing",
        reason: "sample-failover-missing-buffer-token",
        voiceSpecKind: voiceSpec.kind,
        voiceSpecId: voiceSpec.voiceId,
        bufferToken: null,
        sampleTokenHydrated: false,
        sampleHydratedTokenRequired: true,
        synthFailoverCandidateRequested: synthRequested,
        sampleFailoverCandidateRequested: sampleRequested,
        failoverOnlyForDroppedLegacySlots: true,
        forbidsGenericSampleSubstitution: true,
        primaryReplacementForbidden: true,
        lateWindowStrict: true,
        ageMs,
        maxLateMs,
        pilotReady,
        workletAcceptedCount,
        sampleHydratedCount,
        detail: "Sample failover is blocked because the VoiceSpec has no buffer token; no synth substitute is permitted.",
      };
    }
    if (!sampleTokenHydrated) {
      return {
        version: 1,
        reportKind: "xensonar-wave-starter-failover-decision-gate",
        decision: "drop-token-not-hydrated",
        reason: "sample-failover-token-not-hydrated",
        voiceSpecKind: voiceSpec.kind,
        voiceSpecId: voiceSpec.voiceId,
        bufferToken: token,
        sampleTokenHydrated: false,
        sampleHydratedTokenRequired: true,
        synthFailoverCandidateRequested: synthRequested,
        sampleFailoverCandidateRequested: sampleRequested,
        failoverOnlyForDroppedLegacySlots: true,
        forbidsGenericSampleSubstitution: true,
        primaryReplacementForbidden: true,
        lateWindowStrict: true,
        ageMs,
        maxLateMs,
        pilotReady,
        workletAcceptedCount,
        sampleHydratedCount,
        detail: "Sample failover is blocked until the Worklet has hydrated the matching buffer token; Legacy remains the only truthful sample body path.",
      };
    }
    return {
      version: 1,
      reportKind: "xensonar-wave-starter-failover-decision-gate",
      decision: "sample-failover",
      reason: "dropped-legacy-slot-sample-worklet-candidate",
      voiceSpecKind: voiceSpec.kind,
      voiceSpecId: voiceSpec.voiceId,
      bufferToken: token,
      sampleTokenHydrated: true,
      sampleHydratedTokenRequired: true,
      synthFailoverCandidateRequested: synthRequested,
      sampleFailoverCandidateRequested: sampleRequested,
      failoverOnlyForDroppedLegacySlots: true,
      forbidsGenericSampleSubstitution: true,
      primaryReplacementForbidden: true,
      lateWindowStrict: true,
      ageMs,
      maxLateMs,
      pilotReady,
      workletAcceptedCount,
      sampleHydratedCount,
      detail: "Hydrated sample-token candidate may enter the bounded Worklet one-shot failover path; no loop, FX parity, or primary replacement is claimed.",
    };
  }

  if (sampleRequested && !synthRequested) {
    return {
      version: 1,
      reportKind: "xensonar-wave-starter-failover-decision-gate",
      decision: "drop-invalid-kind",
      reason: "synth-cannot-use-sample-failover",
      voiceSpecKind: voiceSpec.kind,
      voiceSpecId: voiceSpec.voiceId,
      bufferToken: null,
      sampleTokenHydrated: false,
      sampleHydratedTokenRequired: true,
      synthFailoverCandidateRequested: synthRequested,
      sampleFailoverCandidateRequested: sampleRequested,
      failoverOnlyForDroppedLegacySlots: true,
      forbidsGenericSampleSubstitution: true,
      primaryReplacementForbidden: true,
      lateWindowStrict: true,
      ageMs,
      maxLateMs,
      pilotReady,
      workletAcceptedCount,
      sampleHydratedCount,
      detail: "Synth voice cannot use the sample failover branch; failover kinds remain explicitly separated.",
    };
  }

  return {
    version: 1,
    reportKind: "xensonar-wave-starter-failover-decision-gate",
    decision: "synth-failover",
    reason: "dropped-legacy-slot-synth-worklet-candidate",
    voiceSpecKind: voiceSpec.kind,
    voiceSpecId: voiceSpec.voiceId,
    bufferToken: null,
    sampleTokenHydrated: false,
    sampleHydratedTokenRequired: true,
    synthFailoverCandidateRequested: synthRequested,
    sampleFailoverCandidateRequested: sampleRequested,
    failoverOnlyForDroppedLegacySlots: true,
    forbidsGenericSampleSubstitution: true,
    primaryReplacementForbidden: true,
    lateWindowStrict: true,
    ageMs,
    maxLateMs,
    pilotReady,
    workletAcceptedCount,
    sampleHydratedCount,
    detail: "Synth VoiceSpec may enter the Worklet synth failover path after a dropped/deferred legacy slot; normal legacy playback remains primary.",
  };
}

export function publishWaveStarterFailoverDecisionGate(input: WaveStarterFailoverDecisionGateInput): WaveStarterFailoverDecisionGateReport {
  const resolved = resolveWaveStarterFailoverDecisionGate(input);
  bump(resolved.decision);
  const report: WaveStarterFailoverDecisionGateReport = {
    ...resolved,
    generatedAtIso: new Date().toISOString(),
    counters: { ...counters },
  };
  lastReport = report;
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>)[WAVE_STARTER_FAILOVER_DECISION_GATE_GLOBAL] = report;
  }
  return report;
}

export function buildWaveStarterFailoverDecisionGateReport(): WaveStarterFailoverDecisionGateReport {
  if (lastReport) return lastReport;
  return {
    version: 1,
    reportKind: "xensonar-wave-starter-failover-decision-gate",
    generatedAtIso: new Date().toISOString(),
    decision: "no-failover-decision-observed",
    reason: "normal-legacy-path",
    voiceSpecKind: null,
    voiceSpecId: null,
    bufferToken: null,
    sampleTokenHydrated: false,
    sampleHydratedTokenRequired: true,
    synthFailoverCandidateRequested: false,
    sampleFailoverCandidateRequested: false,
    failoverOnlyForDroppedLegacySlots: true,
    forbidsGenericSampleSubstitution: true,
    primaryReplacementForbidden: true,
    lateWindowStrict: true,
    ageMs: null,
    maxLateMs: DEFAULT_MAX_LATE_MS,
    pilotReady: false,
    workletAcceptedCount: 0,
    sampleHydratedCount: 0,
    counters: { ...counters },
    detail: "No Wellenstarter failover decision has been observed yet; Legacy remains the default path and Worklet failover is candidate-only.",
  };
}

export function readWaveStarterFailoverDecisionGateFromBrowser(): WaveStarterFailoverDecisionGateReport | null {
  if (typeof window === "undefined") return null;
  const value = (window as unknown as Record<string, unknown>)[WAVE_STARTER_FAILOVER_DECISION_GATE_GLOBAL];
  if (!value || typeof value !== "object") return null;
  return value as WaveStarterFailoverDecisionGateReport;
}

export function formatWaveStarterFailoverDecisionGateUiValue(report: WaveStarterFailoverDecisionGateReport | null): string {
  if (!report) return "not-observed · Gate noch nicht getriggert · Legacy bleibt Primärpfad";
  const age = report.ageMs === null ? "age —" : `age ${Math.round(report.ageMs)}ms/${report.maxLateMs}ms`;
  const sample = report.voiceSpecKind === "sample"
    ? ` · token ${report.sampleTokenHydrated ? "hydrated" : report.bufferToken ? "missing-hydration" : "missing"}`
    : "";
  return `${report.decision} · ${report.reason} · ${age}${sample} · L/Sa/Sy ${report.counters.legacyAdmitted}/${report.counters.sampleFailover}/${report.counters.synthFailover} · drop ${report.counters.dropTooLate + report.counters.dropTokenMissing + report.counters.dropTokenNotHydrated + report.counters.dropWorkletNotReady + report.counters.dropInvalidKind}`;
}
