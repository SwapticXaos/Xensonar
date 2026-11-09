import { useRef } from "react";
import type { TransientVoiceHandle } from "../../resonance/transientRuntime";

export type ScheduledToneHandle = {
  osc: OscillatorNode;
  gain: GainNode;
  filter: BiquadFilterNode;
  ticket: TransientVoiceHandle | null;
};

export function useAudioContextRuntimeRefs() {
  const activeScheduledTonesRef = useRef<ScheduledToneHandle[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioWarmupDoneRef = useRef(false);
  const audioWarmupPromiseRef = useRef<Promise<void> | null>(null);
  const keyboardPitchAudioReadyLatchRef = useRef({ ready: false, pending: false });

  return {
    activeScheduledTonesRef,
    audioCtxRef,
    audioWarmupDoneRef,
    audioWarmupPromiseRef,
    keyboardPitchAudioReadyLatchRef,
  };
}
