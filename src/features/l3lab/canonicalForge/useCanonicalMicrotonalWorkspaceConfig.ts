import { clampBars } from '../spectralForge/state/storeMaterialExport';
import {
createCanonicalMicrotonalDrumActions,
createCanonicalMicrotonalMaterialActions,
createCanonicalMicrotonalMelodicActions,
  type CanonicalMicrotonalDrumActionArgs,
  type CanonicalMicrotonalMaterialActionArgs,
} from './microtonalLogicActionBuilders';
import type { MicrotonalLogicWorkspaceProps } from './microtonalLogicWorkspace';
import {
buildCanonicalMicrotonalDrumProps,
buildCanonicalMicrotonalMaterialProps,
buildCanonicalMicrotonalMelodicProps,
composeMicrotonalLogicWorkspaceProps,
} from './microtonalLogicWorkspaceProps';
import type { CanonicalMicrotonalMelodicActionArgs } from './microtonalMelodicActionSurface';
import type { CanonicalLogicView } from './sessionTypes';

type CanonicalDrumBuilderArgs = Parameters<typeof buildCanonicalMicrotonalDrumProps>[0];
type CanonicalMelodicBuilderArgs = Parameters<typeof buildCanonicalMicrotonalMelodicProps>[0];
type CanonicalMaterialBuilderArgs = Parameters<typeof buildCanonicalMicrotonalMaterialProps>[0];

export type CanonicalMicrotonalWorkspaceDrumActions = CanonicalMicrotonalDrumActionArgs;
export type CanonicalMicrotonalWorkspaceMelodicActions = Omit<CanonicalMicrotonalMelodicActionArgs, 'activeLoopPitchIndex'>;
export type CanonicalMicrotonalWorkspaceMaterialActions = Omit<CanonicalMicrotonalMaterialActionArgs, 'clampBars'>;

export type CanonicalMicrotonalWorkspaceConfigArgs = {
  logicView: CanonicalLogicView;
  currentDrumPatternLabel: string;
  currentDrumKitLabel: string;
  currentMelodicPresetLabel: string;
  drumState: CanonicalDrumBuilderArgs['state'];
  drumRefs: CanonicalDrumBuilderArgs['refs'];
  drumActions: CanonicalMicrotonalWorkspaceDrumActions;
  melodicState: CanonicalMelodicBuilderArgs['state'];
  melodicRefs: CanonicalMelodicBuilderArgs['refs'];
  melodicActions: CanonicalMicrotonalWorkspaceMelodicActions;
  materialState: CanonicalMaterialBuilderArgs['state'];
  materialActions: CanonicalMicrotonalWorkspaceMaterialActions;
};

export function useCanonicalMicrotonalWorkspaceConfig({
  logicView,
  currentDrumPatternLabel,
  currentDrumKitLabel,
  currentMelodicPresetLabel,
  drumState,
  drumRefs,
  drumActions,
  melodicState,
  melodicRefs,
  melodicActions,
  materialState,
  materialActions,
}: CanonicalMicrotonalWorkspaceConfigArgs): MicrotonalLogicWorkspaceProps {
  return composeMicrotonalLogicWorkspaceProps({
    header: {
      logicView,
      currentDrumPatternLabel,
      currentDrumKitLabel,
      currentMelodicPresetLabel,
    },
    drum: buildCanonicalMicrotonalDrumProps({
      state: drumState,
      refs: drumRefs,
      actions: createCanonicalMicrotonalDrumActions({ ...drumActions }),
    }),
    melodic: buildCanonicalMicrotonalMelodicProps({
      state: melodicState,
      refs: melodicRefs,
      actions: createCanonicalMicrotonalMelodicActions({
        ...melodicActions,
        activeLoopPitchIndex: melodicState.activeLoopPitchIndex,
      }),
    }),
    material: buildCanonicalMicrotonalMaterialProps({
      state: materialState,
      actions: createCanonicalMicrotonalMaterialActions({
        ...materialActions,
        clampBars,
      }),
    }),
  });
}
