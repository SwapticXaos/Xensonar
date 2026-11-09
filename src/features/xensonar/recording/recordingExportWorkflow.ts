import { encodeWavBlob } from '../helpers';
import type { RecordingCropRange, RecordingMarker, RecordingSourceMode } from '../domain/runtimeTypes';
import { buildRecordingDownloadFilename, markRecordingMarkersUsedInRange } from './recordingTimelineUtils';
import { formatRecordingExportReadyMessage, resolveRecordingExportAudio } from './recordingExportHelpers';
import { triggerBlobDownload } from './objectUrlUtils';

export function performRecordingWavExport(args: {
  buffer: AudioBuffer | null;
  range?: RecordingCropRange | null;
  filenameBase: string;
  sourceMode: RecordingSourceMode;
  markers: RecordingMarker[];
}) {
  const { buffer, range = null, filenameBase, sourceMode, markers } = args;
  if (!buffer) {
    throw new Error('Keine Aufnahme verfuegbar.');
  }

  const { left, right, effectiveDurationMs } = resolveRecordingExportAudio(buffer, range);
  const wavBlob = encodeWavBlob(left, right, buffer.sampleRate);
  if (!wavBlob.size) throw new Error('WAV-Blob ist leer.');

  const filename = buildRecordingDownloadFilename(filenameBase, sourceMode, effectiveDurationMs, range);
  triggerBlobDownload(wavBlob, filename);

  return {
    nextMarkers: range ? markRecordingMarkersUsedInRange(markers, range) : markers,
    exportMessage: formatRecordingExportReadyMessage(range, wavBlob.size),
    debugLabel: range ? `crop start=${range.startMs} end=${range.endMs} duration=${effectiveDurationMs}` : `full duration=${effectiveDurationMs}`,
    wavBlob,
  };
}
