import { useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { createEmptyMyceliumSnapshot, type MyceliumSnapshot } from "../../topology/myceliumSnapshot";
import { deriveMyzelLayerMod, type DroneMyceliumMod, type MyzelBallMode, type MyzelLayerMod, type MyzelNodeMode } from "../../resonance/myceliumInterpreters";
import { createMyzelDriveCurve } from "./resonanceRuntimeMath";
import type { AppNexusParams } from "./nexusParamsInitialState";
import type { ResonanceNexusRuntimeRefObject } from "./resonanceNexusRuntimeRefs";
import { useAppResonanceMyceliumDroneModFrameRuntime } from "./useAppResonanceMyceliumDroneModFrameRuntime";
import { useAppResonanceWaveImpactDecayFrameRuntime } from "./useAppResonanceWaveImpactDecayFrameRuntime";

type HousekeepingNParams = Pick<
  AppNexusParams,
  | "particleVolume"
  | "bassRootHz"
  | "lockCursorToGrid"
  | "gridBase"
  | "gridTuning"
  | "manualGridMutedSteps"
  | "manualGridStepOffsets"
>;

type MyzelDriveMix = {
  driveAmount: number;
};

export type AppResonanceHousekeepingBoundaryArgs = {
  audioCtx: AudioContext | null;
  nexusActive: boolean;
  resonanceInputActive: boolean;
  myzelEnabled: boolean;
  tParams: { intensityGlobal: number };
  nParamsUI: HousekeepingNParams;
  myzelBallMode: MyzelBallMode;
  myzelNodeMode: MyzelNodeMode;
  myzelDriveEnabled: boolean;
  myzelInterpreterMix: MyzelDriveMix;
  installationSharedFieldActive: boolean;
  myceliumSnapshotRef: MutableRefObject<MyceliumSnapshot>;
  myceliumDroneAmountRef: MutableRefObject<number>;
  myceliumDroneModRef: MutableRefObject<DroneMyceliumMod>;
  myzelGateRef: MutableRefObject<number>;
  myzelLayerModRef: MutableRefObject<MyzelLayerMod>;
  installationSharedFieldActiveRef: MutableRefObject<boolean>;
  keyboardWindowOffsetRef: MutableRefObject<number>;
  setKeyboardWindowStamp: Dispatch<SetStateAction<number>>;
  commitResonanceCursorY: (rawY: number, options?: { syncHud?: boolean }) => number;
  nexusRefs: ResonanceNexusRuntimeRefObject;
  nexusParamsRef: MutableRefObject<AppNexusParams>;
  impactDecayOn: boolean;
  waveLaunchAtRef: MutableRefObject<number>;
  waveImpactDecayRef: MutableRefObject<number>;
  resetResonanceActionHolds: () => void;
  releaseHeldScheduledTones: () => void;
};

const clampValue = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function useAppResonanceHousekeepingBoundary(args: AppResonanceHousekeepingBoundaryArgs) {
  const {
    audioCtx,
    nexusActive,
    resonanceInputActive,
    myzelEnabled,
    tParams,
    nParamsUI,
    myzelBallMode,
    myzelNodeMode,
    myzelDriveEnabled,
    myzelInterpreterMix,
    installationSharedFieldActive,
    myceliumSnapshotRef,
    myceliumDroneAmountRef,
    myceliumDroneModRef,
    myzelGateRef,
    myzelLayerModRef,
    installationSharedFieldActiveRef,
    keyboardWindowOffsetRef,
    setKeyboardWindowStamp,
    commitResonanceCursorY,
    nexusRefs,
    nexusParamsRef,
    impactDecayOn,
    waveLaunchAtRef,
    waveImpactDecayRef,
    resetResonanceActionHolds,
    releaseHeldScheduledTones,
  } = args;

  const commitResonanceCursorYRef = useRef(commitResonanceCursorY);
  const releaseHeldScheduledTonesRef = useRef(releaseHeldScheduledTones);

  useEffect(() => {
    commitResonanceCursorYRef.current = commitResonanceCursorY;
  }, [commitResonanceCursorY]);

  useEffect(() => {
    releaseHeldScheduledTonesRef.current = releaseHeldScheduledTones;
  }, [releaseHeldScheduledTones]);

  useEffect(() => {
    myceliumDroneAmountRef.current = clampValue(0.12 + tParams.intensityGlobal * 0.68, 0, 1);
  }, [tParams.intensityGlobal]);

  useAppResonanceMyceliumDroneModFrameRuntime({
    myceliumSnapshotRef,
    myceliumDroneAmountRef,
    myceliumDroneModRef,
  });

  useEffect(() => {
    if (myzelEnabled) return;
    myzelGateRef.current = 0;
    myzelLayerModRef.current = deriveMyzelLayerMod(
      createEmptyMyceliumSnapshot(),
      tParams.intensityGlobal,
      nParamsUI.bassRootHz,
      myzelBallMode,
      myzelNodeMode,
    );
    const refs = nexusRefs.current;
    const now = audioCtx?.currentTime ?? 0;
    refs.myzelMasterGain?.gain.setTargetAtTime(0.0001, now, 0.05);
  }, [myzelEnabled, audioCtx, tParams.intensityGlobal, nParamsUI.bassRootHz, myzelBallMode, myzelNodeMode]);

  useEffect(() => {
    installationSharedFieldActiveRef.current = installationSharedFieldActive;
  }, [installationSharedFieldActive]);

  useEffect(() => {
    keyboardWindowOffsetRef.current = 0;
    setKeyboardWindowStamp((prev) => prev + 1);
    if (!nParamsUI.lockCursorToGrid) return;
    commitResonanceCursorYRef.current(nexusRefs.current.cursorY, { syncHud: false });
  }, [
    nParamsUI.lockCursorToGrid,
    nParamsUI.gridBase,
    nParamsUI.gridTuning,
    nParamsUI.manualGridMutedSteps,
    nParamsUI.manualGridStepOffsets,
  ]);

  useAppResonanceWaveImpactDecayFrameRuntime({
    audioCtx,
    impactDecayOn,
    particleVolume: nParamsUI.particleVolume,
    nexusParamsRef,
    waveLaunchAtRef,
    waveImpactDecayRef,
  });

  useEffect(() => {
    if (!resonanceInputActive) {
      resetResonanceActionHolds();
      releaseHeldScheduledTonesRef.current();
    }
  }, [resonanceInputActive, resetResonanceActionHolds]);

  useEffect(() => {
    const shaper = nexusRefs.current.myzelDriveShaper;
    const gain = nexusRefs.current.myzelDriveGain;
    if (!shaper || !gain) return;
    shaper.curve = myzelDriveEnabled ? createMyzelDriveCurve(myzelInterpreterMix.driveAmount) : null;
    shaper.oversample = myzelDriveEnabled ? "4x" : "none";
    gain.gain.setTargetAtTime(myzelDriveEnabled ? Math.max(1, 1 + myzelInterpreterMix.driveAmount * 2.5) : 1, audioCtx?.currentTime ?? 0, 0.04);
  }, [audioCtx, myzelDriveEnabled, myzelInterpreterMix.driveAmount, nexusActive]);
}
