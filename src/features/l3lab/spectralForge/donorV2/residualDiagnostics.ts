import type {
  ResidualCellModel,
  ResidualFrameModel,
  ResidualModelSummary,
} from '../types/carrierDonorV2Types';

export function summarizeResidualModels(
  frames: ResidualFrameModel[],
  cells: ResidualCellModel[],
): ResidualModelSummary {
  if (!frames.length && !cells.length) {
    return {
      frameCount: 0,
      cellCount: 0,
      meanResidualStrength: 0,
      strongResidualRatio: 0,
      meanResidualFlatness: 0,
      meanNoiseColorCentroid: 0,
    };
  }

  const source = cells.length
    ? cells.map((cell) => ({
        strength: cell.meanResidualStrength,
        flatness: cell.meanResidualFlatness,
        centroid: cell.meanNoiseColorCentroid,
      }))
    : frames.map((frame) => ({
        strength: frame.residualStrength,
        flatness: frame.residualFlatness,
        centroid: frame.noiseColorCentroid,
      }));

  const count = source.length;
  const meanResidualStrength = source.reduce((sum, item) => sum + item.strength, 0) / count;
  const strongResidualRatio = source.filter((item) => item.strength > 0.48).length / count;
  const meanResidualFlatness = source.reduce((sum, item) => sum + item.flatness, 0) / count;
  const meanNoiseColorCentroid = source.reduce((sum, item) => sum + item.centroid, 0) / count;

  return {
    frameCount: frames.length,
    cellCount: cells.length,
    meanResidualStrength,
    strongResidualRatio,
    meanResidualFlatness,
    meanNoiseColorCentroid,
  };
}

export function classifyResidualStrength(meanResidualStrength: number): 'weak' | 'moderate' | 'strong' {
  if (meanResidualStrength < 0.25) return 'weak';
  if (meanResidualStrength < 0.55) return 'moderate';
  return 'strong';
}

export function isLikelyTooWeakForResidualTransfer(summary: ResidualModelSummary): boolean {
  return summary.meanResidualStrength < 0.18 || summary.strongResidualRatio < 0.08;
}
