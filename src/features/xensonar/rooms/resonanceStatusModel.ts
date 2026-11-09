import {
  deriveModeMask,
  getModesForSystem,
  getMutedStepsForMode,
  getOptionLabel,
  GRID_TUNING_OPTIONS,
  sameBooleanArray,
  sameNumberSet,
} from '../domain/instrumentData';
import type { ChurchMode, GridTuning } from '../domain/instrumentData';

type BuildResonanceStatusModelArgs = {
  particleSystem: GridTuning | 'ji' | 'bp';
  churchMode: ChurchMode;
  gridTuning: GridTuning;
  gridMode: ChurchMode;
  manualGridMutedSteps: number[];
  manualGridStepOffsets?: number[];
  activeParticleNodeCount: number;
  agentEnabled: boolean[];
};

export function buildResonanceStatusModel(args: BuildResonanceStatusModelArgs) {
  const particleSystemLabel = args.particleSystem === 'ji'
    ? 'Just Intonation'
    : args.particleSystem === 'bp'
      ? 'Bohlen-Pierce'
      : getOptionLabel(GRID_TUNING_OPTIONS, `${args.particleSystem}` as GridTuning);

  const particleModeLabel = getOptionLabel(getModesForSystem(args.particleSystem), args.churchMode);
  const gridTuningLabel = getOptionLabel(GRID_TUNING_OPTIONS, args.gridTuning);
  const defaultGridMutedSteps = getMutedStepsForMode(args.gridMode, args.gridTuning);
  const gridOffsets = args.manualGridStepOffsets ?? [];
  const gridIsCustom = gridOffsets.some((offset) => Math.abs(offset) > 0.02)
    || !sameNumberSet(args.manualGridMutedSteps, defaultGridMutedSteps);
  const gridModeLabel = gridIsCustom ? 'Custom' : getOptionLabel(getModesForSystem(args.gridTuning), args.gridMode);
  const particleDefaultMask = deriveModeMask(args.churchMode, args.particleSystem).slice(0, args.activeParticleNodeCount);
  const particleCurrentMask = Array.from({ length: args.activeParticleNodeCount }, (_, idx) => !!args.agentEnabled[idx]);
  const particleIsCustom = !sameBooleanArray(particleDefaultMask, particleCurrentMask);
  const particleDisplayModeLabel = particleIsCustom ? `${particleModeLabel}*` : particleModeLabel;

  return {
    particleSystemLabel,
    particleDisplayModeLabel,
    gridTuningLabel,
    gridModeLabel,
  };
}
