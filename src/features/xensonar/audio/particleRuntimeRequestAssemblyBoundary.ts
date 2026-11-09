import type { ParticleSampleProfileMode } from '@/features/soundLibrary/particleSamplePlayback';
import type { RefucktorVoiceKind } from '@/features/resonance/refucktorAudioGuard';
import type { TransientEventPlan } from '@/features/resonance/transientRuntime';
import { getParticleBodyExciterProfile } from '@/features/resonance/modalBody';
import { getParticleTransientDemand } from '@/features/xensonar/rooms/transientDemandProfiles';
import type { ParticlePlaybackDispatchRequest } from './particlePlaybackDispatch';
import type { ParticleTonePlanningResult } from './particleTonePlanningRequestBoundary';

export type ParticleTransientPlanBegin = (
  source: 'particle',
  requestedVoices: number,
  intensity?: number,
) => TransientEventPlan;

export interface ParticleRuntimeRequestAssemblyRuntime {
  beginTransientEvent: ParticleTransientPlanBegin;
}

export interface ParticleRuntimeRequestAssemblyInput {
  freq: number;
  rootFreq?: number;
  volume: number;
  requestedAtMs?: number;
  when?: number;
  sourceKind: RefucktorVoiceKind;
  tonePlanning: ParticleTonePlanningResult;
  targetDestinations: Array<AudioNode | null | undefined>;
  sampleProfileMode?: ParticleSampleProfileMode | null;
}

export interface ParticleRuntimeRequestAssemblyResult {
  dispatchRequest: ParticlePlaybackDispatchRequest;
  transientPlan: TransientEventPlan;
  bodyVoiceBudget: number;
  sampleProfileMode: ParticleSampleProfileMode;
}

export const DEFAULT_PARTICLE_SAMPLE_PROFILE_MODE: ParticleSampleProfileMode = 'current_db_v2';

export function resolveParticleBodyVoiceBudget(plan: TransientEventPlan): number {
  return plan.bodyScale >= 0.84 ? 4 : plan.bodyScale >= 0.56 ? 2 : 1;
}

export function resolveParticleTransientIntensity(
  volume: number,
  brightness: number,
  attackHardness: number,
): number {
  return volume * (0.84 + brightness * 0.26 + attackHardness * 0.14);
}

export function assembleParticleRuntimePlaybackRequest(
  runtime: ParticleRuntimeRequestAssemblyRuntime,
  input: ParticleRuntimeRequestAssemblyInput,
): ParticleRuntimeRequestAssemblyResult {
  const { tonePlanning } = input;
  const { brightness, attackHardness } = tonePlanning.axes;
  const profile = getParticleBodyExciterProfile(tonePlanning.synthPresetId, tonePlanning.axes);
  const bodySourceDemand = Math.min(4, profile.voices.length) + (profile.noiseGain > 0 ? 1 : 0);
  const coreSourceDemand = tonePlanning.synthTonePlan.introTones.length
    + (tonePlanning.playbackRoute.kind === 'sample' ? 1 : tonePlanning.synthTonePlan.mainTones.length)
    + (tonePlanning.synthTonePlan.noiseAccentVolumeScale !== null ? 1 : 0);
  const transientPlan = runtime.beginTransientEvent(
    'particle',
    Math.max(getParticleTransientDemand(tonePlanning.synthPresetId), coreSourceDemand) + bodySourceDemand,
    resolveParticleTransientIntensity(input.volume, brightness, attackHardness),
  );
  const bodyVoiceBudget = resolveParticleBodyVoiceBudget(transientPlan);
  const sampleProfileMode = input.sampleProfileMode ?? DEFAULT_PARTICLE_SAMPLE_PROFILE_MODE;

  return {
    dispatchRequest: {
      freq: input.freq,
      rootFreq: input.rootFreq,
      volume: input.volume,
      requestedAtMs: input.requestedAtMs,
      when: input.when,
      offset: tonePlanning.offset,
      sourceKind: input.sourceKind,
      presetRoute: tonePlanning.playbackRoute,
      synthTonePlan: tonePlanning.synthTonePlan,
      axes: tonePlanning.axes,
      targetDestinations: input.targetDestinations,
      transientPlan,
      bodyVoiceBudget,
      sampleProfileMode,
    },
    transientPlan,
    bodyVoiceBudget,
    sampleProfileMode,
  };
}
