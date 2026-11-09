import { useMemo } from "react";
import { buildAppRoomSceneRuntimeArgsBuilder } from "../layout/appRoomSceneRuntimeArgsBuilder";
import type { BuildAppRoomSceneRuntimeArgsBuilderInput } from "../layout/appRoomSceneRuntimeArgsBuilderTypes";
import { buildAppRoomSceneRuntimeEntry } from "../runtimeEntries";
import type { Room3TopologyUiState } from "./room3TopologyUiStateTypes";
import type { useRoom3TopologyRuntimeEntry } from "./useRoom3TopologyRuntimeEntry";


export {
  APP_ROOM_SCENE_RUNTIME_SOURCE_READINESS_AUDIT,
  APP_ROOM_SCENE_RUNTIME_SOURCE_READINESS_AUDIT_MANIFEST,
  APP_ROOM_SCENE_RUNTIME_SOURCE_READINESS_GROUP_KEYS,
} from '../layout/appRoomSceneRuntimeSourceReadinessAudit';

type TopologySceneInput = BuildAppRoomSceneRuntimeArgsBuilderInput["topologyScene"];
type InstallationSceneInput = BuildAppRoomSceneRuntimeArgsBuilderInput["installationScene"];
type ViewportSceneInput = BuildAppRoomSceneRuntimeArgsBuilderInput["viewportScene"];

type Room3RuntimeEntry = ReturnType<typeof useRoom3TopologyRuntimeEntry>;

export type UseAppRoomSceneRuntimeBoundaryArgs = {
  room3Topology: Room3TopologyUiState;
  room3RuntimeEntry: Room3RuntimeEntry;
  topologyScene: Pick<
    TopologySceneInput,
    | "freqFromY"
    | "selectedLoopHandoffProfile"
    | "selectedLoopMaterial"
    | "summarizeHandoffProfile"
    | "setFamilyRequestedActive"
    | "setRoom"
    | "setMyzelModeAndPower"
    | "toggleMyzelEnabled"
    | "resetMyzelTopologyNodes"
    | "activeMyzelRootHz"
  >;
  installationScene: Pick<
    InstallationSceneInput,
    | "particleSoundsMuted"
    | "onNodalDeviceEnabledChange"
    | "onNodalDeviceAmountChange"
    | "onNodalDeviceTargetChange"
    | "previewPendingCustomResident"
    | "selectedResidentNode"
    | "residentBaseHz"
    | "residentAddFrequencyHz"
  >;
  viewportScene: ViewportSceneInput;
};

export type AppRoomSceneRuntimeBoundary = ReturnType<typeof buildAppRoomSceneRuntimeEntry>;

export function useAppRoomSceneRuntimeBoundary({
  room3Topology,
  room3RuntimeEntry,
  topologyScene,
  installationScene,
  viewportScene,
}: UseAppRoomSceneRuntimeBoundaryArgs): AppRoomSceneRuntimeBoundary {
  return useMemo(() => buildAppRoomSceneRuntimeEntry(buildAppRoomSceneRuntimeArgsBuilder({
    topologyScene: {
      topologySnapshot: room3Topology.myceliumSnapshotRef.current,
      room3BodyEnabled: room3Topology.room3BodyEnabled,
      room3TimbreState: room3Topology.room3TimbreStateRef.current,
      primed: {
        y: room3Topology.myzelPrimedYRef.current,
        source: room3Topology.myzelPrimedSourceRef.current,
      },
      freqFromY: topologyScene.freqFromY,
      room3BodyMaterial: room3Topology.room3BodyControls.material,
      selectedLoopHandoffProfile: topologyScene.selectedLoopHandoffProfile,
      selectedLoopMaterial: topologyScene.selectedLoopMaterial,
      summarizeHandoffProfile: topologyScene.summarizeHandoffProfile,
      setFamilyRequestedActive: topologyScene.setFamilyRequestedActive,
      setRoom: topologyScene.setRoom,
      myzelTopologyMode: room3Topology.myzelTopologyMode,
      setMyzelModeAndPower: topologyScene.setMyzelModeAndPower,
      myzelEnabled: room3Topology.myzelEnabled,
      toggleMyzelEnabled: topologyScene.toggleMyzelEnabled,
      resetMyzelTopologyNodes: topologyScene.resetMyzelTopologyNodes,
      systemState: room3Topology.systemState,
      activeMyzelRootHz: topologyScene.activeMyzelRootHz,
      topologyCanvasRef: room3Topology.topologyCanvasRef,
      handleTopologyCanvasMouseDown: room3RuntimeEntry.handleTopologyCanvasMouseDown,
      handleTopologyCanvasMouseMove: room3RuntimeEntry.handleTopologyCanvasMouseMove,
      handleTopologyCanvasMouseUp: room3RuntimeEntry.handleTopologyCanvasMouseUp,
      handleTopologyCanvasContextMenu: room3RuntimeEntry.handleTopologyCanvasContextMenu,
      tParams: room3Topology.tParams,
      setTParams: room3Topology.setTParams,
      myzelPostFxGroup: room3Topology.myzelPostFxGroup,
      setMyzelPostFxGroup: room3Topology.setMyzelPostFxGroup,
      myzelPostFxEnabled: room3Topology.myzelPostFxEnabled,
      setMyzelPostFxEnabled: room3Topology.setMyzelPostFxEnabled,
      myzelFollowForgeHandoff: room3Topology.myzelFollowForgeHandoff,
      setMyzelFollowForgeHandoff: room3Topology.setMyzelFollowForgeHandoff,
      myzelPostFxDepth: room3Topology.myzelPostFxDepth,
      setMyzelPostFxDepth: room3Topology.setMyzelPostFxDepth,
      myzelPostFxParallel: room3Topology.myzelPostFxParallel,
      setMyzelPostFxParallel: room3Topology.setMyzelPostFxParallel,
      activeMyzelPostFxGroup: {
        summary: room3Topology.activeMyzelPostFxGroup.summary,
        receivesFrom: room3Topology.activeMyzelPostFxGroup.receivesFrom,
        keepsStableBy: room3Topology.activeMyzelPostFxGroup.keepsStableBy,
      },
    },
    installationScene: {
      myzelPattern: room3Topology.myzelPattern,
      setMyzelPattern: room3Topology.setMyzelPattern,
      myzelBallMode: room3Topology.myzelBallMode,
      setMyzelBallMode: room3Topology.setMyzelBallMode,
      myzelNodeMode: room3Topology.myzelNodeMode,
      setMyzelNodeMode: room3Topology.setMyzelNodeMode,
      myzelStep16ths: room3Topology.myzelStep16ths,
      setMyzelStep16ths: room3Topology.setMyzelStep16ths,
      myzelDriveEnabled: room3Topology.myzelDriveEnabled,
      setMyzelDriveEnabled: room3Topology.setMyzelDriveEnabled,
      room3BodyEnabledState: room3Topology.room3BodyEnabled,
      setRoom3BodyEnabled: room3Topology.setRoom3BodyEnabled,
      setMyzelInterpreterMix: room3Topology.setMyzelInterpreterMix,
      setMyzelCentralColorMixer: room3Topology.setMyzelCentralColorMixer,
      nodalDeviceMatrix: room3Topology.nodalDeviceMatrix,
      onNodalDeviceEnabledChange: installationScene.onNodalDeviceEnabledChange,
      onNodalDeviceAmountChange: installationScene.onNodalDeviceAmountChange,
      onNodalDeviceTargetChange: installationScene.onNodalDeviceTargetChange,
      setRoom3BodyControls: room3Topology.setRoom3BodyControls,
      myzelInterpreterMix: room3Topology.myzelInterpreterMix,
      myzelCentralColorMixer: room3Topology.myzelCentralColorMixer,
      room3BodyControls: room3Topology.room3BodyControls,
      setMyzelInstallationMix: room3Topology.setMyzelInstallationMix,
      myzelInstallationMix: room3Topology.myzelInstallationMix,
      installationFieldConfig: room3Topology.installationFieldConfig,
      particleSoundsMuted: installationScene.particleSoundsMuted,
      toggleInstallNomadAttractor: room3RuntimeEntry.toggleInstallNomadAttractor,
      toggleInstallResidents: room3RuntimeEntry.toggleInstallResidents,
      setInstallResidentVolumeLevel: room3RuntimeEntry.setInstallResidentVolumeLevel,
      setInstallResidentSystemValue: room3RuntimeEntry.setInstallResidentSystemValue,
      setInstallResidentModeValue: room3RuntimeEntry.setInstallResidentModeValue,
      toggleInstallResidentWaveExcitation: room3RuntimeEntry.toggleInstallResidentWaveExcitation,
      toggleInstallResidentBallCoupling: room3RuntimeEntry.toggleInstallResidentBallCoupling,
      setInstallParticleSoundMode: room3RuntimeEntry.setInstallParticleSoundMode,
      setInstallResidentSoundPreset: room3RuntimeEntry.setInstallResidentSoundPreset,
      setInstallResidentElasticPitch: room3RuntimeEntry.setInstallResidentElasticPitch,
      customResidentSoundPreset: room3Topology.customResidentSoundPreset,
      customResidentElasticPitch: room3Topology.customResidentElasticPitch,
      setCustomResidentSoundPreset: room3Topology.setCustomResidentSoundPreset,
      setCustomResidentElasticPitch: room3Topology.setCustomResidentElasticPitch,
      previewPendingCustomResident: installationScene.previewPendingCustomResident,
      selectedResidentNode: installationScene.selectedResidentNode,
      residentBaseHz: installationScene.residentBaseHz,
      residentAddFrequencyHz: installationScene.residentAddFrequencyHz,
      setResidentAddFrequencySlider: room3Topology.setResidentAddFrequencySlider,
      addInstallationResident: room3RuntimeEntry.addInstallationResident,
      residentConstellationName: room3Topology.residentConstellationName,
      setResidentConstellationName: room3Topology.setResidentConstellationName,
      savedResidentConstellations: room3Topology.savedResidentConstellations,
      saveCurrentResidentConstellation: room3RuntimeEntry.saveCurrentResidentConstellation,
      loadResidentConstellation: room3RuntimeEntry.loadResidentConstellation,
      deleteResidentConstellation: room3RuntimeEntry.deleteResidentConstellation,
    },
    viewportScene,
  })), [
    room3Topology,
    room3RuntimeEntry,
    topologyScene,
    installationScene,
    viewportScene,
  ]);
}
