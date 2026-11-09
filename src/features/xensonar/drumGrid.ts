const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const DRUM_SEGMENTS_MIN = 1;
export const DRUM_SEGMENTS_MAX = 32;

export function clampDrumSegmentsPerBar(value: number) {
  if (!Number.isFinite(value)) return 16;
  return Math.max(DRUM_SEGMENTS_MIN, Math.min(DRUM_SEGMENTS_MAX, Math.round(value)));
}

function drumMarkerGap(segmentsPerBar: number) {
  return Math.max(0.008, Math.min(0.06, 0.36 / Math.max(2, clampDrumSegmentsPerBar(segmentsPerBar) * 2)));
}

export function buildDefaultDrumSegmentMarkers(segmentsPerBar: number) {
  const safeSegments = clampDrumSegmentsPerBar(segmentsPerBar);
  if (safeSegments <= 1) return [];
  return Array.from({ length: safeSegments - 1 }, (_, index) => (index + 1) / safeSegments);
}

export function sanitizeDrumSegmentMarkers(markers: number[] | undefined, segmentsPerBar: number) {
  const safeSegments = clampDrumSegmentsPerBar(segmentsPerBar);
  if (safeSegments <= 1) return [];
  const defaults = buildDefaultDrumSegmentMarkers(safeSegments);
  const gap = drumMarkerGap(safeSegments);
  const source = Array.isArray(markers) ? markers.slice(0, safeSegments - 1) : [];
  while (source.length < safeSegments - 1) source.push(defaults[source.length] ?? 0.5);
  const next = source.map((value, index) => {
    const min = index === 0 ? gap : 0;
    const max = index === safeSegments - 2 ? 1 - gap : 1;
    return clamp(Number.isFinite(value) ? value : defaults[index], min, max);
  });
  for (let index = 0; index < next.length; index += 1) {
    const prev = index === 0 ? 0 : next[index - 1];
    next[index] = Math.max(next[index], prev + gap);
  }
  for (let index = next.length - 1; index >= 0; index -= 1) {
    const upper = index === next.length - 1 ? 1 : next[index + 1];
    next[index] = Math.min(next[index], upper - gap);
  }
  return next.map((value, index) => {
    const prev = index === 0 ? 0 : next[index - 1];
    const upper = index === next.length - 1 ? 1 : next[index + 1];
    return clamp(value, prev + gap, upper - gap);
  });
}

export function getDrumBarSegmentEdges(segmentsPerBar: number, markers?: number[]) {
  return [0, ...sanitizeDrumSegmentMarkers(markers, segmentsPerBar), 1];
}

export function getDrumBarSegmentCenters(segmentsPerBar: number, markers?: number[]) {
  const edges = getDrumBarSegmentEdges(segmentsPerBar, markers);
  return Array.from({ length: Math.max(0, edges.length - 1) }, (_, index) => (edges[index] + edges[index + 1]) * 0.5);
}

export function remapLegacyStepToSegment(step: number, segmentsPerBar: number) {
  const safeSegments = clampDrumSegmentsPerBar(segmentsPerBar);
  const normalized = Math.max(0, Math.min(15, Math.round(step || 0))) / 16;
  return Math.max(0, Math.min(safeSegments - 1, Math.floor(normalized * safeSegments + 1e-9)));
}

export function stepIndexToGlobalRatio(stepIndex: number, bars: number, segmentsPerBar: number, markers?: number[], position: 'start' | 'center' | 'end' = 'center') {
  const safeBars = Math.max(1, Math.round(bars || 1));
  const safeSegments = clampDrumSegmentsPerBar(segmentsPerBar);
  const totalSteps = safeBars * safeSegments;
  const clampedStep = Math.max(0, Math.min(totalSteps - 1, Math.floor(stepIndex || 0)));
  const barIndex = Math.max(0, Math.min(safeBars - 1, Math.floor(clampedStep / safeSegments)));
  const localIndex = clampedStep % safeSegments;
  const edges = getDrumBarSegmentEdges(safeSegments, markers);
  const localStart = edges[localIndex] ?? 0;
  const localEnd = edges[localIndex + 1] ?? 1;
  const local = position === 'start' ? localStart : position === 'end' ? localEnd : (localStart + localEnd) * 0.5;
  return (barIndex + local) / safeBars;
}

export function stepFloatToGlobalRatio(stepFloat: number, bars: number, segmentsPerBar: number, markers?: number[]) {
  const safeBars = Math.max(1, Math.round(bars || 1));
  const safeSegments = clampDrumSegmentsPerBar(segmentsPerBar);
  const totalSteps = safeBars * safeSegments;
  const clamped = Math.max(0, Math.min(totalSteps, Number.isFinite(stepFloat) ? stepFloat : 0));
  if (clamped >= totalSteps) return 1;
  const barIndex = Math.max(0, Math.min(safeBars - 1, Math.floor(clamped / safeSegments)));
  const localFloat = clamped - barIndex * safeSegments;
  const segmentIndex = Math.max(0, Math.min(safeSegments - 1, Math.floor(localFloat)));
  const fraction = Math.max(0, Math.min(1, localFloat - segmentIndex));
  const edges = getDrumBarSegmentEdges(safeSegments, markers);
  const localStart = edges[segmentIndex] ?? 0;
  const localEnd = edges[segmentIndex + 1] ?? 1;
  return (barIndex + (localStart + (localEnd - localStart) * fraction)) / safeBars;
}

export function globalRatioToStepIndex(globalRatio: number, bars: number, segmentsPerBar: number, markers?: number[]) {
  const safeBars = Math.max(1, Math.round(bars || 1));
  const safeSegments = clampDrumSegmentsPerBar(segmentsPerBar);
  const ratio = clamp(globalRatio, 0, 0.999999);
  const barFloat = ratio * safeBars;
  const barIndex = Math.max(0, Math.min(safeBars - 1, Math.floor(barFloat)));
  const localRatio = barFloat - barIndex;
  const edges = getDrumBarSegmentEdges(safeSegments, markers);
  let segmentIndex = safeSegments - 1;
  for (let index = 0; index < safeSegments; index += 1) {
    if (localRatio >= edges[index] && localRatio < edges[index + 1]) {
      segmentIndex = index;
      break;
    }
  }
  return barIndex * safeSegments + segmentIndex;
}
