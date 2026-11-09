import { useEffect } from "react";
import { ensureRefactorTopologyLegacyAudio, updateRefactorTopologyLegacyAudio } from "../../resonance/refactorTopologyLegacyAudio";
import type { Room3NodeDeviceAndLegacyAudioRuntimeBoundaryArgs } from "./room3NodeDeviceLegacyAudioRuntimeTypes";

export function useRoom3LegacyTopologyAudioFrameRuntime(args: Room3NodeDeviceAndLegacyAudioRuntimeBoundaryArgs) {
  const {
    audioCtx,
    myzelEnabled,
    myzelTopologyMode,
    myzelTopologyModeRef,
    nParamsUI,
    getInterpreterMyzelBaseHz,
    getLiveMasterBus,
    refs,
    policies,
  } = args;

  useEffect(() => {
    if (!audioCtx) return;

    const destination = getLiveMasterBus(audioCtx, "space");
    ensureRefactorTopologyLegacyAudio(audioCtx, refs.myzelLegacyAudioRef.current, destination);

    let raf = 0;
    const tick = () => {
      updateRefactorTopologyLegacyAudio(audioCtx, refs.myzelLegacyAudioRef.current, {
        enabled: myzelEnabled,
        mode: myzelTopologyModeRef.current,
        couplingEnabled: policies.isInstallationResidentBallCouplingActive(
          refs.installationSharedFieldActiveRef.current,
          refs.installationFieldConfigRef.current,
        ),
        rootHz: nParamsUI.bassRootMode === "fixed" ? nParamsUI.bassRootHz : getInterpreterMyzelBaseHz(),
        snapshot: refs.myceliumSnapshotRef.current,
        mix: refs.myzelInstallationMixRef.current,
      });
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [
    audioCtx,
    getLiveMasterBus,
    getInterpreterMyzelBaseHz,
    myzelEnabled,
    myzelTopologyMode,
    myzelTopologyModeRef,
    nParamsUI.bassRootMode,
    nParamsUI.bassRootHz,
    policies.isInstallationResidentBallCouplingActive,
  ]);
}
