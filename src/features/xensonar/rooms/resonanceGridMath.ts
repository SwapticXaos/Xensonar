import { deriveModeMask, getModesForSystem, getRasterDefinition, getRasterPeriodRatio, getRasterStepCents, getTuningSteps, JI_NODES, type ChurchMode, type GridTuning } from '../domain/instrumentData';
import type { GridLine } from '../domain/runtimeTypes';
import { getResonanceViewportRangeForBase } from './resonanceRuntimeMath';

export function buildGridMuteList(tuning: GridTuning, mode: ChurchMode, allowedSteps?: number[]) {
  const len = getTuningSteps(tuning);
  if (mode === 'chromatic' && allowedSteps && allowedSteps.length > 0) {
    const allowed = new Set(allowedSteps.map((step) => ((step % len) + len) % len));
    return Array.from({ length: len }, (_, idx) => idx).filter((step) => !allowed.has(step));
  }
  const mask = deriveModeMask(mode, tuning);
  const nextMutes: number[] = [];
  for (let i = 0; i < len; i += 1) {
    if (!mask[i]) nextMutes.push(i);
  }
  return nextMutes;
}

export function buildGridOffsets(tuning: GridTuning, sparseOffsets?: Record<number, number>) {
  const len = getTuningSteps(tuning);
  const nextOffsets: number[] = Array.from({ length: len }, () => 0);
  if (!sparseOffsets) return nextOffsets;
  Object.entries(sparseOffsets).forEach(([key, value]) => {
    const idx = Number(key);
    if (Number.isFinite(idx) && idx >= 0 && idx < len) nextOffsets[idx] = value;
  });
  return nextOffsets;
}


export type ResonanceGridStateSnapshot = {
  gridTuning: GridTuning;
  gridMode: ChurchMode;
  gridBase: number;
  rememberGrid: boolean;
  gridStates: Record<string, { mutes: number[]; offsets: number[] }>;
  manualGridMutedSteps: number[];
  manualGridStepOffsets: number[];
};

export function normalizeGridMutedSteps(tuning: GridTuning, steps: number[]) {
  const len = getTuningSteps(tuning);
  return [...new Set(steps.map((step) => ((step % len) + len) % len))].sort((a, b) => a - b);
}

export function normalizeGridStepIndex(tuning: GridTuning, step: number) {
  const len = getTuningSteps(tuning);
  return ((step % len) + len) % len;
}

export function buildGridTuningTransition(state: ResonanceGridStateSnapshot, nextTuning: GridTuning) {
  const newGridStates = { ...state.gridStates };
  newGridStates[state.gridTuning] = {
    mutes: [...state.manualGridMutedSteps],
    offsets: [...state.manualGridStepOffsets],
  };

  const availableModes = getModesForSystem(nextTuning);
  const resolvedGridMode = availableModes.some((mode) => mode.value === state.gridMode)
    ? state.gridMode
    : availableModes[0]?.value ?? 'chromatic';

  let nextMutes: number[] = [];
  let nextOffsets: number[] = [];

  if (state.rememberGrid && newGridStates[nextTuning]) {
    nextMutes = [...newGridStates[nextTuning].mutes];
    nextOffsets = [...newGridStates[nextTuning].offsets];
  } else {
    const len = getTuningSteps(nextTuning);
    nextOffsets = Array.from({ length: len }, () => 0);
    const mask = deriveModeMask(resolvedGridMode, nextTuning);
    for (let i = 0; i < len; i += 1) {
      if (!mask[i]) nextMutes.push(i);
    }
  }

  return {
    newGridStates,
    resolvedGridMode,
    nextMutes,
    nextOffsets,
  };
}

const VISIBLE_GRID_LINES_CACHE_LIMIT = 48;
const visibleGridLinesCache = new Map<string, GridLine[]>();

const buildVisibleGridLinesCacheKey = (state: Pick<ResonanceGridStateSnapshot, 'gridTuning' | 'gridBase' | 'manualGridMutedSteps' | 'manualGridStepOffsets'>) => {
  const muted = (state.manualGridMutedSteps ?? []).join(',');
  const offsets = (state.manualGridStepOffsets ?? [])
    .map((value, idx) => (value ? `${idx}:${value}` : ''))
    .filter(Boolean)
    .join(',');
  return `${state.gridTuning}|${state.gridBase.toFixed(6)}|m:${muted}|o:${offsets}`;
};

const readCachedVisibleGridLines = (key: string) => {
  const cached = visibleGridLinesCache.get(key);
  if (!cached) return null;
  visibleGridLinesCache.delete(key);
  visibleGridLinesCache.set(key, cached);
  return cached;
};

const writeCachedVisibleGridLines = (key: string, lines: GridLine[]) => {
  visibleGridLinesCache.set(key, lines);
  if (visibleGridLinesCache.size > VISIBLE_GRID_LINES_CACHE_LIMIT) {
    const oldest = visibleGridLinesCache.keys().next().value;
    if (oldest) visibleGridLinesCache.delete(oldest);
  }
  return lines;
};

export function buildVisibleGridLines(state: Pick<ResonanceGridStateSnapshot, 'gridTuning' | 'gridBase' | 'manualGridMutedSteps' | 'manualGridStepOffsets'>): GridLine[] {
  const cacheKey = buildVisibleGridLinesCacheKey(state);
  const cached = readCachedVisibleGridLines(cacheKey);
  if (cached) return cached;
  const manualMuted = new Set(state.manualGridMutedSteps ?? []);
  const offsets = state.manualGridStepOffsets ?? [];
  const { min, max } = getResonanceViewportRangeForBase(state.gridBase);

  if (state.gridTuning === 'ji') {
    return writeCachedVisibleGridLines(cacheKey, [0.125, 0.25, 0.5, 1, 2, 4].flatMap((oct) =>
      JI_NODES.map((ji, idx) => {
        const offsetCents = (offsets[idx] ?? 0) * 10;
        const freq = state.gridBase * oct * ji.ratio * Math.pow(2, offsetCents / 1200);
        return {
          id: `ji-${oct}-${idx}`,
          label: `${ji.label} (${freq.toFixed(1)}Hz)`,
          freq,
          manualMuted: manualMuted.has(idx),
          modeMuted: false,
          stepIndex: idx,
        };
      }),
    ).filter((line) => line.freq >= min && line.freq <= max));
  }

  const stepCents = getRasterStepCents(state.gridTuning);
  const periodRatio = getRasterPeriodRatio(state.gridTuning);
  const definition = getRasterDefinition(state.gridTuning);
  if (!stepCents.length || !Number.isFinite(periodRatio) || periodRatio <= 1) return writeCachedVisibleGridLines(cacheKey, []);

  const minShift = Math.floor(Math.log(Math.max(min, 0.0001) / Math.max(state.gridBase, 0.0001)) / Math.log(periodRatio)) - 2;
  const maxShift = Math.ceil(Math.log(Math.max(max, 0.0001) / Math.max(state.gridBase, 0.0001)) / Math.log(periodRatio)) + 2;
  const labelPrefix = state.gridTuning === 'bp'
    ? 'BP'
    : state.gridTuning === 'gamelan'
      ? 'Pelog'
      : state.gridTuning === 'maqam'
        ? 'Maqam'
        : definition?.family.toUpperCase() ?? 'Raster';

  const lines: GridLine[] = [];
  for (let shift = minShift; shift <= maxShift; shift += 1) {
    const periodMultiplier = Math.pow(periodRatio, shift);
    stepCents.forEach((cents, step) => {
      const offsetCents = (offsets[step] ?? 0) * 10;
      const freq = state.gridBase * Math.pow(2, (cents + offsetCents) / 1200) * periodMultiplier;
      if (freq < min || freq > max) return;
      const isRoot = step === 0 && shift === 0;
      const stepLabel = isRoot ? `${labelPrefix} Root` : `${labelPrefix} ${step + 1}`;
      lines.push({
        id: `${state.gridTuning}-${shift}-${step}`,
        label: `${stepLabel} (${freq.toFixed(1)}Hz)`,
        freq,
        manualMuted: manualMuted.has(step),
        modeMuted: false,
        stepIndex: step,
      });
    });
  }
  return writeCachedVisibleGridLines(cacheKey, lines);
}
