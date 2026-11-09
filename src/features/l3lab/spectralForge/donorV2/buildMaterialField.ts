import type {
  DonorTimbreAtlas,
  DonorTimbreCell,
} from '../types/carrierDonorV2Types';
import type {
  MaterialCell,
  MaterialCellKind,
  MaterialField,
  MaterialFieldSummary,
} from '../types/gestaltMaterialField';

function mean(values: Float32Array | number[]): number {
  if (!values.length) return 0;
  let total = 0;
  for (let i = 0; i < values.length; i += 1) total += values[i] ?? 0;
  return total / values.length;
}

function energyScore(values: Float32Array): number {
  return mean(values);
}

function inferMaterialKind(cell: DonorTimbreCell): MaterialCellKind {
  const residual = cell.residualModel
    ? Math.max(0, cell.residualModel.meanResidualStrength * (0.55 + cell.residualModel.meanResidualFlatness * 0.45))
    : energyScore(cell.meanResidualBands);
  const resonance = cell.resonanceModel
    ? Math.max(0, cell.resonanceModel.meanResonanceStrength * (0.6 + cell.resonanceModel.meanResonanceSharpness * 0.4))
    : energyScore(cell.meanFormantEnvelope);
  const transient = cell.transientModel
    ? Math.max(0, cell.transientModel.meanTransientStrength * (0.5 + cell.transientModel.meanOnsetSharpness * 0.3 + cell.transientModel.meanDecayTightness * 0.2))
    : energyScore(cell.meanModulationProfile);
  const orderedBase = cell.orderedModel
    ? Math.max(0, cell.orderedModel.meanOrderedness * (1 - cell.orderedModel.meanInharmonicSpread * 0.6))
    : energyScore(cell.meanRelativeSpectralEnvelope);

  const antiOrderedPenalty = cell.leakAuditModel
    ? Math.max(
        cell.leakAuditModel.meanRecommendedSuppression,
        cell.leakAuditModel.meanOverallLeakRisk * 0.85,
      )
    : cell.prosodicTrace * 0.45 +
      cell.sequenceRecoverability * 0.35 +
      cell.cellEntanglement * 0.2;

  const orderedScore = Math.max(0, orderedBase - antiOrderedPenalty);

  const candidates: Array<[MaterialCellKind, number]> = [
    ['ordered', orderedScore],
    ['resonant', resonance],
    ['residual', residual],
    ['transient', transient],
  ];

  candidates.sort((a, b) => b[1] - a[1]);

  const best = candidates[0];
  if (!best) return 'mixed';
  const [bestKind, bestScore] = best;
  const secondScore = candidates[1]?.[1] ?? 0;

  if (bestScore <= 0.05) return 'mixed';
  if (Math.abs(bestScore - secondScore) < 0.05) return 'mixed';
  return bestKind;
}

function toMaterialCell(cell: DonorTimbreCell): MaterialCell {
  return {
    id: cell.id,
    register: cell.register,
    regime: cell.regime,
    kind: inferMaterialKind(cell),
    relativeEnvelope: cell.meanRelativeSpectralEnvelope,
    residualProfile: cell.meanResidualBands,
    resonanceProfile: cell.meanFormantEnvelope,
    transientProfile: cell.meanModulationProfile,
    sequenceRecoverability: cell.sequenceRecoverability,
    prosodicTrace: cell.prosodicTrace,
    cellEntanglement: cell.cellEntanglement,
    orderedStrength: cell.orderedModel?.meanOrderedness,
    orderedInharmonicSpread: cell.orderedModel?.meanInharmonicSpread,
    orderedPartialWeights: cell.orderedModel?.meanPartialWeights,
    orderedSpectralSlope: cell.orderedModel?.meanSpectralSlope,
    orderedOddEvenBalance: cell.orderedModel?.meanOddEvenBalance,
    resonanceStrength: cell.resonanceModel?.meanResonanceStrength,
    resonanceSharpness: cell.resonanceModel?.meanResonanceSharpness,
    resonancePeakCenters: cell.resonanceModel?.meanPeakCenters,
    resonancePeakWeights: cell.resonanceModel?.meanPeakWeights,
    resonancePeakWidths: cell.resonanceModel?.meanPeakWidths,
    resonanceBodyCentroid: cell.resonanceModel?.meanBodyCentroid,
    residualStrength: cell.residualModel?.meanResidualStrength,
    residualFlatness: cell.residualModel?.meanResidualFlatness,
    noiseColorCentroid: cell.residualModel?.meanNoiseColorCentroid,
    transientStrength: cell.transientModel?.meanTransientStrength,
    onsetSharpness: cell.transientModel?.meanOnsetSharpness,
    onsetSpread: cell.transientModel?.meanOnsetSpread,
    decayTightness: cell.transientModel?.meanDecayTightness,
    overallLeakRisk: cell.leakAuditModel?.meanOverallLeakRisk,
    recommendedSuppression: cell.leakAuditModel?.meanRecommendedSuppression,
  };
}

export function buildMaterialField(atlas: DonorTimbreAtlas): MaterialField {
  return {
    cells: atlas.cells.map(toMaterialCell),
  };
}

export function summarizeMaterialField(field: MaterialField): MaterialFieldSummary {
  const initial: Record<MaterialCellKind, number> = {
    ordered: 0,
    resonant: 0,
    residual: 0,
    transient: 0,
    mixed: 0,
  };

  if (!field.cells.length) {
    return {
      cellCount: 0,
      kindCounts: initial,
      meanSequenceRecoverability: 0,
      meanProsodicTrace: 0,
      meanCellEntanglement: 0,
      meanOrderedStrength: 0,
      strongOrderedRatio: 0,
      meanResonanceStrength: 0,
      strongResonantRatio: 0,
      meanResonanceSharpness: 0,
      meanResidualStrength: 0,
      strongResidualRatio: 0,
      meanResidualFlatness: 0,
      meanNoiseColorCentroid: 0,
      meanTransientStrength: 0,
      strongTransientRatio: 0,
      meanOnsetSharpness: 0,
      meanOnsetSpread: 0,
      meanDecayTightness: 0,
      meanOverallLeakRisk: 0,
      highLeakRatio: 0,
      meanRecommendedSuppression: 0,
    };
  }

  const kindCounts = field.cells.reduce<Record<MaterialCellKind, number>>((acc, cell) => {
    acc[cell.kind] += 1;
    return acc;
  }, { ...initial });

  const meanSequenceRecoverability =
    field.cells.reduce((sum, cell) => sum + cell.sequenceRecoverability, 0) /
    field.cells.length;

  const meanProsodicTrace =
    field.cells.reduce((sum, cell) => sum + cell.prosodicTrace, 0) /
    field.cells.length;

  const meanCellEntanglement =
    field.cells.reduce((sum, cell) => sum + cell.cellEntanglement, 0) /
    field.cells.length;
  const meanOrderedStrength =
    field.cells.reduce((sum, cell) => sum + (cell.orderedStrength ?? 0), 0) /
    field.cells.length;
  const strongOrderedRatio =
    field.cells.filter((cell) => (cell.orderedStrength ?? 0) > 0.55).length /
    field.cells.length;
  const meanResonanceStrength =
    field.cells.reduce((sum, cell) => sum + (cell.resonanceStrength ?? 0), 0) /
    field.cells.length;
  const strongResonantRatio =
    field.cells.filter((cell) => (cell.resonanceStrength ?? 0) > 0.48).length /
    field.cells.length;
  const meanResonanceSharpness =
    field.cells.reduce((sum, cell) => sum + (cell.resonanceSharpness ?? 0), 0) /
    field.cells.length;
  const meanResidualStrength =
    field.cells.reduce((sum, cell) => sum + (cell.residualStrength ?? 0), 0) /
    field.cells.length;
  const strongResidualRatio =
    field.cells.filter((cell) => (cell.residualStrength ?? 0) > 0.48).length /
    field.cells.length;
  const meanResidualFlatness =
    field.cells.reduce((sum, cell) => sum + (cell.residualFlatness ?? 0), 0) /
    field.cells.length;
  const meanNoiseColorCentroid =
    field.cells.reduce((sum, cell) => sum + (cell.noiseColorCentroid ?? 0), 0) /
    field.cells.length;
  const meanTransientStrength =
    field.cells.reduce((sum, cell) => sum + (cell.transientStrength ?? 0), 0) /
    field.cells.length;
  const strongTransientRatio =
    field.cells.filter((cell) => (cell.transientStrength ?? 0) > 0.48).length /
    field.cells.length;
  const meanOnsetSharpness =
    field.cells.reduce((sum, cell) => sum + (cell.onsetSharpness ?? 0), 0) /
    field.cells.length;
  const meanOnsetSpread =
    field.cells.reduce((sum, cell) => sum + (cell.onsetSpread ?? 0), 0) /
    field.cells.length;
  const meanDecayTightness =
    field.cells.reduce((sum, cell) => sum + (cell.decayTightness ?? 0), 0) /
    field.cells.length;
  const meanOverallLeakRisk =
    field.cells.reduce((sum, cell) => sum + (cell.overallLeakRisk ?? 0), 0) /
    field.cells.length;
  const highLeakRatio =
    field.cells.filter((cell) => (cell.overallLeakRisk ?? 0) > 0.58).length /
    field.cells.length;
  const meanRecommendedSuppression =
    field.cells.reduce((sum, cell) => sum + (cell.recommendedSuppression ?? 0), 0) /
    field.cells.length;

  return {
    cellCount: field.cells.length,
    kindCounts,
    meanSequenceRecoverability,
    meanProsodicTrace,
    meanCellEntanglement,
    meanOrderedStrength,
    strongOrderedRatio,
    meanResonanceStrength,
    strongResonantRatio,
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
    meanOverallLeakRisk,
    highLeakRatio,
    meanRecommendedSuppression,
  };
}
