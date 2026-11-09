import type { RecordingCropRange, RecordingMarker, RecordingSourceMode } from '../domain/runtimeTypes';
import { AUDIO_CUT_UPLOAD_SOURCES, createAudioCutUploadEntryRequest, dispatchAudioCutUploadEntryRequest } from '../domain/audioCutUploadEntryRequest';
import { encodeWavBlob } from '../helpers';
import { markCutUploadHandoffWindowScrollRestoreSuppressed } from '../domain/cutUploadHandoffWindowScroll';
import { resolveRecordingExportAudio } from './recordingExportHelpers';
import { buildRecordingDownloadFilename, markRecordingMarkersUsedInRange } from './recordingTimelineUtils';

export function buildRecordingTakeMaterialForgeFile(args: {
  buffer: AudioBuffer;
  range?: RecordingCropRange | null;
  filenameBase: string;
  sourceMode: RecordingSourceMode;
}): { file: File; effectiveDurationMs: number; filename: string; isCrop: boolean } {
  const { buffer, range = null, filenameBase, sourceMode } = args;
  const { left, right, effectiveDurationMs } = resolveRecordingExportAudio(buffer, range);
  const wavBlob = encodeWavBlob(left, right, buffer.sampleRate);
  if (!wavBlob.size) throw new Error('WAV-Blob ist leer.');
  const downloadFilename = buildRecordingDownloadFilename(filenameBase, sourceMode, effectiveDurationMs, range);
  const filename = downloadFilename.replace(/\.wav$/i, '-materialschmiede.wav');
  const file = new File([wavBlob], filename, { type: wavBlob.type || 'audio/wav', lastModified: Date.now() });
  return { file, effectiveDurationMs, filename, isCrop: !!range };
}

export function sendRecordingTakeToMaterialForge(args: {
  buffer: AudioBuffer | null;
  range?: RecordingCropRange | null;
  filenameBase: string;
  sourceMode: RecordingSourceMode;
  markers: RecordingMarker[];
}): { nextMarkers: RecordingMarker[]; exportMessage: string; debugLabel: string } {
  const { buffer, range = null, filenameBase, sourceMode, markers } = args;
  if (!buffer) throw new Error('Keine Aufnahme verfuegbar.');
  const result = buildRecordingTakeMaterialForgeFile({ buffer, range, filenameBase, sourceMode });
  const request = createAudioCutUploadEntryRequest(result.file, AUDIO_CUT_UPLOAD_SOURCES.MASTER_RECORDING_RACK);
  markCutUploadHandoffWindowScrollRestoreSuppressed();
  dispatchAudioCutUploadEntryRequest(request);
  return {
    nextMarkers: range ? markRecordingMarkersUsedInRange(markers, range) : markers,
    exportMessage: `${result.isCrop ? 'Crop' : 'Take'} zur Materialschmiede gesendet (${(result.file.size / 1024 / 1024).toFixed(2)} MB).`,
    debugLabel: result.isCrop
      ? `materialforge-send crop duration=${result.effectiveDurationMs} filename=${result.filename}`
      : `materialforge-send full duration=${result.effectiveDurationMs} filename=${result.filename}`,
  };
}
