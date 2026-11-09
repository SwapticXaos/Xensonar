import { useEffect, type MutableRefObject } from "react";
import type { InstallationFieldConfig } from "@/features/topology/installationFieldConfig";
import { persistResidentConstellations, type SavedResidentConstellation } from "@/features/topology/residentConstellations";
import type { Room3BodyControls } from "@/features/resonance/timbreModel";

export type Room3InstallationAndBodyStateBridgeArgs = {
  installationFieldConfig: InstallationFieldConfig;
  installationFieldConfigRef: MutableRefObject<InstallationFieldConfig>;
  savedResidentConstellations: SavedResidentConstellation[];
  room3BodyEnabled: boolean;
  room3BodyEnabledRef: MutableRefObject<boolean>;
  room3BodyControls: Room3BodyControls;
  room3BodyControlsRef: MutableRefObject<Room3BodyControls>;
};

export const useRoom3InstallationAndBodyStateBridges = ({
  installationFieldConfig,
  installationFieldConfigRef,
  savedResidentConstellations,
  room3BodyEnabled,
  room3BodyEnabledRef,
  room3BodyControls,
  room3BodyControlsRef,
}: Room3InstallationAndBodyStateBridgeArgs) => {
  useEffect(() => {
    installationFieldConfigRef.current = installationFieldConfig;
  }, [installationFieldConfig, installationFieldConfigRef]);

  useEffect(() => {
    persistResidentConstellations(savedResidentConstellations);
  }, [savedResidentConstellations]);

  useEffect(() => {
    room3BodyEnabledRef.current = room3BodyEnabled;
  }, [room3BodyEnabled, room3BodyEnabledRef]);

  useEffect(() => {
    room3BodyControlsRef.current = room3BodyControls;
  }, [room3BodyControls, room3BodyControlsRef]);
};
