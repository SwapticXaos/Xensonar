import type { CarrierAnchor, CarrierAnchorContinuityGraph, CarrierAnchorLink, CarrierSpectralSkeleton } from '../types/carrierDonorV2Types';

export type BuildAnchorContinuityGraphOptions = {
  maxDeltaBins?: number;
  maxBandwidthRatio?: number;
  minScore?: number;
  maxLinksPerAnchor?: number;
};

const DEFAULT_OPTIONS: Required<BuildAnchorContinuityGraphOptions> = {
  maxDeltaBins: 18,
  maxBandwidthRatio: 3.2,
  minScore: 0.32,
  maxLinksPerAnchor: 2,
};

function scoreAnchorLink(from: CarrierAnchor, to: CarrierAnchor, cfg: Required<BuildAnchorContinuityGraphOptions>): number {
  const deltaBins = Math.abs(to.centerBin - from.centerBin);
  if (deltaBins > cfg.maxDeltaBins) return 0;

  const freqProximity = Math.max(0, 1 - deltaBins / cfg.maxDeltaBins);
  const energySimilarity = 1 - Math.min(1, Math.abs(from.energy - to.energy) / Math.max(0.001, Math.max(from.energy, to.energy)));
  const fromBandwidth = Math.max(1, from.bandwidthBins);
  const toBandwidth = Math.max(1, to.bandwidthBins);
  const bandwidthRatio = Math.max(fromBandwidth, toBandwidth) / Math.min(fromBandwidth, toBandwidth);
  if (bandwidthRatio > cfg.maxBandwidthRatio) return 0;
  const bandwidthSimilarity = Math.max(0, 1 - (bandwidthRatio - 1) / Math.max(0.001, cfg.maxBandwidthRatio - 1));

  const regimeCompatibility = from.regime === to.regime
    ? 1
    : ((from.regime === 'tonal' && to.regime === 'cluster') || (from.regime === 'cluster' && to.regime === 'tonal'))
      ? 0.74
      : ((from.regime === 'transient' && to.regime === 'tonal') || (from.regime === 'tonal' && to.regime === 'transient'))
        ? 0.56
        : 0.4;

  return freqProximity * 0.42 + energySimilarity * 0.16 + bandwidthSimilarity * 0.18 + regimeCompatibility * 0.24;
}

export function buildAnchorContinuityGraph(
  skeleton: CarrierSpectralSkeleton,
  options?: BuildAnchorContinuityGraphOptions,
): CarrierAnchorContinuityGraph {
  const cfg = { ...DEFAULT_OPTIONS, ...(options ?? {}) };
  const links: CarrierAnchorLink[] = [];
  for (let timeIndex = 0; timeIndex < skeleton.anchorsByTime.length - 1; timeIndex += 1) {
    const currentAnchors = skeleton.anchorsByTime[timeIndex] ?? [];
    const nextAnchors = skeleton.anchorsByTime[timeIndex + 1] ?? [];
    for (const from of currentAnchors) {
      const candidates = nextAnchors
        .map((to) => {
          const continuityScore = scoreAnchorLink(from, to, cfg);
          return {
            fromAnchorId: from.id,
            toAnchorId: to.id,
            continuityScore,
            deltaBins: Math.abs(to.centerBin - from.centerBin),
          } satisfies CarrierAnchorLink;
        })
        .filter((link) => link.continuityScore >= cfg.minScore)
        .sort((a, b) => b.continuityScore - a.continuityScore || a.deltaBins - b.deltaBins)
        .slice(0, cfg.maxLinksPerAnchor);
      links.push(...candidates);
    }
  }
  return { links };
}
