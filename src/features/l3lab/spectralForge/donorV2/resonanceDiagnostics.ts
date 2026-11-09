import type {
  ResonanceCellModel,
  ResonanceFrameModel,
  ResonanceModelSummary,
} from '../types/carrierDonorV2Types';

export function summarizeResonanceModels(
  frames: ResonanceFrameModel[],
  cells: ResonanceCellModel[],
): ResonanceModelSummary {
  if (!frames.length && !cells.length) {
    return {
      frameCount: 0,
      cellCount: 0,
      meanResonanceStrength: 0,
      strongResonanceRatio: 0,
      meanResonanceSharpness: 0,
    };
  }

  const source = cells.length
    ? cells.map((cell) => ({
        strength: cell.meanResonanceStrength,
        sharpness: cell.meanResonanceSharpness,
      }))
    : frames.map((frame) => ({
        strength: frame.resonanceStrength,
        sharpness: frame.resonanceSharpness,
      }));

  const count = source.length;
  const meanResonanceStrength =
    source.reduce((sum, item) => sum + item.strength, 0) / count;
  const strongResonanceRatio =
    source.filter((item) => item.strength > 0.48).length / count;
  const meanResonanceSharpness =
    source.reduce((sum, item) => sum + item.sharpness, 0) / count;

  return {
    frameCount: frames.length,
    cellCount: cells.length,
    meanResonanceStrength,
    strongResonanceRatio,
    meanResonanceSharpness,
  };
}

export function classifyResonanceStrength(meanResonanceStrength: number): 'weak' | 'moderate' | 'strong' {
  if (meanResonanceStrength < 0.25) return 'weak';
  if (meanResonanceStrength < 0.55) return 'moderate';
  return 'strong';
}

export function isLikelyTooWeakForResonantTransfer(summary: ResonanceModelSummary): boolean {
  return summary.meanResonanceStrength < 0.18 || summary.strongResonanceRatio < 0.08;
}
