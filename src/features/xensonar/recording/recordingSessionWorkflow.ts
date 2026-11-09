import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { MAX_RECORDING_MS, clamp } from '../rooms/resonanceRuntimeMath';
import { buildWaveformPeaks } from './recordingBufferUtils';
import { markRecordingMediaRecorderReleased } from './recordingDisposalRegistry';
import type { RecordingCropRange, RecordingMarker, RecordingSourceMode, RecordingState } from '../domain/runtimeTypes';

export type RecordingDestinationResolverArgs = {
  ctx: AudioContext;
  mode: RecordingSourceMode;
  recordingDestinationWithoutDrumsRef: MutableRefObject<MediaStreamAudioDestinationNode | null>;
  recordingDestinationWithDrumsRef: MutableRefObject<MediaStreamAudioDestinationNode | null>;
  ensureNoDrumRecordTap: (ctx: AudioContext) => AudioNode | null;
  finalOutputTrimRef: MutableRefObject<AudioNode | null>;
  ensureFinalMixBus: (ctx: AudioContext) => AudioNode;
};

export function ensureRecordingDestination(args: RecordingDestinationResolverArgs) {
  const {
    ctx,
    mode,
    recordingDestinationWithoutDrumsRef,
    recordingDestinationWithDrumsRef,
    ensureNoDrumRecordTap,
    finalOutputTrimRef,
    ensureFinalMixBus,
  } = args;

  if (mode === 'without_drums') {
    if (!recordingDestinationWithoutDrumsRef.current) {
      const destination = ctx.createMediaStreamDestination();
      ensureNoDrumRecordTap(ctx)?.connect(destination);
      recordingDestinationWithoutDrumsRef.current = destination;
    }
    return recordingDestinationWithoutDrumsRef.current;
  }

  if (!recordingDestinationWithDrumsRef.current) {
    const destination = ctx.createMediaStreamDestination();
    (finalOutputTrimRef.current ?? ensureFinalMixBus(ctx)).connect(destination);
    recordingDestinationWithDrumsRef.current = destination;
  }
  return recordingDestinationWithDrumsRef.current;
}

export type ResetRecordingSessionArgs = {
  recordedBufferRef: MutableRefObject<AudioBuffer | null>;
  recordingChunksRef: MutableRefObject<Blob[]>;
  recordingStartAtRef: MutableRefObject<number | null>;
  recordingMarkersRef: MutableRefObject<RecordingMarker[]>;
  setRecordingMarkers: Dispatch<SetStateAction<RecordingMarker[]>>;
  setRecordingWaveform: Dispatch<SetStateAction<number[]>>;
  setRecordingCrop: Dispatch<SetStateAction<RecordingCropRange | null>>;
  setRecordingCropDraft: Dispatch<SetStateAction<RecordingCropRange | null>>;
  setRecordingPlayheadMs: Dispatch<SetStateAction<number>>;
  updateRecordingPreviewUrl: (blob: Blob | null) => void;
};

export function resetRecordingSession(args: ResetRecordingSessionArgs) {
  const {
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
  } = args;

  recordedBufferRef.current = null;
  recordingChunksRef.current = [];
  recordingStartAtRef.current = performance.now();
  recordingMarkersRef.current = [];
  setRecordingMarkers([]);
  setRecordingWaveform([]);
  setRecordingCrop(null);
  setRecordingCropDraft(null);
  setRecordingPlayheadMs(0);
  updateRecordingPreviewUrl(null);
}

export function buildRecordingModeLabel(mode: RecordingSourceMode) {
  return mode === 'without_drums' ? 'ohne Drums' : 'mit Drums';
}

export function buildRecordingActiveState(mode: RecordingSourceMode): Pick<RecordingState, 'isRecording' | 'hasTake' | 'durationMs' | 'exportStatus' | 'exportMessage'> {
  const modeLabel = buildRecordingModeLabel(mode);
  return {
    isRecording: true,
    hasTake: false,
    durationMs: 0,
    exportStatus: 'idle',
    exportMessage: `Aufnahme laeuft (${modeLabel})...`,
  };
}

export function buildRecordingRecorderErrorState(): Pick<RecordingState, 'isRecording' | 'exportStatus' | 'exportMessage'> {
  return {
    isRecording: false,
    exportStatus: 'error',
    exportMessage: 'Recorder-Fehler.',
  };
}

export function buildRecordingAudioInitErrorState(): Pick<RecordingState, 'isRecording' | 'exportStatus' | 'exportMessage'> {
  return {
    isRecording: false,
    exportStatus: 'error',
    exportMessage: 'Audio konnte nicht initialisiert werden.',
  };
}

export function buildRecordingDecodeErrorState(): Pick<RecordingState, 'isRecording' | 'hasTake' | 'exportStatus' | 'exportMessage'> {
  return {
    isRecording: false,
    hasTake: false,
    exportStatus: 'error',
    exportMessage: 'Take konnte nicht dekodiert werden.',
  };
}

export function buildRecordingReadyState(args: {
  mode: RecordingSourceMode;
  decoded: AudioBuffer;
  markerCount: number;
}): Pick<RecordingState, 'isRecording' | 'durationMs' | 'hasTake' | 'exportStatus' | 'exportMessage'> {
  const { mode, decoded, markerCount } = args;
  const modeLabel = buildRecordingModeLabel(mode);
  return {
    isRecording: false,
    durationMs: Math.min(MAX_RECORDING_MS, Math.round(decoded.duration * 1000)),
    hasTake: decoded.duration > 0,
    exportStatus: 'ready',
    exportMessage: markerCount > 0 ? `Take bereit (${modeLabel}, ${markerCount} Marker).` : `Take bereit (${modeLabel}).`,
  };
}

export function resolveRecordingDurationMs(startedAt: number, now = performance.now()) {
  return clamp(Math.round(now - startedAt), 0, MAX_RECORDING_MS);
}

export type CreateRecordingStopHandlerArgs = {
  ctx: AudioContext;
  recorder: MediaRecorder;
  mimeType: string;
  recordingChunksRef: MutableRefObject<Blob[]>;
  recordedBufferRef: MutableRefObject<AudioBuffer | null>;
  recordingMarkersRef: MutableRefObject<RecordingMarker[]>;
  lastRecordingSourceModeRef: MutableRefObject<RecordingSourceMode>;
  updateRecordingPreviewUrl: (blob: Blob | null) => void;
  setRecordingWaveform: Dispatch<SetStateAction<number[]>>;
  setRecordingPlayheadMs: Dispatch<SetStateAction<number>>;
  setRecordingState: Dispatch<SetStateAction<RecordingState>>;
};

export function createRecordingStopHandler(args: CreateRecordingStopHandlerArgs) {
  const {
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
  } = args;

  return async () => {
    try {
      const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || mimeType || 'audio/webm' });
      updateRecordingPreviewUrl(blob);
      const arrayBuffer = await blob.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
      recordedBufferRef.current = decoded;
      setRecordingWaveform(buildWaveformPeaks(decoded));
      setRecordingPlayheadMs(0);
      const markerCount = recordingMarkersRef.current.length;
      const nextState = buildRecordingReadyState({
        mode: lastRecordingSourceModeRef.current,
        decoded,
        markerCount,
      });
      setRecordingState((prev) => ({ ...prev, ...nextState }));
    } catch {
      updateRecordingPreviewUrl(null);
      const nextState = buildRecordingDecodeErrorState();
      setRecordingState((prev) => ({ ...prev, ...nextState }));
    } finally {
      markRecordingMediaRecorderReleased('recording-media-recorder-onstop-completed');
    }
  };
}
