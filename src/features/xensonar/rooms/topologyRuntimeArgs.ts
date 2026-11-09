import type {
  buildInstallationSharedFieldRuntimeBindings,
  buildTopologyRoomSupportRuntimeBindings,
} from "./topologyRuntimeBindings";

type TopologyRoomSupportRuntimeArgs = Parameters<
  typeof buildTopologyRoomSupportRuntimeBindings
>[0];
type InstallationSharedFieldRuntimeArgs = Parameters<
  typeof buildInstallationSharedFieldRuntimeBindings
>[0];

type BuildTopologyRoomSupportRuntimeArgs = {
  refs: Pick<TopologyRoomSupportRuntimeArgs, "topologyRefs" | "topologyDragRef">;
  selection: Pick<TopologyRoomSupportRuntimeArgs, "setSelectedResidentId">;
  system: Pick<
    TopologyRoomSupportRuntimeArgs,
    "setSystemState" | "setMyzelModeAndPower" | "setRoom"
  >;
  residentRuntime: Pick<
    TopologyRoomSupportRuntimeArgs,
    | "residentBaseHz"
    | "residentAddFrequencyHz"
    | "customResidentSoundPreset"
    | "customResidentElasticPitch"
    | "residentConstellationName"
    | "savedResidentConstellations"
    | "setSavedResidentConstellations"
    | "setResidentConstellationName"
  >;
  installationField: Pick<
    TopologyRoomSupportRuntimeArgs,
    | "installationFieldConfigRef"
    | "setInstallationFieldConfig"
    | "updateNParams"
  >;
  residentConfigActions: Pick<
    TopologyRoomSupportRuntimeArgs,
    "retuneResidentsForConfig" | "applyResidentModeForConfig"
  >;
};

type BuildInstallationSharedFieldRuntimeArgs = {
  refs: Pick<InstallationSharedFieldRuntimeArgs, "topologyRefs" | "topologyDragRef">;
  installState: Pick<
    InstallationSharedFieldRuntimeArgs,
    | "installationSharedFieldActive"
    | "installAttractCursor"
    | "installAttractOscillatorBall"
    | "installResidentsEnabled"
    | "installResidentWaveExcitationEnabled"
    | "installResidentBallCouplingEnabled"
  >;
  particleState: Pick<InstallationSharedFieldRuntimeArgs, "particleSoundsMuted">;
};

export function buildTopologyRoomSupportRuntimeArgs(
  args: BuildTopologyRoomSupportRuntimeArgs,
): TopologyRoomSupportRuntimeArgs {
  return {
    ...args.refs,
    ...args.selection,
    ...args.system,
    ...args.residentRuntime,
    ...args.installationField,
    ...args.residentConfigActions,
  };
}

export function buildInstallationSharedFieldRuntimeArgs(
  args: BuildInstallationSharedFieldRuntimeArgs,
): InstallationSharedFieldRuntimeArgs {
  return {
    ...args.refs,
    ...args.installState,
    ...args.particleState,
  };
}
