import { useEffect } from "react";
import { updateRoom3NodeDeviceAudioFrame } from "./room3NodeDeviceAudioPath";
import type { Room3NodeDeviceAndLegacyAudioRuntimeBoundaryArgs } from "./room3NodeDeviceLegacyAudioRuntimeTypes";

export function useRoom3NodeDeviceAudioFrameRuntime(args: Room3NodeDeviceAndLegacyAudioRuntimeBoundaryArgs) {
  const {
    audioCtx,
    nexusActive,
    nexusRefs,
    myzelEnabled,
    myzelTopologyMode,
    nParamsUI,
    getInterpreterMyzelBaseHz,
    ensureMyzelSynth,
    refs,
    policies,
  } = args;

  useEffect(() => {
    if (!audioCtx || !nexusActive) return;
    let raf = 0;

    const tick = () => {
      const nodeRefs = nexusRefs.current;
      const enabled = Boolean(myzelEnabled && myzelTopologyMode !== "installation");
      if (enabled) ensureMyzelSynth(audioCtx);

      const telemetry = updateRoom3NodeDeviceAudioFrame({
        audioCtx,
        refs: nodeRefs,
        snapshot: refs.myceliumSnapshotRef.current,
        baseHz: nParamsUI.bassRootMode === "fixed" ? nParamsUI.bassRootHz : getInterpreterMyzelBaseHz(),
        enabled,
        colorMixer: refs.myzelCentralColorMixerRef.current,
        nodalMatrix: refs.nodalDeviceMatrixRef.current,
        nodeDeviceEnvelope: refs.myzelAudioFieldEnvelopeRef.current,
        semanticEnvelope: refs.semanticInteractionEnvelopeRef.current,
        topologicalEnvelope: refs.topologicalResonatorEnvelopeRef.current,
        layerMod: refs.myzelLayerModRef.current,
        interpreterMix: refs.myzelInterpreterMixRef.current,
        myzelDriveEnabled: policies.myzelDriveEnabled,
        gate: refs.myzelGateRef.current,
        minFreq: policies.droneMinFreq,
        maxFreq: policies.droneMaxFreq,
      });
      refs.myzelFieldSpaceBoostRef.current = telemetry.fieldSpaceBoost;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [
    audioCtx,
    nexusActive,
    nexusRefs,
    myzelEnabled,
    myzelTopologyMode,
    nParamsUI.bassRootMode,
    nParamsUI.bassRootHz,
    getInterpreterMyzelBaseHz,
    ensureMyzelSynth,
    policies.myzelDriveEnabled,
    policies.droneMinFreq,
    policies.droneMaxFreq,
  ]);
}
