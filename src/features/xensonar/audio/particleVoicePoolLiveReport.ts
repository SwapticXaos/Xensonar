import type { AudioPressureEventKind, AudioPressureSource } from '@/core/audio/audioPressureMap';
import type { RefucktorVoiceKind } from '@/features/resonance/refucktorAudioGuard';

export type ParticleVoicePoolLiveDecision =
  | 'no-particle-intents-observed'
  | 'admission-observed'
  | 'thinning-observed'
  | 'drop-protected'
  | 'deferred-overflow-observed'
  | 'strong-impact-preserved'
  | 'dispatch-observed';

export type ParticleVoicePoolLiveCounters = {
  intentTotal: number;
  particleIntentTotal: number;
  residentIntentTotal: number;
  previewIntentTotal: number;
  admittedTotal: number;
  rejectedTotal: number;
  thinnedTotal: number;
  deferredTotal: number;
  overflowDeferredTotal: number;
  dispatchedTotal: number;
  synthDispatchTotal: number;
  sampleDispatchTotal: number;
  bodyExciterTriggerTotal: number;
  strongImpactTotal: number;
};

export type ParticleVoicePoolLiveReport = {
  version: 1;
  reportKind: 'xensonar-particle-voice-pool-live-report';
  generatedAtIso: string;
  decision: ParticleVoicePoolLiveDecision;
  counters: ParticleVoicePoolLiveCounters;
  lastSourceKind: RefucktorVoiceKind | null;
  lastPressureSource: AudioPressureSource | null;
  lastAudioPressureAction: AudioPressureEventKind | null;
  lastRequestedVolume: number | null;
  lastAdmittedVolume: number | null;
  lastVolumeScale: number | null;
  lastFreq: number | null;
  lastBodyVoiceBudget: number | null;
  lastTransientIntensity: number | null;
  lastDispatchKind: 'sample' | 'synth' | null;
  lastSampleProfileMode: string | null;
  lastIntentAgeMs: number | null;
  lastAdmissionAgeMs: number | null;
  lastRejectAgeMs: number | null;
  lastThinAgeMs: number | null;
  lastDeferredAgeMs: number | null;
  lastDispatchAgeMs: number | null;
  lastStrongImpactAgeMs: number | null;
  blockers: string[];
  note: string;
};

export const PARTICLE_VOICE_POOL_LIVE_REPORT_GLOBAL = '__XENSONAR_PARTICLE_VOICE_POOL_LIVE_REPORT__';

const PARTICLE_VOICE_POOL_STRONG_IMPACT_VOLUME = 0.16;
const PARTICLE_VOICE_POOL_STRONG_BODY_BUDGET = 4;
const PARTICLE_VOICE_POOL_THIN_SCALE_EPSILON = 0.992;

type MutableParticleVoicePoolState = {
  counters: ParticleVoicePoolLiveCounters;
  lastSourceKind: RefucktorVoiceKind | null;
  lastPressureSource: AudioPressureSource | null;
  lastAudioPressureAction: AudioPressureEventKind | null;
  lastRequestedVolume: number | null;
  lastAdmittedVolume: number | null;
  lastVolumeScale: number | null;
  lastFreq: number | null;
  lastBodyVoiceBudget: number | null;
  lastTransientIntensity: number | null;
  lastDispatchKind: 'sample' | 'synth' | null;
  lastSampleProfileMode: string | null;
  lastIntentAtMs: number | null;
  lastAdmissionAtMs: number | null;
  lastRejectAtMs: number | null;
  lastThinAtMs: number | null;
  lastDeferredAtMs: number | null;
  lastDispatchAtMs: number | null;
  lastStrongImpactAtMs: number | null;
};

const state: MutableParticleVoicePoolState = {
  counters: {
    intentTotal: 0,
    particleIntentTotal: 0,
    residentIntentTotal: 0,
    previewIntentTotal: 0,
    admittedTotal: 0,
    rejectedTotal: 0,
    thinnedTotal: 0,
    deferredTotal: 0,
    overflowDeferredTotal: 0,
    dispatchedTotal: 0,
    synthDispatchTotal: 0,
    sampleDispatchTotal: 0,
    bodyExciterTriggerTotal: 0,
    strongImpactTotal: 0,
  },
  lastSourceKind: null,
  lastPressureSource: null,
  lastAudioPressureAction: null,
  lastRequestedVolume: null,
  lastAdmittedVolume: null,
  lastVolumeScale: null,
  lastFreq: null,
  lastBodyVoiceBudget: null,
  lastTransientIntensity: null,
  lastDispatchKind: null,
  lastSampleProfileMode: null,
  lastIntentAtMs: null,
  lastAdmissionAtMs: null,
  lastRejectAtMs: null,
  lastThinAtMs: null,
  lastDeferredAtMs: null,
  lastDispatchAtMs: null,
  lastStrongImpactAtMs: null,
};

function nowMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') return performance.now();
  return Date.now();
}

function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Number(value.toFixed(4)) : null;
}

function ageMs(now: number, then: number | null): number | null {
  return then === null ? null : Math.max(0, Math.round(now - then));
}

function publishParticleVoicePoolLiveReport(): ParticleVoicePoolLiveReport {
  const now = nowMs();
  const blockers: string[] = [];
  if (state.counters.intentTotal <= 0) blockers.push('no-particle-intents-observed');
  if (state.counters.rejectedTotal > 0 && state.counters.dispatchedTotal <= 0) blockers.push('particle-drops-without-dispatch');
  if (state.counters.deferredTotal > 0 && state.counters.admittedTotal <= 0) blockers.push('particle-overflow-deferred-before-admission');

  let decision: ParticleVoicePoolLiveDecision = 'no-particle-intents-observed';
  if (state.counters.strongImpactTotal > 0) decision = 'strong-impact-preserved';
  else if (state.counters.rejectedTotal > 0) decision = 'drop-protected';
  else if (state.counters.deferredTotal > 0 || state.counters.overflowDeferredTotal > 0) decision = 'deferred-overflow-observed';
  else if (state.counters.thinnedTotal > 0) decision = 'thinning-observed';
  else if (state.counters.dispatchedTotal > 0) decision = 'dispatch-observed';
  else if (state.counters.admittedTotal > 0) decision = 'admission-observed';

  const report: ParticleVoicePoolLiveReport = {
    version: 1,
    reportKind: 'xensonar-particle-voice-pool-live-report',
    generatedAtIso: new Date().toISOString(),
    decision,
    counters: { ...state.counters },
    lastSourceKind: state.lastSourceKind,
    lastPressureSource: state.lastPressureSource,
    lastAudioPressureAction: state.lastAudioPressureAction,
    lastRequestedVolume: finiteOrNull(state.lastRequestedVolume),
    lastAdmittedVolume: finiteOrNull(state.lastAdmittedVolume),
    lastVolumeScale: finiteOrNull(state.lastVolumeScale),
    lastFreq: finiteOrNull(state.lastFreq),
    lastBodyVoiceBudget: finiteOrNull(state.lastBodyVoiceBudget),
    lastTransientIntensity: finiteOrNull(state.lastTransientIntensity),
    lastDispatchKind: state.lastDispatchKind,
    lastSampleProfileMode: state.lastSampleProfileMode,
    lastIntentAgeMs: ageMs(now, state.lastIntentAtMs),
    lastAdmissionAgeMs: ageMs(now, state.lastAdmissionAtMs),
    lastRejectAgeMs: ageMs(now, state.lastRejectAtMs),
    lastThinAgeMs: ageMs(now, state.lastThinAtMs),
    lastDeferredAgeMs: ageMs(now, state.lastDeferredAtMs),
    lastDispatchAgeMs: ageMs(now, state.lastDispatchAtMs),
    lastStrongImpactAgeMs: ageMs(now, state.lastStrongImpactAtMs),
    blockers,
    note: 'Partikel-Voice-Pool-Live-Report: beobachtet Intent, Admission, Drop/Thin, Overflow-Defer und starke Body-/Impact-Events ohne einen Partikel-Worklet zu aktivieren.',
  };
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>)[PARTICLE_VOICE_POOL_LIVE_REPORT_GLOBAL] = report;
  }
  return report;
}

export function recordParticleVoicePoolIntent(args: {
  sourceKind: RefucktorVoiceKind;
  requestedVolume: number;
  freq?: number;
}): ParticleVoicePoolLiveReport {
  const now = nowMs();
  state.counters.intentTotal += 1;
  if (args.sourceKind === 'resident') state.counters.residentIntentTotal += 1;
  else if (args.sourceKind === 'preview') state.counters.previewIntentTotal += 1;
  else state.counters.particleIntentTotal += 1;
  state.lastSourceKind = args.sourceKind;
  state.lastRequestedVolume = args.requestedVolume;
  state.lastFreq = typeof args.freq === 'number' && Number.isFinite(args.freq) ? args.freq : state.lastFreq;
  state.lastIntentAtMs = now;
  return publishParticleVoicePoolLiveReport();
}

export function recordParticleVoicePoolAdmission(args: {
  sourceKind: RefucktorVoiceKind;
  pressureSource: AudioPressureSource;
  action: 'voice-admitted' | 'voice-rejected';
  requestedVolume: number;
  admittedVolume: number;
}): ParticleVoicePoolLiveReport {
  const now = nowMs();
  state.lastSourceKind = args.sourceKind;
  state.lastPressureSource = args.pressureSource;
  state.lastAudioPressureAction = args.action;
  state.lastRequestedVolume = args.requestedVolume;
  state.lastAdmittedVolume = args.admittedVolume;
  const scale = args.requestedVolume > 0 ? args.admittedVolume / args.requestedVolume : 0;
  state.lastVolumeScale = scale;
  if (args.action === 'voice-rejected') {
    state.counters.rejectedTotal += 1;
    state.lastRejectAtMs = now;
  } else {
    state.counters.admittedTotal += 1;
    state.lastAdmissionAtMs = now;
    if (scale < PARTICLE_VOICE_POOL_THIN_SCALE_EPSILON) {
      state.counters.thinnedTotal += 1;
      state.lastThinAtMs = now;
    }
  }
  return publishParticleVoicePoolLiveReport();
}

export function recordParticleVoicePoolOverflowDeferred(args: {
  sourceKind: RefucktorVoiceKind;
  count?: number;
  reason: 'tick-limit' | 'resident-limit' | 'overflow-deferred' | 'unknown';
}): ParticleVoicePoolLiveReport {
  const count = Math.max(1, Math.round(args.count ?? 1));
  state.counters.deferredTotal += count;
  if (args.reason === 'overflow-deferred') state.counters.overflowDeferredTotal += count;
  state.lastSourceKind = args.sourceKind;
  state.lastAudioPressureAction = 'voice-deferred';
  state.lastDeferredAtMs = nowMs();
  return publishParticleVoicePoolLiveReport();
}

export function recordParticleVoicePoolDispatch(args: {
  sourceKind: RefucktorVoiceKind;
  dispatchKind: 'sample' | 'synth';
  volume: number;
  freq: number;
  bodyVoiceBudget: number;
  transientIntensity: number;
  sampleProfileMode?: string | null;
}): ParticleVoicePoolLiveReport {
  const now = nowMs();
  state.counters.dispatchedTotal += 1;
  if (args.dispatchKind === 'sample') state.counters.sampleDispatchTotal += 1;
  else state.counters.synthDispatchTotal += 1;
  state.counters.bodyExciterTriggerTotal += 1;
  state.lastSourceKind = args.sourceKind;
  state.lastDispatchKind = args.dispatchKind;
  state.lastRequestedVolume = args.volume;
  state.lastAdmittedVolume = args.volume;
  state.lastFreq = args.freq;
  state.lastBodyVoiceBudget = args.bodyVoiceBudget;
  state.lastTransientIntensity = args.transientIntensity;
  state.lastSampleProfileMode = args.sampleProfileMode ?? null;
  state.lastDispatchAtMs = now;
  if (args.bodyVoiceBudget >= PARTICLE_VOICE_POOL_STRONG_BODY_BUDGET || args.volume >= PARTICLE_VOICE_POOL_STRONG_IMPACT_VOLUME) {
    state.counters.strongImpactTotal += 1;
    state.lastStrongImpactAtMs = now;
  }
  return publishParticleVoicePoolLiveReport();
}

export function readParticleVoicePoolLiveReportFromBrowser(): ParticleVoicePoolLiveReport | null {
  if (typeof window === 'undefined') return null;
  const value = (window as unknown as Record<string, unknown>)[PARTICLE_VOICE_POOL_LIVE_REPORT_GLOBAL];
  if (!value || typeof value !== 'object') return null;
  return value as ParticleVoicePoolLiveReport;
}

export function formatParticleVoicePoolLiveReportUiValue(report: ParticleVoicePoolLiveReport | null): string {
  if (!report) return 'no-runtime-report · intent/admission nicht beobachtet';
  return `${report.decision} · I ${report.counters.intentTotal} · A ${report.counters.admittedTotal} · thin ${report.counters.thinnedTotal} · drop ${report.counters.rejectedTotal} · strong ${report.counters.strongImpactTotal}`;
}
