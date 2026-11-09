import type { AudioPressureEventKind, AudioPressureSource } from '@/core/audio/audioPressureMap';
import type { ParticleSampleProfileMode } from '@/features/soundLibrary/particleSamplePlayback';
import { playParticleSample } from '@/features/soundLibrary/particleSamplePlayback';
import { playResidentSample } from '@/features/soundLibrary/residentSamplePlayback';
import type { ParticlePlaybackRoute } from '@/features/soundLibrary/particlePitchRouting';
import type { Room3ExciterProfile } from '@/features/resonance/modalBody';
import { getParticleBodyExciterProfile } from '@/features/resonance/modalBody';
import { acquireTransientPlaybackLease, type TransientEventPlan, type TransientRuntime } from '@/features/resonance/transientRuntime';
import type { RefucktorVoiceKind } from '@/features/resonance/refucktorAudioGuard';
import type { Room3BodyExciterPlaybackOptions } from './room3BodyExciterPlaybackBoundary';
import type { ParticleScheduledTonePlan, ParticleSynthTonePlan, ParticleTonePlanAxes } from './particleSynthTonePlan';

export type ParticleScheduledTonePlaybackOptions = {
  source: 'particle';
  plan: TransientEventPlan;
  prominence: number;
  /** Original quantized AudioContext deadline; never rebase stale queue work to now. */
  intendedStartTimeSec?: number;
};

export type ParticleScheduledTonePlayback = (
  tone: ParticleScheduledTonePlan,
  targetDestinations: Array<AudioNode | null | undefined>,
  options: ParticleScheduledTonePlaybackOptions,
) => boolean;

export type ParticleNoiseAccentPlayback = (
  baseFreq: number,
  offset: number,
  volume: number,
  psyBias: number,
  targetDestinations: Array<AudioNode | null | undefined>,
  acquireVoice?: () => ReturnType<typeof acquireTransientPlaybackLease>,
  intendedStartTimeSec?: number,
) => boolean;

export type ParticleBodyExciterTrigger = (
  profile: Room3ExciterProfile,
  freq: number,
  intensity: number,
  options?: Room3BodyExciterPlaybackOptions,
) => void;

export interface ParticlePlaybackDispatchRuntime {
  ctx: AudioContext;
  getMainOutput: (ctx: AudioContext) => AudioNode;
  playScheduledTone: ParticleScheduledTonePlayback;
  playNoiseAccent: ParticleNoiseAccentPlayback;
  triggerBodyExciter: ParticleBodyExciterTrigger;
  recordAudioPressureCount?: (source: AudioPressureSource, action: AudioPressureEventKind, count?: number) => void;
  transientRuntime: Pick<TransientRuntime, 'admitVoice' | 'pickTargets' | 'releaseVoice'>;
}

export interface ParticlePlaybackDispatchRequest {
  freq: number;
  rootFreq?: number;
  volume: number;
  requestedAtMs?: number;
  when?: number;
  offset: number;
  sourceKind: RefucktorVoiceKind;
  presetRoute: ParticlePlaybackRoute;
  synthTonePlan: ParticleSynthTonePlan;
  axes: ParticleTonePlanAxes;
  targetDestinations: Array<AudioNode | null | undefined>;
  transientPlan: TransientEventPlan;
  bodyVoiceBudget: number;
  sampleProfileMode: ParticleSampleProfileMode;
}

function createParticleToneOptions(
  plan: TransientEventPlan,
  prominence: number,
  intendedStartTimeSec?: number,
): ParticleScheduledTonePlaybackOptions {
  return { source: 'particle', plan, prominence, intendedStartTimeSec };
}

function resolveParticleToneIntendedStartTimeSec(
  request: ParticlePlaybackDispatchRequest,
  tone: ParticleScheduledTonePlan,
): number | undefined {
  if (request.when === undefined || !Number.isFinite(request.when)) return undefined;
  // Planning clamps a past base deadline to offset=0. Recover only the tone's
  // relative colour delay while preserving the original quantized base deadline.
  const relativeDelaySec = Math.max(0, tone.offset - request.offset);
  return request.when + relativeDelaySec;
}

export function dispatchParticlePlayback(
  runtime: ParticlePlaybackDispatchRuntime,
  request: ParticlePlaybackDispatchRequest,
): void {
  const { synthTonePlan, targetDestinations, presetRoute, axes } = request;
  const { sitarBias, psyBias } = synthTonePlan;
  const acquireVoice = (prominence: number) => () => acquireTransientPlaybackLease(
    runtime.transientRuntime,
    request.transientPlan,
    prominence,
    targetDestinations,
  );
  const playParticleToneSpec = (tone: ParticleScheduledTonePlan) => runtime.playScheduledTone(
    tone,
    targetDestinations,
    createParticleToneOptions(
      request.transientPlan,
      tone.prominence,
      resolveParticleToneIntendedStartTimeSec(request, tone),
    ),
  );
  let bodyStarted = false;
  const triggerBody = () => {
    if (bodyStarted) return;
    bodyStarted = true;
    runtime.triggerBodyExciter(
      getParticleBodyExciterProfile(presetRoute.synthPresetId, axes),
      request.freq,
      request.volume * (1.68 + sitarBias * 0.08 + (1 - psyBias) * 0.06),
      {
        voiceBudget: request.bodyVoiceBudget,
        bodyScale: request.transientPlan.bodyScale,
        acquireVoice: () => {
          const lease = acquireVoice(0.45)();
          return lease ? { gainScale: lease.gainScale, release: lease.release } : null;
        },
      },
    );
  };
  const playSecondaryExciters = () => {
    let started = false;
    for (const tone of synthTonePlan.introTones) {
      if (playParticleToneSpec(tone)) started = true;
    }
    if (synthTonePlan.noiseAccentVolumeScale !== null && runtime.playNoiseAccent(
      request.freq,
      request.offset,
      request.volume * synthTonePlan.noiseAccentVolumeScale,
      psyBias,
      targetDestinations,
      acquireVoice(0.3),
      request.when,
    )) started = true;
    return started;
  };

  if (presetRoute.kind === 'sample') {
    // The selected sample is the instrument identity. It must reserve the first
    // event slot; synthetic colour and body may only spend remaining capacity.
    const onSampleStarted = (played: boolean) => {
      if (!played) return;
      triggerBody();
      playSecondaryExciters();
    };
    if (request.sourceKind === 'resident' && presetRoute.elasticPitchStable) {
      const mainOutput = runtime.getMainOutput(runtime.ctx);
      void playResidentSample({
        ctx: runtime.ctx,
        sampleId: presetRoute.sampleId,
        targetHz: request.freq,
        rootFreq: request.rootFreq,
        volume: request.volume,
        requestedAtMs: request.requestedAtMs,
        output: mainOutput,
        auxTargets: targetDestinations,
        startTime: request.when,
        elasticPitchStable: true,
        acquireVoice: acquireVoice(1),
      }).then(onSampleStarted);
      return;
    }
    const mainOutput = runtime.getMainOutput(runtime.ctx);
    void playParticleSample({
      ctx: runtime.ctx,
      sampleId: presetRoute.sampleId,
      baseFreq: request.freq,
      rootFreq: request.rootFreq,
      volume: request.volume,
      requestedAtMs: request.requestedAtMs,
      output: mainOutput,
      auxTargets: targetDestinations,
      axes,
      startTime: request.when,
      profileMode: request.sampleProfileMode,
      acquireVoice: acquireVoice(1),
    }).then(onSampleStarted);
    return;
  }

  let excitationStarted = playSecondaryExciters();
  for (const tone of synthTonePlan.mainTones) {
    if (playParticleToneSpec(tone)) excitationStarted = true;
  }
  if (excitationStarted) triggerBody();
}
