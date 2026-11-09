export function clampBars(value: number): number {
  return Math.max(1, Math.min(16, Math.round(value || 1)));
}

export function clampGuideSegments(value: number): number {
  return Math.max(1, Math.min(16, Math.round(value || 1)));
}

export function buildDefaultGuideMarkers(guideSegments: number): number[] {
  const count = clampGuideSegments(guideSegments);
  if (count <= 1) return [];
  return Array.from({ length: count - 1 }, (_, idx) => (idx + 1) / count);
}

export function sanitizeGuideMarkers(markers: number[], guideSegments: number): number[] {
  const count = clampGuideSegments(guideSegments);
  if (count <= 1) return [];
  const minGap = 1 / (count * 8);
  const normalized = Array.from({ length: count - 1 }, (_, idx) => {
    const fallback = (idx + 1) / count;
    const raw = Number.isFinite(markers[idx]) ? markers[idx] : fallback;
    return raw;
  }).sort((a, b) => a - b);
  const result = normalized.slice();
  for (let i = 0; i < result.length; i++) {
    const minVal = i == 0 ? minGap : result[i - 1] + minGap;
    const maxVal = i == result.length - 1 ? 1 - minGap : result[i + 1] - minGap;
    result[i] = Math.max(minVal, Math.min(maxVal, result[i]));
  }
  return result;
}

export function computeLoopDurationSec(bars: number, bpm: number): number {
  const safeBars = clampBars(bars);
  const safeBpm = Math.max(1, Number.isFinite(bpm) ? bpm : 1);
  return (safeBars * 4 * 60) / safeBpm;
}
