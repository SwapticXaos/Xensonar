import { useRef, useState } from 'react';
import {
  createEmptyAudioBurstRecorderState,
  type AudioBurstRecorderState,
} from '../../soundLibrary/audioBurstRecorder';
import {
  createEmptyAudioTrafficForensicsState,
  type AudioTrafficForensicsState,
} from '../audioTraffic/audioTrafficForensics';
import type { AudioEventIntakeState } from '../../soundLibrary/audioEventIntake';
import type { QuantizeGrid } from '../domain/instrumentData';
import type { Room } from '../domain/runtimeTypes';

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
  stressScenarioId?: string;
};

export type AudioBurstExportContext = {
  room: Room;
  liveMasteringEnabled: boolean;
  gridTempoBpm: number;
  quantizeGrid: QuantizeGrid;
  particleQuantizeReferenceBars?: number;
  materialLoopActive: boolean;
  waveSoundEnabled: boolean;
  stressScenarioId?: string;
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
  stressScenarioId?: string;
};

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

export function appendAudioBurstSnapshotRuntime() {
  // Core test builds keep the recorder contract available without installing the full stress/forensics harness.
}

export function recordAudioBurstMarkerRuntime() {
  // Core test builds intentionally skip detailed burst marker recording; full builds keep the forensic recorder.
}

export function exportAudioBurstRecorderRuntime() {
  // Core test builds do not ship the full burst export harness.
}

export function useAudioBurstRecorderRuntimeBoundary() {
  const [audioBurstRecorder, setAudioBurstRecorder] = useState<AudioBurstRecorderState>(() => createEmptyAudioBurstRecorderState());
  const recorderRef = useRef<AudioBurstRecorderState>(createEmptyAudioBurstRecorderState());
  const trafficRef = useRef<AudioTrafficForensicsState>(createEmptyAudioTrafficForensicsState());
  const [audioPairTherapistStatus, setAudioPairTherapistStatus] = useState('');
  const activeStressScenarioId = 'core-runtime-minimal';
  const refs: AudioBurstRecorderRuntimeRefs = { recorderRef, trafficRef };
  const setters: AudioBurstRecorderRuntimeSetters = { setRecorder: setAudioBurstRecorder };

  return {
    audioBurstRecorder,
    audioPairTherapistStatus,
    setAudioPairTherapistStatus,
    recorderRef,
    trafficRef,
    activeStressScenarioId,
    setActiveStressScenarioId: () => undefined,
    appendSnapshot: () => undefined,
    recordMarker: () => undefined,
    start: () => startAudioBurstRecorderRuntime(refs, setters),
    stop: () => stopAudioBurstRecorderRuntime(refs, setters),
    clear: () => clearAudioBurstRecorderRuntime(refs, setters),
    exportLog: () => undefined,
  };
}
