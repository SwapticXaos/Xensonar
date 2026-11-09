import type { RecordingCropRange, RecordingMarker, RecordingSourceMode } from '../domain/runtimeTypes';
import { formatDuration } from '../helpers';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function getRecordingTimelineDurationMs(recordedBuffer: AudioBuffer | null, fallbackDurationMs: number): number {
  if (recordedBuffer) return Math.round(recordedBuffer.duration * 1000);
  return fallbackDurationMs;
}

export function getRecordingTimelineRatioFromClientX(element: HTMLDivElement | null, clientX: number): number {
  if (!element) return 0;
  const rect = element.getBoundingClientRect();
  if (!rect.width) return 0;
  return clamp((clientX - rect.left) / rect.width, 0, 1);
}

export function markRecordingMarkersUsedInRange(markers: RecordingMarker[], range: RecordingCropRange): RecordingMarker[] {
  return markers.map((marker) => (
    marker.timeMs >= range.startMs && marker.timeMs <= range.endMs
      ? { ...marker, usedInCrop: true }
      : marker
  ));
}

export function buildRecordingDownloadFilename(
  filenameBase: string,
  sourceMode: RecordingSourceMode,
  effectiveDurationMs: number,
  range: RecordingCropRange | null,
): string {
  const baseName = filenameBase || 'xensonar-take';
  const takeSuffix = sourceMode === 'without_drums' ? '-no-drums' : '-with-drums';
  const suffix = range
    ? `-crop-${formatDuration(range.startMs).replace(':', '-')}_to_${formatDuration(range.endMs).replace(':', '-')}`
    : `-${formatDuration(effectiveDurationMs).replace(':', '-')}`;
  return `${baseName}${takeSuffix}${suffix}.wav`;
}
