import type { MutableRefObject } from "react";
import { createDroneDriveInsert } from "../../resonance/droneDrive";
import type { ResonanceNexusRuntimeRefObject } from "../rooms/resonanceNexusRuntimeRefs";
import { clamp } from "../rooms/resonanceRuntimeMath";

type AnyAudioDevice = Record<string, any> | null | undefined;

export type AppDroneGraphRoutingBoundaryDeps = {
  readonly nexusRefs: ResonanceNexusRuntimeRefObject;
  readonly getDroneVolume: () => number;
  readonly getLiveMasterBus: (ctx: AudioContext, role?: "main" | "drone" | "rhythm" | "space") => GainNode;
  readonly ensureCollectiveMemoryFx: (ctx: AudioContext) => AnyAudioDevice;
  readonly ensurePsychedelicSpiralDevice: (ctx: AudioContext) => AnyAudioDevice;
  readonly myzelPostFxSendsRef: MutableRefObject<any>;
  readonly myzelPostFxConnectionsRef: MutableRefObject<any>;
  readonly psychedelicSpiralSendsRef: MutableRefObject<any>;
  readonly transientDriveSendsRef: MutableRefObject<any>;
  readonly schwarmdeuterSendsRef: MutableRefObject<any>;
  readonly noWaveStarterPolicyOwnedHere: true;
  readonly noRootFollowPolicyOwnedHere: true;
};

export type AppDroneGraphRoutingBoundary = {
  readonly ensureDroneGraphRouting: (ctx: AudioContext) => void;
  readonly droneGraphRoutingBoundaryExtractedFromAppTsx: true;
  readonly routesExistingDroneVoicesOnly: true;
  readonly noJiOscillatorOwnershipResolvedHere: true;
  readonly noWaveStarterOrRootFollowPolicyOwnedHere: true;
};

const routeToDroneGroupBus = (node: AudioNode | null | undefined, groupBus: GainNode | null | undefined) => {
  if (!node || !groupBus) return;
  try {
    node.disconnect();
  } catch {}
  node.connect(groupBus);
};

export function useAppDroneGraphRoutingBoundary(args: AppDroneGraphRoutingBoundaryDeps): AppDroneGraphRoutingBoundary {
  const ensureDroneGraphRouting = (ctx: AudioContext) => {
    const refs = args.nexusRefs.current;
    if (!refs.droneVolumeBus) {
      const volBus = ctx.createGain();
      volBus.gain.value = clamp(args.getDroneVolume(), 0, 1);
      refs.droneVolumeBus = volBus;
      if (args.myzelPostFxSendsRef.current.drone && !args.myzelPostFxConnectionsRef.current.drone) {
        volBus.connect(args.myzelPostFxSendsRef.current.drone);
        args.myzelPostFxConnectionsRef.current.drone = true;
      }

      const groupBus = ctx.createGain();
      refs.droneGroupBus = groupBus;

      const rhythmBus = ctx.createGain();
      rhythmBus.gain.value = 1.0;
      refs.droneRhythmGain = rhythmBus;

      const flangerDelay = ctx.createDelay(1.0);
      const flangerFeedback = ctx.createGain();
      const flangerLfo = ctx.createOscillator();
      const flangerLfoGain = ctx.createGain();
      const flangerWet = ctx.createGain();
      const myceliumFormantFilter = ctx.createBiquadFilter();
      const myceliumFormantGain = ctx.createGain();

      flangerDelay.delayTime.value = 0.005;
      flangerFeedback.gain.value = 0;
      flangerLfo.type = "sine";
      flangerLfo.frequency.value = 0.25;
      flangerLfoGain.gain.value = 0.003;

      flangerLfo.connect(flangerLfoGain);
      flangerLfoGain.connect(flangerDelay.delayTime);
      flangerDelay.connect(flangerFeedback);
      flangerFeedback.connect(flangerDelay);
      groupBus.connect(rhythmBus);
      const droneDriveRefs = createDroneDriveInsert(ctx, rhythmBus, volBus, flangerDelay);
      refs.droneDriveRefs = droneDriveRefs;
      myceliumFormantFilter.type = "bandpass";
      myceliumFormantFilter.frequency.value = 800;
      myceliumFormantFilter.Q.value = 3.5;
      myceliumFormantGain.gain.value = 0.0001;

      flangerDelay.connect(flangerWet);
      flangerWet.connect(volBus);
      groupBus.connect(myceliumFormantFilter);
      myceliumFormantFilter.connect(myceliumFormantGain);
      myceliumFormantGain.connect(volBus);
      volBus.connect(args.getLiveMasterBus(ctx, "drone"));
      const collectiveFx = args.ensureCollectiveMemoryFx(ctx);
      const spiralDevice = args.ensurePsychedelicSpiralDevice(ctx);
      if (collectiveFx?.drone) {
        rhythmBus.connect(collectiveFx.drone.input);
      }
      if (spiralDevice && args.psychedelicSpiralSendsRef.current.drone) {
        volBus.connect(args.psychedelicSpiralSendsRef.current.drone);
      }
      if (args.transientDriveSendsRef.current.drone) {
        volBus.connect(args.transientDriveSendsRef.current.drone);
      }
      if (args.schwarmdeuterSendsRef.current.drone) {
        volBus.connect(args.schwarmdeuterSendsRef.current.drone);
      }
      flangerLfo.start();

      refs.flangerDelay = flangerDelay;
      refs.flangerFeedback = flangerFeedback;
      refs.flangerLfo = flangerLfo;
      refs.flangerLfoGain = flangerLfoGain;
      refs.flangerWet = flangerWet;
      refs.myceliumFormantFilter = myceliumFormantFilter;
      refs.myceliumFormantGain = myceliumFormantGain;
    }

    routeToDroneGroupBus(refs.gain, refs.droneGroupBus);
    routeToDroneGroupBus(refs.gainB, refs.droneGroupBus);
    routeToDroneGroupBus(refs.overtoneMaster, refs.droneGroupBus);
    routeToDroneGroupBus(refs.manualJiMaster, refs.droneGroupBus);
    routeToDroneGroupBus(refs.myzelMasterGain, refs.droneGroupBus);

    refs.droneVolumeBus?.gain.setTargetAtTime(clamp(args.getDroneVolume(), 0, 1), ctx.currentTime, 0.04);
  };

  return {
    ensureDroneGraphRouting,
    droneGraphRoutingBoundaryExtractedFromAppTsx: true,
    routesExistingDroneVoicesOnly: true,
    noJiOscillatorOwnershipResolvedHere: true,
    noWaveStarterOrRootFollowPolicyOwnedHere: true,
  };
}
