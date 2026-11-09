import type { WaveStarterCongestionState } from './waveStarterAttackIntegrityCongestionBrake';
import type { WaveStarterWorkletPilotSnapshot } from './waveStarterWorkletPilotBridge';

export type WaveStarterProcessorRuntimePressureFeedbackReport = {
  version: 1;
  reportKind: 'xensonar-wave-starter-processor-runtime-pressure-feedback';
  generatedAtIso: string;
  processorPressureState: WaveStarterCongestionState;
  processorPressureScore: number;
  processorQueuePressureApprox: number;
  activeSynthVoices: number;
  activeSampleVoices: number;
  acceptedRuntimeVoices: number;
  rejectedRuntimeVoices: number;
  stolenRuntimeVoices: number;
  stealFadeTailPressure: number;
  segmentClockPulseAcceptedCount: number;
  apostropheExtendAcceptedCount: number;
  renderFrameDelta: number;
  compactFeedback: true;
  safeForCongestionBarometer: true;
  detail: string;
};

export const WAVE_STARTER_PROCESSOR_RUNTIME_PRESSURE_FEEDBACK_GLOBAL =
  '__XENSONAR_WAVE_STARTER_PROCESSOR_RUNTIME_PRESSURE_FEEDBACK__';

let lastReport: WaveStarterProcessorRuntimePressureFeedbackReport | null = null;

const n = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function round3(value: number) {
  return Number.isFinite(value) ? Number(value.toFixed(3)) : 0;
}

function stateFromScore(score: number): WaveStarterCongestionState {
  if (score >= 0.92) return 'critical';
  if (score >= 0.72) return 'brake';
  if (score >= 0.46) return 'watch';
  return 'clear';
}

export function buildWaveStarterProcessorRuntimePressureFeedbackReport(
  snapshot: WaveStarterWorkletPilotSnapshot | null,
): WaveStarterProcessorRuntimePressureFeedbackReport {
  const activeSynthVoices = n(snapshot?.processorRuntimeActiveSynthVoices);
  const activeSampleVoices = n(snapshot?.processorRuntimeActiveSampleVoices);
  const acceptedRuntimeVoices =
    n(snapshot?.processorRuntimeSynthVoiceAcceptedCount) +
    n(snapshot?.processorRuntimeSampleVoiceAcceptedCount);
  const rejectedRuntimeVoices =
    n(snapshot?.processorRuntimeSynthVoiceRejectedCount) +
    n(snapshot?.processorRuntimeSampleVoiceRejectedCount);
  const stolenRuntimeVoices = n(snapshot?.processorRuntimeStolenVoiceCount);
  const stealFadeTailPressure = clamp01(n(snapshot?.processorRuntimeStealFadeTailPressure));
  const queuePressureApprox = clamp01(n(snapshot?.processorRuntimeQueuePressureApprox));
  const activeVoicePressure = clamp01(
    activeSynthVoices / Math.max(1, n(snapshot?.synthFailoverVoicePoolMaxVoices) || 32),
  ) * 0.58 + clamp01(
    activeSampleVoices / Math.max(1, n(snapshot?.sampleFailoverVoicePoolMaxVoices) || 16),
  ) * 0.42;
  const rejectPressure = clamp01(rejectedRuntimeVoices / Math.max(1, acceptedRuntimeVoices + rejectedRuntimeVoices));
  const framePressure = clamp01(n(snapshot?.processorRuntimeRenderFrameDelta) / 4096);
  const processorPressureScore = round3(
    Math.max(queuePressureApprox, activeVoicePressure, stealFadeTailPressure, rejectPressure * 0.65, framePressure * 0.4),
  );
  return {
    version: 1,
    reportKind: 'xensonar-wave-starter-processor-runtime-pressure-feedback',
    generatedAtIso: new Date().toISOString(),
    processorPressureState:
      typeof snapshot?.processorRuntimePressureState === 'string'
        ? (snapshot.processorRuntimePressureState as WaveStarterCongestionState)
        : stateFromScore(processorPressureScore),
    processorPressureScore,
    processorQueuePressureApprox: queuePressureApprox,
    activeSynthVoices,
    activeSampleVoices,
    acceptedRuntimeVoices,
    rejectedRuntimeVoices,
    stolenRuntimeVoices,
    stealFadeTailPressure: round3(stealFadeTailPressure),
    segmentClockPulseAcceptedCount: n(snapshot?.processorRuntimeSegmentClockPulseAcceptedCount),
    apostropheExtendAcceptedCount: n(snapshot?.processorRuntimeApostropheSafeExtendAcceptedCount),
    renderFrameDelta: n(snapshot?.processorRuntimeRenderFrameDelta),
    compactFeedback: true,
    safeForCongestionBarometer: true,
    detail:
      'Kompakte Worklet-Prozessor-Druckrückmeldung: aktive Runtime-Stimmen, Queue-Druck, Steal-/Tail-Druck und accepted/rejected Runtime-Voices werden verdichtet und dürfen das Congestion-Barometer informieren, ohne globale Attack-Defaults zu ändern.',
  };
}

export function publishWaveStarterProcessorRuntimePressureFeedbackReport(
  snapshot: WaveStarterWorkletPilotSnapshot | null,
): WaveStarterProcessorRuntimePressureFeedbackReport {
  const report = buildWaveStarterProcessorRuntimePressureFeedbackReport(snapshot);
  lastReport = report;
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>)[
      WAVE_STARTER_PROCESSOR_RUNTIME_PRESSURE_FEEDBACK_GLOBAL
    ] = report;
  }
  return report;
}

export function readWaveStarterProcessorRuntimePressureFeedbackReportFromBrowser(): WaveStarterProcessorRuntimePressureFeedbackReport | null {
  if (typeof window === 'undefined') return lastReport;
  const value = (window as unknown as Record<string, unknown>)[
    WAVE_STARTER_PROCESSOR_RUNTIME_PRESSURE_FEEDBACK_GLOBAL
  ];
  return value && typeof value === 'object'
    ? (value as WaveStarterProcessorRuntimePressureFeedbackReport)
    : lastReport;
}

export function resolveWaveStarterProcessorPressureBias(
  report: WaveStarterProcessorRuntimePressureFeedbackReport | null,
): number {
  if (!report) return 0;
  return clamp01(report.processorPressureScore);
}

export function formatWaveStarterProcessorRuntimePressureFeedbackUiValue(
  report: WaveStarterProcessorRuntimePressureFeedbackReport | null,
): string {
  if (!report) return 'not-observed · Prozessor-Druckrückmeldung noch nicht empfangen';
  return `${report.processorPressureState} · score ${report.processorPressureScore.toFixed(2)} · active Sy/Sa ${report.activeSynthVoices}/${report.activeSampleVoices} · q ${report.processorQueuePressureApprox.toFixed(2)} · steal ${report.stolenRuntimeVoices}/${report.stealFadeTailPressure.toFixed(2)} · ack/rej ${report.acceptedRuntimeVoices}/${report.rejectedRuntimeVoices}`;
}
