import { buildTopologyRoomSupport } from './topologyRoomSupportCoordinator';
import type { BuildTopologyRoomSupportBindingsArgs } from './topologyRoomSupportBindingsTypes';

export function buildTopologyRoomSupportBindings(args: BuildTopologyRoomSupportBindingsArgs) {
  return buildTopologyRoomSupport({
    canvasHandlers: {
      topologyRefs: args.topologyRefs,
      topologyDragRef: args.topologyDragRef,
      topologyWidth: args.topologyWidth,
      topologyHeight: args.topologyHeight,
      setSelectedResidentId: args.setSelectedResidentId,
      setSystemState: args.setSystemState,
    },
    residentActions: {
      topologyRefs: args.topologyRefs,
      residentBaseHz: args.residentBaseHz,
      topologyWidth: args.topologyWidth,
      topologyHeight: args.topologyHeight,
      installationFieldConfigRef: args.installationFieldConfigRef,
      residentAddFrequencyHz: args.residentAddFrequencyHz,
      customResidentSoundPreset: args.customResidentSoundPreset,
      customResidentElasticPitch: args.customResidentElasticPitch,
      residentConstellationName: args.residentConstellationName,
      savedResidentConstellations: args.savedResidentConstellations,
      setSavedResidentConstellations: args.setSavedResidentConstellations,
      setInstallationFieldConfig: args.setInstallationFieldConfig,
      setSelectedResidentId: args.setSelectedResidentId,
      setResidentConstellationName: args.setResidentConstellationName,
      setSystemState: args.setSystemState,
    },
    installationFieldActions: {
      setInstallationFieldConfig: args.setInstallationFieldConfig,
      retuneResidentsForConfig: args.retuneResidentsForConfig,
      applyResidentModeForConfig: args.applyResidentModeForConfig,
      updateNParams: args.updateNParams,
      setMyzelModeAndPower: args.setMyzelModeAndPower,
      setRoom: args.setRoom,
    },
  });
}
