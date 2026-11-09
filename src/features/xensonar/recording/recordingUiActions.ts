import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { RecordingCropRange, RecordingMarker, RecordingSourceMode, RecordingState } from '../domain/runtimeTypes';
import { beginRecordingTimelineSelection } from './recordingTimelineDragWorkflow';
import { replaceManagedObjectUrl } from './objectUrlUtils';
import { performRecordingWavExport } from './recordingExportWorkflow';
import { sendRecordingTakeToMaterialForge } from './recordingMaterialForgeSend';

export function updateRecordingPreviewUrlState(args: {
  blob: Blob | null;
  recordingPreviewUrlRef: MutableRefObject<string | null>;
  setRecordingPreviewUrl: Dispatch<SetStateAction<string | null>>;
}) {
  const { blob, recordingPreviewUrlRef, setRecordingPreviewUrl } = args;
  const nextUrl = replaceManagedObjectUrl(recordingPreviewUrlRef.current, blob);
  recordingPreviewUrlRef.current = nextUrl;
  setRecordingPreviewUrl(nextUrl);
}

export function exportRecordingBufferRange(args: {
  range?: RecordingCropRange | null;
  recordedBufferRef: MutableRefObject<AudioBuffer | null>;
  filenameBase: string;
  lastRecordingSourceModeRef: MutableRefObject<RecordingSourceMode>;
  recordingMarkersRef: MutableRefObject<RecordingMarker[]>;
  setRecordingMarkers: Dispatch<SetStateAction<RecordingMarker[]>>;
  setRecordingState: Dispatch<SetStateAction<RecordingState>>;
}) {
  const {
    range = null,
    recordedBufferRef,
    filenameBase,
    lastRecordingSourceModeRef,
    recordingMarkersRef,
    setRecordingMarkers,
    setRecordingState,
  } = args;

  const debugSteps: string[] = [];
  const buffer = recordedBufferRef.current;
  if (!buffer) {
    debugSteps.push('export:missing-buffer');
    console.error('[xensonar] wav export failed', { debugSteps });
    setRecordingState((prev) => ({ ...prev, exportStatus: 'error', exportMessage: 'Keine Aufnahme verfuegbar.' }));
    return;
  }

  try {
    const isCrop = !!range;
    setRecordingState((prev) => ({
      ...prev,
      exportStatus: 'encoding',
      exportMessage: isCrop ? 'Crop wird vorbereitet...' : 'WAV wird vorbereitet...',
    }));
    debugSteps.push(`export:buffer duration=${buffer.duration.toFixed(3)} channels=${buffer.numberOfChannels} sampleRate=${buffer.sampleRate}`);

    const result = performRecordingWavExport({
      buffer,
      range,
      filenameBase,
      sourceMode: lastRecordingSourceModeRef.current,
      markers: recordingMarkersRef.current,
    });
    debugSteps.push(`export:${result.debugLabel}`);
    debugSteps.push(`export:wavBlob type=${result.wavBlob.type} size=${result.wavBlob.size}`);

    if (range) {
      recordingMarkersRef.current = result.nextMarkers;
      setRecordingMarkers(result.nextMarkers);
    }

    setRecordingState((prev) => ({
      ...prev,
      exportStatus: 'ready',
      exportMessage: result.exportMessage,
    }));
  } catch (error) {
    console.error('[xensonar] wav export failed', { error, debugSteps });
    const msg = error instanceof Error ? error.message : 'Unbekannter Fehler';
    setRecordingState((prev) => ({ ...prev, exportStatus: 'error', exportMessage: `WAV-Export fehlgeschlagen: ${msg}` }));
  }
}


export function sendRecordingBufferRangeToMaterialForge(args: {
  range?: RecordingCropRange | null;
  recordedBufferRef: MutableRefObject<AudioBuffer | null>;
  filenameBase: string;
  lastRecordingSourceModeRef: MutableRefObject<RecordingSourceMode>;
  recordingMarkersRef: MutableRefObject<RecordingMarker[]>;
  setRecordingMarkers: Dispatch<SetStateAction<RecordingMarker[]>>;
  setRecordingState: Dispatch<SetStateAction<RecordingState>>;
}) {
  const {
    range = null,
    recordedBufferRef,
    filenameBase,
    lastRecordingSourceModeRef,
    recordingMarkersRef,
    setRecordingMarkers,
    setRecordingState,
  } = args;

  const debugSteps: string[] = [];
  const buffer = recordedBufferRef.current;
  if (!buffer) {
    debugSteps.push('materialforge-send:missing-buffer');
    console.error('[xensonar] materialschmiede send failed', { debugSteps });
    setRecordingState((prev) => ({ ...prev, exportStatus: 'error', exportMessage: 'Keine Aufnahme verfuegbar.' }));
    return;
  }

  try {
    const isCrop = !!range;
    setRecordingState((prev) => ({
      ...prev,
      exportStatus: 'encoding',
      exportMessage: isCrop ? 'Crop wird zur Materialschmiede vorbereitet...' : 'Take wird zur Materialschmiede vorbereitet...',
    }));
    debugSteps.push(`materialforge-send:buffer duration=${buffer.duration.toFixed(3)} channels=${buffer.numberOfChannels} sampleRate=${buffer.sampleRate}`);
    const result = sendRecordingTakeToMaterialForge({
      buffer,
      range,
      filenameBase,
      sourceMode: lastRecordingSourceModeRef.current,
      markers: recordingMarkersRef.current,
    });
    debugSteps.push(result.debugLabel);
    if (range) {
      recordingMarkersRef.current = result.nextMarkers;
      setRecordingMarkers(result.nextMarkers);
    }
    setRecordingState((prev) => ({
      ...prev,
      exportStatus: 'ready',
      exportMessage: result.exportMessage,
    }));
  } catch (error) {
    console.error('[xensonar] materialschmiede send failed', { error, debugSteps });
    const msg = error instanceof Error ? error.message : 'Unbekannter Fehler';
    setRecordingState((prev) => ({ ...prev, exportStatus: 'error', exportMessage: `Materialschmiede-Senden fehlgeschlagen: ${msg}` }));
  }
}

export function handleRecordingTimelinePointerDown(args: {
  event: { clientX: number };
  hasTake: boolean;
  timelineElement: HTMLDivElement | null;
  previewAudio: HTMLAudioElement | null;
  recordedBuffer: AudioBuffer | null;
  fallbackDurationMs: number;
  setRecordingCropDraft: Dispatch<SetStateAction<RecordingCropRange | null>>;
  setRecordingCrop: Dispatch<SetStateAction<RecordingCropRange | null>>;
}) {
  beginRecordingTimelineSelection(args);
}
