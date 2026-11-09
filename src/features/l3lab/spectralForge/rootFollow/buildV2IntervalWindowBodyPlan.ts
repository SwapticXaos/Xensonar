import type { LocalFieldModuleState, LocalFieldTargetSlot } from '../../canonicalForge/localField';
import type { AnchorBindingPreview, CarrierAnchor, CarrierSpectralSkeleton, DonorTimbreAtlas } from '../types/carrierDonorV2Types';
import type { MaterialAllocationPreview, MaterialCell, MaterialCellKind, MaterialField } from '../types/gestaltMaterialField';
import type { AudioMaterialInterpretationProfile } from '../../../xensonar/audioMaterial/audioMaterialInterpretationProfile';
import type { RootFollowSpectralWindowMeta } from '../../../xensonar/rootFollow/rootFollowSpectralWindowMeta';
import type { SpectralForgeV2RootFollowLayerId } from './buildV2RootFollowEvent';

export type SpectralForgeV2IntervalWindowLayer = SpectralForgeV2RootFollowLayerId | 'mixed';
export type SpectralForgeV2WindowVoiceRole = 'body' | 'surface' | 'skin' | 'articulation';

export type SpectralForgeV2IntervalWindow = {
  id: string;
  startTimeIndex: number;
  endTimeIndex: number;
  startBeat: number;
  endBeat: number;
  layer: SpectralForgeV2IntervalWindowLayer;
  anchorCount: number;
  bindingCount: number;
  allocationCount: number;
  yMinBin: number;
  yMaxBin: number;
  yCentroidBin: number;
  ySpread: number;
  energyGraph: number[];
  densityGraph: number[];
  centroidGraph: number[];
  spreadGraph: number[];
  frequencyStartHz: number;
  frequencyEndHz: number;
  frequencyCentroidHz: number;
  continuity: number;
  roughness: number;
  transientness: number;
  donorPigment?: {
    resonanceTint: number;
    residualTint: number;
    transientTint: number;
    noiseColor: number;
    leakRisk: number;
  };
};

export type SpectralForgeV2IntervalWindowVoice = {
  id: string;
  windowId: string;
  role: SpectralForgeV2WindowVoiceRole;
  trackId: SpectralForgeV2RootFollowLayerId;
  startBeat: number;
  durationBeats: number;
  lineHz: number;
  velocity: number;
  gate: number;
  localField: LocalFieldModuleState;
  spectralWindowMeta: RootFollowSpectralWindowMeta;
};

export type SpectralForgeV2IntervalWindowBodyPlan = {
  windows: SpectralForgeV2IntervalWindow[];
  voices: SpectralForgeV2IntervalWindowVoice[];
  summary: {
    intervalWindowCount: number;
    intervalWindowVoiceCount: number;
    densestWindowAnchorCount: number;
    maxWindowDensity: number;
    denseColumnRatio: number;
    windowedAnchorCount: number;
    sourceAnchorCount: number;
  };
};

type ColumnStats = {
  timeIndex: number;
  anchors: CarrierAnchor[];
  anchorCount: number;
  bindingCount: number;
  allocationCount: number;
  energy: number;
  density: number;
  centroidBin: number;
  spreadBins: number;
  minBin: number;
  maxBin: number;
  centroidHz: number;
  continuity: number;
  roughness: number;
  transientness: number;
  layerScores: Record<SpectralForgeV2RootFollowLayerId, number>;
  donorPigment: SpectralForgeV2IntervalWindow['donorPigment'];
};

type BuildArgs = {
  skeleton: CarrierSpectralSkeleton;
  bindingPreview: AnchorBindingPreview[];
  donorAtlas: DonorTimbreAtlas | null | undefined;
  materialField: MaterialField | null | undefined;
  materialAllocationPreview: MaterialAllocationPreview | null | undefined;
  materialInterpretationProfile?: AudioMaterialInterpretationProfile | null;
  totalBeats: number;
  baseHz: number;
};

const GRAPH_RESOLUTION = 96;
const LOCAL_FIELD_RESOLUTION = 96;

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function layerFromRegime(regime: CarrierAnchor['regime']): SpectralForgeV2RootFollowLayerId {
  switch (regime) {
    case 'tonal': return 'ordered';
    case 'cluster': return 'body';
    case 'noise': return 'residual';
    case 'transient': return 'transient';
    default: return 'body';
  }
}

function layerFromMaterialKind(kind: MaterialCellKind): SpectralForgeV2RootFollowLayerId {
  switch (kind) {
    case 'ordered': return 'ordered';
    case 'resonant': return 'body';
    case 'residual': return 'residual';
    case 'transient': return 'transient';
    case 'mixed':
    default: return 'body';
  }
}

function emptyScores(): Record<SpectralForgeV2RootFollowLayerId, number> {
  return { ordered: 0, body: 0, residual: 0, transient: 0 };
}

function dominantLayer(scores: Record<SpectralForgeV2RootFollowLayerId, number>): SpectralForgeV2IntervalWindowLayer {
  const entries = (Object.keys(scores) as SpectralForgeV2RootFollowLayerId[])
    .map((layer) => ({ layer, score: scores[layer] }))
    .sort((a, b) => b.score - a.score);
  const best = entries[0];
  const second = entries[1];
  if (!best || best.score <= 0) return 'body';
  if (second && second.score > best.score * 0.72) return 'mixed';
  return best.layer;
}

function buildMaterialCellMap(materialField: MaterialField | null | undefined) {
  return new Map((materialField?.cells ?? []).map((cell) => [cell.id, cell] as const));
}

function buildAllocationMap(materialAllocationPreview: MaterialAllocationPreview | null | undefined) {
  const map = new Map<number, Array<{ cellId: string; weight: number }>>();
  for (const allocation of materialAllocationPreview?.allocations ?? []) {
    const entries = allocation.cellIds.map((cellId, index) => ({
      cellId,
      weight: Math.max(0, allocation.weights[index] ?? 0),
    })).filter((entry) => entry.weight > 0.001);
    if (entries.length) map.set(allocation.timeIndex, entries);
  }
  return map;
}

function weightedMean<T>(entries: T[], weight: (entry: T) => number, value: (entry: T) => number, fallback = 0) {
  let sum = 0;
  let wSum = 0;
  for (const entry of entries) {
    const w = Math.max(0.0001, weight(entry));
    sum += value(entry) * w;
    wSum += w;
  }
  return wSum > 0 ? sum / wSum : fallback;
}

function resampleGraph(values: number[], count = GRAPH_RESOLUTION) {
  const safeCount = Math.max(2, Math.round(count));
  if (!values.length) return new Array(safeCount).fill(0);
  if (values.length === safeCount) return values.map((value) => clamp(value, -1, 1));
  return new Array(safeCount).fill(0).map((_, index) => {
    const t = index / Math.max(1, safeCount - 1);
    const pos = t * Math.max(0, values.length - 1);
    const left = Math.floor(pos);
    const right = Math.min(values.length - 1, left + 1);
    const mix = pos - left;
    return clamp((values[left] ?? 0) * (1 - mix) + (values[right] ?? 0) * mix, -1, 1);
  });
}

function normalizePositive(values: number[]) {
  const max = Math.max(0.0001, ...values.map((value) => Math.max(0, value)));
  return values.map((value) => clamp(value / max, 0, 1));
}

function normalizeSignedAroundMean(values: number[], scale = 1) {
  if (!values.length) return [];
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const maxDeviation = Math.max(0.0001, ...values.map((value) => Math.abs(value - mean)));
  return values.map((value) => clamp(((value - mean) / maxDeviation) * scale, -1, 1));
}

function makeTargetSlot(curve: number[]): LocalFieldTargetSlot {
  const resampled = resampleGraph(curve, LOCAL_FIELD_RESOLUTION);
  return {
    edgeHandles: { left: resampled[0] ?? 0, right: resampled[resampled.length - 1] ?? 0 },
    deformation: {
      resolution: resampled.length,
      curve: resampled,
      interior: [...resampled],
      xOffsets: new Array(resampled.length).fill(0),
      smoothing: 0.48,
    },
  };
}

function buildLocalFieldForWindow(window: SpectralForgeV2IntervalWindow, role: SpectralForgeV2WindowVoiceRole): LocalFieldModuleState {
  const dynamicBase = window.energyGraph.map((energy, index) => {
    const density = window.densityGraph[index] ?? energy;
    const roleBias = role === 'surface' ? -0.08 : role === 'skin' ? -0.12 : role === 'articulation' ? -0.18 : -0.04;
    return clamp((energy * 0.72 + density * 0.28 - 0.5) * 0.55 + roleBias, -0.42, 0.42);
  });
  const pitchBase = window.centroidGraph.map((centroid, index) => {
    const spread = window.spreadGraph[index] ?? 0;
    const roleScale = role === 'body' ? 0.11 : role === 'surface' ? 0.18 : role === 'skin' ? 0.08 : 0.04;
    return clamp(centroid * roleScale + spread * (role === 'surface' ? 0.035 : 0.012), -0.22, 0.22);
  });
  const dynamicSlot = makeTargetSlot(dynamicBase);
  const pitchSlot = makeTargetSlot(pitchBase);
  return {
    id: `sf-v2-window-field-${window.id}-${role}`,
    geometryKind: 'linear-strip',
    interpreterKind: 'dynamic-fade',
    enabled: true,
    bypassed: false,
    referenceLevel: 0,
    range: { startRatio: 0, endRatio: 1 },
    edgeHandles: { ...dynamicSlot.edgeHandles },
    baseCurve: { kind: 'smooth' },
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

function columnStats(args: {
  anchors: CarrierAnchor[];
  timeIndex: number;
  height: number;
  bindingByAnchorId: Map<string, AnchorBindingPreview>;
  allocationByTime: Map<number, Array<{ cellId: string; weight: number }>>;
  materialCellMap: Map<string, MaterialCell>;
  donorCellMap: Map<string, DonorTimbreAtlas['cells'][number]>;
  materialInterpretationProfile?: AudioMaterialInterpretationProfile | null;
}): ColumnStats {
  const anchors = args.anchors.filter((anchor) => anchor.energy > 0.003 && Number.isFinite(anchor.centerHz) && anchor.centerHz > 20);
  const layerScores = emptyScores();
  let bindingCount = 0;
  let allocationCount = 0;
  let resonanceTint = 0;
  let residualTint = 0;
  let transientTint = 0;
  let noiseColor = 0;
  let leakRisk = 0;
  let donorWeight = 0;

  for (const anchor of anchors) {
    const anchorWeight = Math.max(0.001, anchor.energy * (0.55 + anchor.continuity * 0.45));
    layerScores[layerFromRegime(anchor.regime)] += anchorWeight;
    const binding = args.bindingByAnchorId.get(anchor.id);
    if (binding) {
      bindingCount += 1;
      binding.donorCellIds.forEach((cellId, index) => {
        const cell = args.donorCellMap.get(cellId);
        const weight = Math.max(0, binding.weights[index] ?? 0) * anchorWeight;
        if (!cell || weight <= 0.001) return;
        layerScores[layerFromRegime(cell.regime)] += weight * 0.42;
        resonanceTint += (cell.resonanceModel?.meanResonanceStrength ?? 0) * weight;
        residualTint += (cell.residualModel?.meanResidualStrength ?? 0) * weight;
        transientTint += (cell.transientModel?.meanTransientStrength ?? 0) * weight;
        noiseColor += (cell.residualModel?.meanNoiseColorCentroid ?? 0) * weight;
        leakRisk += (cell.leakAuditModel?.meanOverallLeakRisk ?? cell.pitchLeakRisk ?? 0) * weight;
        donorWeight += weight;
      });
    }
  }

  for (const entry of args.allocationByTime.get(args.timeIndex) ?? []) {
    const cell = args.materialCellMap.get(entry.cellId);
    if (!cell) continue;
    allocationCount += 1;
    layerScores[layerFromMaterialKind(cell.kind)] += entry.weight * 0.64;
    resonanceTint += (cell.resonanceStrength ?? 0) * entry.weight;
    residualTint += (cell.residualStrength ?? 0) * entry.weight;
    transientTint += (cell.transientStrength ?? 0) * entry.weight;
    noiseColor += (cell.noiseColorCentroid ?? 0) * entry.weight;
    leakRisk += (cell.overallLeakRisk ?? 0) * entry.weight;
    donorWeight += entry.weight;
  }

  const roleWeights = args.materialInterpretationProfile?.carrierReading.roleWeights;
  if (roleWeights) {
    const influence = clamp(args.materialInterpretationProfile?.carrierReading.donorMaterialLoad ?? 0.35, 0.1, 0.6);
    layerScores.ordered += roleWeights.ordered * influence;
    layerScores.body += roleWeights.body * influence;
    layerScores.residual += roleWeights.residual * influence;
    layerScores.transient += roleWeights.transient * influence;
  }

  const energy = anchors.length ? anchors.reduce((sum, anchor) => sum + Math.max(0, anchor.energy), 0) / anchors.length : 0;
  const continuity = anchors.length ? weightedMean(anchors, (anchor) => anchor.energy, (anchor) => anchor.continuity, 0) : 0;
  const roughness = anchors.length ? weightedMean(anchors, (anchor) => anchor.energy, (anchor) => 1 - anchor.ridgeness, 0) : 0;
  const transientness = anchors.length ? weightedMean(anchors, (anchor) => anchor.energy, (anchor) => anchor.regime === 'transient' ? 1 : 0, 0) : 0;
  const centroidBin = anchors.length ? weightedMean(anchors, (anchor) => anchor.energy, (anchor) => anchor.centerBin, 0) : 0;
  const centroidHz = anchors.length ? weightedMean(anchors, (anchor) => anchor.energy, (anchor) => anchor.centerHz, 220) : 220;
  const minBin = anchors.length ? Math.min(...anchors.map((anchor) => anchor.centerBin - anchor.bandwidthBins * 0.5)) : 0;
  const maxBin = anchors.length ? Math.max(...anchors.map((anchor) => anchor.centerBin + anchor.bandwidthBins * 0.5)) : 0;
  const spreadBins = anchors.length
    ? Math.sqrt(weightedMean(anchors, (anchor) => anchor.energy, (anchor) => Math.pow(anchor.centerBin - centroidBin, 2), 0))
    : 0;
  const density = anchors.length * Math.max(0.02, energy) * (0.45 + continuity * 0.55) * (1 + Math.min(0.4, spreadBins / Math.max(1, args.height) * 3.2));

  return {
    timeIndex: args.timeIndex,
    anchors,
    anchorCount: anchors.length,
    bindingCount,
    allocationCount,
    energy: clamp(energy, 0, 1),
    density,
    centroidBin: clamp(centroidBin, 0, Math.max(1, args.height)),
    spreadBins: clamp(spreadBins, 0, Math.max(1, args.height)),
    minBin: clamp(minBin, 0, Math.max(1, args.height)),
    maxBin: clamp(maxBin, 0, Math.max(1, args.height)),
    centroidHz: clamp(centroidHz, 20, 12000),
    continuity: clamp(continuity, 0, 1),
    roughness: clamp(roughness, 0, 1),
    transientness: clamp(transientness, 0, 1),
    layerScores,
    donorPigment: donorWeight > 0 ? {
      resonanceTint: clamp(resonanceTint / donorWeight, 0, 1),
      residualTint: clamp(residualTint / donorWeight, 0, 1),
      transientTint: clamp(transientTint / donorWeight, 0, 1),
      noiseColor: clamp(noiseColor / donorWeight, 0, 1),
      leakRisk: clamp(leakRisk / donorWeight, 0, 1),
    } : undefined,
  };
}

function buildColumns(args: BuildArgs) {
  const width = Math.max(1, args.skeleton.width || 1);
  const height = Math.max(1, args.skeleton.height || 1);
  const bindingByAnchorId = new Map(args.bindingPreview.map((binding) => [binding.carrierAnchorId, binding] as const));
  const donorCellMap = new Map((args.donorAtlas?.cells ?? []).map((cell) => [cell.id, cell] as const));
  const materialCellMap = buildMaterialCellMap(args.materialField);
  const allocationByTime = buildAllocationMap(args.materialAllocationPreview);
  const columns: ColumnStats[] = [];
  for (let timeIndex = 0; timeIndex < width; timeIndex += 1) {
    columns.push(columnStats({
      anchors: args.skeleton.anchorsByTime[timeIndex] ?? [],
      timeIndex,
      height,
      bindingByAnchorId,
      allocationByTime,
      materialCellMap,
      donorCellMap,
      materialInterpretationProfile: args.materialInterpretationProfile,
    }));
  }
  return columns;
}

function densityThreshold(columns: ColumnStats[]) {
  const active = columns.filter((column) => column.anchorCount > 0).map((column) => column.density).sort((a, b) => a - b);
  if (!active.length) return Infinity;
  const q = (ratio: number) => active[Math.min(active.length - 1, Math.max(0, Math.floor((active.length - 1) * ratio)))] ?? 0;
  // Ziel: nicht ein mechanisches N-Event-Limit, sondern feldartige, tragende Spalten.
  // Bei fast durchgehendem Feld liegt der Schwellwert bewusst unterhalb des oberen Quartils,
  // damit ein langer Körper statt vieler Event-Inseln entsteht.
  return Math.max(0.006, Math.min(q(0.38), q(0.74) * 0.72));
}

function shouldTreatAsDense(column: ColumnStats, threshold: number) {
  if (column.anchorCount <= 0) return false;
  const continuityBoost = 0.78 + column.continuity * 0.34;
  const bodyEvidence = column.anchorCount >= 1 || column.spreadBins >= 1.2 || column.bindingCount >= 1 || column.allocationCount >= 1;
  const gestureEvidence = column.energy > 0.018 || column.continuity > 0.16 || column.roughness > 0.18 || column.transientness > 0.12;
  return bodyEvidence && gestureEvidence && column.density * continuityBoost >= threshold;
}

function mergeDonorPigments(pigments: Array<SpectralForgeV2IntervalWindow['donorPigment']>) {
  const usable = pigments.filter((entry): entry is NonNullable<SpectralForgeV2IntervalWindow['donorPigment']> => Boolean(entry));
  if (!usable.length) return undefined;
  const sum = usable.reduce((acc, entry) => ({
    resonanceTint: acc.resonanceTint + entry.resonanceTint,
    residualTint: acc.residualTint + entry.residualTint,
    transientTint: acc.transientTint + entry.transientTint,
    noiseColor: acc.noiseColor + entry.noiseColor,
    leakRisk: acc.leakRisk + entry.leakRisk,
  }), { resonanceTint: 0, residualTint: 0, transientTint: 0, noiseColor: 0, leakRisk: 0 });
  return {
    resonanceTint: clamp(sum.resonanceTint / usable.length, 0, 1),
    residualTint: clamp(sum.residualTint / usable.length, 0, 1),
    transientTint: clamp(sum.transientTint / usable.length, 0, 1),
    noiseColor: clamp(sum.noiseColor / usable.length, 0, 1),
    leakRisk: clamp(sum.leakRisk / usable.length, 0, 1),
  };
}

function makeWindow(args: {
  columns: ColumnStats[];
  index: number;
  width: number;
  height: number;
  totalBeats: number;
  baseHz: number;
}): SpectralForgeV2IntervalWindow {
  const activeColumns = args.columns.filter((column) => column.anchorCount > 0);
  const anchorCount = activeColumns.reduce((sum, column) => sum + column.anchorCount, 0);
  const bindingCount = activeColumns.reduce((sum, column) => sum + column.bindingCount, 0);
  const allocationCount = activeColumns.reduce((sum, column) => sum + column.allocationCount, 0);
  const layerScores = emptyScores();
  for (const column of activeColumns) {
    (Object.keys(layerScores) as SpectralForgeV2RootFollowLayerId[]).forEach((layer) => {
      layerScores[layer] += column.layerScores[layer];
    });
  }
  const startTimeIndex = Math.min(...args.columns.map((column) => column.timeIndex));
  const endTimeIndex = Math.max(...args.columns.map((column) => column.timeIndex));
  const startBeat = clamp(startTimeIndex / Math.max(1, args.width) * args.totalBeats, 0, args.totalBeats);
  const endBeat = clamp((endTimeIndex + 1) / Math.max(1, args.width) * args.totalBeats, startBeat + args.totalBeats / Math.max(1, args.width), args.totalBeats);
  const yMinBin = activeColumns.length ? Math.min(...activeColumns.map((column) => column.minBin)) : 0;
  const yMaxBin = activeColumns.length ? Math.max(...activeColumns.map((column) => column.maxBin)) : 0;
  const yCentroidBin = activeColumns.length ? weightedMean(activeColumns, (column) => Math.max(0.001, column.energy * column.anchorCount), (column) => column.centroidBin, args.height * 0.5) : args.height * 0.5;
  const ySpread = activeColumns.length ? weightedMean(activeColumns, (column) => Math.max(0.001, column.energy * column.anchorCount), (column) => column.spreadBins, 0) : 0;
  const rawEnergy = activeColumns.map((column) => column.energy);
  const rawDensity = normalizePositive(activeColumns.map((column) => column.density));
  const rawCentroid = normalizeSignedAroundMean(activeColumns.map((column) => column.centroidBin), 1);
  const rawSpread = normalizePositive(activeColumns.map((column) => column.spreadBins)).map((value) => value * 2 - 1);
  const frequencyStartHz = activeColumns[0]?.centroidHz ?? args.baseHz;
  const frequencyEndHz = activeColumns[activeColumns.length - 1]?.centroidHz ?? args.baseHz;
  const frequencyCentroidHz = activeColumns.length
    ? weightedMean(activeColumns, (column) => Math.max(0.001, column.energy * column.anchorCount), (column) => column.centroidHz, args.baseHz)
    : args.baseHz;
  return {
    id: `sf-v2-interval-window-${args.index}`,
    startTimeIndex,
    endTimeIndex,
    startBeat,
    endBeat,
    layer: dominantLayer(layerScores),
    anchorCount,
    bindingCount,
    allocationCount,
    yMinBin: Math.round(yMinBin),
    yMaxBin: Math.round(yMaxBin),
    yCentroidBin: Math.round(yCentroidBin),
    ySpread: clamp(ySpread, 0, args.height),
    energyGraph: resampleGraph(normalizePositive(rawEnergy), GRAPH_RESOLUTION).map((value) => clamp(value, 0, 1)),
    densityGraph: resampleGraph(rawDensity, GRAPH_RESOLUTION).map((value) => clamp(value, 0, 1)),
    centroidGraph: resampleGraph(rawCentroid, GRAPH_RESOLUTION),
    spreadGraph: resampleGraph(rawSpread, GRAPH_RESOLUTION),
    frequencyStartHz: clamp(frequencyStartHz, 20, 12000),
    frequencyEndHz: clamp(frequencyEndHz, 20, 12000),
    frequencyCentroidHz: clamp(frequencyCentroidHz, 20, 12000),
    continuity: activeColumns.length ? clamp(weightedMean(activeColumns, (column) => column.anchorCount, (column) => column.continuity, 0), 0, 1) : 0,
    roughness: activeColumns.length ? clamp(weightedMean(activeColumns, (column) => column.anchorCount, (column) => column.roughness, 0), 0, 1) : 0,
    transientness: activeColumns.length ? clamp(weightedMean(activeColumns, (column) => column.anchorCount, (column) => column.transientness, 0), 0, 1) : 0,
    donorPigment: mergeDonorPigments(activeColumns.map((column) => column.donorPigment)),
  };
}

function splitDenseColumns(args: { columns: ColumnStats[]; totalBeats: number; width: number; height: number; baseHz: number }) {
  const threshold = densityThreshold(args.columns);
  const maxGapColumns = Math.max(1, Math.round(args.width / Math.max(12, args.totalBeats * 3)));
  const denseFlags = args.columns.map((column) => shouldTreatAsDense(column, threshold));
  const windows: SpectralForgeV2IntervalWindow[] = [];
  let current: ColumnStats[] = [];
  let gap: ColumnStats[] = [];

  const flush = () => {
    const active = current.filter((column) => column.anchorCount > 0);
    if (active.length >= 1 || active.reduce((sum, column) => sum + column.anchorCount, 0) >= 2) {
      windows.push(makeWindow({
        columns: current,
        index: windows.length,
        width: args.width,
        height: args.height,
        totalBeats: args.totalBeats,
        baseHz: args.baseHz,
      }));
    }
    current = [];
    gap = [];
  };

  args.columns.forEach((column, index) => {
    if (denseFlags[index]) {
      if (gap.length) {
        current.push(...gap);
        gap = [];
      }
      current.push(column);
      return;
    }
    if (!current.length) return;
    if (column.anchorCount > 0 && gap.length < maxGapColumns) {
      gap.push(column);
      return;
    }
    flush();
  });
  flush();
  return { windows, threshold, denseColumnRatio: denseFlags.filter(Boolean).length / Math.max(1, args.columns.length) };
}

function roleTrack(window: SpectralForgeV2IntervalWindow, role: SpectralForgeV2WindowVoiceRole): SpectralForgeV2RootFollowLayerId {
  if (role === 'body') return window.layer === 'ordered' ? 'ordered' : 'body';
  if (role === 'surface') return window.layer === 'ordered' ? 'ordered' : 'body';
  if (role === 'skin') return 'residual';
  return 'transient';
}

function voiceRolesForWindow(window: SpectralForgeV2IntervalWindow): SpectralForgeV2WindowVoiceRole[] {
  const roles: SpectralForgeV2WindowVoiceRole[] = ['body'];
  if (window.ySpread > 1.2 || window.roughness > 0.14 || window.layer === 'mixed' || window.layer === 'ordered' || window.anchorCount >= 2) roles.push('surface');
  if ((window.donorPigment?.residualTint ?? 0) > 0.05 || window.roughness > 0.22 || window.layer === 'residual' || window.densityGraph.some((value) => value > 0.48)) roles.push('skin');
  if (window.transientness > 0.11 || (window.donorPigment?.transientTint ?? 0) > 0.1 || window.layer === 'transient' || window.energyGraph.some((value, index, graph) => index > 0 && Math.abs(value - (graph[index - 1] ?? value)) > 0.34)) roles.push('articulation');
  return roles.slice(0, 4);
}

function buildMeta(window: SpectralForgeV2IntervalWindow, role: SpectralForgeV2WindowVoiceRole): RootFollowSpectralWindowMeta {
  return {
    schemaVersion: 1,
    windowId: window.id,
    windowRole: role,
    layer: window.layer,
    anchorCount: window.anchorCount,
    bindingCount: window.bindingCount,
    allocationCount: window.allocationCount,
    startTimeIndex: window.startTimeIndex,
    endTimeIndex: window.endTimeIndex,
    yMinBin: window.yMinBin,
    yMaxBin: window.yMaxBin,
    yCentroidBin: window.yCentroidBin,
    ySpread: window.ySpread,
    energyGraph: [...window.energyGraph],
    densityGraph: [...window.densityGraph],
    centroidGraph: [...window.centroidGraph],
    spreadGraph: [...window.spreadGraph],
    continuity: window.continuity,
    roughness: window.roughness,
    transientness: window.transientness,
  };
}

function velocityForRole(window: SpectralForgeV2IntervalWindow, role: SpectralForgeV2WindowVoiceRole, profile: AudioMaterialInterpretationProfile | null | undefined) {
  const roleWeights = profile?.carrierReading.roleWeights;
  const bodyBias = roleWeights?.body ?? 0.5;
  const orderedBias = roleWeights?.ordered ?? 0.45;
  const residualBias = roleWeights?.residual ?? 0.35;
  const transientBias = roleWeights?.transient ?? 0.25;
  const base = 0.22 + Math.min(0.26, Math.log1p(window.anchorCount) * 0.045) + window.continuity * 0.14;
  if (role === 'body') return clamp(base + bodyBias * 0.18, 0.16, 0.9);
  if (role === 'surface') return clamp(base * 0.74 + orderedBias * 0.18 + window.ySpread * 0.008, 0.1, 0.72);
  if (role === 'skin') return clamp(base * 0.56 + residualBias * 0.2 + window.roughness * 0.14, 0.07, 0.56);
  return clamp(base * 0.46 + transientBias * 0.24 + window.transientness * 0.22, 0.06, 0.5);
}

function lineHzForRole(window: SpectralForgeV2IntervalWindow, role: SpectralForgeV2WindowVoiceRole) {
  const base = window.frequencyCentroidHz;
  if (role === 'surface') return clamp(base * (window.layer === 'ordered' ? 1.5 : 1.25), 20, 12000);
  if (role === 'skin') return clamp(base * 0.72, 20, 12000);
  if (role === 'articulation') return clamp(base * 2, 20, 12000);
  return clamp(base, 20, 12000);
}

function voicesFromWindows(windows: SpectralForgeV2IntervalWindow[], profile: AudioMaterialInterpretationProfile | null | undefined) {
  const voices: SpectralForgeV2IntervalWindowVoice[] = [];
  for (const window of windows) {
    for (const role of voiceRolesForWindow(window)) {
      const durationBeats = Math.max(0.0625, window.endBeat - window.startBeat);
      voices.push({
        id: `${window.id}-${role}`,
        windowId: window.id,
        role,
        trackId: roleTrack(window, role),
        startBeat: window.startBeat,
        durationBeats,
        lineHz: lineHzForRole(window, role),
        velocity: velocityForRole(window, role, profile),
        gate: role === 'articulation' ? clamp(0.38 + window.transientness * 0.4, 0.28, 0.74) : 1,
        localField: buildLocalFieldForWindow(window, role),
        spectralWindowMeta: buildMeta(window, role),
      });
    }
  }
  return voices;
}

export function buildSpectralForgeV2IntervalWindowBodyPlan(args: BuildArgs): SpectralForgeV2IntervalWindowBodyPlan {
  const width = Math.max(1, args.skeleton.width || 1);
  const height = Math.max(1, args.skeleton.height || 1);
  const columns = buildColumns(args);
  const sourceAnchorCount = columns.reduce((sum, column) => sum + column.anchorCount, 0);
  const split = splitDenseColumns({ columns, totalBeats: args.totalBeats, width, height, baseHz: args.baseHz });
  const windows = split.windows;
  const voices = voicesFromWindows(windows, args.materialInterpretationProfile);
  const windowedAnchorCount = windows.reduce((sum, window) => sum + window.anchorCount, 0);
  return {
    windows,
    voices,
    summary: {
      intervalWindowCount: windows.length,
      intervalWindowVoiceCount: voices.length,
      densestWindowAnchorCount: windows.reduce((max, window) => Math.max(max, window.anchorCount), 0),
      maxWindowDensity: columns.reduce((max, column) => Math.max(max, column.density), 0),
      denseColumnRatio: clamp(split.denseColumnRatio, 0, 1),
      windowedAnchorCount,
      sourceAnchorCount,
    },
  };
}
