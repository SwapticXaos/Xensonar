import type { AppRoomSceneRuntimeEntryArgs, BuildAppRoomSceneRuntimeArgsBuilderInput } from './appRoomSceneRuntimeArgsBuilderTypes';

export type { BuildAppRoomSceneRuntimeArgsBuilderInput } from './appRoomSceneRuntimeArgsBuilderTypes';

export function buildAppRoomSceneRuntimeArgsBuilder(
  input: BuildAppRoomSceneRuntimeArgsBuilderInput,
): AppRoomSceneRuntimeEntryArgs {
  return {
    topologyScene: {
      ...input.topologyScene,
      room3MaterialLabel: input.topologyScene.room3TimbreState.materialLabel,
      primedY: input.topologyScene.primed.y,
      primedSource: input.topologyScene.primed.source,
      activeMyzelPostFxGroupSummary: input.topologyScene.activeMyzelPostFxGroup.summary,
      activeMyzelPostFxGroupReceivesFrom: input.topologyScene.activeMyzelPostFxGroup.receivesFrom,
      activeMyzelPostFxGroupKeepsStableBy: input.topologyScene.activeMyzelPostFxGroup.keepsStableBy,
    },
    installationScene: {
      ...input.installationScene,
      selectedResidentLabel: input.installationScene.selectedResidentNode?.label ?? null,
      selectedResidentFrequencyHz:
        input.installationScene.selectedResidentNode?.freq ?? null,
    },
    viewportScene: {
      ...input.viewportScene,
    },
  };
}
