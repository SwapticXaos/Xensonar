import { useEffect, type MutableRefObject } from "react";
import { DRONE_JI_OVERTONES } from "../domain/instrumentData";
import type { ResonanceNexusRuntimeRefObject } from "../rooms/resonanceNexusRuntimeRefs";
import { clamp, freqFromY } from "../rooms/resonanceRuntimeMath";

type ManualJiOvertoneParams = {
  readonly droneTimbre: number;
  readonly droneOvertoneWaveform: OscillatorType;
  readonly droneJIOvertones: Record<string, number>;
};

type AppManualJiOvertoneLifecycleBoundaryDeps = {
  readonly audioCtx: AudioContext | null;
  readonly nexusActive: boolean;
  readonly nexusRefs: ResonanceNexusRuntimeRefObject;
  readonly nexusParamsRef: MutableRefObject<ManualJiOvertoneParams>;
  readonly getLiveMasterBus: (ctx: AudioContext, role?: "main" | "drone" | "rhythm" | "space") => GainNode;
  readonly noJiOscillatorOwnershipResolvedHere: true;
  readonly noWaveStarterOrRootFollowPolicyOwnedHere: true;
};

export type AppManualJiOvertoneLifecycleBoundary = {
  readonly manualJiOvertoneLifecycleBoundaryExtractedFromAppTsx: true;
  readonly ownsManualJiOscillatorLifecycleOnly: true;
  readonly doesNotOwnJiOscillatorLayer: true;
  readonly noWaveStarterOrRootFollowPolicyOwnedHere: true;
};

export function useAppManualJiOvertoneLifecycleBoundary(
  args: AppManualJiOvertoneLifecycleBoundaryDeps,
): AppManualJiOvertoneLifecycleBoundary {
  const { audioCtx, nexusActive, nexusRefs, nexusParamsRef, getLiveMasterBus } = args;

  useEffect(() => {
    if (!audioCtx || !nexusActive) return;

    const refs = nexusRefs.current;
    if (!refs.manualJiMaster) {
      const master = audioCtx.createGain();
      master.gain.value = 0.85;
      if (refs.droneGroupBus) master.connect(refs.droneGroupBus);
      else master.connect(getLiveMasterBus(audioCtx, "drone"));
      refs.manualJiMaster = master;
    }

    const manualJiMaster = refs.manualJiMaster;
    if (!manualJiMaster) return;

    DRONE_JI_OVERTONES.forEach((node) => {
      if (refs.manualJiOscs[node.label]) return;
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = "sine";
      g.gain.value = 0;
      osc.connect(g);
      g.connect(manualJiMaster);
      osc.start();
      refs.manualJiOscs[node.label] = osc;
      refs.manualJiGains[node.label] = g;
    });

    let raf = 0;
    const tick = () => {
      const p = nexusParamsRef.current;
      const baseFreq = freqFromY(refs.cursorY);
      const timbreMix = clamp(p.droneTimbre, 0, 1);
      const floor = 0.004;
      const depth = 0.1;

      DRONE_JI_OVERTONES.forEach((node) => {
        const osc = refs.manualJiOscs[node.label];
        const g = refs.manualJiGains[node.label];
        if (!osc || !g) return;

        if (osc.type !== p.droneOvertoneWaveform) osc.type = p.droneOvertoneWaveform;
        const level = p.droneJIOvertones[node.label] ?? 0;
        osc.frequency.setTargetAtTime(baseFreq * node.ratio, audioCtx.currentTime, 0.03);
        const targetGain = level * (floor + depth * timbreMix);
        g.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.05);
      });

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      Object.values(refs.manualJiOscs).forEach((osc) => {
        try {
          osc.stop();
        } catch {}
      });
      Object.values(refs.manualJiGains).forEach((g) => g.disconnect());
      refs.manualJiOscs = {};
      refs.manualJiGains = {};
      if (refs.manualJiMaster) {
        refs.manualJiMaster.disconnect();
        refs.manualJiMaster = null;
      }
    };
  }, [audioCtx, nexusActive]);

  return {
    manualJiOvertoneLifecycleBoundaryExtractedFromAppTsx: true,
    ownsManualJiOscillatorLifecycleOnly: true,
    doesNotOwnJiOscillatorLayer: true,
    noWaveStarterOrRootFollowPolicyOwnedHere: true,
  };
}
