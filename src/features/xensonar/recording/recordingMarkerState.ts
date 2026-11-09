import type { RecordingMarker } from '../domain/runtimeTypes';

export function appendRecordingMarkerState(args: {
  isRecording: boolean;
  startedAt: number;
  markers: RecordingMarker[];
  source: 'key' | 'logo' | 'side';
  createRecordingMarker: (startedAt: number, markerIndex: number) => RecordingMarker;
  formatRecordingMarkerMessage: (count: number, timeMs: number, source: 'key' | 'logo' | 'side') => string;
}) {
  const { isRecording, startedAt, markers, source, createRecordingMarker, formatRecordingMarkerMessage } = args;
  if (!isRecording) {
    return { accepted: false as const, nextMarkers: markers, nextMarker: null, message: '' };
  }
  const nextMarker = createRecordingMarker(startedAt, markers.length);
  const nextMarkers = [...markers, nextMarker];
  return {
    accepted: true as const,
    nextMarkers,
    nextMarker,
    message: formatRecordingMarkerMessage(nextMarkers.length, nextMarker.timeMs, source),
  };
}
