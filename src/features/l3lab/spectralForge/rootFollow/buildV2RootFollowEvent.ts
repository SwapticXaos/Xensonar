import type { RootFollowBankEntryConfig, RootFollowCarrierTimbreSnapshot, RootFollowSynthNoteSnapshot, RootFollowSynthPatchTrackSnapshot, RootFollowSynthTrackSnapshot } from '../../../xensonar/rootFollow/rootFollowTypes';
import type { AnchorBindingPreview, CarrierAnchor, CarrierSpectralSkeleton, DonorTimbreAtlas } from '../types/carrierDonorV2Types';
import type { MaterialAllocationPreview, MaterialCell, MaterialField, MaterialCellKind } from '../types/gestaltMaterialField';
import type { TransferProfile } from '../types/transferProfile';
import type { CarrierDonorV2DonorUseMode } from '../types/carrierDonorV2RenderPolicy';
import { buildSpectralForgeV2IntervalWindowBodyPlan } from './buildV2IntervalWindowBodyPlan';
import { buildBranchB573SynthWindowBodyPlan } from './buildBranchB573SynthWindowBodyPlan';
import { buildCarrierLoopBodyCurvesFromBranchC } from '../integral/buildCarrierLoopBodyCurvesFromBranchC';
import type { CarrierLoopBodyCurveSet } from '../integral/carrierLoopBodyCurveTypes';
import type { AudioMaterialInterpretationProfile } from '../../../xensonar/audioMaterial/audioMaterialInterpretationProfile';
import type { CarrierIntegralMachineParams, CarrierIntegralRouteSignature } from '../integral/carrierIntegralContracts';
import { resolveCarrierIntegralRuntimeRootFollowRoute, type CarrierIntegralRuntimeRootFollowRouteStatus } from '../integral/carrierIntegralRuntimeRoutes';
import {
  buildCarrierLoopBodyShadowProbe,
  type CarrierLoopBodyShadowProbeReport,
  type CarrierLoopBodyShadowProbeRequest,
} from '../integral/carrierLoopBodyShadowProbe';
import type { CarrierLoopBodyPreviewAuditionHookRequest } from '../integral/carrierLoopBodyPreviewAuditionHook';
import {
  buildCarrierLoopBodyRootFollowModulationPlan,
  type CarrierLoopBodyRootFollowModulationPlan,
} from '../integral/carrierLoopBodyRootFollowModulationPlan';

export type SpectralForgeV2RootFollowLayerId = 'ordered' | 'body' | 'residual' | 'transient';

export type SpectralForgeV2RootFollowPlanSummary = {
  eligible: boolean;
  mode: 'spectralforge_v2_synthetic_event' | 'none';
  sourceKind: 'synth';
  renderMode: 'direct';
  bars: number;
  bpm: number;
  beatsPerBar: number;
  durationSec: number;
  totalBeats: number;
  coveredStartBeat: number | null;
  coveredEndBeat: number | null;
  coveredDurationBeats: number;
  activeDurationRatio: number;
  maxLineDurationBeats: number;
  baseHz: number;
  anchorGridStep: number | null;
  pitchMode: 'floating_frequency_signature';
  tuningSource: 'spectralforge_v2_carrier_signature';
  tuning: 'floating-frequency';
  repetitionModel: 'frequency-ratio';
  usesPitchQuantization: boolean;
  usesHardcodedTuning: boolean;
  trackCount: number;
  lineCount: number;
  noteCount: number;
  layerLineCounts: Record<SpectralForgeV2RootFollowLayerId, number>;
  branchALineTrafficCount: number;
  branchALineTrafficMicroOffsetCount: number;
  intervalWindowCount: number;
  intervalWindowVoiceCount: number;
  spectralWindowMetaCount: number;
  b573WindowCount: number;
  b573VoiceCount: number;
  b573LocalFieldVoiceCount: number;
  b573EmissionMode: 'line_segments' | 'interval_window_body' | 'hybrid' | null;
  usesAudioBuffer: boolean;
  usesGranularPlayback: boolean;
  usesSamplePresets: boolean;
  rootFollowPitchMode: 'live_frequency_anchor';
  carrierIntegralMachineId: CarrierIntegralRouteSignature['machineId'] | null;
  carrierIntegralBodySourceMode: CarrierIntegralRouteSignature['bodySourceMode'] | null;
  carrierIntegralParamsHash: string | null;
  carrierIntegralRuntimeStatus: CarrierIntegralRuntimeRootFollowRouteStatus | null;
  carrierIntegralEmissionMode: string | null;
  carrierLoopBodyShadowProbe: CarrierLoopBodyShadowProbeReport | null;
  carrierIntegralParamSummary: {
    maxVoices: number;
    maxLines: number;
    maxWindows: number;
    fadeInBeats: number;
    fadeOutBeats: number;
    densityCompression: number;
    localFieldDepth: number;
    stretchElasticity: number;
    safetyMode: string;
  } | null;
  reason: string;
};

export type SpectralForgeV2RootFollowBuildResult = {
  config: RootFollowBankEntryConfig;
  summary: SpectralForgeV2RootFollowPlanSummary;
  carrierLoopBodyPreviewCandidateCurveSet: CarrierLoopBodyCurveSet | null;
  carrierLoopBodyRootFollowModulationPlan: CarrierLoopBodyRootFollowModulationPlan | null;
};

type WeightedLayer = {
  layer: SpectralForgeV2RootFollowLayerId;
  weight: number;
};

type LineAnchorSample = {
  anchor: CarrierAnchor;
  layerWeight: number;
};

type LineGroup = {
  key: string;
  layer: SpectralForgeV2RootFollowLayerId;
  spectralLane: number;
  samples: LineAnchorSample[];
};

type LineSegment = {
  id: string;
  layer: SpectralForgeV2RootFollowLayerId;
  spectralLane: number;
  startTimeIndex: number;
  endTimeIndex: number;
  centerHz: number;
  energy: number;
  continuity: number;
  ridgeness: number;
  layerWeight: number;
  regime: CarrierAnchor['regime'];
  sampleCount: number;
};

const V2_LAYER_TRACKS: Array<{
  id: SpectralForgeV2RootFollowLayerId;
  label: string;
  color: string;
  role: RootFollowSynthTrackSnapshot['instrumentRole'];
  preset: string;
  volume: number;
  pan: number;
}> = [
  { id: 'ordered', label: 'V2 Ordered', color: '#a78bfa', role: 'companion', preset: 'bowGlass', volume: 0.66, pan: -0.14 },
  { id: 'body', label: 'V2 Body', color: '#38bdf8', role: 'bass', preset: 'amberPad', volume: 0.72, pan: 0.02 },
  { id: 'residual', label: 'V2 Residual', color: '#34d399', role: 'texture', preset: 'dustTexture', volume: 0.48, pan: 0.16 },
  { id: 'transient', label: 'V2 Transient', color: '#f59e0b', role: 'aux', preset: 'woodPulse', volume: 0.46, pan: -0.02 },
];

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function safeBars(value: number) {
  return Math.max(1, Math.round(Number.isFinite(value) ? value : 1));
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
    default:
      return 'body';
  }
}

function allAnchors(skeleton: CarrierSpectralSkeleton) {
  return skeleton.anchorsByTime.flat().filter(Boolean);
}

function resolveBaseHz(anchors: CarrierAnchor[], fallback = 220) {
  if (!anchors.length) return fallback;
  const sorted = [...anchors]
    .filter((anchor) => Number.isFinite(anchor.centerHz) && anchor.centerHz > 20)
    .sort((a, b) => b.energy - a.energy);
  const strongest = sorted.slice(0, Math.min(24, sorted.length));
  if (!strongest.length) return fallback;
  let mean = strongest.reduce((sum, anchor) => sum + anchor.centerHz * Math.max(0.001, anchor.energy), 0)
    / Math.max(0.001, strongest.reduce((sum, anchor) => sum + Math.max(0.001, anchor.energy), 0));
  while (mean > 440) mean /= 2;
  while (mean < 110) mean *= 2;
  return clamp(mean, 55, 880);
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

function chooseLayerForAnchor(args: {
  anchor: CarrierAnchor;
  allocationCells: Array<{ cellId: string; weight: number }> | undefined;
  materialCellMap: Map<string, MaterialCell>;
  binding: AnchorBindingPreview | undefined;
  donorAtlas: DonorTimbreAtlas | null | undefined;
  materialInterpretationProfile?: AudioMaterialInterpretationProfile | null;
}): WeightedLayer {
  let bestLayer = layerFromRegime(args.anchor.regime);
  let bestWeight = Math.max(0.01, args.anchor.energy);

  const candidateWeights: Record<SpectralForgeV2RootFollowLayerId, number> = {
    ordered: 0,
    body: 0,
    residual: 0,
    transient: 0,
  };

  for (const entry of args.allocationCells ?? []) {
    const cell = args.materialCellMap.get(entry.cellId);
    if (!cell) continue;
    candidateWeights[layerFromMaterialKind(cell.kind)] += entry.weight;
  }

  if (args.binding && args.donorAtlas) {
    const donorCells = new Map(args.donorAtlas.cells.map((cell) => [cell.id, cell] as const));
    args.binding.donorCellIds.forEach((cellId, index) => {
      const cell = donorCells.get(cellId);
      const weight = Math.max(0, args.binding?.weights[index] ?? 0);
      if (!cell || weight <= 0.001) return;
      candidateWeights[layerFromRegime(cell.regime)] += weight * 0.7;
    });
  }

  const roleWeights = args.materialInterpretationProfile?.carrierReading.roleWeights;
  if (roleWeights) {
    const profileInfluence = clamp(args.materialInterpretationProfile?.carrierReading.donorMaterialLoad ?? 0.35, 0.12, 0.62);
    candidateWeights.ordered += roleWeights.ordered * profileInfluence;
    candidateWeights.body += roleWeights.body * profileInfluence;
    candidateWeights.residual += roleWeights.residual * profileInfluence;
    candidateWeights.transient += roleWeights.transient * profileInfluence;
    bestWeight += (args.materialInterpretationProfile?.carrierReading.carrierRespect ?? 0) * 0.06;
  }

  (Object.keys(candidateWeights) as SpectralForgeV2RootFollowLayerId[]).forEach((layer) => {
    if (candidateWeights[layer] > bestWeight) {
      bestLayer = layer;
      bestWeight = candidateWeights[layer];
    }
  });

  return { layer: bestLayer, weight: clamp(bestWeight, 0.01, 1) };
}

function spectralLaneForAnchor(anchor: CarrierAnchor, height: number) {
  // Nur Bild-/Gestalt-Lane nach gemalter Y-Position. Keine Tonleiter, keine EDO-Quantisierung.
  const laneSizeBins = Math.max(1, Math.round(Math.max(1, height) / 36));
  return Math.round(Math.max(0, anchor.centerBin) / laneSizeBins);
}

function lineVelocity(segment: LineSegment, params?: CarrierIntegralMachineParams | null) {
  const compression = clamp(params?.densityCompression ?? 0.35, 0, 1);
  const headroomGain = Math.pow(10, clamp(params?.headroomDb ?? 0, -36, 3) / 20);
  const raw = 0.16
    + segment.energy * (0.58 * (1 - compression * 0.42))
    + segment.ridgeness * 0.1
    + segment.continuity * 0.12
    + segment.layerWeight * 0.17
    + Math.min(0.12, segment.sampleCount * 0.008);
  return clamp(raw * headroomGain, 0.04, 0.95);
}

function branchALineTrafficMicroOffsetBeat(segment: LineSegment, index: number, params?: CarrierIntegralMachineParams | null) {
  // Branch A bleibt Linien-/Ereignisverkehr: kein C-Fensterkörper, kein B_5.73-Spaltenfenster,
  // sondern eine geführte Konturfolge mit kleinem deterministischem Mikro-Versatz.
  const strength = clamp(params?.microOffsetStrength ?? 0.34, 0, 1);
  if (strength <= 0.001) return 0;
  const layerPhase: Record<SpectralForgeV2RootFollowLayerId, number> = {
    ordered: -0.45,
    body: 0.1,
    residual: 0.32,
    transient: -0.18,
  };
  const densityTension = clamp(segment.energy * 0.45 + segment.ridgeness * 0.25 + Math.min(0.3, segment.sampleCount * 0.012), 0, 1);
  const alternating = ((index % 5) - 2) / 2;
  return clamp((layerPhase[segment.layer] * 0.45 + alternating * 0.55) * densityTension * strength * 0.12, -0.18, 0.18);
}

function branchALineTrafficVelocityScale(segment: LineSegment, params?: CarrierIntegralMachineParams | null) {
  const compression = clamp(params?.densityCompression ?? 0.46, 0, 1);
  const contourRespect = clamp(0.82 + segment.continuity * 0.22 + segment.ridgeness * 0.12, 0.72, 1.12);
  const safetyTrim = params?.safetyMode === 'streng' ? 0.82 : params?.safetyMode === 'frei' ? 1.04 : 0.94;
  return clamp(contourRespect * safetyTrim * (1 - compression * 0.18), 0.58, 1.1);
}

function branchALineTrafficGateScale(segment: LineSegment, params?: CarrierIntegralMachineParams | null) {
  const elasticity = clamp(params?.stretchElasticity ?? 0.5, 0, 1);
  if (segment.layer === 'transient') return clamp(0.72 + elasticity * 0.18, 0.62, 0.96);
  if (segment.layer === 'residual') return clamp(0.84 + elasticity * 0.3, 0.78, 1.18);
  return clamp(0.88 + elasticity * 0.24 + segment.continuity * 0.12, 0.78, 1.22);
}

function layerProfileVolumeMultiplier(layer: SpectralForgeV2RootFollowLayerId, profile: AudioMaterialInterpretationProfile | null | undefined) {
  const weights = profile?.carrierReading.roleWeights;
  if (!weights) return 1;
  const weight = weights[layer];
  return clamp(0.82 + weight * 0.72, 0.74, 1.18);
}

function layerProfileGate(layer: SpectralForgeV2RootFollowLayerId, profile: AudioMaterialInterpretationProfile | null | undefined) {
  const reading = profile?.carrierReading;
  if (!reading) return layer === 'transient' ? 0.68 : 1;
  if (layer === 'transient') return clamp(0.42 + reading.transientPulse * 0.32, 0.38, 0.82);
  if (layer === 'residual') return clamp(0.68 + reading.residualDust * 0.22 + reading.releaseBias * 0.12, 0.62, 1.05);
  if (layer === 'ordered') return clamp(0.78 + reading.carrierRespect * 0.26 + reading.releaseBias * 0.12, 0.72, 1.18);
  return clamp(0.74 + reading.bodyContinuity * 0.32 + reading.releaseBias * 0.1, 0.68, 1.15);
}


function groupKeyForAnchor(args: {
  anchor: CarrierAnchor;
  layer: SpectralForgeV2RootFollowLayerId;
  spectralLane: number;
  width: number;
  totalBeats: number;
}) {
  // V2 wird für Root Follow als mehrlinige Supernote behandelt.
  // Die Linienidentität kommt aus Cluster-ID oder sichtbarer Spektral-Lane des gemalten Feldes.
  // Das ist keine Tonleiter: keine EDO-Rundung, kein aktives Raster, kein heimliches Tuning.
  const clusterPart = args.anchor.clusterId ? 'cluster:' + args.anchor.clusterId : 'lane:' + args.spectralLane;
  if (args.layer === 'transient') {
    const transientBucketCount = Math.max(1, Math.round(args.totalBeats * 2));
    const transientBucket = Math.floor(clamp(args.anchor.timeIndex / Math.max(1, args.width), 0, 0.999999) * transientBucketCount);
    return args.layer + ':b' + transientBucket + ':' + clusterPart;
  }
  return args.layer + ':' + clusterPart;
}

function buildLineSegments(args: {
  anchors: CarrierAnchor[];
  width: number;
  totalBeats: number;
  beatsPerColumn: number;
  baseHz: number;
  height: number;
  bindingByAnchorId: Map<string, AnchorBindingPreview>;
  allocationByTime: Map<number, Array<{ cellId: string; weight: number }>>;
  materialCellMap: Map<string, MaterialCell>;
  donorAtlas: DonorTimbreAtlas | null | undefined;
  materialInterpretationProfile?: AudioMaterialInterpretationProfile | null;
}) {
  const groups = new Map<string, LineGroup>();

  for (const anchor of args.anchors) {
    if (anchor.energy <= 0.003 || !Number.isFinite(anchor.centerHz) || anchor.centerHz <= 20) continue;
    const binding = args.bindingByAnchorId.get(anchor.id);
    const { layer, weight } = chooseLayerForAnchor({
      anchor,
      allocationCells: args.allocationByTime.get(anchor.timeIndex),
      materialCellMap: args.materialCellMap,
      binding,
      donorAtlas: args.donorAtlas,
      materialInterpretationProfile: args.materialInterpretationProfile,
    });
    const spectralLane = spectralLaneForAnchor(anchor, args.height);
    const key = groupKeyForAnchor({ anchor, layer, spectralLane, width: args.width, totalBeats: args.totalBeats });
    const group = groups.get(key) ?? { key, layer, spectralLane, samples: [] };
    group.samples.push({ anchor, layerWeight: weight });
    groups.set(key, group);
  }

  const maxGapColumns = Math.max(1, Math.round(args.width / Math.max(8, args.totalBeats * 2)));
  const segments: LineSegment[] = [];

  for (const group of groups.values()) {
    const samples = group.samples.sort((a, b) => a.anchor.timeIndex - b.anchor.timeIndex || a.anchor.centerHz - b.anchor.centerHz);
    let current: LineAnchorSample[] = [];
    let lastTime = -Infinity;

    const flush = () => {
      if (!current.length) return;
      let weightedHz = 0;
      let weightSum = 0;
      let energy = 0;
      let ridgeness = 0;
      let continuity = 0;
      let layerWeight = 0;
      let strongest = current[0]!.anchor;
      for (const sample of current) {
        const w = Math.max(0.001, sample.anchor.energy * sample.layerWeight);
        weightedHz += sample.anchor.centerHz * w;
        weightSum += w;
        energy += sample.anchor.energy;
        ridgeness += sample.anchor.ridgeness * w;
        continuity += sample.anchor.continuity * w;
        layerWeight += sample.layerWeight * w;
        if (sample.anchor.energy > strongest.energy) strongest = sample.anchor;
      }
      const minTime = Math.min(...current.map((sample) => sample.anchor.timeIndex));
      const maxTime = Math.max(...current.map((sample) => sample.anchor.timeIndex));
      const id = `sf-v2-line-${group.key.replace(/[^a-z0-9_-]+/gi, '-')}-${segments.length}`;
      segments.push({
        id,
        layer: group.layer,
        spectralLane: group.spectralLane,
        startTimeIndex: minTime,
        endTimeIndex: maxTime,
        centerHz: clamp(weightedHz / Math.max(0.001, weightSum), 20, 12000),
        energy: clamp(energy / Math.max(1, current.length), 0, 1),
        continuity: clamp(continuity / Math.max(0.001, weightSum), 0, 1),
        ridgeness: clamp(ridgeness / Math.max(0.001, weightSum), 0, 1),
        layerWeight: clamp(layerWeight / Math.max(0.001, weightSum), 0, 1),
        regime: strongest.regime,
        sampleCount: current.length,
      });
      current = [];
    };

    for (const sample of samples) {
      if (current.length && sample.anchor.timeIndex - lastTime > maxGapColumns) flush();
      current.push(sample);
      lastTime = sample.anchor.timeIndex;
    }
    flush();
  }

  return segments;
}

function segmentScore(segment: LineSegment) {
  const span = Math.max(1, segment.endTimeIndex - segment.startTimeIndex + 1);
  return segment.energy * 0.5
    + segment.continuity * 0.18
    + segment.layerWeight * 0.18
    + Math.min(0.18, Math.log1p(span) * 0.04)
    + Math.min(0.16, segment.sampleCount * 0.006);
}

function selectLineSegments(segments: LineSegment[], maxLines: number, width: number, totalBeats: number) {
  if (segments.length <= maxLines) {
    return [...segments].sort((a, b) => a.startTimeIndex - b.startTimeIndex || a.centerHz - b.centerHz);
  }

  const selected = new Map<string, LineSegment>();
  const bucketCount = Math.max(8, Math.min(64, Math.round(totalBeats * 2)));
  const buckets = new Map<number, Array<{ segment: LineSegment; score: number }>>();
  for (const segment of segments) {
    const mid = (segment.startTimeIndex + segment.endTimeIndex) / 2;
    const bucket = Math.floor(clamp(mid / Math.max(1, width), 0, 0.999999) * bucketCount);
    const list = buckets.get(bucket) ?? [];
    list.push({ segment, score: segmentScore(segment) });
    buckets.set(bucket, list);
  }

  for (const bucket of [...buckets.keys()].sort((a, b) => a - b)) {
    const entries = (buckets.get(bucket) ?? []).sort((a, b) => b.score - a.score);
    for (const entry of entries.slice(0, 2)) {
      if (selected.size >= maxLines) break;
      selected.set(entry.segment.id, entry.segment);
    }
    if (selected.size >= maxLines) break;
  }

  const remainder = segments
    .filter((segment) => !selected.has(segment.id))
    .map((segment) => ({ segment, score: segmentScore(segment) }))
    .sort((a, b) => b.score - a.score);
  for (const entry of remainder) {
    if (selected.size >= maxLines) break;
    selected.set(entry.segment.id, entry.segment);
  }

  return [...selected.values()].sort((a, b) => a.startTimeIndex - b.startTimeIndex || a.centerHz - b.centerHz);
}

function mergeBeatRanges(ranges: Array<{ start: number; end: number }>) {
  if (!ranges.length) return { start: null as number | null, end: null as number | null, duration: 0 };
  const sorted = ranges
    .map((range) => ({ start: Math.min(range.start, range.end), end: Math.max(range.start, range.end) }))
    .sort((a, b) => a.start - b.start || a.end - b.end);
  let covered = 0;
  let current = { ...sorted[0]! };
  for (let i = 1; i < sorted.length; i += 1) {
    const next = sorted[i]!;
    if (next.start <= current.end) current.end = Math.max(current.end, next.end);
    else {
      covered += Math.max(0, current.end - current.start);
      current = { ...next };
    }
  }
  covered += Math.max(0, current.end - current.start);
  return {
    start: sorted[0]!.start,
    end: sorted.reduce((max, range) => Math.max(max, range.end), sorted[0]!.end),
    duration: covered,
  };
}

export function buildSpectralForgeV2RootFollowEntryConfig(args: {
  skeleton: CarrierSpectralSkeleton;
  bindingPreview: AnchorBindingPreview[];
  donorAtlas: DonorTimbreAtlas | null | undefined;
  materialField: MaterialField | null | undefined;
  materialAllocationPreview: MaterialAllocationPreview | null | undefined;
  transferProfile: TransferProfile;
  bars: number;
  bpm: number;
  durationSec: number;
  donorUseMode: CarrierDonorV2DonorUseMode;
  materialInterpretationProfile?: AudioMaterialInterpretationProfile | null;
  carrierIntegralParams?: CarrierIntegralMachineParams | null;
  carrierIntegralRouteSignature?: CarrierIntegralRouteSignature | null;
  carrierIntegralTimbre?: RootFollowCarrierTimbreSnapshot | null;
  carrierLoopBodyShadowProbe?: CarrierLoopBodyShadowProbeRequest | null;
  carrierLoopBodyPreviewCandidate?: CarrierLoopBodyPreviewAuditionHookRequest | null;
}): SpectralForgeV2RootFollowBuildResult {
  const bars = safeBars(args.bars);
  const beatsPerBar = 4;
  const totalBeats = Math.max(1, bars * beatsPerBar);
  const width = Math.max(1, args.skeleton.width || 1);
  const beatsPerColumn = totalBeats / width;
  const anchors = allAnchors(args.skeleton);
  const integralParams = args.carrierIntegralParams ?? null;
  const runtimeRoute = resolveCarrierIntegralRuntimeRootFollowRoute(args.carrierIntegralRouteSignature);
  const baseHz = resolveBaseHz(anchors);
  const anchorGridStep: number | null = null;
  const bindingByAnchorId = new Map(args.bindingPreview.map((binding) => [binding.carrierAnchorId, binding] as const));
  const materialCellMap = buildMaterialCellMap(args.materialField);
  const allocationByTime = buildAllocationMap(args.materialAllocationPreview);
  const layerLineCounts: Record<SpectralForgeV2RootFollowLayerId, number> = {
    ordered: 0,
    body: 0,
    residual: 0,
    transient: 0,
  };

  const shouldBuildALineTraffic = runtimeRoute.machineId === 'branch-a-line-traffic'
    && runtimeRoute.shouldBuildSyntheticRootFollow
    && args.donorUseMode === 'synthetic_pigment';
  const shouldBuildB573SynthWindow = runtimeRoute.machineId === 'branch-b573-synth-window'
    && runtimeRoute.shouldBuildSyntheticRootFollow
    && args.donorUseMode === 'synthetic_pigment';
  const shouldBuildCIntervalBody = runtimeRoute.machineId === 'branch-c-interval-body'
    && runtimeRoute.shouldBuildSyntheticRootFollow
    && args.donorUseMode === 'synthetic_pigment';
  const b573WindowPlan = shouldBuildB573SynthWindow
    ? buildBranchB573SynthWindowBodyPlan({
        skeleton: args.skeleton,
        bindingByAnchorId,
        allocationByTime,
        materialCellMap,
        materialAllocationPreview: args.materialAllocationPreview,
        donorAtlas: args.donorAtlas,
        materialInterpretationProfile: args.materialInterpretationProfile,
        resolveLayerForAnchor: chooseLayerForAnchor,
        width,
        height: Math.max(1, args.skeleton.height || 1),
        totalBeats,
        beatsPerColumn,
        baseHz,
      })
    : null;
  const intervalWindowPlan = shouldBuildCIntervalBody
    ? buildSpectralForgeV2IntervalWindowBodyPlan({
        skeleton: args.skeleton,
        bindingPreview: args.bindingPreview,
        donorAtlas: args.donorAtlas,
        materialField: args.materialField,
        materialAllocationPreview: args.materialAllocationPreview,
        materialInterpretationProfile: args.materialInterpretationProfile,
        totalBeats,
        baseHz,
      })
    : null;
  const carrierLoopBodyShadowProbe = args.carrierLoopBodyShadowProbe?.enabled
    ? buildCarrierLoopBodyShadowProbe({
        enabled: true,
        plan: shouldBuildCIntervalBody ? intervalWindowPlan : null,
        durationSec: Math.max(0.005, args.durationSec),
        totalBeats,
        baseHz,
        sourcePresetId: runtimeRoute.compositionPresetId,
        controlSampleRate: args.carrierLoopBodyShadowProbe.controlSampleRate,
        pitchRole: args.carrierLoopBodyShadowProbe.pitchRole,
        sourceIdentity: args.carrierLoopBodyShadowProbe.sourceIdentity,
      })
    : null;
  const carrierLoopBodyPreviewCandidateCurveSet = args.carrierLoopBodyPreviewCandidate?.enabled && shouldBuildCIntervalBody && intervalWindowPlan
    ? buildCarrierLoopBodyCurvesFromBranchC({
        plan: intervalWindowPlan,
        durationSec: Math.max(0.005, args.durationSec),
        totalBeats,
        baseHz,
        sourcePresetId: runtimeRoute.compositionPresetId,
        sourceIdentity: args.carrierLoopBodyPreviewCandidate.sourceIdentity,
        controlSampleRate: args.carrierLoopBodyPreviewCandidate.controlSampleRate,
        pitchRole: args.carrierLoopBodyPreviewCandidate.pitchRole,
      })
    : null;
  const carrierLoopBodyRootFollowModulationPlan = carrierLoopBodyPreviewCandidateCurveSet
    ? buildCarrierLoopBodyRootFollowModulationPlan(carrierLoopBodyPreviewCandidateCurveSet)
    : null;
  const b573VoiceLimit = integralParams
    ? Math.max(1, Math.min(512, Math.floor(Math.min(integralParams.maxVoices, integralParams.maxWindows * 4))))
    : 128;
  const b573WindowNotes: RootFollowSynthNoteSnapshot[] = (b573WindowPlan?.voices ?? [])
    .slice(0, b573VoiceLimit)
    .map((voice, index) => {
      layerLineCounts[voice.layer] += 1;
      return {
        id: voice.id + '-' + index,
        trackId: voice.layer,
        startBeat: clamp(voice.startBeat, 0, totalBeats - 0.03125),
        durationBeats: clamp(voice.durationBeats, 0.0625, totalBeats),
        gridStepOffset: 0,
        channelIndex: 0,
        octaveOffset: 0,
        velocity: clamp(voice.velocity * layerProfileVolumeMultiplier(voice.layer, args.materialInterpretationProfile), 0.04, 0.92),
        gate: clamp(voice.gate * layerProfileGate(voice.layer, args.materialInterpretationProfile), 0.18, 1.25),
        lineId: voice.windowId,
        lineHz: clamp(voice.centerHz, 20, 12000),
        instrumentPresetOverride: null,
        noteClass: 'standard',
        renderSourceKind: 'synth-live',
        sourceMaterialId: null,
        anchorHz: clamp(voice.centerHz, 20, 12000),
        sourceTempoBpm: Math.max(1, args.bpm),
        sourceLoopDurationSec: Math.max(0.005, args.durationSec),
        sampleOffsetSec: null,
        samplePlaybackDurationSec: null,
        fadeInBeats: integralParams?.fadeInBeats ?? 0.055,
        fadeOutBeats: integralParams?.fadeOutBeats ?? 0.14,
        localField: voice.localField,
        spectralWindowMeta: null,
      };
    });
  const intervalVoiceLimit = integralParams
    ? Math.max(1, Math.min(512, Math.floor(Math.min(integralParams.maxVoices, integralParams.maxWindows * 4))))
    : 128;
  const intervalWindowNotes: RootFollowSynthNoteSnapshot[] = (intervalWindowPlan?.voices ?? [])
    .slice(0, intervalVoiceLimit)
    .map((voice, index) => {
      layerLineCounts[voice.trackId] += 1;
      return {
        id: voice.id + '-' + index,
        trackId: voice.trackId,
        startBeat: clamp(voice.startBeat, 0, totalBeats - 0.03125),
        durationBeats: clamp(voice.durationBeats, 0.0625, totalBeats),
        gridStepOffset: 0,
        channelIndex: 0,
        octaveOffset: 0,
        velocity: clamp(voice.velocity * layerProfileVolumeMultiplier(voice.trackId, args.materialInterpretationProfile), 0.04, 0.92),
        gate: clamp(voice.gate * layerProfileGate(voice.trackId, args.materialInterpretationProfile), 0.18, 1.25),
        lineId: voice.windowId,
        lineHz: clamp(voice.lineHz, 20, 12000),
        instrumentPresetOverride: null,
        noteClass: 'standard',
        renderSourceKind: 'synth-live',
        sourceMaterialId: null,
        anchorHz: clamp(voice.lineHz, 20, 12000),
        sourceTempoBpm: Math.max(1, args.bpm),
        sourceLoopDurationSec: Math.max(0.005, args.durationSec),
        sampleOffsetSec: null,
        samplePlaybackDurationSec: null,
        fadeInBeats: integralParams?.fadeInBeats ?? 0.075,
        fadeOutBeats: integralParams?.fadeOutBeats ?? 0.18,
        localField: voice.localField,
        spectralWindowMeta: voice.spectralWindowMeta,
      };
    });

  const allSegments = (shouldBuildB573SynthWindow || shouldBuildCIntervalBody) ? [] : buildLineSegments({
    anchors,
    width,
    totalBeats,
    beatsPerColumn,
    baseHz,
    height: Math.max(1, args.skeleton.height || 1),
    bindingByAnchorId,
    allocationByTime,
    materialCellMap,
    donorAtlas: args.donorAtlas,
    materialInterpretationProfile: args.materialInterpretationProfile,
  });
  const legacyMaxLines = args.donorUseMode === 'synthetic_pigment' ? 220 : 96;
  const selectedMaxLines = integralParams
    ? Math.max(1, Math.min(512, Math.floor(Math.min(integralParams.maxLines, integralParams.maxVoices))))
    : legacyMaxLines;
  const selectedSegments = (shouldBuildB573SynthWindow || shouldBuildCIntervalBody) ? [] : selectLineSegments(allSegments, selectedMaxLines, width, totalBeats);
  const minVoiceDurationFromParams = integralParams?.minVoiceDurationBeats ?? null;
  const fadeInBeatsFromParams = integralParams?.fadeInBeats ?? 0;
  const fadeOutBeatsFromParams = integralParams?.fadeOutBeats ?? 0;
  // Runtime parameter bridge kept explicit for checks: fadeInBeats: fadeInBeatsFromParams / fadeOutBeats: fadeOutBeatsFromParams

  const directSegmentNotes: RootFollowSynthNoteSnapshot[] = selectedSegments.map((segment, index) => {
    layerLineCounts[segment.layer] += 1;
    const rawStartBeat = segment.startTimeIndex * beatsPerColumn;
    const branchAMicroOffsetBeat = shouldBuildALineTraffic ? branchALineTrafficMicroOffsetBeat(segment, index, integralParams) : 0;
    const startBeat = clamp(rawStartBeat + branchAMicroOffsetBeat, 0, totalBeats - 0.03125);
    const rawEndBeat = Math.min(totalBeats, (segment.endTimeIndex + 1) * beatsPerColumn);
    const minDuration = segment.layer === 'transient'
      ? Math.max(0.0625, beatsPerColumn * 1.1)
      : Math.max(0.25, beatsPerColumn * 2.2);
    const integralMinDuration = minVoiceDurationFromParams !== null
      ? Math.max(segment.layer === 'transient' ? 0.0625 : 0.12, minVoiceDurationFromParams)
      : minDuration;
    const desiredDuration = Math.max(integralMinDuration, rawEndBeat - startBeat);
    const durationBeats = clamp(desiredDuration, 0.0625, Math.max(0.0625, totalBeats - startBeat));
    const profileGate = layerProfileGate(segment.layer, args.materialInterpretationProfile);
    const branchAVelocityScale = shouldBuildALineTraffic ? branchALineTrafficVelocityScale(segment, integralParams) : 1;
    const branchAGateScale = shouldBuildALineTraffic ? branchALineTrafficGateScale(segment, integralParams) : 1;
    const velocity = clamp(lineVelocity(segment, integralParams) * layerProfileVolumeMultiplier(segment.layer, args.materialInterpretationProfile) * branchAVelocityScale, 0.04, 0.98);
    return {
      id: (shouldBuildALineTraffic ? 'branch-a-traffic-' : '') + segment.id + '-' + index,
      trackId: segment.layer,
      startBeat,
      durationBeats,
      gridStepOffset: 0,
      channelIndex: 0,
      octaveOffset: 0,
      velocity,
      gate: clamp(profileGate * branchAGateScale, 0.08, 1.32),
      lineId: shouldBuildALineTraffic ? 'branch-a-traffic|' + segment.id : segment.id,
      lineHz: clamp(segment.centerHz, 20, 12000),
      instrumentPresetOverride: null,
      noteClass: 'standard',
      renderSourceKind: 'synth-live',
      sourceMaterialId: null,
      anchorHz: clamp(segment.centerHz, 20, 12000),
      sourceTempoBpm: Math.max(1, args.bpm),
      sourceLoopDurationSec: Math.max(0.005, args.durationSec),
      sampleOffsetSec: null,
      samplePlaybackDurationSec: null,
      fadeInBeats: shouldBuildALineTraffic ? clamp(fadeInBeatsFromParams || 0.025, 0, durationBeats * 0.35) : fadeInBeatsFromParams,
      fadeOutBeats: shouldBuildALineTraffic ? clamp(fadeOutBeatsFromParams || 0.07, 0, durationBeats * 0.4) : fadeOutBeatsFromParams,
      localField: null,
      spectralWindowMeta: null,
    };
  });
  const notes: RootFollowSynthNoteSnapshot[] = shouldBuildB573SynthWindow
    ? b573WindowNotes
    : shouldBuildCIntervalBody
    ? intervalWindowNotes
    : directSegmentNotes;

  const tracks: RootFollowSynthTrackSnapshot[] = V2_LAYER_TRACKS.map((track) => ({
    id: track.id,
    label: track.label,
    color: track.color,
    instrumentRole: track.role,
    instrumentPreset: track.preset,
    patternPresetId: null,
    enabled: layerLineCounts[track.id] > 0,
    volume: clamp(track.volume * layerProfileVolumeMultiplier(track.id, args.materialInterpretationProfile), 0.05, 1),
    pan: track.pan,
  }));
  const trackPatches: RootFollowSynthPatchTrackSnapshot[] = tracks.map((track) => ({
    id: track.id,
    instrumentPreset: track.instrumentPreset,
    patternPresetId: null,
    enabled: track.enabled,
    volume: track.volume,
    pan: track.pan,
  }));
  const usesSamplePresets = tracks.some((track) => typeof track.instrumentPreset === 'string' && track.instrumentPreset.startsWith('sample:'))
    || notes.some((note) => typeof note.instrumentPresetOverride === 'string' && note.instrumentPresetOverride.startsWith('sample:'));
  const beatCoverage = mergeBeatRanges(notes.map((note) => ({
    start: note.startBeat,
    end: Math.min(totalBeats, note.startBeat + note.durationBeats * clamp(note.gate || 1, 0.05, 2)),
  })));
  const maxLineDurationBeats = notes.reduce((max, note) => Math.max(max, note.durationBeats * clamp(note.gate || 1, 0.05, 2)), 0);
  const spectralWindowMetaCount = notes.filter((note) => note.spectralWindowMeta).length;

  const config: RootFollowBankEntryConfig = {
    sourceKind: 'synth',
    renderMode: 'direct',
    anchorGridStep,
    synthPattern: {
      bars,
      beatsPerBar,
      stepsPerBar: 16,
      segmentCount: Math.max(1, Math.round(width / Math.max(1, bars))),
      baseHz,
      tuning: 'floating-frequency',
      repetitionModel: 'frequency-ratio',
      activeTrackIds: tracks.filter((track) => track.enabled).map((track) => track.id),
      tracks,
      notes,
    },
    synthPatch: {
      compositionPresetId: runtimeRoute.compositionPresetId,
      baseHz,
      tuning: 'floating-frequency',
      repetitionModel: 'frequency-ratio',
      trackPatches,
      carrierIntegralTimbre: args.carrierIntegralTimbre ?? null,
    },
    formantWindowPlan: null,
  };

  const activeDurationRatio = clamp(beatCoverage.duration / Math.max(0.001, totalBeats), 0, 1);
  const durationGoodEnough = activeDurationRatio >= 0.55 || notes.length === 0;

  return {
    config,
    carrierLoopBodyPreviewCandidateCurveSet,
    carrierLoopBodyRootFollowModulationPlan,
    summary: {
      eligible: args.donorUseMode === 'synthetic_pigment' && notes.length > 0 && !usesSamplePresets && runtimeRoute.shouldBuildSyntheticRootFollow,
      mode: notes.length > 0 ? 'spectralforge_v2_synthetic_event' : 'none',
      sourceKind: 'synth',
      renderMode: 'direct',
      bars,
      bpm: Math.max(1, args.bpm),
      beatsPerBar,
      durationSec: Math.max(0.005, args.durationSec),
      totalBeats,
      coveredStartBeat: beatCoverage.start,
      coveredEndBeat: beatCoverage.end,
      coveredDurationBeats: beatCoverage.duration,
      activeDurationRatio,
      maxLineDurationBeats,
      baseHz,
      anchorGridStep,
      pitchMode: 'floating_frequency_signature',
      tuningSource: 'spectralforge_v2_carrier_signature',
      tuning: 'floating-frequency',
      repetitionModel: 'frequency-ratio',
      usesPitchQuantization: false,
      usesHardcodedTuning: false,
      trackCount: tracks.filter((track) => track.enabled).length,
      lineCount: notes.length,
      noteCount: notes.length,
      layerLineCounts,
      branchALineTrafficCount: shouldBuildALineTraffic ? notes.length : 0,
      branchALineTrafficMicroOffsetCount: shouldBuildALineTraffic ? notes.filter((note) => typeof note.lineId === 'string' && note.lineId.startsWith('branch-a-traffic|')).length : 0,
      intervalWindowCount: intervalWindowPlan?.summary.intervalWindowCount ?? 0,
      intervalWindowVoiceCount: intervalWindowPlan?.summary.intervalWindowVoiceCount ?? 0,
      spectralWindowMetaCount,
      b573WindowCount: b573WindowPlan?.windowCount ?? 0,
      b573VoiceCount: b573WindowPlan?.voices.length ?? 0,
      b573LocalFieldVoiceCount: b573WindowNotes.filter((note) => note.localField).length,
      b573EmissionMode: b573WindowPlan?.emissionMode ?? null,
      usesAudioBuffer: false,
      usesGranularPlayback: false,
      usesSamplePresets,
      rootFollowPitchMode: 'live_frequency_anchor',
      carrierIntegralMachineId: args.carrierIntegralRouteSignature?.machineId ?? null,
      carrierIntegralBodySourceMode: args.carrierIntegralRouteSignature?.bodySourceMode ?? null,
      carrierIntegralParamsHash: args.carrierIntegralRouteSignature?.paramsHash ?? null,
      carrierIntegralRuntimeStatus: runtimeRoute.status,
      carrierIntegralEmissionMode: runtimeRoute.emissionMode,
      carrierLoopBodyShadowProbe,
      carrierIntegralParamSummary: integralParams ? {
        maxVoices: integralParams.maxVoices,
        maxLines: integralParams.maxLines,
        maxWindows: integralParams.maxWindows,
        fadeInBeats: integralParams.fadeInBeats,
        fadeOutBeats: integralParams.fadeOutBeats,
        densityCompression: integralParams.densityCompression,
        localFieldDepth: integralParams.localFieldDepth,
        stretchElasticity: integralParams.stretchElasticity,
        safetyMode: integralParams.safetyMode,
      } : null,
      reason: !runtimeRoute.shouldBuildSyntheticRootFollow
        ? runtimeRoute.guardrail
        : shouldBuildALineTraffic && notes.length > 0
          ? runtimeRoute.summary + ' · Linien ' + notes.length + ' · Mikro-Versatz ' + notes.filter((note) => typeof note.lineId === 'string' && note.lineId.startsWith('branch-a-traffic|')).length + '.'
        : shouldBuildALineTraffic && notes.length === 0
          ? 'A Linienverkehr ist aktiv, aber aus diesem Carrier wurden keine geführten Linien ableitbar.'
        : shouldBuildB573SynthWindow && notes.length > 0
          ? runtimeRoute.summary + ' · B_5.73 Fenster ' + (b573WindowPlan?.windowCount ?? 0) + ' · Stimmen ' + notes.length + ' · LocalField ' + b573WindowNotes.filter((note) => note.localField).length + '.'
        : shouldBuildB573SynthWindow && notes.length === 0
          ? 'B_5.73 Synth-Fenster ist aktiv, aber aus diesem Carrier wurden keine dichten Spaltenfenster ableitbar.'
        : shouldBuildCIntervalBody && notes.length > 0
          ? runtimeRoute.summary + ' · Cecilia-Klangfarbengewebe ' + (intervalWindowPlan?.summary.intervalWindowCount ?? 0) + ' Fenster · ' + notes.length + ' Stimmen.'
        : shouldBuildCIntervalBody && notes.length === 0
          ? 'C Intervallkörper ist aktiv, aber aus diesem Carrier wurden keine dichten Fenster ableitbar.'
        : notes.length === 0
        ? 'Keine V2-Linien für Root Follow ableitbar.'
        : usesSamplePresets
          ? 'Der Plan enthält Sample-Presets und ist deshalb nicht rein synthetisch.'
          : args.donorUseMode === 'synthetic_pigment'
            ? durationGoodEnough
              ? runtimeRoute.summary
              : 'V2 wurde synthetisch vorbereitet, deckt aber noch nicht die ganze gemalte Taktspanne ab.'
            : 'Rohtextur-V2 bleibt für Root Follow als granularer Audio-Modus markiert.',
    },
  };
}
