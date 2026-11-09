export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function safeCurveValue(value: unknown, fallback = 0): number {
  return Number.isFinite(value as number) ? Number(value) : fallback;
}

export function makeFilledCurve(length: number, fill = 0): number[] {
  return new Array(Math.max(2, Math.round(length))).fill(fill);
}

export function sanitizeCurve(curve: readonly number[] | null | undefined, fallback = 0): number[] {
  if (!curve?.length) return [fallback, fallback];
  return Array.from(curve, (value) => safeCurveValue(value, fallback));
}

export function sampleLinearCurve(curve: readonly number[] | null | undefined, ratio: number, fallback = 0): number {
  if (!curve?.length) return fallback;
  const safeRatio = clampNumber(ratio, 0, 1);
  const position = safeRatio * Math.max(0, curve.length - 1);
  const left = Math.floor(position);
  const right = Math.min(curve.length - 1, left + 1);
  const mix = position - left;
  const a = safeCurveValue(curve[left], fallback);
  const b = safeCurveValue(curve[right], a);
  return a * (1 - mix) + b * mix;
}

export function sampleWrappedLinearCurve(curve: readonly number[] | null | undefined, ratio: number, fallback = 0): number {
  const wrapped = ((ratio % 1) + 1) % 1;
  return sampleLinearCurve(curve, wrapped, fallback);
}

export function resampleNormalizedCurveSegment(
  curve: readonly number[] | null | undefined,
  startRatio: number,
  endRatio: number,
  outputResolution: number,
  fallback = 0,
): number[] {
  const source = sanitizeCurve(curve, fallback);
  const resolution = Math.max(2, Math.round(outputResolution));
  const start = clampNumber(startRatio, 0, 1);
  const end = clampNumber(endRatio, 0, 1);
  const low = Math.min(start, end);
  const high = Math.max(start, end);
  if (source.length === 1 || high - low <= 1e-6) {
    const index = Math.round(low * Math.max(0, source.length - 1));
    const value = source[Math.max(0, Math.min(source.length - 1, index))] ?? fallback;
    return new Array(resolution).fill(safeCurveValue(value, fallback));
  }
  return new Array(resolution).fill(0).map((_, index) => {
    const localRatio = resolution <= 1 ? 0 : index / (resolution - 1);
    return sampleLinearCurve(source, low + (high - low) * localRatio, fallback);
  });
}

export function interpolateMissingLinear(values: Array<number | null | undefined>, fallback = 0): number[] {
  const out = values.map((value) => (Number.isFinite(value as number) ? Number(value) : null));
  const first = out.findIndex((value) => value != null);
  if (first < 0) return new Array(out.length).fill(fallback);
  for (let i = 0; i < first; i += 1) out[i] = out[first];
  let lastKnown = first;
  for (let i = first + 1; i < out.length; i += 1) {
    if (out[i] == null) continue;
    const next = i;
    const start = out[lastKnown] ?? fallback;
    const end = out[next] ?? start;
    const span = next - lastKnown;
    for (let j = lastKnown + 1; j < next; j += 1) {
      const mix = (j - lastKnown) / Math.max(1, span);
      out[j] = start * (1 - mix) + end * mix;
    }
    lastKnown = next;
  }
  for (let i = lastKnown + 1; i < out.length; i += 1) out[i] = out[lastKnown];
  return out.map((value) => Number(value ?? fallback));
}

export function clampCurve(curve: readonly number[], min: number, max: number): number[] {
  return curve.map((value) => clampNumber(value, min, max));
}

export function makeSineWindowCurve(count: number): Float32Array {
  const out = new Float32Array(Math.max(8, Math.round(count)));
  for (let index = 0; index < out.length; index += 1) {
    const phase = out.length <= 1 ? 0 : index / Math.max(1, out.length - 1);
    out[index] = clampNumber(Math.sin(Math.PI * clampNumber(phase, 0, 1)), 0, 1);
  }
  return out;
}
