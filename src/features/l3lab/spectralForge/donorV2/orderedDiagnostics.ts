import type {
  OrderedCellModel,
  OrderedFrameModel,
  OrderedModelSummary,
} from '../types/carrierDonorV2Types';

export function summarizeOrderedModels(
  frames: OrderedFrameModel[],
  cells: OrderedCellModel[],
): OrderedModelSummary {
  if (!frames.length && !cells.length) {
    return {
      frameCount: 0,
      cellCount: 0,
      meanOrderedness: 0,
      strongOrderedRatio: 0,
      meanInharmonicSpread: 0,
    };
  }

  const source = cells.length
    ? cells.map((cell) => ({
        orderedness: cell.meanOrderedness,
        inharmonicSpread: cell.meanInharmonicSpread,
      }))
    : frames.map((frame) => ({
        orderedness: frame.orderedness,
        inharmonicSpread: frame.inharmonicSpread,
      }));

  const count = Math.max(1, source.length);
  const meanOrderedness =
    source.reduce((sum, item) => sum + item.orderedness, 0) / count;
  const strongOrderedRatio =
    source.filter((item) => item.orderedness > 0.55).length / count;
  const meanInharmonicSpread =
    source.reduce((sum, item) => sum + item.inharmonicSpread, 0) / count;

  return {
    frameCount: frames.length,
    cellCount: cells.length,
    meanOrderedness,
    strongOrderedRatio,
    meanInharmonicSpread,
  };
}

export function classifyOrderedStrength(meanOrderedness: number): 'weak' | 'moderate' | 'strong' {
  if (meanOrderedness < 0.3) return 'weak';
  if (meanOrderedness < 0.6) return 'moderate';
  return 'strong';
}

export function isLikelyTooWeakForOrderedTransfer(summary: OrderedModelSummary): boolean {
  return summary.meanOrderedness < 0.22 || summary.strongOrderedRatio < 0.08;
}
