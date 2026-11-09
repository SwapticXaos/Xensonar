import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { RecordingMarker, RecordingSourceMode, RecordingState } from '../domain/runtimeTypes';
import {
  markRecordingMaxDurationTimeoutReleased,
  markRecordingMediaRecorderFailed,
  markRecordingMediaRecorderReleased,
  registerRecordingMaxDurationTimeout,
  registerRecordingMediaRecorder,
} from './recordingDisposalRegistry';
import { addRecordingMarkerWorkflow, triggerLogoMarkerPulse } from './recordingMarkerWorkflow';
import type { LogoMarkerPulse } from './recordingMarkerWorkflowTypes';
import {
  buildRecordingActiveState,
  buildRecordingAudioInitErrorState,
  buildRecordingRecorderErrorState,
  createRecordingStopHandler,
  resetRecordingSession,
} from './recordingSessionWorkflow';

export function stopRecordingSession(args: {
  recordingStopTimerRef: MutableRefObject<number | null>;
  mediaRecorderRef: MutableRefObject<MediaRecorder | null>;
  setRecordingState: Dispatch<SetStateAction<RecordingState>>;
}) {
  const { recordingStopTimerRef, mediaRecorderRef, setRecordingState } = args;
  if (recordingStopTimerRef.current !== null) {
    window.clearTimeout(recordingStopTimerRef.current);
    markRecordingMaxDurationTimeoutReleased('recording-stop-cleared-timeout');
    recordingStopTimerRef.current = null;
  }
  const recorder = mediaRecorderRef.current;
  const shouldWaitForStopEvent = !!recorder && recorder.state !== 'inactive';
  if (shouldWaitForStopEvent) recorder.stop();
  else markRecordingMediaRecorderReleased('recording-stop-media-recorder-already-inactive');
  setRecordingState((prev) => ({ ...prev, isRecording: false }));
}

export async function startRecordingSession(args: {
  ensureAudioReady: () => Promise<AudioContext>;
  recordingSourceMode: RecordingSourceMode;
  lastRecordingSourceModeRef: MutableRefObject<RecordingSourceMode>;
  ensureRecordingDestination: (ctx: AudioContext, mode: RecordingSourceMode) => MediaStreamAudioDestinationNode | null;
  recordedBufferRef: MutableRefObject<AudioBuffer | null>;
  recordingChunksRef: MutableRefObject<Blob[]>;
  recordingStartAtRef: MutableRefObject<number | null>;
  recordingMarkersRef: MutableRefObject<RecordingMarker[]>;
  setRecordingMarkers: Dispatch<SetStateAction<RecordingMarker[]>>;
  setRecordingWaveform: Dispatch<SetStateAction<number[]>>;
  setRecordingCrop: Dispatch<SetStateAction<import('../domain/runtimeTypes').RecordingCropRange | null>>;
  setRecordingCropDraft: Dispatch<SetStateAction<import('../domain/runtimeTypes').RecordingCropRange | null>>;
  setRecordingPlayheadMs: Dispatch<SetStateAction<number>>;
  updateRecordingPreviewUrl: (blob: Blob | null) => void;
  getSupportedRecordingMimeType: () => string;
  mediaRecorderRef: MutableRefObject<MediaRecorder | null>;
  setRecordingState: Dispatch<SetStateAction<RecordingState>>;
  stopRecording: () => void;
  recordingStopTimerRef: MutableRefObject<number | null>;
  maxRecordingMs: number;
}) {
  const {
    ensureAudioReady,
    recordingSourceMode,
    lastRecordingSourceModeRef,
    ensureRecordingDestination,
    recordedBufferRef,
    recordingChunksRef,
    recordingStartAtRef,
    recordingMarkersRef,
    setRecordingMarkers,
    setRecordingWaveform,
    setRecordingCrop,
    setRecordingCropDraft,
    setRecordingPlayheadMs,
    updateRecordingPreviewUrl,
    getSupportedRecordingMimeType,
    mediaRecorderRef,
    setRecordingState,
    stopRecording,
    recordingStopTimerRef,
    maxRecordingMs,
  } = args;

  try {
    const ctx = await ensureAudioReady();
    const mode = recordingSourceMode;
    lastRecordingSourceModeRef.current = mode;
    const destination = ensureRecordingDestination(ctx, mode);
    if (!destination) return;

    resetRecordingSession({
      recordedBufferRef,
      recordingChunksRef,
      recordingStartAtRef,
      recordingMarkersRef,
      setRecordingMarkers,
      setRecordingWaveform,
      setRecordingCrop,
      setRecordingCropDraft,
      setRecordingPlayheadMs,
      updateRecordingPreviewUrl,
    });

    const mimeType = getSupportedRecordingMimeType();
    const recorder = mimeType ? new MediaRecorder(destination.stream, { mimeType }) : new MediaRecorder(destination.stream);
    mediaRecorderRef.current = recorder;
    registerRecordingMediaRecorder(mode, mimeType || 'default');

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) recordingChunksRef.current.push(event.data);
    };
    recorder.onerror = () => {
      markRecordingMediaRecorderFailed('recording-media-recorder-error-event');
      const nextState = buildRecordingRecorderErrorState();
      setRecordingState((prev) => ({ ...prev, ...nextState }));
    };
    recorder.onstop = createRecordingStopHandler({
      ctx,
      recorder,
      mimeType,
      recordingChunksRef,
      recordedBufferRef,
      recordingMarkersRef,
      lastRecordingSourceModeRef,
      updateRecordingPreviewUrl,
      setRecordingWaveform,
      setRecordingPlayheadMs,
      setRecordingState,
    });

    recorder.start(250);
    recordingStopTimerRef.current = window.setTimeout(() => stopRecording(), maxRecordingMs);
    registerRecordingMaxDurationTimeout(maxRecordingMs);
    const nextState = buildRecordingActiveState(mode);
    setRecordingState((prev) => ({ ...prev, ...nextState }));
  } catch {
    markRecordingMediaRecorderFailed('recording-audio-init-or-recorder-construction-failed');
    const nextState = buildRecordingAudioInitErrorState();
    setRecordingState((prev) => ({ ...prev, ...nextState }));
  }
}

export function addRecordingMarkerAction(args: {
  source?: 'key' | 'logo' | 'side';
  isRecording: boolean;
  recordingStartAtRef: MutableRefObject<number | null>;
  recordingMarkersRef: MutableRefObject<RecordingMarker[]>;
  setRecordingMarkers: Dispatch<SetStateAction<RecordingMarker[]>>;
  setRecordingState: Dispatch<SetStateAction<RecordingState>>;
  setLogoMarkerPulses: Dispatch<SetStateAction<LogoMarkerPulse[]>>;
}) {
  const {
    source = 'key',
    isRecording,
    recordingStartAtRef,
    recordingMarkersRef,
    setRecordingMarkers,
    setRecordingState,
    setLogoMarkerPulses,
  } = args;

  addRecordingMarkerWorkflow({
    source,
    isRecording,
    recordingStartAtRef,
    recordingMarkersRef,
    setRecordingMarkers,
    setRecordingState,
    onLogoPulse: () => triggerLogoMarkerPulse(setLogoMarkerPulses),
  });
}
