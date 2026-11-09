import { DRONE_JI_OVERTONES } from "../domain/instrumentData";
import type { ResonanceNexusRuntimeRefObject } from "../rooms/resonanceNexusRuntimeRefs";

export const RESONANCE_JI_FILTER_LAYER_CONTRACT = {
  canonicalJiOscillatorOwner: true,
  preservesLiveGreen260FilterRoute: true,
  route: "jiGain -> primaryFilter -> primaryGain/droneGraph",
  keepsManualJiLayerSeparate: true,
  ownsJiCreationAndCleanup: true,
  ownsNoFrameModulation: true,
} as const;

export function ensureResonanceJiFilterLayer(
  ctx: AudioContext,
  filter: BiquadFilterNode,
  nexusRefs: ResonanceNexusRuntimeRefObject,
): void {
  if (Object.keys(nexusRefs.current.jiOscs).length !== 0) return;

  DRONE_JI_OVERTONES.forEach((node) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(filter);
    osc.start();
    nexusRefs.current.jiOscs[node.label] = osc;
    nexusRefs.current.jiGains[node.label] = gain;
  });
}

export function disposeResonanceJiFilterLayer(nexusRefs: ResonanceNexusRuntimeRefObject): void {
  Object.values(nexusRefs.current.jiOscs).forEach((osc) => {
    osc.stop();
    osc.disconnect();
  });
  Object.values(nexusRefs.current.jiGains).forEach((gain) => gain.disconnect());
  nexusRefs.current.jiOscs = {};
  nexusRefs.current.jiGains = {};
}
