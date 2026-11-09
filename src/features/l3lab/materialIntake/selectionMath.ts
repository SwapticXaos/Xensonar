import type { TimeRange } from './types';

export function clampSelectionBounds(startSec: number, durationSec: number, maxDuration: number, minDuration = 0.05): TimeRange {
  const safeMax = Math.max(minDuration, maxDuration || minDuration);
  const safeDuration = Math.max(minDuration, Math.min(durationSec, safeMax));
  const safeStart = Math.max(0, Math.min(safeMax - safeDuration, startSec));
  return { startSec: safeStart, durationSec: safeDuration };
}

export function buildDetailViewport(startSec: number, durationSec: number, maxDuration: number, paddingFactor = 2.2): TimeRange {
  const safeDuration = Math.max(0.15, Math.min(maxDuration, durationSec * paddingFactor));
  const center = startSec + durationSec * 0.5;
  return clampSelectionBounds(center - safeDuration * 0.5, safeDuration, maxDuration, 0.15);
}

export function rangeEnd(range: TimeRange): number {
  return range.startSec + range.durationSec;
}

export function intersectRanges(a: TimeRange, b: TimeRange): TimeRange | null {
  const start = Math.max(a.startSec, b.startSec);
  const end = Math.min(rangeEnd(a), rangeEnd(b));
  if (end <= start) return null;
  return { startSec: start, durationSec: end - start };
}

export function isRangeFullyVisible(inner: TimeRange, outer: TimeRange): boolean {
  return inner.startSec >= outer.startSec && rangeEnd(inner) <= rangeEnd(outer);
}
