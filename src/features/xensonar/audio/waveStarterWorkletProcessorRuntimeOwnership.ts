import type { WaveStarterWorkletPilotSnapshot } from './waveStarterWorkletPilotBridge';
import type { WaveStarterWorkletVoicePoolRuntimeResult } from './waveStarterWorkletVoicePoolRuntime';
import {
  publishWaveStarterProcessorRuntimePressureFeedbackReport,
  type WaveStarterProcessorRuntimePressureFeedbackReport,
} from './waveStarterProcessorRuntimePressureFeedback';

export type WaveStarterWorkletProcessorRuntimeOwnershipReport = {
  version: 1;
  reportKind: 'xensonar-wave-starter-worklet-processor-runtime-ownership';
  generatedAtIso: string;
  lastResult: WaveStarterWorkletVoicePoolRuntimeResult | null;
  pilotReady: boolean;
  processorRuntimeOwnershipEnabled: boolean;
  processorRuntimeLegacyReferencePreserved: boolean;
  processorRuntimeVoicePoolReusesExistingRenderer: boolean;
  processorOwnsGestureQueueContract: true;
  processorOwnsSegmentClockContract: true;
  processorOwnsVoicePoolRuntime: boolean;
  synthProcessorRuntimePostedCount: number;
  sampleProcessorRuntimePostedCount: number;
  synthProcessorRuntimeAcceptedCount: number;
  sampleProcessorRuntimeAcceptedCount: number;
  synthProcessorRuntimeRejectedCount: number;
  sampleProcessorRuntimeRejectedCount: number;
  segmentClockPulseAcceptedCount: number;
  apostropheSafeExtendAcceptedCount: number;
  processorRuntimeRenderFrameCount: number;
  processorRuntimeRenderFrameDelta: number;
  lastSourceIntent: string | null;
  lastLane: string | null;
  lastExtendPolicy: string | null;
  lastVoiceSpecId: string | null;
  lastRejectReason: string | null;
  processorRuntimePressure: WaveStarterProcessorRuntimePressureFeedbackReport;
  processorOwnedHoldSchedulerEnabled: boolean;
  processorOwnedHoldSchedulerActive: boolean;
  processorOwnedHoldGestureActiveCount: number;
  processorOwnedHoldSegmentPulseCount: number;
  processorOwnedHoldSynthVoiceCreatedCount: number;
  processorOwnedHoldGestureStartAcceptedCount: number;
  processorOwnedHoldGestureUpdateAcceptedCount: number;
  processorOwnedHoldGestureReleaseAcceptedCount: number;
  processorOwnedHoldLastGestureId: string | null;
  processorOwnedHoldLastLane: string | null;
  processorOwnedHoldLastSegmentsPerBar: number | null;
  safeBecauseLegacyFallbackRemains: true;
  detail: string;
};

export const WAVE_STARTER_WORKLET_PROCESSOR_RUNTIME_OWNERSHIP_GLOBAL =
  '__XENSONAR_WAVE_STARTER_WORKLET_PROCESSOR_RUNTIME_OWNERSHIP__';

let lastReport: WaveStarterWorkletProcessorRuntimeOwnershipReport | null = null;

function n(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function buildWaveStarterWorkletProcessorRuntimeOwnershipReport(args: {
  pilotSnapshot: WaveStarterWorkletPilotSnapshot | null;
  lastResult: WaveStarterWorkletVoicePoolRuntimeResult | null;
}): WaveStarterWorkletProcessorRuntimeOwnershipReport {
  const pilot = args.pilotSnapshot;
  const pilotReady = !!(
    pilot &&
    pilot.keepAliveConnected &&
    pilot.outputConnected &&
    !pilot.errorMessage
  );
  const synthPosted = n(pilot?.processorRuntimeSynthVoicePostedCount);
  const samplePosted = n(pilot?.processorRuntimeSampleVoicePostedCount);
  const synthAccepted = n(pilot?.processorRuntimeSynthVoiceAcceptedCount);
  const sampleAccepted = n(pilot?.processorRuntimeSampleVoiceAcceptedCount);
  const processorRuntimePressure =
    publishWaveStarterProcessorRuntimePressureFeedbackReport(pilot ?? null);
  const report: WaveStarterWorkletProcessorRuntimeOwnershipReport = {
    version: 1,
    reportKind: 'xensonar-wave-starter-worklet-processor-runtime-ownership',
    generatedAtIso: new Date().toISOString(),
    lastResult: args.lastResult,
    pilotReady,
    processorRuntimeOwnershipEnabled:
      pilot?.processorRuntimeOwnershipEnabled === true,
    processorRuntimeLegacyReferencePreserved:
      pilot?.processorRuntimeLegacyReferencePreserved === true,
    processorRuntimeVoicePoolReusesExistingRenderer:
      pilot?.processorRuntimeVoicePoolReusesExistingRenderer === true,
    processorOwnsGestureQueueContract: true,
    processorOwnsSegmentClockContract: true,
    processorOwnsVoicePoolRuntime: synthAccepted + sampleAccepted > 0,
    synthProcessorRuntimePostedCount: synthPosted,
    sampleProcessorRuntimePostedCount: samplePosted,
    synthProcessorRuntimeAcceptedCount: synthAccepted,
    sampleProcessorRuntimeAcceptedCount: sampleAccepted,
    synthProcessorRuntimeRejectedCount: n(pilot?.processorRuntimeSynthVoiceRejectedCount),
    sampleProcessorRuntimeRejectedCount: n(pilot?.processorRuntimeSampleVoiceRejectedCount),
    segmentClockPulseAcceptedCount: n(pilot?.processorRuntimeSegmentClockPulseAcceptedCount),
    apostropheSafeExtendAcceptedCount: n(pilot?.processorRuntimeApostropheSafeExtendAcceptedCount),
    processorRuntimeRenderFrameCount: n(pilot?.processorRuntimeRenderFrameCount),
    processorRuntimeRenderFrameDelta: n(pilot?.processorRuntimeRenderFrameDelta),
    lastSourceIntent: pilot?.processorRuntimeLastSourceIntent ?? null,
    lastLane: pilot?.processorRuntimeLastLane ?? null,
    lastExtendPolicy: pilot?.processorRuntimeLastExtendPolicy ?? null,
    lastVoiceSpecId: pilot?.processorRuntimeLastVoiceSpecId ?? null,
    lastRejectReason: pilot?.processorRuntimeLastRejectReason ?? null,
    processorRuntimePressure,
    processorOwnedHoldSchedulerEnabled:
      pilot?.processorOwnedHoldSchedulerEnabled === true,
    processorOwnedHoldSchedulerActive:
      pilot?.processorOwnedHoldSchedulerActive === true,
    processorOwnedHoldGestureActiveCount: n(pilot?.processorOwnedHoldGestureActiveCount),
    processorOwnedHoldSegmentPulseCount: n(pilot?.processorOwnedHoldSegmentPulseCount),
    processorOwnedHoldSynthVoiceCreatedCount: n(pilot?.processorOwnedHoldSynthVoiceCreatedCount),
    processorOwnedHoldGestureStartAcceptedCount: n(pilot?.processorOwnedHoldGestureStartAcceptedCount),
    processorOwnedHoldGestureUpdateAcceptedCount: n(pilot?.processorOwnedHoldGestureUpdateAcceptedCount),
    processorOwnedHoldGestureReleaseAcceptedCount: n(pilot?.processorOwnedHoldGestureReleaseAcceptedCount),
    processorOwnedHoldLastGestureId: pilot?.processorOwnedHoldLastGestureId ?? null,
    processorOwnedHoldLastLane: pilot?.processorOwnedHoldLastLane ?? null,
    processorOwnedHoldLastSegmentsPerBar: pilot?.processorOwnedHoldLastSegmentsPerBar ?? null,
    safeBecauseLegacyFallbackRemains: true,
    detail:
      'Wellenstarter Gesture-/Keyboard-VoiceSpecs use explicit processor-runtime voice messages. The processor owns the voice-pool runtime contract and segment-clock metadata while reusing the proven synth/sample renderer; Legacy remains fail-open until the processor path is hörforensisch confirmed.',
  };
  return report;
}

export function publishWaveStarterWorkletProcessorRuntimeOwnershipReport(args: {
  pilotSnapshot: WaveStarterWorkletPilotSnapshot | null;
  lastResult: WaveStarterWorkletVoicePoolRuntimeResult | null;
}): WaveStarterWorkletProcessorRuntimeOwnershipReport {
  const report = buildWaveStarterWorkletProcessorRuntimeOwnershipReport(args);
  lastReport = report;
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>)[
      WAVE_STARTER_WORKLET_PROCESSOR_RUNTIME_OWNERSHIP_GLOBAL
    ] = report;
  }
  return report;
}

export function readWaveStarterWorkletProcessorRuntimeOwnershipReportFromBrowser(): WaveStarterWorkletProcessorRuntimeOwnershipReport | null {
  if (typeof window === 'undefined') return lastReport;
  const value = (window as unknown as Record<string, unknown>)[
    WAVE_STARTER_WORKLET_PROCESSOR_RUNTIME_OWNERSHIP_GLOBAL
  ];
  return value && typeof value === 'object'
    ? (value as WaveStarterWorkletProcessorRuntimeOwnershipReport)
    : lastReport;
}

export function formatWaveStarterWorkletProcessorRuntimeOwnershipUiValue(
  report: WaveStarterWorkletProcessorRuntimeOwnershipReport | null,
): string {
  if (!report)
    return 'not-observed · Processor-Runtime-Ownership noch nicht berührt';
  return `${report.pilotReady ? 'pilot ready' : 'pilot wait'} · own ${report.processorOwnsVoicePoolRuntime ? 'active' : 'pending'} · press ${report.processorRuntimePressure.processorPressureState}/${report.processorRuntimePressure.processorPressureScore.toFixed(2)} · Sy/Sa ${report.processorRuntimePressure.activeSynthVoices}/${report.processorRuntimePressure.activeSampleVoices} · Hold ${report.processorOwnedHoldSchedulerActive ? 'sched' : 'idle'} ${report.processorOwnedHoldGestureActiveCount}/${report.processorOwnedHoldSegmentPulseCount} · extend ${report.apostropheSafeExtendAcceptedCount} · frames ${report.processorRuntimeRenderFrameDelta}`;
}
