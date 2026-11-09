import { useEffect } from "react";
import { recordResonanceJiOwnershipProbe } from "../audio/resonanceJiOwnershipProbe";
import { createResonanceNexusCoreAudioSession } from "../audio/resonanceNexusCoreAudioSession";
import { startResonanceNexusFrameRuntime } from "./resonanceNexusFrameRuntime";
import type { AppResonanceNexusMainLoopBoundaryArgs } from "./resonanceNexusRuntimeBoundaryTypes";
export type { AppResonanceNexusMainLoopBoundaryArgs } from "./resonanceNexusRuntimeBoundaryTypes";

export const APP_RESONANCE_NEXUS_MAIN_LOOP_BOUNDARY_CONTRACT = {
  postGreenInternalRefactor: true,
  mainBoundaryCallOrderPreserved: true,
  effectDependenciesPreserved: true,
  loopStartsSynchronously: true,
  creationAndCleanupMoveTogether: true,
  coreAudioSessionSeparatedFromFrameRuntime: true,
  singleReactLifecyclePreserved: true,
  jiOscillatorOwnershipCanonicalFilterLayer: true,
  noUiChangedByBoundary: true,
  noFrameOrderMoved: true,
  liveGreenFilterRoutePreserved: true,
  competingOvertoneMasterJiRouteRetired: true,
  noGainNormalization: true,
  noLiveReaderConversion: true,
  noWellenstarterOrRootFollowPolicyOwnedHere: true,
  noStableLanePolicyOwnedHere: true,
} as const;

export function useAppResonanceNexusMainLoopBoundary(args: AppResonanceNexusMainLoopBoundaryArgs): void {
  const {
    room,
    nexusActive,
    audioCtx,
    getLiveMasterBus,
    nexusRefs,
  } = args;

  useEffect(() => {
    if (room !== "RESONANCE" || !nexusActive || !audioCtx) return;

    recordResonanceJiOwnershipProbe("mainloop-enter", nexusRefs);
    const coreAudio = createResonanceNexusCoreAudioSession({
      ctx: audioCtx,
      getLiveMasterBus,
      nexusRefs,
    });
    recordResonanceJiOwnershipProbe("mainloop-primary-ready", nexusRefs);

    if (Object.keys(nexusRefs.current.jiOscs).length === 0) {
      recordResonanceJiOwnershipProbe("mainloop-canonical-ji-filter-layer", nexusRefs);
    }
    coreAudio.ensureJiLayer();
    recordResonanceJiOwnershipProbe("mainloop-ready", nexusRefs);

    const frameRuntime = startResonanceNexusFrameRuntime({
      ...args,
      audioCtx,
      osc: coreAudio.osc,
      filter: coreAudio.filter,
      gain: coreAudio.gain,
    });

    return () => {
      recordResonanceJiOwnershipProbe("mainloop-cleanup", nexusRefs);
      frameRuntime.stop();
      coreAudio.dispose();
    };
  }, [room, nexusActive, audioCtx]);
}
