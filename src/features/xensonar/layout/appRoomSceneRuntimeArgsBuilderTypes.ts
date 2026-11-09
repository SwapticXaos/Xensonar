import type { buildAppRoomSceneRuntimeArgs } from "../rooms/appRoomSceneRuntimeArgs";

export type AppRoomSceneRuntimeEntryArgs = Parameters<typeof buildAppRoomSceneRuntimeArgs>[0];

type TopologySceneArgs = AppRoomSceneRuntimeEntryArgs["topologyScene"];
type InstallationSceneArgs = AppRoomSceneRuntimeEntryArgs["installationScene"];
type ViewportSceneArgs = AppRoomSceneRuntimeEntryArgs["viewportScene"];

export type BuildAppRoomSceneRuntimeArgsBuilderInput = {
  topologyScene: Omit<
    TopologySceneArgs,
    | "room3MaterialLabel"
    | "primedY"
    | "primedSource"
    | "activeMyzelPostFxGroupSummary"
    | "activeMyzelPostFxGroupReceivesFrom"
    | "activeMyzelPostFxGroupKeepsStableBy"
  > & {
    room3TimbreState: {
      materialLabel: TopologySceneArgs["room3MaterialLabel"];
    };
    primed: {
      y: TopologySceneArgs["primedY"];
      source: TopologySceneArgs["primedSource"];
    };
    activeMyzelPostFxGroup: {
      summary: TopologySceneArgs["activeMyzelPostFxGroupSummary"];
      receivesFrom: TopologySceneArgs["activeMyzelPostFxGroupReceivesFrom"];
      keepsStableBy: TopologySceneArgs["activeMyzelPostFxGroupKeepsStableBy"];
    };
  };
  installationScene: Omit<
    InstallationSceneArgs,
    "selectedResidentLabel" | "selectedResidentFrequencyHz"
  > & {
    selectedResidentNode: {
      label?: InstallationSceneArgs["selectedResidentLabel"];
      freq?: InstallationSceneArgs["selectedResidentFrequencyHz"];
    } | null;
  };
  viewportScene: ViewportSceneArgs;
};
