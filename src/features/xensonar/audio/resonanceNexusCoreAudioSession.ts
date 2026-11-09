import type { AppAudioDeviceRackRuntimeBoundary } from "./useAppAudioDeviceRackRuntimeBoundary";
import { disposeResonanceJiFilterLayer, ensureResonanceJiFilterLayer } from "./resonanceJiFilterLayer";
import type { ResonanceNexusRuntimeRefObject } from "../rooms/resonanceNexusRuntimeRefs";

export const RESONANCE_NEXUS_CORE_AUDIO_SESSION_CONTRACT = {
  ownsPrimaryOscillatorLifecycle: true,
  ownsPrimaryFilterGainLifecycle: true,
  ownsEchoDelayLifecycle: true,
  ownsCanonicalJiFilterLayerLifecycle: true,
  ownsNoRafLifecycle: true,
  preservesLegacyCleanupRefSemantics: true,
} as const;

export type ResonanceNexusCoreAudioSession = {
  readonly osc: OscillatorNode;
  readonly filter: BiquadFilterNode;
  readonly gain: GainNode;
  readonly ensureJiLayer: () => void;
  readonly dispose: () => void;
};

export function createResonanceNexusCoreAudioSession(args: {
  readonly ctx: AudioContext;
  readonly getLiveMasterBus: AppAudioDeviceRackRuntimeBoundary["getLiveMasterBus"];
  readonly nexusRefs: ResonanceNexusRuntimeRefObject;
}): ResonanceNexusCoreAudioSession {
  const { ctx, getLiveMasterBus, nexusRefs } = args;
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  osc.type = "sawtooth";
  osc.frequency.value = 110;
  filter.type = "lowpass";
  filter.frequency.value = 400;
  filter.Q.value = 2;
  gain.gain.value = 0.02;

  osc.connect(filter);
  filter.connect(gain);
  osc.start();

  const delayNode = ctx.createDelay(3.0);
  const delayFeedback = ctx.createGain();
  delayNode.connect(delayFeedback);
  delayFeedback.connect(delayNode);
  delayNode.connect(getLiveMasterBus(ctx, "space"));

  nexusRefs.current.osc = osc;
  nexusRefs.current.filter = filter;
  nexusRefs.current.gain = gain;
  nexusRefs.current.delayNode = delayNode;
  nexusRefs.current.delayFeedback = delayFeedback;

  return {
    osc,
    filter,
    gain,
    ensureJiLayer: () => ensureResonanceJiFilterLayer(ctx, filter, nexusRefs),
    dispose: () => {
      osc.stop();
      osc.disconnect();
      filter.disconnect();
      gain.disconnect();
      if (nexusRefs.current.delayNode) nexusRefs.current.delayNode.disconnect();
      if (nexusRefs.current.delayFeedback) nexusRefs.current.delayFeedback.disconnect();
      disposeResonanceJiFilterLayer(nexusRefs);
    },
  };
}
