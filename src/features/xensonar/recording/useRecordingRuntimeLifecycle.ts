import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { RecordingMarker, RecordingState } from '../domain/runtimeTypes';
import { clamp } from '../rooms/resonanceRuntimeMath';
import { registerRecordingMarkerHotkeyListener } from './recordingDisposalRegistry';
import { revokeManagedObjectUrl } from './objectUrlUtils';
import {
  cleanupRecordingRuntime,
  createRecordingMarkerHotkeyHandler,
  startRecordingDurationDisplaySecondTick,
  startRecordingPreviewPlayheadLoop,
} from './recordingEffectHandlers';
import { resolveRecordingDurationMs } from './recordingSessionWorkflow';

type MutableRef<T> = { current: T };

type UseRecordingRuntimeLifecycleArgs = {
  recordingMarkers: RecordingMarker[];
  recordingMarkersRef: MutableRef<RecordingMarker[]>;
  recordingPreviewUrlRef: MutableRef<string | null>;
  recordingState: RecordingState;
  recordingStartAtRef: MutableRef<number | null>;
  setRecordingState: Dispatch<SetStateAction<RecordingState>>;
  addRecordingMarker: (source?: 'key' | 'logo' | 'side') => boolean;
  isEditableTarget: (target: EventTarget | null) => boolean;
  isForgeHotkeyTarget: (target: EventTarget | null) => boolean;
  recordingPreviewUrl: string | null;
  recordingPreviewAudioRef: MutableRef<HTMLAudioElement | null>;
  recordedBufferRef: MutableRef<AudioBuffer | null>;
  setRecordingPlayheadMs: Dispatch<SetStateAction<number>>;
  recordingStopTimerRef: MutableRef<number | null>;
  mediaRecorderRef: MutableRef<MediaRecorder | null>;
};

export function useRecordingRuntimeLifecycle(args: UseRecordingRuntimeLifecycleArgs): void {
  const {
    recordingMarkers,
    recordingMarkersRef,
    recordingPreviewUrlRef,
    recordingState,
    recordingStartAtRef,
    setRecordingState,
    addRecordingMarker,
    isEditableTarget,
    isForgeHotkeyTarget,
    recordingPreviewUrl,
    recordingPreviewAudioRef,
    recordedBufferRef,
    setRecordingPlayheadMs,
    recordingStopTimerRef,
    mediaRecorderRef,
  } = args;

  useEffect(() => {
    recordingMarkersRef.current = recordingMarkers;
  }, [recordingMarkers]);

  useEffect(() => {
    return () => {
      revokeManagedObjectUrl(recordingPreviewUrlRef.current);
      recordingPreviewUrlRef.current = null;
    };
  }, []);

  useEffect(() => startRecordingDurationDisplaySecondTick({
    isRecording: recordingState.isRecording,
    recordingStartAtRef,
    setRecordingState,
    resolveRecordingDurationMs,
  }), [recordingState.isRecording]);

  useEffect(() => {
    if (!recordingState.isRecording) return;
    const handleRecordingMarkerKey = createRecordingMarkerHotkeyHandler({
      addRecordingMarker,
      isEditableTarget,
      isForgeHotkeyTarget,
    });

    const hotkeyListener = registerRecordingMarkerHotkeyListener();
    window.addEventListener('keydown', handleRecordingMarkerKey);
    return () => {
      window.removeEventListener('keydown', handleRecordingMarkerKey);
      hotkeyListener.markReleased('recording-marker-hotkey-listener-removed');
    };
  }, [recordingState.isRecording]);

  useEffect(() => startRecordingPreviewPlayheadLoop({
    recordingPreviewUrl,
    recordingPreviewAudioRef,
    recordedBufferRef,
    fallbackDurationMs: recordingState.durationMs,
    setRecordingPlayheadMs,
    clampValue: clamp,
  }), [recordingPreviewUrl, recordingState.durationMs]);

  useEffect(() => {
    return () => cleanupRecordingRuntime({
      recordingStopTimerRef,
      mediaRecorderRef,
      recordingPreviewUrlRef,
      revokeManagedObjectUrl,
    });
  }, []);
}
