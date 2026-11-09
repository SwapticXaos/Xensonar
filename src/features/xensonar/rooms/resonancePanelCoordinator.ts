import { buildResonanceStagePanelProps } from './resonanceStageController';
import {
  buildResonanceControlCorePanelProps,
  buildResonanceGrooveBassPanelProps,
  buildResonanceSoundPalettePanelProps,
} from './resonancePanelProps';

import type { BuildResonancePanelSuitePropsArgs, ResonancePanelSuiteProps } from './resonancePanelCoordinatorTypes';

export type { BuildResonancePanelSuitePropsArgs, ResonancePanelSuiteProps } from './resonancePanelCoordinatorTypes';

export function buildResonancePanelSuiteProps(args: BuildResonancePanelSuitePropsArgs): ResonancePanelSuiteProps {
  return {
    resonanceStagePanelProps: buildResonanceStagePanelProps(args.stage),
    resonanceControlCorePanelProps: buildResonanceControlCorePanelProps(args.controlCore),
    resonanceSoundPalettePanelProps: buildResonanceSoundPalettePanelProps(args.soundPalette),
    resonanceParallelEffectsPanelProps: args.parallelEffects,
    resonanceGrooveBassPanelProps: buildResonanceGrooveBassPanelProps(args.grooveBass),
    recordingTakePanelProps: args.recordingTake,
    resonanceBurstDiagnosticsPanelProps: args.burstDiagnostics,
  };
}
