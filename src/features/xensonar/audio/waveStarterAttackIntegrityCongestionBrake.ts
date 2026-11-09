export type WaveStarterCongestionState = 'clear' | 'watch' | 'brake' | 'critical';

export type WaveStarterCongestionBrakeReason =
  | 'capacity-clear-full-attack'
  | 'capacity-watch-full-attack-prep'
  | 'capacity-brake-temporary-wave-starter-window'
  | 'capacity-critical-lane-protection'
  | 'emit-blocked-softening-outside-congestion'
  | 'emit-accepted-congestion-softening';

export type WaveStarterAttackIntegrityCongestionDecision = {
  version: 1;
  state: WaveStarterCongestionState;
  reason: WaveStarterCongestionBrakeReason;
  pressureScore: number;
  pressureBias: number;
  activeScheduledToneCount: number;
  isKeyboardGlissando: boolean;
  isRepeat: boolean;
  attackSoftening: number;
  gainScale: number;
  voiceDemandMul: number;
  rootFollowSegmentQuantizeHint: boolean;
  workletDirect: boolean;
  workletOnly: boolean;
  previewWaveAllowed: boolean;
  attackIntegrityPreserved: true;
};

export type WaveStarterAttackIntegrityCongestionCounters = {
  attackIntegrityPreserved: number;
  congestionBrakeEntered: number;
  congestionBrakeActiveMs: number;
  congestionBrakeReleased: number;
  criticalLaneProtectionEvents: number;
  attackSofteningBlockedOutsideCongestion: number;
};

export type WaveStarterAttackIntegrityCongestionReport = {
  version: 1;
  reportKind: 'xensonar-wave-starter-attack-integrity-congestion-brake';
  generatedAtIso: string;
  currentState: WaveStarterCongestionState;
  previousState: WaveStarterCongestionState | null;
  lastDecision: WaveStarterAttackIntegrityCongestionDecision | null;
  lastDecisionAgeMs: number | null;
  counters: WaveStarterAttackIntegrityCongestionCounters;
  note: string;
};

export const WAVE_STARTER_ATTACK_INTEGRITY_CONGESTION_GLOBAL =
  '__XENSONAR_WAVE_STARTER_ATTACK_INTEGRITY_CONGESTION__';

let currentState: WaveStarterCongestionState = 'clear';
let previousState: WaveStarterCongestionState | null = null;
let brakeEnteredAtMs: number | null = null;
let lastDecision: WaveStarterAttackIntegrityCongestionDecision | null = null;
let lastDecisionAtMs: number | null = null;

const counters: WaveStarterAttackIntegrityCongestionCounters = {
  attackIntegrityPreserved: 0,
  congestionBrakeEntered: 0,
  congestionBrakeActiveMs: 0,
  congestionBrakeReleased: 0,
  criticalLaneProtectionEvents: 0,
  attackSofteningBlockedOutsideCongestion: 0,
};

function nowMs() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function round3(value: number) {
  return Number.isFinite(value) ? Number(value.toFixed(3)) : 0;
}

function pressureScoreFrom(pressureBias: number, activeScheduledToneCount: number) {
  return Math.max(clamp(pressureBias, 0, 1), Math.max(0, activeScheduledToneCount) / 176);
}

export function resolveWaveStarterCongestionState(args: {
  pressureBias: number;
  activeScheduledToneCount: number;
  isKeyboardGlissando: boolean;
  isRepeat: boolean;
}): WaveStarterCongestionState {
  const pressureBias = clamp(args.pressureBias, 0, 1);
  const activeScheduledToneCount = Math.max(
    0,
    Math.floor(Number.isFinite(args.activeScheduledToneCount) ? args.activeScheduledToneCount : 0),
  );
  const pressureScore = pressureScoreFrom(pressureBias, activeScheduledToneCount);

  if (pressureScore >= 0.955 || activeScheduledToneCount >= 172) return 'critical';
  if (pressureScore >= 0.78 || activeScheduledToneCount >= 126) return 'brake';
  if (pressureScore >= 0.54 || activeScheduledToneCount >= 86) return 'watch';
  if (args.isKeyboardGlissando && args.isRepeat && (pressureScore >= 0.38 || activeScheduledToneCount >= 68)) return 'watch';
  return 'clear';
}

export function resolveWaveStarterAttackIntegrityCongestionDecision(args: {
  pressureBias: number;
  activeScheduledToneCount: number;
  isKeyboardGlissando: boolean;
  isRepeat: boolean;
  audioReadyForPreview: boolean;
}): WaveStarterAttackIntegrityCongestionDecision {
  const pressureBias = clamp(args.pressureBias, 0, 1);
  const activeScheduledToneCount = Math.max(
    0,
    Math.floor(Number.isFinite(args.activeScheduledToneCount) ? args.activeScheduledToneCount : 0),
  );
  const pressureScore = pressureScoreFrom(pressureBias, activeScheduledToneCount);
  const state = resolveWaveStarterCongestionState({
    pressureBias,
    activeScheduledToneCount,
    isKeyboardGlissando: args.isKeyboardGlissando,
    isRepeat: args.isRepeat,
  });

  if (state === 'critical') {
    return {
      version: 1,
      state,
      reason: 'capacity-critical-lane-protection',
      pressureScore: round3(pressureScore),
      pressureBias,
      activeScheduledToneCount,
      isKeyboardGlissando: args.isKeyboardGlissando,
      isRepeat: args.isRepeat,
      attackSoftening: args.isKeyboardGlissando ? 1.28 : 1.16,
      gainScale: args.isKeyboardGlissando ? 0.62 : 0.76,
      voiceDemandMul: args.isKeyboardGlissando ? 0.5 : 0.7,
      rootFollowSegmentQuantizeHint: true,
      workletDirect: args.isKeyboardGlissando,
      workletOnly: args.isKeyboardGlissando,
      previewWaveAllowed: args.audioReadyForPreview && pressureScore < 0.985 && activeScheduledToneCount < 188,
      attackIntegrityPreserved: true,
    };
  }

  if (state === 'brake') {
    return {
      version: 1,
      state,
      reason: 'capacity-brake-temporary-wave-starter-window',
      pressureScore: round3(pressureScore),
      pressureBias,
      activeScheduledToneCount,
      isKeyboardGlissando: args.isKeyboardGlissando,
      isRepeat: args.isRepeat,
      attackSoftening: args.isKeyboardGlissando ? 1.12 : 1.08,
      gainScale: args.isKeyboardGlissando ? 0.86 : 0.9,
      voiceDemandMul: args.isKeyboardGlissando ? 0.78 : 0.84,
      rootFollowSegmentQuantizeHint: true,
      workletDirect: args.isKeyboardGlissando,
      workletOnly: false,
      previewWaveAllowed: args.audioReadyForPreview,
      attackIntegrityPreserved: true,
    };
  }

  if (state === 'watch') {
    return {
      version: 1,
      state,
      reason: 'capacity-watch-full-attack-prep',
      pressureScore: round3(pressureScore),
      pressureBias,
      activeScheduledToneCount,
      isKeyboardGlissando: args.isKeyboardGlissando,
      isRepeat: args.isRepeat,
      attackSoftening: 1,
      gainScale: 1,
      voiceDemandMul: 1,
      rootFollowSegmentQuantizeHint: false,
      workletDirect: args.isKeyboardGlissando,
      workletOnly: false,
      previewWaveAllowed: args.audioReadyForPreview,
      attackIntegrityPreserved: true,
    };
  }

  return {
    version: 1,
    state,
    reason: 'capacity-clear-full-attack',
    pressureScore: round3(pressureScore),
    pressureBias,
    activeScheduledToneCount,
    isKeyboardGlissando: args.isKeyboardGlissando,
    isRepeat: args.isRepeat,
    attackSoftening: 1,
    gainScale: 1,
    voiceDemandMul: 1,
    rootFollowSegmentQuantizeHint: false,
    workletDirect: false,
    workletOnly: false,
    previewWaveAllowed: args.audioReadyForPreview,
    attackIntegrityPreserved: true,
  };
}

function transitionState(nextState: WaveStarterCongestionState, atMs: number) {
  if (nextState === currentState) return;
  previousState = currentState;
  if ((nextState === 'brake' || nextState === 'critical') && currentState !== 'brake' && currentState !== 'critical') {
    brakeEnteredAtMs = atMs;
    counters.congestionBrakeEntered += 1;
  }
  if ((currentState === 'brake' || currentState === 'critical') && nextState !== 'brake' && nextState !== 'critical') {
    if (brakeEnteredAtMs !== null) {
      counters.congestionBrakeActiveMs += Math.max(0, Math.round(atMs - brakeEnteredAtMs));
    }
    brakeEnteredAtMs = null;
    counters.congestionBrakeReleased += 1;
  }
  currentState = nextState;
}

export function publishWaveStarterAttackIntegrityCongestionDecision(
  decision: WaveStarterAttackIntegrityCongestionDecision,
): WaveStarterAttackIntegrityCongestionReport {
  const atMs = nowMs();
  transitionState(decision.state, atMs);
  counters.attackIntegrityPreserved += 1;
  if (decision.state === 'critical') counters.criticalLaneProtectionEvents += 1;
  lastDecision = decision;
  lastDecisionAtMs = atMs;
  return buildWaveStarterAttackIntegrityCongestionReport();
}

export function resolveWaveStarterAttackSofteningForEmit(args: {
  requestedSoftening: number | null | undefined;
  congestionState: WaveStarterCongestionState | null | undefined;
}): number {
  const requested = clamp(args.requestedSoftening ?? 1, 1, 4);
  if (requested <= 1) return 1;
  if (args.congestionState === 'brake' || args.congestionState === 'critical') {
    return requested;
  }
  counters.attackSofteningBlockedOutsideCongestion += 1;
  return 1;
}

export function buildWaveStarterAttackIntegrityCongestionReport(): WaveStarterAttackIntegrityCongestionReport {
  const atMs = nowMs();
  const activeCounters = { ...counters };
  if ((currentState === 'brake' || currentState === 'critical') && brakeEnteredAtMs !== null) {
    activeCounters.congestionBrakeActiveMs += Math.max(0, Math.round(atMs - brakeEnteredAtMs));
  }
  const report: WaveStarterAttackIntegrityCongestionReport = {
    version: 1,
    reportKind: 'xensonar-wave-starter-attack-integrity-congestion-brake',
    generatedAtIso: new Date().toISOString(),
    currentState,
    previousState,
    lastDecision,
    lastDecisionAgeMs: lastDecisionAtMs === null ? null : Math.max(0, Math.round(atMs - lastDecisionAtMs)),
    counters: activeCounters,
    note: 'Wellenstarter Attack-Integrität: clear/watch behalten volle Attack; brake/critical dürfen nur temporär eine leichte Stau-Bremse setzen und deeskalieren zurück zu voller Direktheit.',
  };
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>)[WAVE_STARTER_ATTACK_INTEGRITY_CONGESTION_GLOBAL] = report;
  }
  return report;
}

export function readWaveStarterAttackIntegrityCongestionReportFromBrowser(): WaveStarterAttackIntegrityCongestionReport | null {
  if (typeof window === 'undefined') return null;
  const value = (window as unknown as Record<string, unknown>)[WAVE_STARTER_ATTACK_INTEGRITY_CONGESTION_GLOBAL];
  return value && typeof value === 'object' ? value as WaveStarterAttackIntegrityCongestionReport : null;
}

export function formatWaveStarterAttackIntegrityCongestionUiValue(
  report: WaveStarterAttackIntegrityCongestionReport | null,
): string {
  if (!report?.lastDecision) return 'clear · volle Attack · Stau-Bremse nicht aktiv';
  const d = report.lastDecision;
  const countersText = `enter/release ${report.counters.congestionBrakeEntered}/${report.counters.congestionBrakeReleased}`;
  const blocked = report.counters.attackSofteningBlockedOutsideCongestion;
  return `${report.currentState} · ${d.reason} · a/g/v ${d.attackSoftening.toFixed(2)}/${d.gainScale.toFixed(2)}/${d.voiceDemandMul.toFixed(2)} · RF ${d.rootFollowSegmentQuantizeHint ? 'segment-hint' : 'live'} · ${countersText} · blocked ${blocked}`;
}
