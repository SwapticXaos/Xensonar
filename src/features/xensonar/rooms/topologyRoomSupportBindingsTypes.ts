import type { buildTopologyRoomSupport } from './topologyRoomSupportCoordinator';

type BuildTopologyRoomSupportArgs = Parameters<typeof buildTopologyRoomSupport>[0];
type CanvasHandlersArgs = BuildTopologyRoomSupportArgs['canvasHandlers'];
type ResidentActionsArgs = BuildTopologyRoomSupportArgs['residentActions'];
type InstallationFieldActionsArgs = BuildTopologyRoomSupportArgs['installationFieldActions'];

export type BuildTopologyRoomSupportBindingsArgs = {
  topologyRefs: CanvasHandlersArgs['topologyRefs'];
  topologyDragRef: CanvasHandlersArgs['topologyDragRef'];
  topologyWidth: CanvasHandlersArgs['topologyWidth'];
  topologyHeight: CanvasHandlersArgs['topologyHeight'];
  setSelectedResidentId: ResidentActionsArgs['setSelectedResidentId'];
  setSystemState: ResidentActionsArgs['setSystemState'];
  residentBaseHz: ResidentActionsArgs['residentBaseHz'];
  installationFieldConfigRef: ResidentActionsArgs['installationFieldConfigRef'];
  residentAddFrequencyHz: ResidentActionsArgs['residentAddFrequencyHz'];
  customResidentSoundPreset: ResidentActionsArgs['customResidentSoundPreset'];
  customResidentElasticPitch: ResidentActionsArgs['customResidentElasticPitch'];
  residentConstellationName: ResidentActionsArgs['residentConstellationName'];
  savedResidentConstellations: ResidentActionsArgs['savedResidentConstellations'];
  setSavedResidentConstellations: ResidentActionsArgs['setSavedResidentConstellations'];
  setInstallationFieldConfig: ResidentActionsArgs['setInstallationFieldConfig'];
  setResidentConstellationName: ResidentActionsArgs['setResidentConstellationName'];
  retuneResidentsForConfig: InstallationFieldActionsArgs['retuneResidentsForConfig'];
  applyResidentModeForConfig: InstallationFieldActionsArgs['applyResidentModeForConfig'];
  updateNParams: InstallationFieldActionsArgs['updateNParams'];
  setMyzelModeAndPower: InstallationFieldActionsArgs['setMyzelModeAndPower'];
  setRoom: InstallationFieldActionsArgs['setRoom'];
};
