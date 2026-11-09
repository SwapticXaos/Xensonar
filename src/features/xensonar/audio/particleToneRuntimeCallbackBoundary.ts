import type { ScheduledTonePlaybackOptions } from './scheduledTonePlaybackBoundary';
import type {
  ParticleBodyExciterTrigger,
  ParticleNoiseAccentPlayback,
  ParticlePlaybackDispatchRuntime,
  ParticleScheduledTonePlayback,
} from './particlePlaybackDispatch';

export type ParticleBaseScheduledTonePlayback = (
  freq: number,
  offset: number,
  dur: number,
  type: OscillatorType,
  volume: number,
  q?: number,
  cutoff?: number,
  targetDestinations?: AudioNode | Array<AudioNode | null | undefined> | null,
  options?: ScheduledTonePlaybackOptions,
) => boolean;

export interface ParticleToneRuntimeCallbackBoundaryInput {
  ctx: AudioContext;
  getMainOutput: (ctx: AudioContext) => AudioNode;
  playScheduledTone: ParticleBaseScheduledTonePlayback;
  playNoiseAccent: ParticleNoiseAccentPlayback;
  triggerBodyExciter: ParticleBodyExciterTrigger;
  recordAudioPressureCount?: ParticlePlaybackDispatchRuntime['recordAudioPressureCount'];
  transientRuntime: ParticlePlaybackDispatchRuntime['transientRuntime'];
}

export function adaptParticleScheduledTonePlayback(
  playScheduledTone: ParticleBaseScheduledTonePlayback,
): ParticleScheduledTonePlayback {
  return (tone, targetDestinations, options) => playScheduledTone(
    tone.freq,
    tone.offset,
    tone.dur,
    tone.type,
    tone.volume,
    tone.q,
    tone.cutoff,
    targetDestinations,
    options,
  );
}

export function buildParticlePlaybackDispatchRuntime(
  input: ParticleToneRuntimeCallbackBoundaryInput,
): ParticlePlaybackDispatchRuntime {
  return {
    ctx: input.ctx,
    getMainOutput: input.getMainOutput,
    playScheduledTone: adaptParticleScheduledTonePlayback(input.playScheduledTone),
    playNoiseAccent: input.playNoiseAccent,
    triggerBodyExciter: input.triggerBodyExciter,
    recordAudioPressureCount: input.recordAudioPressureCount,
    transientRuntime: input.transientRuntime,
  };
}
