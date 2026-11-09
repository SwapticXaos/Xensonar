import type { MutableRefObject } from 'react';
import { clamp } from '../rooms/resonanceRuntimeMath';
import type { MyceliumSnapshot } from '../../topology/myceliumSnapshot';
import {
  deriveMyzelLayerMod,
  type MyzelBallMode,
  type MyzelLayerMod,
  type MyzelNodeMode,
} from '../../resonance/myceliumInterpreters';
import { getDominantDroneRatios } from '../../resonance/weaveMath';
import { getMyzelPatternLevel, type MyzelPattern } from '../domain/instrumentData';
import type { ResonanceNexusRuntimeRefObject } from '../rooms/resonanceNexusRuntimeRefs';

export type AppStableRhythmLaneMyzelLayerStepActionProbeArgs = {
  readonly audioCtx: AudioContext;
  readonly nexusRefs: ResonanceNexusRuntimeRefObject;
  readonly myzelEnabled: boolean;
  readonly myzelTopologyModeRef: MutableRefObject<string>;
  readonly resolveBaseHz: () => number;
  readonly ensureMyzelSynth: (ctx: AudioContext) => unknown;
  readonly myceliumSnapshotRef: MutableRefObject<MyceliumSnapshot>;
  readonly myzelStep16ths: number;
  readonly myzelLayerModRef: MutableRefObject<MyzelLayerMod>;
  readonly myzelGateRef: MutableRefObject<number>;
  readonly intensityGlobal: number;
  readonly myzelBallMode: MyzelBallMode;
  readonly myzelNodeMode: MyzelNodeMode;
  readonly myzelPattern: MyzelPattern;
  readonly myzelInterpreterMix: {
    readonly weaveBlend: number;
    readonly constellationBlend: number;
  };
  readonly readActiveDroneOvertoneMix: () => Record<string, number>;
  readonly stableRhythmLaneMyzelLayerStepActionExtractedFromAppTsx: true;
  readonly audioBodyNowActionProbeOwned: true;
  readonly myzelSynthStillAppSupplied: true;
  readonly hotPathAddsNoPerStepBuilder: true;
};

export type AppStableRhythmLaneMyzelLayerStepActionProbeResult = {
  readonly applyMyzelLayerStep: (timeSec: number, step16: number) => void;
  readonly stableRhythmLaneMyzelLayerStepActionExtractedFromAppTsx: true;
  readonly audioBodyNowActionProbeOwned: true;
  readonly myzelSynthStillAppSupplied: true;
  readonly schedulerStillLoopProbeOwned: true;
  readonly transportStillAppNexusRefOwned: true;
  readonly hotPathAddsNoPerStepBuilder: true;
};

export const buildAppStableRhythmLaneMyzelLayerStepActionProbe = (
  args: AppStableRhythmLaneMyzelLayerStepActionProbeArgs,
): AppStableRhythmLaneMyzelLayerStepActionProbeResult => {
  const applyMyzelLayerStep = (time: number, step: number) => {
    const refs = args.nexusRefs.current;
    if (!args.myzelEnabled || args.myzelTopologyModeRef.current === 'installation') {
      if (refs.myzelMasterGain) refs.myzelMasterGain.gain.setTargetAtTime(0.0001, time, 0.05);
      return;
    }

    const baseHz = args.resolveBaseHz();
    args.ensureMyzelSynth(args.audioCtx);

    const snapshot = args.myceliumSnapshotRef.current;
    const constellationFlux = clamp(snapshot.constellationFlux ?? 0, 0, 1);
    const shouldRefreshLayer = step % Math.max(1, args.myzelStep16ths) === 0 || constellationFlux > 0.04;
    if (shouldRefreshLayer) {
      args.myzelLayerModRef.current = deriveMyzelLayerMod(
        snapshot,
        args.intensityGlobal,
        baseHz,
        args.myzelBallMode,
        args.myzelNodeMode,
      );
    }

    const mod = args.myzelLayerModRef.current;
    const gate = getMyzelPatternLevel(args.myzelPattern, step);
    const weaveBlend = clamp(args.myzelInterpreterMix.weaveBlend, 0, 1);
    const constellationBlend = clamp(args.myzelInterpreterMix.constellationBlend, 0, 1);
    const liveSnapshot = args.myceliumSnapshotRef.current;
    const gateFloor = clamp(((liveSnapshot.constellationFlux ?? 0) * 0.55 + (liveSnapshot.constellationTension ?? 0) * 0.2) * (0.25 + constellationBlend * 0.95), 0, 0.78);
    const effectiveGate = Math.max(gate, gateFloor);
    args.myzelGateRef.current = effectiveGate;

    const droneOvertones = getDominantDroneRatios(args.readActiveDroneOvertoneMix());
    const wovenRatios = mod.overtoneRatios.map((ratio, idx) => {
      const droneRatio = droneOvertones[idx]?.ratio;
      const blend = droneRatio ? (0.22 + effectiveGate * 0.34) * weaveBlend : 0;
      return droneRatio ? ratio + (droneRatio - ratio) * blend : ratio;
    });
    const wovenLowpass = clamp(
      mod.lowpassHz * (0.94 + ((droneOvertones[0]?.amount ?? 0) * 0.22 + mod.shimmer * 0.8) * weaveBlend + (liveSnapshot.constellationBrightness ?? 0.5) * 0.12 * constellationBlend),
      220,
      3400,
    );

    refs.myzelCarrierOsc?.frequency.setTargetAtTime(mod.baseHz, time, 0.08);
    refs.myzelSubOsc?.frequency.setTargetAtTime(mod.baseHz / 2, time, 0.08);
    refs.myzelCarrierGain?.gain.setTargetAtTime(mod.carrierGain * (0.55 + effectiveGate * 0.45 + weaveBlend * 0.08), time, 0.07);
    refs.myzelSubGain?.gain.setTargetAtTime(mod.subGain * (0.45 + effectiveGate * 0.55), time, 0.07);
    refs.myzelBodyGain?.gain.setTargetAtTime(mod.bodyGain * (0.68 + effectiveGate * 0.28 + weaveBlend * 0.12), time, 0.08);
    refs.myzelLowpass?.frequency.setTargetAtTime(wovenLowpass, time, 0.12);
    refs.myzelPan?.pan.setTargetAtTime(mod.pan, time, 0.1);
    refs.myzelMasterGain?.gain.setTargetAtTime(Math.max(0.0001, mod.masterGain * effectiveGate * (0.94 + weaveBlend * 0.12 + constellationBlend * 0.16)), time, 0.09);
    refs.myzelFormantFilters.forEach((filter, idx) => {
      const formantScale = 0.94 + (droneOvertones[idx]?.amount ?? 0) * 0.18 * weaveBlend;
      filter.frequency.setTargetAtTime((mod.formantCenters[idx] ?? mod.formantCenters[0]) * formantScale, time, 0.11);
      filter.Q.setTargetAtTime(mod.formantQ, time, 0.12);
    });
    refs.myzelFormantGains.forEach((gain, idx) => {
      const droneLift = 0.88 + (droneOvertones[idx]?.amount ?? 0) * 0.45 * weaveBlend;
      gain.gain.setTargetAtTime(Math.max(0.0001, (mod.formantGains[idx] ?? 0.0001) * droneLift), time, 0.09);
    });
    refs.myzelOvertoneOscs.forEach((osc, idx) => {
      osc.frequency.setTargetAtTime(mod.baseHz * (wovenRatios[idx] ?? mod.overtoneRatios[idx] ?? 1.5), time, 0.1);
    });
    refs.myzelOvertoneGains.forEach((gain, idx) => {
      const droneLift = 0.78 + (droneOvertones[idx]?.amount ?? 0) * 0.65 * weaveBlend + effectiveGate * 0.18;
      gain.gain.setTargetAtTime(Math.max(0.0001, (mod.overtoneGains[idx] ?? 0.0001) * droneLift * (0.6 + effectiveGate * 0.4)), time, 0.09);
    });
  };

  return {
    applyMyzelLayerStep,
    stableRhythmLaneMyzelLayerStepActionExtractedFromAppTsx: true,
    audioBodyNowActionProbeOwned: true,
    myzelSynthStillAppSupplied: true,
    schedulerStillLoopProbeOwned: true,
    transportStillAppNexusRefOwned: true,
    hotPathAddsNoPerStepBuilder: true,
  };
};
