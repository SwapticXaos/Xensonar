import type { CarrierAnchor, CarrierAnchorContinuityGraph, CarrierAnchorContinuitySummary, CarrierAnchorRegime, CarrierSpectralSkeleton, CarrierSpectralSkeletonSummary } from '../types/carrierDonorV2Types';

function flattenAnchors(skeleton: CarrierSpectralSkeleton): CarrierAnchor[] {
  return skeleton.anchorsByTime.flat();
}

export function summarizeCarrierSpectralSkeleton(skeleton: CarrierSpectralSkeleton): CarrierSpectralSkeletonSummary {
  const anchors = flattenAnchors(skeleton);
  const anchorCount = anchors.length;
  const peakPolyphony = skeleton.anchorsByTime.reduce((max, frame) => Math.max(max, frame.length), 0);
  const meanAnchorsPerFrame = skeleton.width > 0 ? anchorCount / skeleton.width : 0;
  const meanAnchorEnergy = anchorCount > 0 ? anchors.reduce((sum, anchor) => sum + anchor.energy, 0) / anchorCount : 0;
  const strongestAnchor = anchors.reduce<CarrierAnchor | null>((best, anchor) => {
    if (!best || anchor.energy > best.energy) return anchor;
    return best;
  }, null);
  const regimeCounts: Record<CarrierAnchorRegime, number> = {
    tonal: 0,
    cluster: 0,
    noise: 0,
    transient: 0,
  };
  for (const anchor of anchors) regimeCounts[anchor.regime] += 1;
  return {
    anchorCount,
    peakPolyphony,
    meanAnchorsPerFrame,
    meanAnchorEnergy,
    strongestAnchorHz: strongestAnchor?.centerHz ?? null,
    regimeCounts,
  };
}


export function summarizeCarrierAnchorContinuityGraph(graph: CarrierAnchorContinuityGraph): CarrierAnchorContinuitySummary {
  const linkCount = graph.links.length;
  const meanContinuityScore = linkCount > 0 ? graph.links.reduce((sum, link) => sum + link.continuityScore, 0) / linkCount : 0;
  const meanDeltaBins = linkCount > 0 ? graph.links.reduce((sum, link) => sum + link.deltaBins, 0) / linkCount : 0;
  const strongestContinuityScore = linkCount > 0 ? graph.links.reduce((best, link) => Math.max(best, link.continuityScore), 0) : 0;
  return {
    linkCount,
    meanContinuityScore,
    meanDeltaBins,
    strongestContinuityScore,
  };
}
