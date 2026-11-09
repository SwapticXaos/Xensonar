export function clampSegmentPatternLength(value: unknown, fallback = 1): number {
  const numeric = typeof value === 'number' && Number.isFinite(value)
    ? value
    : typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))
      ? Number(value)
      : fallback;
  return Math.max(1, Math.min(64, Math.round(numeric)));
}

export function normalizeSegmentPatternSteps(
  steps: readonly number[] | null | undefined,
  segments: unknown,
  fallbackOn = true,
): number[] {
  const length = clampSegmentPatternLength(segments, 1);
  const source = Array.isArray(steps) ? steps : [];
  return Array.from({ length }, (_, index) => {
    const value = source[index];
    if (value === 0) return 0;
    if (value === 1) return 1;
    return fallbackOn ? 1 : 0;
  });
}

export function buildEveryNthSegmentPattern(every: unknown, segments: unknown): number[] {
  const safeEvery = clampSegmentPatternLength(every, 1);
  const length = clampSegmentPatternLength(segments, 1);
  if (safeEvery <= 1) return Array.from({ length }, () => 1);
  return Array.from({ length }, (_, index) => ((index + 1) % safeEvery === 0 ? 1 : 0));
}

export function isSegmentPatternStepActive(
  steps: readonly number[] | null | undefined,
  segments: unknown,
  globalSlot: unknown,
): boolean {
  const length = clampSegmentPatternLength(segments, 1);
  const pattern = normalizeSegmentPatternSteps(steps, length);
  if (pattern.length <= 0) return true;
  const slot = Math.max(1, Math.round(Number(globalSlot) || 1));
  const index = (slot - 1) % pattern.length;
  return pattern[index] !== 0;
}

export function countActiveSegmentPatternSteps(steps: readonly number[] | null | undefined, segments: unknown): number {
  return normalizeSegmentPatternSteps(steps, segments).reduce((sum, step) => sum + (step === 0 ? 0 : 1), 0);
}

export function formatSegmentPatternCompact(steps: readonly number[] | null | undefined, segments: unknown): string {
  return normalizeSegmentPatternSteps(steps, segments).map((step) => (step === 0 ? '.' : 'X')).join('');
}


/**
 * Resizes an explicit on/off segment pattern without inventing audible slots.
 * Existing explicit slots are preserved, new tail slots are muted. This is used
 * for ratio/sync UI actions where changing the takt relation must not secretly
 * add new audible impulses.
 */
export function resizeSegmentPatternPreservingMutedTail(
  steps: readonly number[] | null | undefined,
  segments: unknown,
): number[] {
  const length = clampSegmentPatternLength(segments, 1);
  const source = Array.isArray(steps) ? steps : [];
  return Array.from({ length }, (_, index) => source[index] === 1 ? 1 : 0);
}
