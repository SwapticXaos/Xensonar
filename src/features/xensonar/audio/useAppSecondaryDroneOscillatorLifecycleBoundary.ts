import { useEffect } from "react";
import type { ResonanceNexusRuntimeRefObject } from "../rooms/resonanceNexusRuntimeRefs";

type AppSecondaryDroneOscillatorLifecycleBoundaryDeps = {
  readonly room: string;
  readonly nexusActive: boolean;
  readonly audioCtx: AudioContext | null;
  readonly nexusRefs: ResonanceNexusRuntimeRefObject;
};

export type AppSecondaryDroneOscillatorLifecycleBoundary = {
  readonly secondaryDroneOscillatorLifecycleExtractedFromAppTsx: true;
  readonly ownsOscBAndFilterLfoLifecycleOnly: true;
  readonly irrelevantInstallationRestartDependenciesRemoved: true;
  readonly noWaveStarterOrRootFollowPolicyOwnedHere: true;
};

export function useAppSecondaryDroneOscillatorLifecycleBoundary(
  args: AppSecondaryDroneOscillatorLifecycleBoundaryDeps,
): AppSecondaryDroneOscillatorLifecycleBoundary {
  const {
    room,
    nexusActive,
    audioCtx,
    nexusRefs,
  } = args;

  useEffect(() => {
    if (room !== "RESONANCE" || !nexusActive || !audioCtx) return;
    const refs = nexusRefs.current;
    if (!refs.osc || !refs.filter || !refs.gain) return;

    if (!refs.oscB || !refs.gainB) {
      const oscB = audioCtx.createOscillator();
      const gainB = audioCtx.createGain();
      oscB.type = "triangle";
      oscB.detune.value = 6;
      gainB.gain.value = 0.0001;
      oscB.connect(gainB);
      gainB.connect(refs.filter);
      oscB.start();
      refs.oscB = oscB;
      refs.gainB = gainB;
    }

    if (!refs.lfo || !refs.lfoGain) {
      const lfo = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      lfo.type = "sine";
      lfo.frequency.value = 0.13;
      lfoGain.gain.value = 0;
      lfo.connect(lfoGain);
      lfoGain.connect(refs.filter.detune);
      lfo.start();
      refs.lfo = lfo;
      refs.lfoGain = lfoGain;
    }

    return () => {
      refs.oscB?.stop();
      refs.oscB?.disconnect();
      refs.gainB?.disconnect();
      refs.lfo?.stop();
      refs.lfo?.disconnect();
      refs.lfoGain?.disconnect();
      refs.oscB = null;
      refs.gainB = null;
      refs.lfo = null;
      refs.lfoGain = null;
    };
  }, [room, nexusActive, audioCtx]);

  return {
    secondaryDroneOscillatorLifecycleExtractedFromAppTsx: true,
    ownsOscBAndFilterLfoLifecycleOnly: true,
    irrelevantInstallationRestartDependenciesRemoved: true,
    noWaveStarterOrRootFollowPolicyOwnedHere: true,
  };
}
