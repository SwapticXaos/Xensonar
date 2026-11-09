import type {
  TransientCellModel,
  TransientFrameModel,
  TransientModelSummary,
} from '../types/carrierDonorV2Types';

export function summarizeTransientModels(
  frames: TransientFrameModel[],
  cells: TransientCellModel[],
): TransientModelSummary {
  if (!frames.length && !cells.length) {
    return {
      frameCount: 0,
      cellCount: 0,
      meanTransientStrength: 0,
      strongTransientRatio: 0,
      meanOnsetSharpness: 0,
      meanOnsetSpread: 0,
      meanDecayTightness: 0,
    };
  }

  const source = cells.length
    ? cells.map((cell) => ({
        strength: cell.meanTransientStrength,
        onsetSharpness: cell.meanOnsetSharpness,
        onsetSpread: cell.meanOnsetSpread,
        decayTightness: cell.meanDecayTightness,
      }))
    : frames.map((frame) => ({
        strength: frame.transientStrength,
        onsetSharpness: frame.onsetSharpness,
        onsetSpread: frame.onsetSpread,
        decayTightness: frame.decayTightness,
      }));

  const count = source.length;
  const meanTransientStrength = source.reduce((sum, item) => sum + item.strength, 0) / count;
  const strongTransientRatio = source.filter((item) => item.strength > 0.48).length / count;
  const meanOnsetSharpness = source.reduce((sum, item) => sum + item.onsetSharpness, 0) / count;
  const meanOnsetSpread = source.reduce((sum, item) => sum + item.onsetSpread, 0) / count;
  const meanDecayTightness = source.reduce((sum, item) => sum + item.decayTightness, 0) / count;

  return {
    frameCount: frames.length,
    cellCount: cells.length,
    meanTransientStrength,
    strongTransientRatio,
    meanOnsetSharpness,
    meanOnsetSpread,
    meanDecayTightness,
  };
}

export function classifyTransientStrength(meanTransientStrength: number): 'weak' | 'moderate' | 'strong' {
  if (meanTransientStrength < 0.25) return 'weak';
  if (meanTransientStrength < 0.55) return 'moderate';
  return 'strong';
}

export function isLikelyTooWeakForTransientTransfer(summary: TransientModelSummary): boolean {
  return summary.meanTransientStrength < 0.18 || summary.strongTransientRatio < 0.08;
}
