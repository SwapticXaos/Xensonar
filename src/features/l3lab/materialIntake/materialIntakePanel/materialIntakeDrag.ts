import { rangeEnd } from '../selectionMath';
import type { TimeRange } from '../types';

export type DragMode = 'new' | 'move' | 'resize-start' | 'resize-end';

export type DragState = {
  target: 'overview' | 'detail';
  mode: DragMode;
  anchorTime: number;
  startSec: number;
  durationSec: number;
};

export function detectDragMode(pointSec: number, range: TimeRange, secondsPerPixel: number): DragMode {
  const tolerance = Math.max(secondsPerPixel * 8, range.durationSec * 0.025, 0.015);
  const start = range.startSec;
  const end = rangeEnd(range);
  if (Math.abs(pointSec - start) <= tolerance) return 'resize-start';
  if (Math.abs(pointSec - end) <= tolerance) return 'resize-end';
  if (pointSec >= start && pointSec <= end) return 'move';
  return 'new';
}

export function updateDraggedRange(pointSec: number, drag: DragState, maxDuration: number, minDuration: number): TimeRange {
  let nextStart = drag.startSec;
  let nextDuration = drag.durationSec;
  if (drag.mode === 'move') {
    nextStart = drag.startSec + (pointSec - drag.anchorTime);
  } else if (drag.mode === 'resize-start') {
    const end = drag.startSec + drag.durationSec;
    nextStart = Math.min(pointSec, end - minDuration);
    nextDuration = end - nextStart;
  } else if (drag.mode === 'resize-end') {
    const nextEnd = Math.max(drag.startSec + minDuration, pointSec);
    nextDuration = nextEnd - drag.startSec;
  } else {
    nextStart = Math.min(drag.anchorTime, pointSec);
    nextDuration = Math.abs(pointSec - drag.anchorTime);
  }
  const safeDuration = Math.max(minDuration, Math.min(maxDuration, nextDuration));
  const safeStart = Math.max(0, Math.min(maxDuration - safeDuration, nextStart));
  return { startSec: safeStart, durationSec: safeDuration };
}
