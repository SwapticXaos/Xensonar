import { MAX_RECORDING_MS, clamp } from '../rooms/resonanceRuntimeMath';
import { formatDuration } from '../helpers';
import type { RecordingMarker } from '../domain/runtimeTypes';

export type RecordingMarkerSource = 'key' | 'logo' | 'side';

export function createLogoMarkerPulseId(now = Date.now(), randomPart = Math.random().toString(36).slice(2, 7)): string {
  return `logo-pulse-${now}-${randomPart}`;
}

export function createSideMarkerPulseId(side: 'left' | 'right', now = Date.now(), randomPart = Math.random().toString(36).slice(2, 7)): string {
  return `side-pulse-${side}-${now}-${randomPart}`;
}

export function createRecordingMarker(startedAt: number, markerCount: number, now = performance.now()): RecordingMarker {
  const timeMs = clamp(Math.round(now - startedAt), 0, MAX_RECORDING_MS);
  return {
    id: `marker-${timeMs}-${markerCount + 1}`,
    timeMs,
    usedInCrop: false,
  };
}

export function formatRecordingMarkerMessage(markerCount: number, timeMs: number, source: RecordingMarkerSource): string {
  const sourceLabel = source === 'logo' ? ' · Logo' : source === 'side' ? ' · Rand' : '';
  return `Marker M${markerCount} @ ${formatDuration(timeMs)}${sourceLabel}`;
}
