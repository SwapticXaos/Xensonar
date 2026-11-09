import { useMemo } from "react";
import { buildTopologyRuntimeEntry } from "../runtimeEntries";
import type { Room3TopologyUiState } from "./room3TopologyUiStateTypes";

type BuildTopologyRuntimeEntryArgs = Parameters<typeof buildTopologyRuntimeEntry>[0];
type RoomSupportArgs = BuildTopologyRuntimeEntryArgs["roomSupport"];

type UseRoom3TopologyRuntimeEntryArgs = {
  room3Topology: Room3TopologyUiState;
  residentBaseHz: number;
  residentAddFrequencyHz: number;
  particleSoundsMuted: boolean;
  setMyzelModeAndPower: RoomSupportArgs["system"]["setMyzelModeAndPower"];
  setRoom: RoomSupportArgs["system"]["setRoom"];
  updateNParams: RoomSupportArgs["installationField"]["updateNParams"];
};

export function useRoom3TopologyRuntimeEntry({
  room3Topology,
  residentBaseHz,
  residentAddFrequencyHz,
  particleSoundsMuted,
  setMyzelModeAndPower,
  setRoom,
  updateNParams,
}: UseRoom3TopologyRuntimeEntryArgs): ReturnType<typeof buildTopologyRuntimeEntry> {
  const {
    topologyRefs,
    topologyDragRef,
    setSelectedResidentId,
    setSystemState,
    customResidentSoundPreset,
    customResidentElasticPitch,
    residentConstellationName,
    savedResidentConstellations,
    setSavedResidentConstellations,
    setResidentConstellationName,
    installationFieldConfigRef,
    setInstallationFieldConfig,
    installationSharedFieldFlags,
  } = room3Topology;

  return useMemo(() => buildTopologyRuntimeEntry({
    residentConfig: {
      topologyNodes: topologyRefs.current.nodes,
      residentBaseHz,
    },
    roomSupport: {
      refs: {
        topologyRefs,
        topologyDragRef,
      },
      selection: {
        setSelectedResidentId,
      },
      system: {
        setSystemState,
        setMyzelModeAndPower,
        setRoom,
      },
      residentRuntime: {
        residentBaseHz,
        residentAddFrequencyHz,
        customResidentSoundPreset,
        customResidentElasticPitch,
        residentConstellationName,
        savedResidentConstellations,
        setSavedResidentConstellations,
        setResidentConstellationName,
      },
      installationField: {
        installationFieldConfigRef,
        setInstallationFieldConfig,
        updateNParams,
      },
    },
    installationSharedField: {
      refs: {
        topologyRefs,
        topologyDragRef,
      },
      installState: installationSharedFieldFlags,
      particleState: {
        particleSoundsMuted,
      },
    },
  }), [
    topologyRefs,
    topologyDragRef,
    setSelectedResidentId,
    setSystemState,
    setMyzelModeAndPower,
    setRoom,
    residentBaseHz,
    residentAddFrequencyHz,
    customResidentSoundPreset,
    customResidentElasticPitch,
    residentConstellationName,
    savedResidentConstellations,
    setSavedResidentConstellations,
    setResidentConstellationName,
    installationFieldConfigRef,
    setInstallationFieldConfig,
    updateNParams,
    installationSharedFieldFlags,
    particleSoundsMuted,
  ]);
}
