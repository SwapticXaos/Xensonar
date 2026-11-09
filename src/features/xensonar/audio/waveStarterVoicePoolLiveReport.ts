export type WaveStarterVoicePoolLiveDecision =
  | 'no-wave-intents-observed'
  | 'live-delivery-observed'
  | 'latest-intent-slot-active'
  | 'micro-release-observed'
  | 'stale-drop-protected'
  | 'pressure-retry-slot'
  | 'admission-blocked'
  | 'disposed';

export type WaveStarterVoicePoolLiveCounters = {
  requestTotal: number;
  admittedTotal: number;
  deferredTotal: number;
  latestIntentReplacedTotal: number;
  flushAttemptTotal: number;
  retrySlotTotal: number;
  microReleasedTotal: number;
  staleDroppedTotal: number;
  overloadSlotTotal: number;
  emittedFromDeferredTotal: number;
};

export type WaveStarterVoicePoolLiveReport = {
  version: 1;
  reportKind: 'xensonar-wave-starter-voice-pool-live-report';
  generatedAtIso: string;
  decision: WaveStarterVoicePoolLiveDecision;
  pendingSlotCount: number;
  pendingSlotAgeMs: number | null;
  timerActive: boolean;
  latestIntentSlotActive: boolean;
  pressureBias: number;
  activeScheduledToneCount: number;
  lastAdmissionKind: string | null;
  lastAdmissionReason: string | null;
  lastMicroDecisionKind: string | null;
  lastMicroDecisionReason: string | null;
  lastMicroGainScale: number | null;
  lastMicroVoiceDemandMul: number | null;
  lastRequestAgeMs: number | null;
  lastDeferredAgeMs: number | null;
  lastFlushAgeMs: number | null;
  lastEmitAgeMs: number | null;
  lastMicroReleaseAgeMs: number | null;
  lastStaleDropAgeMs: number | null;
  counters: WaveStarterVoicePoolLiveCounters;
  blockers: string[];
  note: string;
};

export type WaveStarterVoicePoolLiveReportInput = {
  nowMs: number;
  pressureBias: number;
  activeScheduledToneCount: number;
  pendingSlotCount: number;
  pendingRequestedAtMs: number | null;
  timerActive: boolean;
  lastAdmissionKind: string | null;
  lastAdmissionReason: string | null;
  lastMicroDecisionKind: string | null;
  lastMicroDecisionReason: string | null;
  lastMicroGainScale: number | null;
  lastMicroVoiceDemandMul: number | null;
  lastRequestAtMs: number | null;
  lastDeferredAtMs: number | null;
  lastFlushAtMs: number | null;
  lastEmitAtMs: number | null;
  lastMicroReleaseAtMs: number | null;
  lastStaleDropAtMs: number | null;
  disposed?: boolean;
  counters: WaveStarterVoicePoolLiveCounters;
};

export const WAVE_STARTER_VOICE_POOL_LIVE_REPORT_GLOBAL = '__XENSONAR_WAVE_STARTER_VOICE_POOL_LIVE_REPORT__';

function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function ageMs(nowMs: number, thenMs: number | null | undefined): number | null {
  const then = finiteOrNull(thenMs);
  if (then === null || !Number.isFinite(nowMs)) return null;
  return Math.max(0, Math.round(nowMs - then));
}

function round3(value: number): number {
  return Number.isFinite(value) ? Number(value.toFixed(3)) : 0;
}

export function buildWaveStarterVoicePoolLiveReport(input: WaveStarterVoicePoolLiveReportInput): WaveStarterVoicePoolLiveReport {
  const pendingSlotAgeMs = ageMs(input.nowMs, input.pendingRequestedAtMs);
  const lastRequestAgeMs = ageMs(input.nowMs, input.lastRequestAtMs);
  const lastDeferredAgeMs = ageMs(input.nowMs, input.lastDeferredAtMs);
  const lastFlushAgeMs = ageMs(input.nowMs, input.lastFlushAtMs);
  const lastEmitAgeMs = ageMs(input.nowMs, input.lastEmitAtMs);
  const lastMicroReleaseAgeMs = ageMs(input.nowMs, input.lastMicroReleaseAtMs);
  const lastStaleDropAgeMs = ageMs(input.nowMs, input.lastStaleDropAtMs);
  const latestIntentSlotActive = input.pendingSlotCount > 0 || input.timerActive;
  const blockers: string[] = [];
  if (input.disposed) blockers.push('wave-starter-runtime-disposed');
  if (input.counters.requestTotal <= 0) blockers.push('no-wave-intents-observed');
  if (input.counters.deferredTotal > 0 && input.counters.microReleasedTotal <= 0 && input.counters.staleDroppedTotal <= 0 && !latestIntentSlotActive) blockers.push('deferred-slot-without-release-or-drop');
  if (input.counters.latestIntentReplacedTotal > 0 && input.counters.staleDroppedTotal <= 0 && input.counters.microReleasedTotal <= 0) blockers.push('latest-intent-replacements-unresolved');

  let decision: WaveStarterVoicePoolLiveDecision = 'no-wave-intents-observed';
  if (input.disposed) decision = 'disposed';
  else if (input.counters.microReleasedTotal > 0) decision = 'micro-release-observed';
  else if (input.counters.staleDroppedTotal > 0) decision = 'stale-drop-protected';
  else if (input.counters.retrySlotTotal > 0) decision = 'pressure-retry-slot';
  else if (latestIntentSlotActive) decision = 'latest-intent-slot-active';
  else if (input.counters.admittedTotal > 0) decision = 'live-delivery-observed';
  else if (input.counters.deferredTotal > 0 || input.counters.overloadSlotTotal > 0) decision = 'admission-blocked';

  return {
    version: 1,
    reportKind: 'xensonar-wave-starter-voice-pool-live-report',
    generatedAtIso: new Date().toISOString(),
    decision,
    pendingSlotCount: Math.max(0, input.pendingSlotCount),
    pendingSlotAgeMs,
    timerActive: input.timerActive,
    latestIntentSlotActive,
    pressureBias: round3(input.pressureBias),
    activeScheduledToneCount: Math.max(0, Math.round(input.activeScheduledToneCount)),
    lastAdmissionKind: input.lastAdmissionKind,
    lastAdmissionReason: input.lastAdmissionReason,
    lastMicroDecisionKind: input.lastMicroDecisionKind,
    lastMicroDecisionReason: input.lastMicroDecisionReason,
    lastMicroGainScale: finiteOrNull(input.lastMicroGainScale),
    lastMicroVoiceDemandMul: finiteOrNull(input.lastMicroVoiceDemandMul),
    lastRequestAgeMs,
    lastDeferredAgeMs,
    lastFlushAgeMs,
    lastEmitAgeMs,
    lastMicroReleaseAgeMs,
    lastStaleDropAgeMs,
    counters: { ...input.counters },
    blockers,
    note: 'Wellenstarter-Voice-Pool-Live-Report: prüft den hörbaren Main-Thread-Fallback-Pool mit latest-intent slot, strengem stale drop und Microrelease, ohne einen Wellenstarter-Worklet zu aktivieren.',
  };
}

export function publishWaveStarterVoicePoolLiveReport(input: WaveStarterVoicePoolLiveReportInput): WaveStarterVoicePoolLiveReport {
  const report = buildWaveStarterVoicePoolLiveReport(input);
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>)[WAVE_STARTER_VOICE_POOL_LIVE_REPORT_GLOBAL] = report;
  }
  return report;
}

export function readWaveStarterVoicePoolLiveReportFromBrowser(): WaveStarterVoicePoolLiveReport | null {
  if (typeof window === 'undefined') return null;
  const value = (window as unknown as Record<string, unknown>)[WAVE_STARTER_VOICE_POOL_LIVE_REPORT_GLOBAL];
  if (!value || typeof value !== 'object') return null;
  return value as WaveStarterVoicePoolLiveReport;
}

export function formatWaveStarterVoicePoolLiveReportUiValue(report: WaveStarterVoicePoolLiveReport | null): string {
  if (!report) return 'no-runtime-report · latest-intent nicht beobachtet';
  const pending = report.pendingSlotAgeMs === null
    ? `slot ${report.pendingSlotCount}`
    : `slot ${report.pendingSlotCount}/${report.pendingSlotAgeMs}ms`;
  return `${report.decision} · ${pending} · A ${report.counters.admittedTotal} · D ${report.counters.deferredTotal} · μ ${report.counters.microReleasedTotal} · stale ${report.counters.staleDroppedTotal}`;
}
