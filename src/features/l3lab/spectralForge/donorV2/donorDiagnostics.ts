import type {
  AnchorRelativeTimbreTensor,
  DonorAnchor,
  DonorTimbreAnalysisSummary,
  DonorAnchorPhase,
  DonorRegisterLabel,
  DonorTimbreAtlas,
  DonorTimbreAtlasSummary,
} from '../types/carrierDonorV2Types';

export function summarizeDonorTimbreAnalysis(
  anchors: DonorAnchor[],
  tensor: AnchorRelativeTimbreTensor,
): DonorTimbreAnalysisSummary {
  const anchorCount = anchors.length;
  const atomCount = tensor.atoms.length;
  const peakPolyphonyByFrame = new Map<number, number>();
  const registerCounts: Record<DonorRegisterLabel, number> = { low: 0, mid: 0, high: 0 };
  const phaseCounts: Record<DonorAnchorPhase, number> = { attack: 0, sustain: 0, release: 0 };
  const mutableRegimeCounts = { tonal: 0, cluster: 0, noise: 0, transient: 0 };
  let strongestAnchorHz: number | null = null;
  let strongestAnchorEnergy = -1;

  for (const anchor of anchors) {
    peakPolyphonyByFrame.set(anchor.frameIndex, (peakPolyphonyByFrame.get(anchor.frameIndex) ?? 0) + 1);
    registerCounts[anchor.register] += 1;
    phaseCounts[anchor.phase] += 1;
    mutableRegimeCounts[anchor.regime] += 1;
    if (anchor.energy > strongestAnchorEnergy) {
      strongestAnchorEnergy = anchor.energy;
      strongestAnchorHz = anchor.centerHz;
    }
  }

  const peakPolyphony = peakPolyphonyByFrame.size > 0
    ? Math.max(...peakPolyphonyByFrame.values())
    : 0;
  const meanQuality = atomCount > 0
    ? tensor.atoms.reduce((sum, atom) => sum + atom.quality, 0) / atomCount
    : 0;
  const meanOrderedness = tensor.orderedSummary?.meanOrderedness ?? 0;
  const strongOrderedRatio = tensor.orderedSummary?.strongOrderedRatio ?? 0;
  const meanOrderedInharmonicSpread = tensor.orderedSummary?.meanInharmonicSpread ?? 0;
  const meanResonanceStrength = tensor.resonanceSummary?.meanResonanceStrength ?? 0;
  const strongResonanceRatio = tensor.resonanceSummary?.strongResonanceRatio ?? 0;
  const meanResonanceSharpness = tensor.resonanceSummary?.meanResonanceSharpness ?? 0;
  const meanResidualStrength = tensor.residualSummary?.meanResidualStrength ?? 0;
  const strongResidualRatio = tensor.residualSummary?.strongResidualRatio ?? 0;
  const meanResidualFlatness = tensor.residualSummary?.meanResidualFlatness ?? 0;
  const meanNoiseColorCentroid = tensor.residualSummary?.meanNoiseColorCentroid ?? 0;
  const meanTransientStrength = tensor.transientSummary?.meanTransientStrength ?? 0;
  const strongTransientRatio = tensor.transientSummary?.strongTransientRatio ?? 0;
  const meanOnsetSharpness = tensor.transientSummary?.meanOnsetSharpness ?? 0;
  const meanOnsetSpread = tensor.transientSummary?.meanOnsetSpread ?? 0;
  const meanDecayTightness = tensor.transientSummary?.meanDecayTightness ?? 0;
  const meanLeakAuditRisk = tensor.leakAuditSummary?.meanOverallLeakRisk ?? 0;
  const highLeakAuditRatio = tensor.leakAuditSummary?.highLeakRatio ?? 0;
  const meanRecommendedSuppression = tensor.leakAuditSummary?.meanRecommendedSuppression ?? 0;

  return {
    anchorCount,
    atomCount,
    peakPolyphony,
    meanQuality,
    strongestAnchorHz,
    meanOrderedness,
    strongOrderedRatio,
    meanOrderedInharmonicSpread,
    meanResonanceStrength,
    strongResonanceRatio,
    meanResonanceSharpness,
    meanResidualStrength,
    strongResidualRatio,
    meanResidualFlatness,
    meanNoiseColorCentroid,
    meanTransientStrength,
    strongTransientRatio,
    meanOnsetSharpness,
    meanOnsetSpread,
    meanDecayTightness,
    meanLeakAuditRisk,
    highLeakAuditRatio,
    meanRecommendedSuppression,
    registerCounts,
    phaseCounts,
    regimeCounts: mutableRegimeCounts,
  };
}

export function summarizeDonorTimbreAtlas(atlas: DonorTimbreAtlas): DonorTimbreAtlasSummary {
  const cellCount = atlas.cells.length;
  const registerCounts: Record<DonorRegisterLabel, number> = { low: 0, mid: 0, high: 0 };
  const phaseCounts: Record<DonorAnchorPhase, number> = { attack: 0, sustain: 0, release: 0 };
  const regimeCounts = { tonal: 0, cluster: 0, noise: 0, transient: 0 };
  let meanStability = 0;
  let meanPitchLeakRisk = 0;
  let meanSequenceRecoverability = 0;
  let meanProsodicTrace = 0;
  let meanCellEntanglement = 0;
  let strongestCellQuality = 0;
  let meanOrderedness = 0;
  let strongOrderedRatio = 0;
  let meanOrderedInharmonicSpread = 0;
  let meanResonanceStrength = 0;
  let strongResonanceRatio = 0;
  let meanResonanceSharpness = 0;
  let meanResidualStrength = 0;
  let strongResidualRatio = 0;
  let meanResidualFlatness = 0;
  let meanNoiseColorCentroid = 0;
  let meanLeakAuditRisk = 0;
  let highLeakAuditRatio = 0;
  let meanRecommendedSuppression = 0;
  let meanTransientStrength = 0;
  let strongTransientRatio = 0;
  let meanOnsetSharpness = 0;
  let meanOnsetSpread = 0;
  let meanDecayTightness = 0;

  for (const cell of atlas.cells) {
    registerCounts[cell.register] += 1;
    phaseCounts[cell.phase] += 1;
    regimeCounts[cell.regime] += 1;
    meanStability += cell.stability;
    meanPitchLeakRisk += cell.pitchLeakRisk;
    meanSequenceRecoverability += cell.sequenceRecoverability;
    meanProsodicTrace += cell.prosodicTrace;
    meanCellEntanglement += cell.cellEntanglement;
    strongestCellQuality = Math.max(strongestCellQuality, cell.quality);
    meanOrderedness += cell.orderedModel?.meanOrderedness ?? 0;
    meanOrderedInharmonicSpread += cell.orderedModel?.meanInharmonicSpread ?? 0;
    strongOrderedRatio += (cell.orderedModel?.meanOrderedness ?? 0) > 0.55 ? 1 : 0;
    meanResonanceStrength += cell.resonanceModel?.meanResonanceStrength ?? 0;
    meanResonanceSharpness += cell.resonanceModel?.meanResonanceSharpness ?? 0;
    strongResonanceRatio += (cell.resonanceModel?.meanResonanceStrength ?? 0) > 0.48 ? 1 : 0;
    meanResidualStrength += cell.residualModel?.meanResidualStrength ?? 0;
    meanResidualFlatness += cell.residualModel?.meanResidualFlatness ?? 0;
    meanNoiseColorCentroid += cell.residualModel?.meanNoiseColorCentroid ?? 0;
    strongResidualRatio += (cell.residualModel?.meanResidualStrength ?? 0) > 0.48 ? 1 : 0;
    meanLeakAuditRisk += cell.leakAuditModel?.meanOverallLeakRisk ?? 0;
    highLeakAuditRatio += (cell.leakAuditModel?.meanOverallLeakRisk ?? 0) > 0.58 ? 1 : 0;
    meanRecommendedSuppression += cell.leakAuditModel?.meanRecommendedSuppression ?? 0;
    meanTransientStrength += cell.transientModel?.meanTransientStrength ?? 0;
    meanOnsetSharpness += cell.transientModel?.meanOnsetSharpness ?? 0;
    meanOnsetSpread += cell.transientModel?.meanOnsetSpread ?? 0;
    meanDecayTightness += cell.transientModel?.meanDecayTightness ?? 0;
    strongTransientRatio += (cell.transientModel?.meanTransientStrength ?? 0) > 0.48 ? 1 : 0;
  }
  if (cellCount > 0) {
    meanStability /= cellCount;
    meanPitchLeakRisk /= cellCount;
    meanSequenceRecoverability /= cellCount;
    meanProsodicTrace /= cellCount;
    meanCellEntanglement /= cellCount;
    meanOrderedness /= cellCount;
    meanOrderedInharmonicSpread /= cellCount;
    strongOrderedRatio /= cellCount;
    meanResonanceStrength /= cellCount;
    meanResonanceSharpness /= cellCount;
    strongResonanceRatio /= cellCount;
    meanResidualStrength /= cellCount;
    meanResidualFlatness /= cellCount;
    meanNoiseColorCentroid /= cellCount;
    strongResidualRatio /= cellCount;
    meanLeakAuditRisk /= cellCount;
    highLeakAuditRatio /= cellCount;
    meanRecommendedSuppression /= cellCount;
    meanTransientStrength /= cellCount;
    meanOnsetSharpness /= cellCount;
    meanOnsetSpread /= cellCount;
    meanDecayTightness /= cellCount;
    strongTransientRatio /= cellCount;
  }
  return {
    cellCount,
    meanStability,
    meanPitchLeakRisk,
    meanSequenceRecoverability,
    meanProsodicTrace,
    meanCellEntanglement,
    strongestCellQuality,
    meanOrderedness,
    strongOrderedRatio,
    meanOrderedInharmonicSpread,
    meanResonanceStrength,
    strongResonanceRatio,
    meanResonanceSharpness,
    meanResidualStrength,
    strongResidualRatio,
    meanResidualFlatness,
    meanNoiseColorCentroid,
    meanTransientStrength,
    strongTransientRatio,
    meanOnsetSharpness,
    meanOnsetSpread,
    meanDecayTightness,
    meanLeakAuditRisk,
    highLeakAuditRatio,
    meanRecommendedSuppression,
    registerCounts,
    phaseCounts,
    regimeCounts,
  };
}
