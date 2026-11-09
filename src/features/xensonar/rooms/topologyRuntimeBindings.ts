import { buildInstallationSharedFieldControllerArgs, buildTopologyRoomSupportArgs } from './topologyRoomSupportArgs';
import { buildTopologyResidentConfigActions } from './topologyResidentConfigActions';

type TopologyResidentConfigActionArgs = Parameters<typeof buildTopologyResidentConfigActions>[0];
type TopologyRoomSupportArgs = Parameters<typeof buildTopologyRoomSupportArgs>[0];
type InstallationSharedFieldArgs = Parameters<typeof buildInstallationSharedFieldControllerArgs>[0];

export function buildTopologyResidentConfigBindings(
  args: TopologyResidentConfigActionArgs,
): TopologyResidentConfigActionArgs {
  return {
    topologyNodes: args.topologyNodes,
    residentBaseHz: args.residentBaseHz,
  };
}

export function buildTopologyRoomSupportRuntimeBindings(
  args: Omit<TopologyRoomSupportArgs, 'topologyWidth' | 'topologyHeight'>,
): Omit<TopologyRoomSupportArgs, 'topologyWidth' | 'topologyHeight'> {
  return {
    topologyRefs: args.topologyRefs,
    topologyDragRef: args.topologyDragRef,
    setSelectedResidentId: args.setSelectedResidentId,
    setSystemState: args.setSystemState,
    residentBaseHz: args.residentBaseHz,
    installationFieldConfigRef: args.installationFieldConfigRef,
    residentAddFrequencyHz: args.residentAddFrequencyHz,
    customResidentSoundPreset: args.customResidentSoundPreset,
    customResidentElasticPitch: args.customResidentElasticPitch,
    residentConstellationName: args.residentConstellationName,
    savedResidentConstellations: args.savedResidentConstellations,
    setSavedResidentConstellations: args.setSavedResidentConstellations,
    setInstallationFieldConfig: args.setInstallationFieldConfig,
    setResidentConstellationName: args.setResidentConstellationName,
    retuneResidentsForConfig: args.retuneResidentsForConfig,
    applyResidentModeForConfig: args.applyResidentModeForConfig,
    updateNParams: args.updateNParams,
    setMyzelModeAndPower: args.setMyzelModeAndPower,
    setRoom: args.setRoom,
  };
}

export function buildInstallationSharedFieldRuntimeBindings(
  args: Omit<InstallationSharedFieldArgs, 'sourceWidth' | 'sourceHeight' | 'targetWidth' | 'targetHeight'>,
): Omit<InstallationSharedFieldArgs, 'sourceWidth' | 'sourceHeight' | 'targetWidth' | 'targetHeight'> {
  return {
    topologyRefs: args.topologyRefs,
    topologyDragRef: args.topologyDragRef,
    installationSharedFieldActive: args.installationSharedFieldActive,
    installAttractCursor: args.installAttractCursor,
    installAttractOscillatorBall: args.installAttractOscillatorBall,
    installResidentsEnabled: args.installResidentsEnabled,
    installResidentWaveExcitationEnabled: args.installResidentWaveExcitationEnabled,
    installResidentBallCouplingEnabled: args.installResidentBallCouplingEnabled,
    particleSoundsMuted: args.particleSoundsMuted,
  };
}
