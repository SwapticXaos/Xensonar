import type { WaveStarterCongestionState } from './waveStarterAttackIntegrityCongestionBrake';

export type WaveStarterKeyboardEventAdmissionRoute =
  | 'keyboard-wave-event-9061-direct'
  | 'keyboard-wave-event-preview-suppressed';

export type WaveStarterKeyboardGestureCapacityDecision = {
  version: 4;
  route: WaveStarterKeyboardEventAdmissionRoute;
  previewWave: boolean;
  microGainScale: 1;
  microVoiceDemandMul: 1;
  microAttackSoftening: 1;
  congestionState: WaveStarterCongestionState;
  congestionBrakeReason: 'legacy-9061-direct-event-contract';
  rootFollowSegmentQuantizeHint: false;
  reason: 'keyboard-wave-event-9061-direct-contract';
  pressureBias: number;
  pressureScore: number;
  activeScheduledToneCount: number;
  isRepeat: boolean;
  commandReason: string;
  directEventContract: true;
  crisisManagementIsSupportOnly: true;
  preservesGlobalLanes: true;
  preservesPlayedKeysUntilPressureForcesDrop: true;
  attackIntegrityPreserved: true;
  waveStarterOptions?: undefined;
};

export type WaveStarterKeyboardGestureCapacityReport = {
  version: 4;
  reportKind: 'xensonar-wave-starter-keyboard-event-admission';
  generatedAtIso: string;
  lastDecision: WaveStarterKeyboardGestureCapacityDecision | null;
  activePressureHint: number;
  rootFollowSegmentQuantizeHint: false;
  lastDecisionAgeMs: number | null;
  counters: Record<WaveStarterKeyboardEventAdmissionRoute, number>;
  previewedCount: number;
  suppressedPreviewCount: number;
  attackIntegrityPreservedCount: number;
  directEventContract: true;
  crisisManagementIsSupportOnly: true;
  hotPathReportMode: 'cold-only';
  detail: string;
};

export const WAVE_STARTER_KEYBOARD_GESTURE_CAPACITY_GLOBAL =
  '__XENSONAR_WAVE_STARTER_KEYBOARD_EVENT_ADMISSION__';

const counters: Record<WaveStarterKeyboardEventAdmissionRoute, number> = {
  'keyboard-wave-event-9061-direct': 0,
  'keyboard-wave-event-preview-suppressed': 0,
};
let lastRoute: WaveStarterKeyboardEventAdmissionRoute | null = null;
let lastDecisionAtMs: number | null = null;
let previewedCount = 0;
let suppressedPreviewCount = 0;
let attackIntegrityPreservedCount = 0;

function nowMs() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

export function resolveWaveStarterKeyboardGestureCapacity(args: {
  kind: 'direct-pitch-hit' | 'continuous-gliss-target';
  commandReason: string;
  isRepeat: boolean;
  audioReadyForPreview: boolean;
  pressureBias: number;
  activeScheduledToneCount: number;
}): WaveStarterKeyboardGestureCapacityDecision {
  const pressureBias = clamp(args.pressureBias, 0, 1);
  const activeScheduledToneCount = Math.max(0, Math.floor(Number.isFinite(args.activeScheduledToneCount) ? args.activeScheduledToneCount : 0));
  const previewWave = args.audioReadyForPreview;
  return {
    version: 4,
    pressureBias,
    pressureScore: Math.max(pressureBias, activeScheduledToneCount / 176),
    activeScheduledToneCount,
    isRepeat: args.isRepeat,
    commandReason: args.commandReason,
    congestionState: 'clear',
    congestionBrakeReason: 'legacy-9061-direct-event-contract',
    directEventContract: true,
    crisisManagementIsSupportOnly: true,
    preservesGlobalLanes: true,
    preservesPlayedKeysUntilPressureForcesDrop: true,
    attackIntegrityPreserved: true,
    route: previewWave ? 'keyboard-wave-event-9061-direct' : 'keyboard-wave-event-preview-suppressed',
    previewWave,
    microGainScale: 1,
    microVoiceDemandMul: 1,
    microAttackSoftening: 1,
    rootFollowSegmentQuantizeHint: false,
    reason: 'keyboard-wave-event-9061-direct-contract',
    waveStarterOptions: undefined,
  };
}

export function noteWaveStarterKeyboardEventAdmissionHotPath(previewWave: boolean): void {
  const route: WaveStarterKeyboardEventAdmissionRoute = previewWave
    ? 'keyboard-wave-event-9061-direct'
    : 'keyboard-wave-event-preview-suppressed';
  counters[route] += 1;
  lastRoute = route;
  lastDecisionAtMs = nowMs();
  attackIntegrityPreservedCount += 1;
  if (previewWave) previewedCount += 1;
  else suppressedPreviewCount += 1;
}

export function publishWaveStarterKeyboardGestureCapacityDecision(
  decision: WaveStarterKeyboardGestureCapacityDecision,
): WaveStarterKeyboardGestureCapacityReport {
  // Cold compatibility hook only: do not call this from keyboard/preview hot paths.
  noteWaveStarterKeyboardEventAdmissionHotPath(decision.previewWave);
  return buildWaveStarterKeyboardGestureCapacityReport();
}

function buildColdSyntheticDecision(): WaveStarterKeyboardGestureCapacityDecision | null {
  if (!lastRoute) return null;
  const previewWave = lastRoute === 'keyboard-wave-event-9061-direct';
  return {
    version: 4,
    route: lastRoute,
    previewWave,
    microGainScale: 1,
    microVoiceDemandMul: 1,
    microAttackSoftening: 1,
    congestionState: 'clear',
    congestionBrakeReason: 'legacy-9061-direct-event-contract',
    rootFollowSegmentQuantizeHint: false,
    reason: 'keyboard-wave-event-9061-direct-contract',
    pressureBias: 0,
    pressureScore: 0,
    activeScheduledToneCount: 0,
    isRepeat: false,
    commandReason: 'cold-report-synthetic-keyboard-wave-event',
    directEventContract: true,
    crisisManagementIsSupportOnly: true,
    preservesGlobalLanes: true,
    preservesPlayedKeysUntilPressureForcesDrop: true,
    attackIntegrityPreserved: true,
    waveStarterOptions: undefined,
  };
}

export function buildWaveStarterKeyboardGestureCapacityReport(): WaveStarterKeyboardGestureCapacityReport {
  const ageMs = lastDecisionAtMs === null ? null : Math.max(0, nowMs() - lastDecisionAtMs);
  const report: WaveStarterKeyboardGestureCapacityReport = {
    version: 4,
    reportKind: 'xensonar-wave-starter-keyboard-event-admission',
    generatedAtIso: new Date().toISOString(),
    lastDecision: buildColdSyntheticDecision(),
    activePressureHint: 0,
    rootFollowSegmentQuantizeHint: false,
    lastDecisionAgeMs: ageMs,
    counters: { ...counters },
    previewedCount,
    suppressedPreviewCount,
    attackIntegrityPreservedCount,
    directEventContract: true,
    crisisManagementIsSupportOnly: true,
    hotPathReportMode: 'cold-only',
    detail: '9061-Direktvertrag: Keyboard-Wellenereignisse liefern keine Worklet-/Micro-Orchestration-Optionen. Viele schnelle Ereignisse bleiben normale Wellenstarter; der Türsteher sitzt im TransientRuntime-Gate. Reports werden nur kalt aus dem Krisenmanager gebaut, nicht im Tastatur-Hot-Path.',
  };
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>)[WAVE_STARTER_KEYBOARD_GESTURE_CAPACITY_GLOBAL] = report;
  }
  return report;
}

export function readWaveStarterKeyboardGestureCapacityReportFromBrowser(): WaveStarterKeyboardGestureCapacityReport | null {
  if (typeof window === 'undefined') return null;
  const value = (window as unknown as Record<string, unknown>)[WAVE_STARTER_KEYBOARD_GESTURE_CAPACITY_GLOBAL];
  return value && typeof value === 'object' ? value as WaveStarterKeyboardGestureCapacityReport : null;
}

export function readWaveStarterKeyboardCapacityPressureHint(): number {
  return 0;
}

export function formatWaveStarterKeyboardGestureCapacityUiValue(report: WaveStarterKeyboardGestureCapacityReport | null): string {
  if (!report?.lastDecision) return 'not-observed · 9061-Direktvertrag noch nicht getriggert · cold-report only';
  const d = report.lastDecision;
  return `${d.route} · 9061-direct/${d.reason} · no micro/worklet options · preview ${d.previewWave ? 'yes' : 'drop'} · events ${report.counters['keyboard-wave-event-9061-direct']}/${report.counters['keyboard-wave-event-preview-suppressed']} · report ${report.hotPathReportMode}`;
}
