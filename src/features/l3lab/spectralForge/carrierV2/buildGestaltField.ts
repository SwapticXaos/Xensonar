import type {
  CarrierAnchor,
  CarrierAnchorContinuityGraph,
  CarrierSpectralSkeleton,
} from '../types/carrierDonorV2Types';
import type {
  GestaltAnchor,
  GestaltField,
  GestaltFieldSummary,
  GestaltSlot,
} from '../types/gestaltMaterialField';

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function buildContinuityScoreByAnchorId(
  continuityGraph: CarrierAnchorContinuityGraph | null | undefined,
): Map<string, number> {
  const scores = new Map<string, number>();
  if (!continuityGraph) return scores;

  for (const link of continuityGraph.links) {
    scores.set(
      link.fromAnchorId,
      (scores.get(link.fromAnchorId) ?? 0) + link.continuityScore,
    );
    scores.set(
      link.toAnchorId,
      (scores.get(link.toAnchorId) ?? 0) + link.continuityScore,
    );
  }

  return scores;
}

function toGestaltAnchor(anchor: CarrierAnchor): GestaltAnchor {
  return {
    id: anchor.id,
    timeIndex: anchor.timeIndex,
    centerBin: anchor.centerBin,
    centerHz: anchor.centerHz,
    energy: anchor.energy,
    bandwidthBins: anchor.bandwidthBins,
    regime: anchor.regime,
    clusterId: anchor.clusterId,
  };
}

function computeSlotDensity(anchors: CarrierAnchor[]): number {
  if (!anchors.length) return 0;

  const anchorCount = anchors.length;
  const totalEnergy = anchors.reduce((sum, a) => sum + Math.max(0, a.energy), 0);
  const meanBandwidth =
    anchors.reduce((sum, a) => sum + Math.max(0, a.bandwidthBins), 0) / anchorCount;

  const raw =
    anchorCount * 0.45 +
    Math.min(2, totalEnergy) * 0.35 +
    Math.min(6, meanBandwidth) * 0.2;

  return clamp01(raw / 3);
}

function computeTotalEnergy(anchors: CarrierAnchor[]): number {
  return anchors.reduce((sum, a) => sum + Math.max(0, a.energy), 0);
}

function computeContinuityStrength(
  anchors: CarrierAnchor[],
  continuityScores: Map<string, number>,
): number {
  if (!anchors.length) return 0;
  const total = anchors.reduce(
    (sum, anchor) => sum + (continuityScores.get(anchor.id) ?? 0),
    0,
  );
  return total / anchors.length;
}

export function buildGestaltField(
  skeleton: CarrierSpectralSkeleton,
  continuityGraph?: CarrierAnchorContinuityGraph | null,
): GestaltField {
  const continuityScores = buildContinuityScoreByAnchorId(continuityGraph);

  const slots: GestaltSlot[] = skeleton.anchorsByTime.map((anchors, timeIndex) => {
    const safeAnchors = anchors ?? [];
    return {
      timeIndex,
      anchors: safeAnchors.map(toGestaltAnchor),
      density: computeSlotDensity(safeAnchors),
      totalEnergy: computeTotalEnergy(safeAnchors),
      continuityStrength: computeContinuityStrength(safeAnchors, continuityScores),
    };
  });

  return {
    width: skeleton.width,
    height: skeleton.height,
    durationSec: skeleton.durationSec,
    slots,
  };
}

export function summarizeGestaltField(field: GestaltField): GestaltFieldSummary {
  const slotCount = field.slots.length;
  if (!slotCount) {
    return {
      slotCount: 0,
      peakPolyphony: 0,
      meanAnchorsPerSlot: 0,
      meanDensity: 0,
      sparseSlotRatio: 0,
      denseSlotRatio: 0,
    };
  }

  const anchorCounts = field.slots.map((slot) => slot.anchors.length);
  const densities = field.slots.map((slot) => slot.density);

  const peakPolyphony = anchorCounts.reduce((max, value) => Math.max(max, value), 0);
  const meanAnchorsPerSlot =
    anchorCounts.reduce((sum, value) => sum + value, 0) / slotCount;
  const meanDensity =
    densities.reduce((sum, value) => sum + value, 0) / slotCount;

  const sparseSlotRatio =
    field.slots.filter((slot) => slot.density < 0.25).length / slotCount;
  const denseSlotRatio =
    field.slots.filter((slot) => slot.density > 0.66).length / slotCount;

  return {
    slotCount,
    peakPolyphony,
    meanAnchorsPerSlot,
    meanDensity,
    sparseSlotRatio,
    denseSlotRatio,
  };
}
