export type LocalFieldGeometryKind = 'linear-strip';
export type LocalFieldInterpreterKind = 'dynamic-fade' | 'pitch-elastic' | null;
export type LocalFieldTargetKind = Extract<LocalFieldInterpreterKind, 'dynamic-fade' | 'pitch-elastic'>;
export type LocalFieldBaseCurveKind = 'linear' | 'smooth';
export type LocalFieldOperationKind = 'warp';

export type LocalFieldRange = {
  startRatio: number;
  endRatio: number;
};

export type LinearFieldEdgeHandles = {
  left: number;
  right: number;
};

export type LinearFieldBaseCurve = {
  kind: LocalFieldBaseCurveKind;
};

export type LinearFieldDeformation = {
  resolution: number;
  curve: number[];
  interior: number[];
  xOffsets: number[];
  smoothing: number;
  seed?: number;
};

export type LocalFieldTargetSlot = {
  edgeHandles: LinearFieldEdgeHandles;
  deformation: LinearFieldDeformation;
};

export type LocalFieldModuleState = {
  id: string;
  geometryKind: LocalFieldGeometryKind;
  interpreterKind: LocalFieldInterpreterKind;
  enabled: boolean;
  bypassed: boolean;
  referenceLevel: 0;
  range: LocalFieldRange;
  edgeHandles: LinearFieldEdgeHandles;
  baseCurve: LinearFieldBaseCurve;
  deformation: LinearFieldDeformation;
  targetSlots?: Partial<Record<LocalFieldTargetKind, LocalFieldTargetSlot>>;
};

export type ResolvedLocalFieldCurve = {
  base: number[];
  resolved: number[];
  polylineX: number[];
  polylineY: number[];
};

export type LocalFieldBrushPreview = {
  ratio: number;
  value: number;
  radiusPx: number;
  mode: LocalFieldOperationKind;
  pointerDown?: boolean;
};

export type LocalFieldDrawPoint = {
  ratio: number;
  value: number;
};

export type LocalFieldDrawPreview = {
  points: LocalFieldDrawPoint[];
  pointerDown?: boolean;
};

export type LocalFieldRenderArgs = {
  canvas: HTMLCanvasElement;
  field: LocalFieldModuleState;
  brushPreview?: LocalFieldBrushPreview | null;
  drawPreview?: LocalFieldDrawPreview | null;
};

export type LocalFieldBrushStrokeArgs = {
  focusRatio: number;
  focusValue: number;
  radiusPx: number;
  intensity: number;
  hardness: number;
  fluidity: number;
  plotWidth: number;
  plotHeight: number;
  deltaRatio?: number;
  deltaValue: number;
};

export const DEFAULT_LOCAL_FIELD_RANGE: LocalFieldRange = { startRatio: 0.18, endRatio: 0.82 };
export const DEFAULT_LOCAL_FIELD_RESOLUTION = 360;
const MIN_RESOLUTION = 64;
const MAX_RESOLUTION = 512;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function clamp01(value: number) {
  return clamp(value, 0, 1);
}

function clampSigned(value: number) {
  return clamp(Number.isFinite(value) ? value : 0, -1, 1);
}

function smoothstep(t: number) {
  const safe = clamp01(t);
  return safe * safe * (3 - 2 * safe);
}

function createLinearCurve(leftY: number, rightY: number, count: number) {
  if (count <= 1) return [clampSigned(leftY)];
  return new Array(count).fill(0).map((_, index) => {
    const t = index / Math.max(1, count - 1);
    return clampSigned(leftY + (rightY - leftY) * t);
  });
}

function sampleLinear(source: number[], position: number) {
  const count = source.length;
  if (!count) return 0;
  const safePos = clamp(position, 0, Math.max(0, count - 1));
  const floorIndex = Math.floor(safePos);
  const ceilIndex = Math.min(count - 1, floorIndex + 1);
  const mix = safePos - floorIndex;
  return (source[floorIndex] ?? 0) * (1 - mix) + (source[ceilIndex] ?? 0) * mix;
}

function resampleCurve(source: number[], targetCount: number) {
  const count = Math.max(2, targetCount);
  if (!source.length) return createLinearCurve(0, 0, count);
  if (source.length === count) return source.map((value) => clampSigned(value));
  return new Array(count).fill(0).map((_, index) => {
    const t = count <= 1 ? 0 : index / Math.max(1, count - 1);
    const position = t * Math.max(0, source.length - 1);
    return clampSigned(sampleLinear(source, position));
  });
}

function normalizeDrawPoints(points: LocalFieldDrawPoint[]) {
  if (points.length <= 1) return points.map((point) => ({ ratio: clamp01(point.ratio), value: clampSigned(point.value) }));
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  if (!firstPoint || !lastPoint) return [];
  const oriented = firstPoint.ratio <= lastPoint.ratio ? [...points] : [...points].reverse();
  const deduped: LocalFieldDrawPoint[] = [];
  for (const point of oriented) {
    const normalizedPoint = { ratio: clamp01(point.ratio), value: clampSigned(point.value) };
    const last = deduped[deduped.length - 1];
    if (last && Math.abs(last.ratio - normalizedPoint.ratio) < 0.0005) {
      deduped[deduped.length - 1] = normalizedPoint;
    } else {
      deduped.push(normalizedPoint);
    }
  }
  return deduped;
}

function curveIndexFromRatio(ratio: number, count: number) {
  return clamp(Math.round(clamp01(ratio) * Math.max(0, count - 1)), 0, Math.max(0, count - 1));
}

function projectY(value: number, plotHeight: number) {
  return ((1 - clampSigned(value)) / 2) * plotHeight;
}

function legacyResolveLocalFieldCurve(fieldInput: Partial<LocalFieldModuleState>, sampleCount: number) {
  const count = Math.max(MIN_RESOLUTION, Math.min(MAX_RESOLUTION, Math.round(sampleCount || DEFAULT_LOCAL_FIELD_RESOLUTION)));
  const edgeHandles = fieldInput.edgeHandles ?? { left: 0, right: 0 };
  const baseCurveKind = fieldInput.baseCurve?.kind === 'linear' ? 'linear' : 'smooth';
  const deformation = fieldInput.deformation ?? { resolution: count, interior: [], xOffsets: [] } as Partial<LinearFieldDeformation>;
  const resolution = Math.max(2, Math.round(deformation.resolution || count));
  const interior = new Array(resolution).fill(0).map((_, index) => {
    if (index === 0 || index === resolution - 1) return 0;
    return clampSigned(deformation.interior?.[index] ?? 0);
  });
  const xOffsets = new Array(resolution).fill(0).map((_, index) => {
    if (index === 0 || index === resolution - 1) return 0;
    return clamp(Number.isFinite(deformation.xOffsets?.[index]) ? Number(deformation.xOffsets?.[index]) : 0, -0.42, 0.42);
  });
  const uniformX = new Array(count).fill(0).map((_, index) => (count <= 1 ? 0 : index / Math.max(1, count - 1)));
  const base = uniformX.map((t) => {
    const mix = baseCurveKind === 'smooth' ? smoothstep(t) : t;
    return clampSigned((edgeHandles.left ?? 0) + ((edgeHandles.right ?? 0) - (edgeHandles.left ?? 0)) * mix);
  });
  const yDeformation = uniformX.map((t, index) => {
    if (index === 0 || index === count - 1) return 0;
    const sourceIndex = t * Math.max(1, resolution - 1);
    return clampSigned(sampleLinear(interior, sourceIndex));
  });
  const rawX = uniformX.map((t, index) => {
    if (index === 0) return 0;
    if (index === count - 1) return 1;
    const sourceIndex = t * Math.max(1, resolution - 1);
    return clamp01(t + sampleLinear(xOffsets, sourceIndex));
  });
  const minGap = 1 / Math.max(4096, count * 64);
  const polylineX = [...rawX];
  polylineX[0] = 0;
  polylineX[count - 1] = 1;
  for (let index = 1; index < count - 1; index += 1) {
    polylineX[index] = Math.max(polylineX[index] ?? 0, (polylineX[index - 1] ?? 0) + minGap);
  }
  polylineX[count - 1] = 1;
  for (let index = count - 2; index >= 1; index -= 1) {
    polylineX[index] = Math.min(polylineX[index] ?? 1, (polylineX[index + 1] ?? 1) - minGap);
  }
  const polylineY = base.map((value, index) => {
    if (index === 0) return clampSigned(edgeHandles.left ?? 0);
    if (index === count - 1) return clampSigned(edgeHandles.right ?? 0);
    return clampSigned(value + (yDeformation[index] ?? 0));
  });
  const resolved = new Array(count).fill(0).map((_, index) => {
    const x = uniformX[index] ?? 0;
    let segment = 0;
    while (segment < polylineX.length - 2 && x > (polylineX[segment + 1] ?? 1)) segment += 1;
    const x0 = polylineX[segment] ?? 0;
    const x1 = polylineX[Math.min(polylineX.length - 1, segment + 1)] ?? x0;
    const y0 = polylineY[segment] ?? 0;
    const y1 = polylineY[Math.min(polylineY.length - 1, segment + 1)] ?? y0;
    const span = Math.max(1e-6, x1 - x0);
    const mix = clamp01((x - x0) / span);
    return clampSigned(y0 + (y1 - y0) * mix);
  });
  return resampleCurve(resolved, count);
}

function syncEdgeHandles(field: LocalFieldModuleState) {
  const curve = field.deformation.curve;
  field.edgeHandles.left = clampSigned(curve[0] ?? 0);
  field.edgeHandles.right = clampSigned(curve[curve.length - 1] ?? 0);
}

function rebaseCurveBetweenHandles(curve: number[], previousLeft: number, previousRight: number, nextLeft: number, nextRight: number) {
  const count = curve.length;
  if (!count) return [];
  const previousBase = createLinearCurve(previousLeft, previousRight, count);
  const nextBase = createLinearCurve(nextLeft, nextRight, count);
  const rebased = new Array(count).fill(0).map((_, index) => {
    const deviation = (curve[index] ?? 0) - (previousBase[index] ?? 0);
    return clampSigned((nextBase[index] ?? 0) + deviation);
  });
  rebased[0] = clampSigned(nextLeft);
  rebased[count - 1] = clampSigned(nextRight);
  return rebased;
}

export function setLocalFieldEdgeHandle(fieldInput: LocalFieldModuleState, side: 'left' | 'right', value: number): LocalFieldModuleState {
  const field = sanitizeLocalFieldState(fieldInput);
  const next = cloneLocalFieldState(field);
  const nextLeft = side === 'left' ? clampSigned(value) : clampSigned(next.edgeHandles.left);
  const nextRight = side === 'right' ? clampSigned(value) : clampSigned(next.edgeHandles.right);
  next.deformation.curve = rebaseCurveBetweenHandles(next.deformation.curve, next.edgeHandles.left, next.edgeHandles.right, nextLeft, nextRight);
  next.deformation.interior = [...next.deformation.curve];
  next.edgeHandles = { left: nextLeft, right: nextRight };
  return sanitizeLocalFieldState(next);
}

function applyFluidSmoothing(input: number[], fluidity: number, hardness: number) {
  if (fluidity <= 0) return input.map((value) => clampSigned(value));
  const output = [...input];
  const blend = fluidity * 0.32 * (1 - hardness * 0.42);
  const loops = fluidity > 0.66 ? 2 : 1;
  for (let pass = 0; pass < loops; pass += 1) {
    const source = [...output];
    for (let index = 1; index < output.length - 1; index += 1) {
      const neighborAverage = ((source[index - 1] ?? 0) + (source[index + 1] ?? 0)) * 0.5;
      output[index] = clampSigned((source[index] ?? 0) * (1 - blend) + neighborAverage * blend);
    }
  }
  return output.map((value) => clampSigned(value));
}

function strokePolyline(ctx: CanvasRenderingContext2D, xs: number[], ys: number[]) {
  if (!xs.length || !ys.length) return;
  ctx.beginPath();
  ctx.moveTo(xs[0] ?? 0, ys[0] ?? 0);
  for (let index = 1; index < Math.min(xs.length, ys.length); index += 1) {
    ctx.lineTo(xs[index] ?? 0, ys[index] ?? 0);
  }
}

export function getLocalFieldCanvasMetrics(canvas: HTMLCanvasElement) {
  const padX = 18;
  const padY = 16;
  const usableW = Math.max(1, canvas.width - padX * 2);
  const usableH = Math.max(1, canvas.height - padY * 2);
  const midY = padY + usableH * 0.5;
  const ampH = usableH * 0.5;
  return { padX, padY, usableW, usableH, midY, ampH };
}

function cloneTargetSlot(slot: LocalFieldTargetSlot): LocalFieldTargetSlot {
  return {
    edgeHandles: { ...slot.edgeHandles },
    deformation: {
      ...slot.deformation,
      curve: [...slot.deformation.curve],
      interior: [...slot.deformation.interior],
      xOffsets: [...slot.deformation.xOffsets],
    },
  };
}

function createDefaultTargetSlot(resolution = DEFAULT_LOCAL_FIELD_RESOLUTION): LocalFieldTargetSlot {
  const curve = createLinearCurve(0, 0, resolution);
  return {
    edgeHandles: { left: 0, right: 0 },
    deformation: {
      resolution,
      curve,
      interior: [...curve],
      xOffsets: new Array(resolution).fill(0),
      smoothing: 0.42,
    },
  };
}

function sanitizeTargetSlot(slotInput: Partial<LocalFieldTargetSlot> | null | undefined, resolution: number): LocalFieldTargetSlot {
  const slot = slotInput ? cloneTargetSlot(slotInput as LocalFieldTargetSlot) : createDefaultTargetSlot(resolution);
  const curveSource = Array.isArray(slot.deformation?.curve) && slot.deformation.curve.length
    ? slot.deformation.curve
    : createLinearCurve(slot.edgeHandles?.left ?? 0, slot.edgeHandles?.right ?? 0, resolution);
  const curve = resampleCurve(curveSource, resolution);
  curve[0] = clampSigned(curve[0] ?? slot.edgeHandles?.left ?? 0);
  curve[curve.length - 1] = clampSigned(curve[curve.length - 1] ?? slot.edgeHandles?.right ?? 0);
  return {
    edgeHandles: {
      left: clampSigned(curve[0] ?? 0),
      right: clampSigned(curve[curve.length - 1] ?? 0),
    },
    deformation: {
      resolution,
      curve,
      interior: [...curve],
      xOffsets: new Array(resolution).fill(0),
      smoothing: clamp(Number.isFinite(slot.deformation?.smoothing) ? Number(slot.deformation.smoothing) : 0.42, 0, 1),
      seed: Number.isFinite(slot.deformation?.seed) ? Number(slot.deformation.seed) : undefined,
    },
  };
}

export function createDefaultLocalFieldState(): LocalFieldModuleState {
  const resolution = DEFAULT_LOCAL_FIELD_RESOLUTION;
  const dynamicSlot = createDefaultTargetSlot(resolution);
  const pitchSlot = createDefaultTargetSlot(resolution);
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `local-field-${Date.now()}`,
    geometryKind: 'linear-strip',
    interpreterKind: 'dynamic-fade',
    enabled: true,
    bypassed: false,
    referenceLevel: 0,
    range: { ...DEFAULT_LOCAL_FIELD_RANGE },
    edgeHandles: { ...dynamicSlot.edgeHandles },
    baseCurve: { kind: 'linear' },
    deformation: {
      ...dynamicSlot.deformation,
      curve: [...dynamicSlot.deformation.curve],
      interior: [...dynamicSlot.deformation.interior],
      xOffsets: [...dynamicSlot.deformation.xOffsets],
    },
    targetSlots: {
      'dynamic-fade': dynamicSlot,
      'pitch-elastic': pitchSlot,
    },
  };
}

export function cloneLocalFieldState(field: LocalFieldModuleState): LocalFieldModuleState {
  return {
    ...field,
    range: { ...field.range },
    edgeHandles: { ...field.edgeHandles },
    baseCurve: { ...field.baseCurve },
    deformation: {
      ...field.deformation,
      curve: [...field.deformation.curve],
      interior: [...field.deformation.interior],
      xOffsets: [...field.deformation.xOffsets],
    },
    targetSlots: field.targetSlots ? {
      'dynamic-fade': field.targetSlots['dynamic-fade'] ? cloneTargetSlot(field.targetSlots['dynamic-fade']) : undefined,
      'pitch-elastic': field.targetSlots['pitch-elastic'] ? cloneTargetSlot(field.targetSlots['pitch-elastic']) : undefined,
    } : undefined,
  };
}

export function sanitizeLocalFieldState(field: LocalFieldModuleState | null | undefined): LocalFieldModuleState {
  const base = field ? cloneLocalFieldState(field) : createDefaultLocalFieldState();
  const activeTarget: LocalFieldTargetKind = base.interpreterKind === 'pitch-elastic' ? 'pitch-elastic' : 'dynamic-fade';
  const resolution = Math.max(MIN_RESOLUTION, Math.min(MAX_RESOLUTION, Math.round(base.deformation?.resolution || DEFAULT_LOCAL_FIELD_RESOLUTION)));
  let startRatio = clamp01(base.range?.startRatio ?? DEFAULT_LOCAL_FIELD_RANGE.startRatio);
  let endRatio = clamp01(base.range?.endRatio ?? DEFAULT_LOCAL_FIELD_RANGE.endRatio);
  if (endRatio < startRatio + 0.05) {
    const center = (startRatio + endRatio) * 0.5;
    startRatio = clamp01(center - 0.025);
    endRatio = clamp01(center + 0.025);
    if (endRatio < startRatio + 0.05) {
      startRatio = clamp01(Math.min(startRatio, 0.95));
      endRatio = clamp01(Math.max(endRatio, startRatio + 0.05));
    }
  }

  const legacyCurveSource = Array.isArray(base.deformation?.curve) && base.deformation.curve.length
    ? base.deformation.curve
    : legacyResolveLocalFieldCurve(base, resolution);
  const legacyCurve = resampleCurve(legacyCurveSource, resolution);
  legacyCurve[0] = clampSigned(legacyCurve[0] ?? base.edgeHandles?.left ?? 0);
  legacyCurve[legacyCurve.length - 1] = clampSigned(legacyCurve[legacyCurve.length - 1] ?? base.edgeHandles?.right ?? 0);
  const legacySlot = sanitizeTargetSlot({
    edgeHandles: {
      left: clampSigned(base.edgeHandles?.left ?? legacyCurve[0] ?? 0),
      right: clampSigned(base.edgeHandles?.right ?? legacyCurve[legacyCurve.length - 1] ?? 0),
    },
    deformation: {
      resolution,
      curve: legacyCurve,
      interior: [...legacyCurve],
      xOffsets: new Array(resolution).fill(0),
      smoothing: clamp(Number.isFinite(base.deformation?.smoothing) ? Number(base.deformation.smoothing) : 0.42, 0, 1),
      seed: Number.isFinite(base.deformation?.seed) ? Number(base.deformation.seed) : undefined,
    },
  }, resolution);

  const previousSlots = base.targetSlots ?? {};
  const dynamicSlot = sanitizeTargetSlot(activeTarget === 'dynamic-fade' ? legacySlot : previousSlots['dynamic-fade'], resolution);
  const pitchSlot = sanitizeTargetSlot(activeTarget === 'pitch-elastic' ? legacySlot : previousSlots['pitch-elastic'], resolution);
  const activeSlot = activeTarget === 'pitch-elastic' ? pitchSlot : dynamicSlot;

  const sanitized: LocalFieldModuleState = {
    id: base.id || createDefaultLocalFieldState().id,
    geometryKind: 'linear-strip',
    interpreterKind: activeTarget,
    enabled: base.enabled !== false,
    bypassed: !!base.bypassed,
    referenceLevel: 0,
    range: { startRatio, endRatio },
    edgeHandles: { ...activeSlot.edgeHandles },
    baseCurve: {
      kind: base.baseCurve?.kind === 'smooth' ? 'smooth' : 'linear',
    },
    deformation: {
      ...activeSlot.deformation,
      curve: [...activeSlot.deformation.curve],
      interior: [...activeSlot.deformation.interior],
      xOffsets: [...activeSlot.deformation.xOffsets],
    },
    targetSlots: {
      'dynamic-fade': dynamicSlot,
      'pitch-elastic': pitchSlot,
    },
  };
  syncEdgeHandles(sanitized);
  return sanitized;
}

export function ensureLocalFieldState(field: LocalFieldModuleState | null | undefined) {
  return sanitizeLocalFieldState(field);
}

export function setLocalFieldActiveTarget(fieldInput: LocalFieldModuleState, target: LocalFieldTargetKind): LocalFieldModuleState {
  const field = sanitizeLocalFieldState(fieldInput);
  if (field.interpreterKind === target) return field;
  const resolution = field.deformation.resolution;
  const currentTarget: LocalFieldTargetKind = field.interpreterKind === 'pitch-elastic' ? 'pitch-elastic' : 'dynamic-fade';
  const currentSlot = sanitizeTargetSlot({
    edgeHandles: field.edgeHandles,
    deformation: field.deformation,
  }, resolution);
  const targetSlot = sanitizeTargetSlot(field.targetSlots?.[target], resolution);
  const next = cloneLocalFieldState(field);
  next.targetSlots = {
    ...(field.targetSlots ?? {}),
    [currentTarget]: currentSlot,
    [target]: targetSlot,
  };
  next.interpreterKind = target;
  next.edgeHandles = { ...targetSlot.edgeHandles };
  next.deformation = {
    ...targetSlot.deformation,
    curve: [...targetSlot.deformation.curve],
    interior: [...targetSlot.deformation.interior],
    xOffsets: [...targetSlot.deformation.xOffsets],
  };
  return sanitizeLocalFieldState(next);
}

export function resetLocalFieldTarget(fieldInput: LocalFieldModuleState, target: LocalFieldTargetKind): LocalFieldModuleState {
  const field = sanitizeLocalFieldState(fieldInput);
  const resolution = field.deformation.resolution;
  const defaultField = createDefaultLocalFieldState();
  const defaultSlot = sanitizeTargetSlot(defaultField.targetSlots?.[target], resolution);
  const next = cloneLocalFieldState(field);
  next.targetSlots = {
    ...(field.targetSlots ?? {}),
    [target]: defaultSlot,
  };
  if (field.interpreterKind === target) {
    next.edgeHandles = { ...defaultSlot.edgeHandles };
    next.deformation = {
      ...defaultSlot.deformation,
      curve: [...defaultSlot.deformation.curve],
      interior: [...defaultSlot.deformation.interior],
      xOffsets: [...defaultSlot.deformation.xOffsets],
    };
  }
  return sanitizeLocalFieldState(next);
}

export function getLocalFieldTargetState(fieldInput: LocalFieldModuleState, target: LocalFieldTargetKind): LocalFieldModuleState {
  return setLocalFieldActiveTarget(fieldInput, target);
}

export function resolveLocalFieldCurve(fieldInput: LocalFieldModuleState, sampleCount = fieldInput.deformation.resolution): ResolvedLocalFieldCurve {
  const field = sanitizeLocalFieldState(fieldInput);
  const count = Math.max(MIN_RESOLUTION, Math.min(MAX_RESOLUTION, Math.round(sampleCount || field.deformation.resolution || DEFAULT_LOCAL_FIELD_RESOLUTION)));
  const resolved = resampleCurve(field.deformation.curve, count);
  const base = createLinearCurve(resolved[0] ?? 0, resolved[resolved.length - 1] ?? 0, count);
  const polylineX = new Array(count).fill(0).map((_, index) => (count <= 1 ? 0 : index / Math.max(1, count - 1)));
  const polylineY = [...resolved];
  return { base, resolved, polylineX, polylineY };
}

export function resolveLocalFieldCurveForTarget(fieldInput: LocalFieldModuleState, target: LocalFieldTargetKind, sampleCount?: number): ResolvedLocalFieldCurve {
  const field = getLocalFieldTargetState(fieldInput, target);
  return resolveLocalFieldCurve(field, sampleCount ?? field.deformation.resolution);
}

export function paintLocalFieldSegment(
  fieldInput: LocalFieldModuleState,
  fromIndex: number,
  toIndex: number,
  fromValue: number,
  toValue: number,
): LocalFieldModuleState {
  const field = sanitizeLocalFieldState(fieldInput);
  const next = cloneLocalFieldState(field);
  const count = next.deformation.curve.length;
  const startIndex = clamp(Math.round(fromIndex), 0, Math.max(0, count - 1));
  const endIndex = clamp(Math.round(toIndex), 0, Math.max(0, count - 1));
  const steps = Math.max(1, Math.abs(endIndex - startIndex));
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const index = Math.round(startIndex + (endIndex - startIndex) * t);
    const value = clampSigned(fromValue + (toValue - fromValue) * t);
    next.deformation.curve[index] = value;
  }
  next.deformation.interior = [...next.deformation.curve];
  syncEdgeHandles(next);
  return sanitizeLocalFieldState(next);
}

export function applyLocalFieldDrawStroke(fieldInput: LocalFieldModuleState, points: LocalFieldDrawPoint[]): LocalFieldModuleState {
  const field = sanitizeLocalFieldState(fieldInput);
  const normalized = normalizeDrawPoints(points);
  if (normalized.length < 2) return field;
  let next = cloneLocalFieldState(field);
  const count = next.deformation.curve.length;
  for (let index = 1; index < normalized.length; index += 1) {
    const previousPoint = normalized[index - 1];
    const point = normalized[index];
    if (!previousPoint || !point) continue;
    next = paintLocalFieldSegment(
      next,
      curveIndexFromRatio(previousPoint.ratio, count),
      curveIndexFromRatio(point.ratio, count),
      previousPoint.value,
      point.value,
    );
  }
  return sanitizeLocalFieldState(next);
}

export function applyLocalFieldBrushStroke(
  fieldInput: LocalFieldModuleState,
  operation: LocalFieldOperationKind,
  args: LocalFieldBrushStrokeArgs,
): LocalFieldModuleState {
  const field = sanitizeLocalFieldState(fieldInput);
  if (operation !== 'warp') return field;
  const next = cloneLocalFieldState(field);
  const previous = [...next.deformation.curve];
  const count = previous.length;
  const focusRatio = clamp01(args.focusRatio);
  const focusValue = clampSigned(args.focusValue);
  const radiusPx = clamp(args.radiusPx, 12, Math.max(12, Math.max(args.plotWidth, args.plotHeight)));
  const intensity = clamp(args.intensity, 0.02, 1);
  const hardness = clamp(args.hardness, 0, 1);
  const fluidity = clamp(args.fluidity, 0, 1);
  const deltaNorm = clamp(args.deltaValue, -2, 2);
  const deltaIndex = clamp(Number.isFinite(args.deltaRatio) ? Number(args.deltaRatio) : 0, -1, 1) * Math.max(1, count - 1);
  const plotWidth = Math.max(1, args.plotWidth);
  const plotHeight = Math.max(1, args.plotHeight);
  const focusX = focusRatio * plotWidth;
  const focusY = projectY(focusValue, plotHeight);
  const hardnessPower = 1.35 + hardness * 4.4;
  const mutated = [...previous];
  const influenceMap = new Array<number>(count).fill(0);
  const verticalSoftRadius = Math.max(radiusPx * 1.18, plotHeight * (0.16 + fluidity * 0.12));

  for (let index = 0; index < count; index += 1) {
    const pointX = (index / Math.max(1, count - 1)) * plotWidth;
    const pointY = projectY(previous[index] ?? 0, plotHeight);
    const horizontalRatio = Math.abs(pointX - focusX) / Math.max(1, radiusPx);
    if (horizontalRatio > 1) continue;
    const verticalRatio = Math.abs(pointY - focusY) / Math.max(1, verticalSoftRadius);
    const footprintRatio = clamp(horizontalRatio * 0.82 + Math.min(1, verticalRatio) * 0.18, 0, 1);
    const falloff = Math.pow(1 - footprintRatio, hardnessPower);
    const coreBoost = hardness > 0.7 && horizontalRatio < 0.24 ? (hardness - 0.7) * 0.28 : 0;
    const influence = clamp(falloff + coreBoost, 0, 1);
    influenceMap[index] = influence;
    mutated[index] = clampSigned((previous[index] ?? 0) + deltaNorm * intensity * influence);
  }

  const shiftField = new Array<number>(count).fill(0);
  const horizontalGain = 1.65 + (1 - fluidity) * 2.15 + hardness * 0.95;
  for (let index = 0; index < count; index += 1) {
    const influence = influenceMap[index] ?? 0;
    if (influence <= 0.0001) continue;
    shiftField[index] = deltaIndex * influence * horizontalGain * intensity;
  }

  if (fluidity > 0.26) {
    const passes = fluidity > 0.68 ? 2 : 1;
    const blend = fluidity * 0.38;
    for (let pass = 0; pass < passes; pass += 1) {
      const source = [...shiftField];
      for (let index = 1; index < count - 1; index += 1) {
        const average = ((source[index - 1] ?? 0) + (source[index + 1] ?? 0)) * 0.5;
        shiftField[index] = (source[index] ?? 0) * (1 - blend) + average * blend;
      }
    }
  }

  const advected = [...mutated];
  const structureLock = clamp((1 - fluidity) * 0.82 + hardness * 0.28, 0, 1);
  for (let index = 0; index < count; index += 1) {
    const sourceIndex = clamp(index - (shiftField[index] ?? 0), 0, count - 1);
    const leftIndex = Math.floor(sourceIndex);
    const rightIndex = Math.min(count - 1, leftIndex + 1);
    const mix = sourceIndex - leftIndex;
    const linear = (mutated[leftIndex] ?? 0) * (1 - mix) + (mutated[rightIndex] ?? 0) * mix;
    const nearest = mutated[Math.round(sourceIndex)] ?? linear;
    advected[index] = clampSigned(linear * (1 - structureLock) + nearest * structureLock);
  }

  for (let index = 0; index < count; index += 1) {
    const localShift = Math.abs(shiftField[index] ?? 0);
    const shiftInfluence = clamp(localShift / 3.8, 0, 1);
    const mix = clamp(Math.max(influenceMap[index] ?? 0, shiftInfluence) * (0.45 + intensity * 0.7), 0, 1);
    mutated[index] = clampSigned((mutated[index] ?? 0) * (1 - mix) + (advected[index] ?? 0) * mix);
  }

  const smoothed = applyFluidSmoothing(mutated, fluidity, hardness);
  next.deformation.curve = smoothed;
  next.deformation.interior = [...smoothed];
  next.deformation.xOffsets = shiftField.map((value, index) => {
    if (index === 0 || index === count - 1) return 0;
    return clamp(value / Math.max(1, count - 1), -0.42, 0.42);
  });
  syncEdgeHandles(next);
  return sanitizeLocalFieldState(next);
}

export function applyLocalFieldOperation(
  fieldInput: LocalFieldModuleState,
  operation: LocalFieldOperationKind,
  args: { focusRatio: number; radius: number; intensity: number },
): LocalFieldModuleState {
  const field = sanitizeLocalFieldState(fieldInput);
  return applyLocalFieldBrushStroke(field, operation, {
    focusRatio: args.focusRatio,
    focusValue: 0,
    radiusPx: args.radius,
    intensity: args.intensity,
    hardness: 0.7,
    fluidity: 0.42,
    plotWidth: 980,
    plotHeight: 320,
    deltaValue: 0.12,
  });
}

export function drawLocalFieldWorkbench(args: LocalFieldRenderArgs) {
  const { canvas, field, brushPreview, drawPreview } = args;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const width = canvas.width;
  const height = canvas.height;
  const { padX, padY, usableW, usableH, midY } = getLocalFieldCanvasMetrics(canvas);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, 'rgba(217,70,239,0.08)');
  gradient.addColorStop(1, 'rgba(59,130,246,0.08)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  for (let step = 0; step <= 6; step += 1) {
    const ratio = step / 6;
    const y = padY + ratio * usableH;
    ctx.strokeStyle = step === 3 ? 'rgba(250,204,21,0.82)' : 'rgba(148,163,184,0.14)';
    ctx.lineWidth = step === 3 ? 1.7 : 1;
    ctx.beginPath();
    ctx.moveTo(padX, y + 0.5);
    ctx.lineTo(width - padX, y + 0.5);
    ctx.stroke();
  }

  for (let step = 0; step <= 12; step += 1) {
    const ratio = step / 12;
    const x = padX + ratio * usableW;
    ctx.strokeStyle = 'rgba(96,165,250,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, padY);
    ctx.lineTo(x + 0.5, height - padY);
    ctx.stroke();
  }

  const curve = resolveLocalFieldCurve(field, field.deformation.resolution);
  const projectX = (ratio: number) => padX + ratio * usableW;
  const projectYCanvas = (value: number) => padY + projectY(value, usableH);
  const baseXs = curve.base.map((_, index) => projectX(index / Math.max(1, curve.base.length - 1)));
  const baseYs = curve.base.map((value) => projectYCanvas(value));
  const resolvedXs = curve.polylineX.map((value) => projectX(value));
  const resolvedYs = curve.polylineY.map((value) => projectYCanvas(value));

  if (drawPreview && drawPreview.points.length > 1) {
    const previewPoints = normalizeDrawPoints(drawPreview.points);
    const previewXs = previewPoints.map((point) => projectX(point.ratio));
    const previewYs = previewPoints.map((point) => projectYCanvas(point.value));
    ctx.save();
    ctx.strokeStyle = drawPreview.pointerDown ? 'rgba(250,204,21,0.98)' : 'rgba(250,204,21,0.72)';
    ctx.lineWidth = drawPreview.pointerDown ? 2.4 : 1.8;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    strokePolyline(ctx, previewXs, previewYs);
    ctx.stroke();
    ctx.restore();
  }

  if (brushPreview) {
    const x = projectX(clamp01(brushPreview.ratio));
    const y = projectYCanvas(brushPreview.value);
    const radiusPx = Math.max(12, brushPreview.radiusPx);
    ctx.save();
    ctx.strokeStyle = brushPreview.pointerDown ? 'rgba(244,114,182,0.96)' : 'rgba(244,114,182,0.52)';
    ctx.lineWidth = brushPreview.pointerDown ? 1.8 : 1.2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.arc(x, y, radiusPx, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(244,114,182,0.28)';
    ctx.beginPath();
    ctx.moveTo(x + 0.5, padY);
    ctx.lineTo(x + 0.5, height - padY);
    ctx.stroke();
    ctx.fillStyle = 'rgba(244,114,182,0.92)';
    ctx.beginPath();
    ctx.arc(x, y, brushPreview.pointerDown ? 4 : 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.strokeStyle = 'rgba(148,163,184,0.42)';
  ctx.lineWidth = 1.1;
  strokePolyline(ctx, baseXs, baseYs);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(244,114,182,0.24)';
  ctx.lineWidth = 5.8;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  strokePolyline(ctx, resolvedXs, resolvedYs);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(244,114,182,0.98)';
  ctx.lineWidth = 2.2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  strokePolyline(ctx, resolvedXs, resolvedYs);
  ctx.stroke();
  ctx.restore();

  const drawTriangle = (ratio: number, value: number, side: 'left' | 'right') => {
    const x = projectX(ratio);
    const y = projectYCanvas(value);
    const size = 9;
    ctx.fillStyle = 'rgba(244,114,182,0.98)';
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (side === 'left') {
      ctx.moveTo(x + size, y);
      ctx.lineTo(x, y - size * 0.72);
      ctx.lineTo(x, y + size * 0.72);
    } else {
      ctx.moveTo(x - size, y);
      ctx.lineTo(x, y - size * 0.72);
      ctx.lineTo(x, y + size * 0.72);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  drawTriangle(0, field.edgeHandles.left, 'left');
  drawTriangle(1, field.edgeHandles.right, 'right');

  ctx.fillStyle = 'rgba(248,250,252,0.78)';
  ctx.font = '11px sans-serif';
  ctx.fillText('Null-Linie', padX + 8, midY - 6);
}

export function localFieldDynamicFadeGain(value: number) {
  const safe = clampSigned(value);
  return clamp(1 + safe * 0.95, 0.0, 2.0);
}

export function localFieldPitchSemitoneOffset(value: number) {
  return clampSigned(value) * 12;
}
