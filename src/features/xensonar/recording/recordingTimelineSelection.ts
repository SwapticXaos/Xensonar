import type { RecordingCropRange } from '../domain/runtimeTypes';

export function buildRecordingCropRange(startRatio: number, endRatio: number, durationMs: number): RecordingCropRange {
  return {
    startMs: Math.round(Math.min(startRatio, endRatio) * durationMs),
    endMs: Math.round(Math.max(startRatio, endRatio) * durationMs),
  };
}

export function getRecordingCropDurationMs(range: RecordingCropRange) {
  return Math.abs(range.endMs - range.startMs);
}

export function resolveRecordingSeekTimeMs(ratio: number, durationMs: number, clampValue: (value: number, min: number, max: number) => number) {
  return clampValue(Math.round(ratio * durationMs), 0, durationMs);
}
