import { useEffect, type MutableRefObject } from "react";
import { getDroneRhythmGain } from "../../resonance/droneRhythmPatterns";
import { updateDroneDriveInsert } from "../../resonance/droneDrive";
import { getWeaveMatch } from "../../resonance/weaveMath";
import { getPartialGroupWeight, type Room3ModalBodyState } from "../../resonance/modalBody";
import type { DroneMyceliumMod, MyzelLayerMod } from "../../resonance/myceliumInterpreters";
import type { Room3BodyControls, Room3TimbreState } from "../../resonance/timbreModel";
import { DRONE_JI_OVERTONES } from "../domain/instrumentData";
import type { AppNexusParams } from "../rooms/nexusParamsInitialState";
import type { ResonanceNexusRuntimeRefObject } from "../rooms/resonanceNexusRuntimeRefs";
import { clamp } from "../rooms/resonanceRuntimeMath";

type DroneFrameMixParams = Pick<
  AppNexusParams,
  | "droneRhythm"
  | "quantizeBpm"
  | "droneRhythmCustomSteps"
  | "droneJIOvertonesByPreset"
  | "dronePreset"
  | "droneJIOvertones"
  | "droneTimbre"
  | "droneDriveOn"
  | "droneDriveAmount"
  | "droneDriveTone"
  | "droneDriveMix"
  | "droneDriveOutput"
  | "droneFlanger"
>;

type AppDroneFrameMixSyncBoundaryDeps = {
  readonly audioCtx: AudioContext | null;
  readonly nexusActive: boolean;
  readonly nexusRefs: ResonanceNexusRuntimeRefObject;
  readonly droneVolume: number;
  readonly nParamsUI: DroneFrameMixParams;
  readonly myzelEnabled: boolean;
  readonly myzelGateRef: MutableRefObject<number>;
  readonly myzelLayerModRef: MutableRefObject<MyzelLayerMod | null>;
  readonly myceliumDroneModRef: MutableRefObject<DroneMyceliumMod>;
  readonly room3BodyEnabled: boolean;
  readonly room3BodyControls: Room3BodyControls;
  readonly room3TimbreStateRef: MutableRefObject<Room3TimbreState>;
  readonly room3ModalStateRef: MutableRefObject<Room3ModalBodyState | null>;
  readonly noUiChangedByBoundary: true;
  readonly noGainNormalization: true;
  readonly noManualJiCollapse: true;
  readonly noJiOscRouteResolution: true;
  readonly noWaveStarterOrRootFollowPolicyOwnedHere: true;
};

export type AppDroneFrameMixSyncBoundary = {
  readonly droneFrameMixSyncBoundaryExtractedFromAppTsx: true;
  readonly ownsFrameMixRafOnly: true;
  readonly preservesMyzelRoom3PartialWeighting: true;
  readonly noUiChangedByBoundary: true;
  readonly noWaveStarterOrRootFollowPolicyOwnedHere: true;
};

export function useAppDroneFrameMixSyncBoundary(
  args: AppDroneFrameMixSyncBoundaryDeps,
): AppDroneFrameMixSyncBoundary {
  const {
    audioCtx,
    nexusActive,
    nexusRefs,
    droneVolume,
    nParamsUI,
    myzelEnabled,
    myzelGateRef,
    myzelLayerModRef,
    myceliumDroneModRef,
    room3BodyEnabled,
    room3BodyControls,
    room3TimbreStateRef,
    room3ModalStateRef,
  } = args;

  useEffect(() => {
    if (!audioCtx || !nexusActive) return;
    let raf = 0;

    const syncDroneMix = () => {
      const refs = nexusRefs.current;
      const now = audioCtx.currentTime;
      const droneHardMuted = droneVolume <= 0.0005;

      if (refs.droneVolumeBus) refs.droneVolumeBus.gain.setTargetAtTime(droneHardMuted ? 0 : clamp(droneVolume, 0, 1), now, droneHardMuted ? 0.02 : 0.03);

      let rGain = 1.0;
      if (refs.droneRhythmGain) {
        rGain = getDroneRhythmGain(nParamsUI.droneRhythm, nParamsUI.quantizeBpm || 120, now, nParamsUI.droneRhythmCustomSteps);
      }

      const presetMix = nParamsUI.droneJIOvertonesByPreset?.[nParamsUI.dronePreset];
      const mix = presetMix ?? nParamsUI.droneJIOvertones;
      const timbre = clamp(nParamsUI.droneTimbre, 0, 1);
      const myzelGate = myzelEnabled ? myzelGateRef.current : 0;
      const myzelLayer = myzelEnabled ? myzelLayerModRef.current : null;
      const room3Modal = room3BodyEnabled && myzelEnabled ? room3ModalStateRef.current : null;
      const weaveRatios = myzelLayer?.overtoneRatios ?? [];

      if (refs.droneRhythmGain) {
        const wovenRhythm = droneHardMuted ? 0 : clamp(rGain * (0.78 + myzelGate * 0.28) + myzelGate * 0.08, 0, 1.15);
        refs.droneRhythmGain.gain.setTargetAtTime(wovenRhythm, now, droneHardMuted ? 0.02 : 0.03);
      }

      if (refs.manualJiMaster) {
        refs.manualJiMaster.gain.setTargetAtTime(droneHardMuted ? 0.0001 : 1 + myzelGate * 0.12 + (myzelLayer?.shimmer ?? 0) * 1.5, now, droneHardMuted ? 0.02 : 0.05);
      }

      if (refs.droneDriveRefs) {
        updateDroneDriveInsert(refs.droneDriveRefs, now, {
          enabled: !droneHardMuted && !!nParamsUI.droneDriveOn,
          amount: droneHardMuted ? 0 : nParamsUI.droneDriveAmount ?? 0.36,
          tone: nParamsUI.droneDriveTone ?? 0.56,
          mix: droneHardMuted ? 0 : nParamsUI.droneDriveMix ?? 0.48,
          output: droneHardMuted ? 0 : nParamsUI.droneDriveOutput ?? 0.9,
          myzelGate,
          shimmer: myzelLayer?.shimmer ?? 0,
          bodyCoupling: room3BodyEnabled ? room3BodyControls.coupling : 0,
          bodyFlux: room3Modal?.exciterGain ?? 0,
          bodyTension: room3Modal?.preDriveAmount ?? 0,
          bodyRoughness: room3BodyEnabled ? room3BodyControls.roughness : 0,
          resonanceFocus: room3BodyEnabled ? room3TimbreStateRef.current.resonanceFocus : 0.5,
        });
      }

      if (refs.flangerWet && refs.flangerFeedback) {
        const myceliumFlanger = myceliumDroneModRef.current.flangerBias;
        const weaveFlanger = (myzelLayer?.shimmer ?? 0) * 1.8 + myzelGate * 0.12;
        const flangerAmt = clamp((nParamsUI.droneFlanger ?? 0) + myceliumFlanger + weaveFlanger, 0, 1);
        refs.flangerWet.gain.setTargetAtTime(droneHardMuted ? 0 : flangerAmt * 0.8, now, droneHardMuted ? 0.02 : 0.05);
        refs.flangerFeedback.gain.setTargetAtTime(droneHardMuted ? 0 : 0.4 + flangerAmt * 0.5, now, droneHardMuted ? 0.02 : 0.05);
      }

      for (const overtone of DRONE_JI_OVERTONES) {
        const gain = refs.manualJiGains[overtone.label];
        if (gain) {
          const amount = clamp(mix?.[overtone.label] ?? 0, 0, 1);
          const weaveMatch = myzelEnabled ? getWeaveMatch(overtone.label, weaveRatios) : 0;
          const weaveBoost = 1 + weaveMatch * (0.28 + myzelGate * 0.35);
          const shimmerLift = 1 + (myzelLayer?.shimmer ?? 0) * 2.2;
          const bodyWeight = room3Modal ? getPartialGroupWeight(overtone.label, room3Modal.partialGroups) : 1;
          const target = droneHardMuted ? 0 : clamp(amount * timbre * 0.22 * weaveBoost * shimmerLift * bodyWeight, 0, 0.42);
          gain.gain.setTargetAtTime(target, now, droneHardMuted ? 0.012 : 0.02);
        }
      }

      raf = requestAnimationFrame(syncDroneMix);
    };

    raf = requestAnimationFrame(syncDroneMix);
    return () => cancelAnimationFrame(raf);
  }, [
    audioCtx,
    nexusActive,
    myzelEnabled,
    droneVolume,
    nParamsUI.droneTimbre,
    nParamsUI.dronePreset,
    nParamsUI.droneJIOvertones,
    nParamsUI.droneJIOvertonesByPreset,
    nParamsUI.droneRhythm,
    nParamsUI.quantizeBpm,
    nParamsUI.droneFlanger,
    nParamsUI.droneDriveOn,
    nParamsUI.droneDriveAmount,
    nParamsUI.droneDriveTone,
    nParamsUI.droneDriveMix,
    nParamsUI.droneDriveOutput,
    room3BodyEnabled,
    room3BodyControls.coupling,
    room3BodyControls.roughness,
    room3BodyControls.resonance,
  ]);

  return {
    droneFrameMixSyncBoundaryExtractedFromAppTsx: true,
    ownsFrameMixRafOnly: true,
    preservesMyzelRoom3PartialWeighting: true,
    noUiChangedByBoundary: true,
    noWaveStarterOrRootFollowPolicyOwnedHere: true,
  };
}
