import { useEffect, useRef, useState } from 'react';
import { summarizeAudioTapState, type AudioTapMonitorSummary } from '../../soundLibrary/audioTapDiagnostics';
import {
  appendAudioBurstRecorderEntry,
  createAudioBurstRecorderLogPayload,
  createEmptyAudioBurstRecorderState,
  downloadAudioBurstRecorderLog,
  type AudioBurstRecorderState,
} from '../../soundLibrary/audioBurstRecorder';
import { createEmptyAudioTrafficForensicsState, snapshotAudioTrafficForensics, type AudioTrafficForensicsState } from '../audioTraffic/audioTrafficForensics';
import { snapshotAudioGraphConnectionRegistry } from '../audio/audioGraphConnectionRegistry';
import { snapshotLiveRuntimeDisposalRegistry } from '../runtime/liveRuntimeDisposalRegistry';
import { summarizeRecordingDisposalRegistry } from '../recording/recordingDisposalRegistry';
import { summarizeQuantizedTrafficTimerRegistry } from '../audioTraffic/quantizedTrafficTimerRegistry';
import { summarizeMaterialTrackLifecycleRegistry } from '../material/materialTrackLifecycleRegistry';
import { summarizeRootFollowLifecycleContractProbe } from '../rootFollow/rootFollowLifecycleContractProbe';
import { summarizeSpectralForgePreviewLifecycleRegistry } from '../../l3lab/spectralForge/lifecycle/spectralForgePreviewLifecycleRegistry';
import type { AudioEventIntakeState } from '../../soundLibrary/audioEventIntake';
import { buildBurstStressExportSlug, detectXensonarBrowserStressProfile, XENSONAR_DEFAULT_BURST_STRESS_SCENARIO_ID, type XensonarBurstStressScenarioId } from './burstStressScenarioContracts';
import type { QuantizeGrid } from '../domain/instrumentData';
import type { Room } from '../domain/runtimeTypes';

declare global {
  interface Window {
    __xensonarBurstStressHarness?: {
      version: 1;
      getScenario: () => XensonarBurstStressScenarioId;
      setScenario: (scenarioId: XensonarBurstStressScenarioId) => void;
      getRecorderState: () => AudioBurstRecorderState;
      start: () => void;
      stop: () => void;
      clear: () => void;
      snapshot: (windowMs?: number) => unknown;
      exportPayload: (metadata?: Record<string, unknown>) => unknown;
    };
  }
}

export type MutableRefLike<T> = { current: T };

export type AudioBurstRecorderRuntimeRefs = {
  recorderRef: MutableRefLike<AudioBurstRecorderState>;
  trafficRef: MutableRefLike<AudioTrafficForensicsState>;
};

export type AudioBurstRecorderRuntimeSetters = {
  setRecorder: (state: AudioBurstRecorderState) => void;
};

export type AudioBurstMarkerContext = {
  room: Room;
  audioNowSec: number | null;
  target: EventTarget | null;
  intakeState: AudioEventIntakeState;
  stressScenarioId?: XensonarBurstStressScenarioId;
};

export type AudioBurstExportContext = {
  room: Room;
  liveMasteringEnabled: boolean;
  gridTempoBpm: number;
  quantizeGrid: QuantizeGrid;
  particleQuantizeReferenceBars?: number;
  materialLoopActive: boolean;
  waveSoundEnabled: boolean;
  stressScenarioId?: XensonarBurstStressScenarioId;
};


export type AudioBurstLiveMasterMonitorSnapshot = {
  main: number;
  drone: number;
  rhythm: number;
  space: number;
  trim: number;
};

export type AudioBurstSnapshotContext = {
  nextState: AudioEventIntakeState;
  audioNowSec: number;
  activeVoices: number;
  room: Room;
  materialLoopActive: boolean;
  waveSoundEnabled: boolean;
  liveMasteringEnabled: boolean;
  liveMasterMonitor: AudioBurstLiveMasterMonitorSnapshot;
  stressScenarioId?: XensonarBurstStressScenarioId;
};

export function appendAudioBurstSnapshotRuntime(
  refs: AudioBurstRecorderRuntimeRefs,
  setters: AudioBurstRecorderRuntimeSetters,
  context: AudioBurstSnapshotContext,
) {
  if (!refs.recorderRef.current.isRecording) return;
  const tapSummary = summarizeAudioTapState(context.nextState);
  const recorderState = appendAudioBurstRecorderEntry(refs.recorderRef.current, {
    kind: 'snapshot',
    wallClockIso: new Date().toISOString(),
    perfNowMs: performance.now(),
    audioNowSec: context.audioNowSec,
    room: context.room,
    taps: tapSummary.taps,
    hottestTap: tapSummary.hottestTap,
    diagnosis: tapSummary.diagnosis,
    activeVoices: context.activeVoices,
    materialLoopActive: context.materialLoopActive,
    waveSoundEnabled: context.waveSoundEnabled,
    liveMasteringEnabled: context.liveMasteringEnabled,
    liveMasterMonitor: context.liveMasterMonitor,
    eventIntake: {
      pendingIntents: context.nextState.pendingIntents.slice(-12),
      latestDecisions: context.nextState.latestDecisions.slice(-24),
    },
    audioTraffic: {
      ...snapshotAudioTrafficForensics(refs.trafficRef.current, 1000, { scenarioId: context.stressScenarioId }),
      audioGraph: snapshotAudioGraphConnectionRegistry(),
      liveRuntime: snapshotLiveRuntimeDisposalRegistry(),
      recordingRuntime: summarizeRecordingDisposalRegistry(),
      quantizedTrafficRuntime: summarizeQuantizedTrafficTimerRegistry(),
      materialTrackRuntime: summarizeMaterialTrackLifecycleRegistry(),
      rootFollowLifecycle: summarizeRootFollowLifecycleContractProbe(),
      spectralForgeRuntime: summarizeSpectralForgePreviewLifecycleRegistry(),
    },
  });
  refs.recorderRef.current = recorderState;
  setters.setRecorder(recorderState);
}

export function useAudioBurstRecorderRuntimeBoundary() {
  const [audioBurstRecorder, setAudioBurstRecorder] = useState<AudioBurstRecorderState>(() => createEmptyAudioBurstRecorderState());
  const [activeStressScenarioId, setActiveStressScenarioId] = useState<XensonarBurstStressScenarioId>(XENSONAR_DEFAULT_BURST_STRESS_SCENARIO_ID);
  const recorderRef = useRef<AudioBurstRecorderState>(createEmptyAudioBurstRecorderState());
  const trafficRef = useRef<AudioTrafficForensicsState>(createEmptyAudioTrafficForensicsState());
  const [audioPairTherapistStatus, setAudioPairTherapistStatus] = useState('');
  const refs: AudioBurstRecorderRuntimeRefs = { recorderRef, trafficRef };
  const setters: AudioBurstRecorderRuntimeSetters = { setRecorder: setAudioBurstRecorder };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const harness = {
      version: 1 as const,
      getScenario: () => activeStressScenarioId,
      setScenario: (scenarioId: XensonarBurstStressScenarioId) => setActiveStressScenarioId(scenarioId),
      getRecorderState: () => recorderRef.current,
      start: () => startAudioBurstRecorderRuntime(refs, setters),
      stop: () => stopAudioBurstRecorderRuntime(refs, setters),
      clear: () => clearAudioBurstRecorderRuntime(refs, setters),
      snapshot: (windowMs = 1000) => snapshotAudioTrafficForensics(trafficRef.current, windowMs, { scenarioId: activeStressScenarioId }),
      exportPayload: (metadata: Record<string, unknown> = {}) => {
        const browserProfile = detectXensonarBrowserStressProfile();
        const stressSnapshot = snapshotAudioTrafficForensics(trafficRef.current, 1000, { scenarioId: activeStressScenarioId });
        return createAudioBurstRecorderLogPayload(recorderRef.current, {
          ...metadata,
          burstStressScenarioId: activeStressScenarioId,
          burstStressBrowserProfile: browserProfile,
          audioTraffic: stressSnapshot,
          suggestedFilename: buildBurstStressExportSlug({
            version: typeof metadata.version === 'string' ? metadata.version : 'xensonar',
            scenarioId: activeStressScenarioId,
            engineMode: stressSnapshot.stressComparison.rootFollowVoiceEngineMode,
            browserId: browserProfile.browserId,
          }),
        });
      },
    };
    window.__xensonarBurstStressHarness = harness;
    return () => {
      if (window.__xensonarBurstStressHarness === harness) {
        delete window.__xensonarBurstStressHarness;
      }
    };
  }, [activeStressScenarioId]);

  return {
    audioBurstRecorder,
    audioPairTherapistStatus,
    setAudioPairTherapistStatus,
    recorderRef,
    trafficRef,
    activeStressScenarioId,
    setActiveStressScenarioId,
    appendSnapshot: (context: AudioBurstSnapshotContext) => appendAudioBurstSnapshotRuntime(refs, setters, { ...context, stressScenarioId: activeStressScenarioId }),
    recordMarker: (context: AudioBurstMarkerContext) => recordAudioBurstMarkerRuntime(refs, setters, { ...context, stressScenarioId: activeStressScenarioId }),
    start: () => startAudioBurstRecorderRuntime(refs, setters),
    stop: () => stopAudioBurstRecorderRuntime(refs, setters),
    clear: () => clearAudioBurstRecorderRuntime(refs, setters),
    exportLog: (context: AudioBurstExportContext) => exportAudioBurstRecorderRuntime(refs, { ...context, stressScenarioId: context.stressScenarioId ?? activeStressScenarioId }),
  };
}

export function resetAudioTrafficForensics(ref: MutableRefLike<AudioTrafficForensicsState>) {
  ref.current = createEmptyAudioTrafficForensicsState();
}

export function startAudioBurstRecorderRuntime(
  refs: AudioBurstRecorderRuntimeRefs,
  setters: AudioBurstRecorderRuntimeSetters,
) {
  const next: AudioBurstRecorderState = {
    isRecording: true,
    startedAtIso: new Date().toISOString(),
    entries: [],
    markerCount: 0,
  };
  refs.recorderRef.current = next;
  resetAudioTrafficForensics(refs.trafficRef);
  setters.setRecorder(next);
}

export function stopAudioBurstRecorderRuntime(
  refs: Pick<AudioBurstRecorderRuntimeRefs, 'recorderRef'>,
  setters: AudioBurstRecorderRuntimeSetters,
) {
  const next: AudioBurstRecorderState = {
    ...refs.recorderRef.current,
    isRecording: false,
  };
  refs.recorderRef.current = next;
  setters.setRecorder(next);
}

export function clearAudioBurstRecorderRuntime(
  refs: AudioBurstRecorderRuntimeRefs,
  setters: AudioBurstRecorderRuntimeSetters,
) {
  const next = createEmptyAudioBurstRecorderState();
  refs.recorderRef.current = next;
  resetAudioTrafficForensics(refs.trafficRef);
  setters.setRecorder(next);
}

export function recordAudioBurstMarkerRuntime(
  refs: AudioBurstRecorderRuntimeRefs,
  setters: AudioBurstRecorderRuntimeSetters,
  context: AudioBurstMarkerContext,
) {
  if (!refs.recorderRef.current.isRecording) return;
  const element = context.target instanceof HTMLElement ? context.target : null;
  const tapSummary: AudioTapMonitorSummary = summarizeAudioTapState(context.intakeState);
  const recorderState = appendAudioBurstRecorderEntry(refs.recorderRef.current, {
    kind: 'marker',
    wallClockIso: new Date().toISOString(),
    perfNowMs: performance.now(),
    audioNowSec: context.audioNowSec,
    room: context.room,
    marker: 'backspace',
    targetTag: element?.tagName?.toLowerCase() ?? null,
    targetRole: element?.getAttribute('role') ?? null,
    note: 'Backspace markiert hörbares Knacken oder Aussetzen.',
    taps: tapSummary.taps,
    hottestTap: tapSummary.hottestTap,
    diagnosis: tapSummary.diagnosis,
    audioTraffic: {
      ...snapshotAudioTrafficForensics(refs.trafficRef.current, 1000, { scenarioId: context.stressScenarioId }),
      audioGraph: snapshotAudioGraphConnectionRegistry(),
      liveRuntime: snapshotLiveRuntimeDisposalRegistry(),
      recordingRuntime: summarizeRecordingDisposalRegistry(),
      quantizedTrafficRuntime: summarizeQuantizedTrafficTimerRegistry(),
      materialTrackRuntime: summarizeMaterialTrackLifecycleRegistry(),
      rootFollowLifecycle: summarizeRootFollowLifecycleContractProbe(),
      spectralForgeRuntime: summarizeSpectralForgePreviewLifecycleRegistry(),
    },
  });
  refs.recorderRef.current = recorderState;
  setters.setRecorder(recorderState);
}

export function exportAudioBurstRecorderRuntime(
  refs: AudioBurstRecorderRuntimeRefs,
  context: AudioBurstExportContext,
) {
  const browserProfile = detectXensonarBrowserStressProfile();
  const stressSnapshot = snapshotAudioTrafficForensics(refs.trafficRef.current, 1000, { scenarioId: context.stressScenarioId });
  downloadAudioBurstRecorderLog(refs.recorderRef.current, {
    room: context.room,
    liveMasteringEnabled: context.liveMasteringEnabled,
    gridTempoBpm: context.gridTempoBpm,
    quantizeGrid: context.quantizeGrid,
    materialLoopActive: context.materialLoopActive,
    waveSoundEnabled: context.waveSoundEnabled,
    burstStressScenarioId: context.stressScenarioId ?? XENSONAR_DEFAULT_BURST_STRESS_SCENARIO_ID,
    burstStressBrowserProfile: browserProfile,
    suggestedFilename: buildBurstStressExportSlug({
      version: '3.2.91.6.9.101',
      scenarioId: context.stressScenarioId ?? XENSONAR_DEFAULT_BURST_STRESS_SCENARIO_ID,
      engineMode: stressSnapshot.stressComparison.rootFollowVoiceEngineMode,
      browserId: browserProfile.browserId,
    }),
    audioTraffic: {
      ...stressSnapshot,
      audioGraph: snapshotAudioGraphConnectionRegistry(),
      liveRuntime: snapshotLiveRuntimeDisposalRegistry(),
      recordingRuntime: summarizeRecordingDisposalRegistry(),
      quantizedTrafficRuntime: summarizeQuantizedTrafficTimerRegistry(),
      materialTrackRuntime: summarizeMaterialTrackLifecycleRegistry(),
      rootFollowLifecycle: summarizeRootFollowLifecycleContractProbe(),
      spectralForgeRuntime: summarizeSpectralForgePreviewLifecycleRegistry(),
    },
    note: 'Backspace setzt Marker für hörbares Knacken oder Bursts. Szenario- und Browserprofil dienen nur der forensischen Vergleichbarkeit.',
  });
}
