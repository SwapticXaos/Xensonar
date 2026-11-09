import { useEffect, type MutableRefObject } from "react";
import {
  DRONE_JI_OVERTONES,
  DRONE_MAX_FREQ,
  DRONE_MIN_FREQ,
} from "../domain/instrumentData";
import type { ResonanceNexusRuntimeRefObject } from "../rooms/resonanceNexusRuntimeRefs";
import { clamp, freqFromY } from "../rooms/resonanceRuntimeMath";
import { recordResonanceJiOwnershipProbe } from "./resonanceJiOwnershipProbe";

type JiOvertoneMasterParams = {
  readonly droneTimbre: number;
  readonly droneJIOvertones: Record<string, number>;
};

type AppJiOvertoneMasterLifecycleBoundaryDeps = {
  readonly audioCtx: AudioContext | null;
  readonly nexusActive: boolean;
  readonly nexusRefs: ResonanceNexusRuntimeRefObject;
  readonly nexusParamsRef: MutableRefObject<JiOvertoneMasterParams>;
  readonly getLiveMasterBus: (ctx: AudioContext, role?: "main" | "drone" | "rhythm" | "space") => GainNode;
  readonly noManualJiCollapse: true;
  readonly noRouteRewrite: true;
  readonly mainLoopFallbackStillRecorded: true;
  readonly noFrameMixSyncMoved: true;
  readonly noWaveStarterOrRootFollowPolicyOwnedHere: true;
};

export type AppJiOvertoneMasterLifecycleBoundary = {
  readonly jiOvertoneMasterLifecycleBoundaryExtractedFromAppTsx: true;
  readonly ownsJiOscillatorLayerLifecycleOnly: true;
  readonly preservesManualJiLayerSeparation: true;
  readonly doesNotResolveMainLoopFallbackYet: true;
  readonly noWaveStarterOrRootFollowPolicyOwnedHere: true;
};

export function useAppJiOvertoneMasterLifecycleBoundary(
  args: AppJiOvertoneMasterLifecycleBoundaryDeps,
): AppJiOvertoneMasterLifecycleBoundary {
  const { audioCtx, nexusActive, nexusRefs, nexusParamsRef, getLiveMasterBus } = args;

  useEffect(() => {
    if (!audioCtx || !nexusActive) return;
    const refs = nexusRefs.current;
    recordResonanceJiOwnershipProbe("overtone-effect-enter", nexusRefs);
    if (!refs.filter || !refs.gain) {
      recordResonanceJiOwnershipProbe("overtone-effect-skip-no-primary", nexusRefs);
      return;
    }

    if (!refs.overtoneMaster) {
      const overtoneMaster = audioCtx.createGain();
      overtoneMaster.gain.value = 0.72;
      if (refs.droneGroupBus) overtoneMaster.connect(refs.droneGroupBus);
      else overtoneMaster.connect(getLiveMasterBus(audioCtx, "drone"));
      refs.overtoneMaster = overtoneMaster;
    }

    for (const node of DRONE_JI_OVERTONES) {
      if (!refs.jiOscs[node.label]) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        gain.gain.value = 0;
        osc.connect(gain);
        gain.connect(refs.overtoneMaster);
        osc.start();
        refs.jiOscs[node.label] = osc;
        refs.jiGains[node.label] = gain;
      }
    }

    recordResonanceJiOwnershipProbe("overtone-effect-ready", nexusRefs);

    let raf = 0;
    const tick = () => {
      const now = audioCtx.currentTime;
      const baseHz = freqFromY(refs.cursorY);
      const timbreMix = clamp(nexusParamsRef.current.droneTimbre, 0, 1);
      for (const node of DRONE_JI_OVERTONES) {
        const osc = refs.jiOscs[node.label];
        const gain = refs.jiGains[node.label];
        if (!osc || !gain) continue;
        const slider = clamp(nexusParamsRef.current.droneJIOvertones[node.label] ?? 0, 0, 1);
        const targetFreq = clamp(baseHz * node.ratio, DRONE_MIN_FREQ * 0.5, DRONE_MAX_FREQ * 6);
        const targetGain = slider * (0.006 + timbreMix * 0.022);
        osc.frequency.setTargetAtTime(targetFreq, now, 0.04);
        gain.gain.setTargetAtTime(targetGain, now, 0.05);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      recordResonanceJiOwnershipProbe("overtone-effect-cleanup", nexusRefs);
      cancelAnimationFrame(raf);
      const refsNow = nexusRefs.current;
      Object.values(refsNow.jiOscs).forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch {}
      });
      Object.values(refsNow.jiGains).forEach((gain) => {
        try {
          gain.disconnect();
        } catch {}
      });
      refsNow.jiOscs = {};
      refsNow.jiGains = {};
      if (refsNow.overtoneMaster) {
        try {
          refsNow.overtoneMaster.disconnect();
        } catch {}
        refsNow.overtoneMaster = null;
      }
    };
  }, [audioCtx, nexusActive]);

  return {
    jiOvertoneMasterLifecycleBoundaryExtractedFromAppTsx: true,
    ownsJiOscillatorLayerLifecycleOnly: true,
    preservesManualJiLayerSeparation: true,
    doesNotResolveMainLoopFallbackYet: true,
    noWaveStarterOrRootFollowPolicyOwnedHere: true,
  };
}
