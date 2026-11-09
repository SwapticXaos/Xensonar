import type { AudioPressureEventKind, AudioPressureSource } from '@/core/audio/audioPressureMap';
import type { ParticleSampleProfileMode } from '@/features/soundLibrary/particleSamplePlayback';
import type { RefucktorAudioGuardState, RefucktorVoiceKind } from '@/features/resonance/refucktorAudioGuard';
import type { TransientRuntime } from '@/features/resonance/transientRuntime';
import type { ParticleGradientPreset } from '@/features/xensonar/domain/instrumentData';
import type { ParticleTransientPlanBegin } from './particleRuntimeRequestAssemblyBoundary';
import { assembleParticleRuntimePlaybackRequest } from './particleRuntimeRequestAssemblyBoundary';
import { resolveParticleAdmissionRequest } from './particleAdmissionBoundary';
import { resolveParticleTonePlanningRequest } from './particleTonePlanningRequestBoundary';
import { buildParticlePlaybackDispatchRuntime, type ParticleBaseScheduledTonePlayback } from './particleToneRuntimeCallbackBoundary';
import { buildParticleAuxTargets, ensureParticleFxRoutes } from './particleFxRouting';
import { dispatchParticlePlayback, type ParticleBodyExciterTrigger, type ParticleNoiseAccentPlayback } from './particlePlaybackDispatch';
import { recordParticleVoicePoolDispatch, recordParticleVoicePoolIntent } from './particleVoicePoolLiveReport';

export type ParticleNexusToneRecordCount = (
  source: AudioPressureSource,
  action: AudioPressureEventKind,
  count?: number,
) => void;

export interface ParticleNexusFxRuntime {
  ensureCollectiveMemoryFx: (ctx: AudioContext) => void;
  ensurePsychedelicSpiralDevice: (ctx: AudioContext) => void;
  ensureTransientDriveDevice: (ctx: AudioContext) => void;
  ensureEnterHoldPsyFxDevice: (ctx: AudioContext) => void;
  ensureSchwarmdeuterDevice: (ctx: AudioContext) => void;
  ensureMyzelPostFxRouter: (ctx: AudioContext) => void;
}

export interface ParticleNexusAuxTargetsRuntime {
  transientDriveParticles: AudioNode | null | undefined;
  psychedelicSpiralParticles: AudioNode | null | undefined;
  collectiveMemoryParticles: AudioNode | null | undefined;
  schwarmdeuterParticles: AudioNode | null | undefined;
  myzelPostFxParticles: AudioNode | null | undefined;
}

export interface ParticleNexusToneRuntime {
  ctx: AudioContext;
  guardState: RefucktorAudioGuardState;
  recordAudioPressureCount: ParticleNexusToneRecordCount;
  particlePreset: string;
  particleGradientX: ParticleGradientPreset;
  particleGradientY: ParticleGradientPreset;
  particleSampleProfileMode?: ParticleSampleProfileMode | null;
  fx: ParticleNexusFxRuntime;
  auxTargets: ParticleNexusAuxTargetsRuntime;
  beginTransientEvent: ParticleTransientPlanBegin;
  getMainOutput: (ctx: AudioContext) => AudioNode;
  playScheduledTone: ParticleBaseScheduledTonePlayback;
  playNoiseAccent: ParticleNoiseAccentPlayback;
  triggerBodyExciter: ParticleBodyExciterTrigger;
  transientRuntime: Pick<TransientRuntime, 'admitVoice' | 'pickTargets' | 'releaseVoice'>;
}

export interface ParticleNexusToneRequest {
  freq: number;
  volume: number;
  requestedAtMs?: number;
  targetDestination?: AudioNode | null;
  when?: number;
  presetOverride?: string;
  impactPosition?: { x: number; y: number };
  sourceKind?: RefucktorVoiceKind;
  rootFreq?: number;
}

export interface ParticleNexusToneResult {
  dispatched: boolean;
  admitted: boolean;
}

export function runParticleNexusToneOrchestrator(
  runtime: ParticleNexusToneRuntime,
  request: ParticleNexusToneRequest,
): ParticleNexusToneResult {
  const sourceKind = request.sourceKind ?? 'particle';
  recordParticleVoicePoolIntent({
    sourceKind,
    requestedVolume: request.volume,
    freq: request.freq,
  });
  const admission = resolveParticleAdmissionRequest({
    guardState: runtime.guardState,
    recordAudioPressureCount: runtime.recordAudioPressureCount,
  }, {
    nowSec: request.when ?? runtime.ctx.currentTime,
    sourceKind,
    volume: request.volume,
  });

  if (!admission.allowed) {
    return { dispatched: false, admitted: false };
  }

  const volume = admission.volume;
  const tonePlanning = resolveParticleTonePlanningRequest({
    currentTimeSec: runtime.ctx.currentTime,
  }, {
    freq: request.freq,
    volume,
    when: request.when,
    presetOverride: request.presetOverride,
    particlePreset: runtime.particlePreset,
    particleGradientX: runtime.particleGradientX,
    particleGradientY: runtime.particleGradientY,
    impactPosition: request.impactPosition,
  });

  ensureParticleFxRoutes({
    ctx: runtime.ctx,
    ...runtime.fx,
  });

  const targetDestinations = buildParticleAuxTargets({
    targetDestination: request.targetDestination,
    ...runtime.auxTargets,
  });

  const particleRuntimeRequest = assembleParticleRuntimePlaybackRequest({
    beginTransientEvent: runtime.beginTransientEvent,
  }, {
    freq: request.freq,
    rootFreq: request.rootFreq,
    volume,
    requestedAtMs: request.requestedAtMs,
    when: request.when,
    sourceKind,
    tonePlanning,
    targetDestinations,
    sampleProfileMode: runtime.particleSampleProfileMode,
  });

  recordParticleVoicePoolDispatch({
    sourceKind,
    dispatchKind: particleRuntimeRequest.dispatchRequest.presetRoute.kind === 'sample' ? 'sample' : 'synth',
    volume,
    freq: request.freq,
    bodyVoiceBudget: particleRuntimeRequest.bodyVoiceBudget,
    transientIntensity: particleRuntimeRequest.transientPlan.intensity,
    sampleProfileMode: particleRuntimeRequest.sampleProfileMode,
  });

  const playbackRuntime = buildParticlePlaybackDispatchRuntime({
    ctx: runtime.ctx,
    getMainOutput: runtime.getMainOutput,
    playScheduledTone: runtime.playScheduledTone,
    playNoiseAccent: runtime.playNoiseAccent,
    triggerBodyExciter: runtime.triggerBodyExciter,
    recordAudioPressureCount: runtime.recordAudioPressureCount,
    transientRuntime: runtime.transientRuntime,
  });

  dispatchParticlePlayback(playbackRuntime, particleRuntimeRequest.dispatchRequest);
  return { dispatched: true, admitted: true };
}
