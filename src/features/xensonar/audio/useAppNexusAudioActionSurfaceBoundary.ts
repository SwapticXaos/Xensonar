import { useMemo } from "react";
import { recordAudioPressureAdaptiveAction, recordAudioPressureCount } from "../../../core/audio/audioPressureMap";
import type {
  TransientEventPlan,
  TransientRuntime,
  TransientSource,
} from "../../resonance/transientRuntime";
import type { RefucktorAudioGuardState, RefucktorVoiceKind } from "../../resonance/refucktorAudioGuard";
import type { ScheduledToneHandle } from "./useAudioContextRuntimeRefs";
import {
  playScheduledToneWithLifecycle,
  type ScheduledTonePlaybackOptions,
} from "./scheduledTonePlaybackBoundary";
import { playParticleNoiseAccentWithLifecycle } from "./particleNoiseAccentPlaybackBoundary";
import {
  triggerRoom3BodyExciterPlayback,
  type Room3BodyExciterPlaybackOptions,
} from "./room3BodyExciterPlaybackBoundary";
import { runParticleNexusToneOrchestrator } from "./particleNexusToneOrchestrator";
import { readLiveSampleClockMs } from "../../soundLibrary/liveMelodicSampleLoad";

type MutableRef<T> = { current: T };

type EnsureAudioNode = (ctx: AudioContext) => AudioNode;
type EnsureVoidAudioDevice = (ctx: AudioContext) => void;
type RecordAudioPressureCount = typeof recordAudioPressureCount;
type RecordAudioPressureAdaptiveAction = typeof recordAudioPressureAdaptiveAction;

type ScheduledToneRequestOptions = {
  source?: TransientSource;
  plan?: TransientEventPlan | null;
  prominence?: number;
} & ScheduledTonePlaybackOptions;

export type AppScheduledToneAction = (
  freq: number,
  offset: number,
  dur: number,
  type: OscillatorType,
  volume: number,
  q?: number,
  cutoff?: number,
  targetDestinations?: AudioNode | Array<AudioNode | null | undefined> | null,
  options?: ScheduledToneRequestOptions,
) => boolean;

export type AppParticleNoiseAccentAction = (
  baseFreq: number,
  offset: number,
  volume: number,
  psyBias: number,
  targetDestinations?: AudioNode | Array<AudioNode | null | undefined> | null,
  acquireVoice?: Parameters<typeof playParticleNoiseAccentWithLifecycle>[1]['acquireVoice'],
  intendedStartTimeSec?: number,
) => boolean;

export type AppRoom3BodyExciterAction = (
  profile: Parameters<typeof triggerRoom3BodyExciterPlayback>[1],
  freq: number,
  intensity: number,
  options?: Room3BodyExciterPlaybackOptions,
) => void;

export type AppNexusAgentToneAction = (
  freq: number,
  volume: number,
  targetDestination?: AudioNode,
  when?: number,
  presetOverride?: string,
  impactPosition?: { x: number; y: number },
  sourceKind?: RefucktorVoiceKind,
  rootFreq?: number,
) => void;

export interface AppNexusAudioActionSurfaceBoundaryDeps {
  audioCtx: AudioContext | null;
  getAudioCtx: () => AudioContext | null;
  activeScheduledTonesRef: MutableRef<ScheduledToneHandle[]>;
  transientRuntimeRef: MutableRef<Pick<TransientRuntime, "admitVoice" | "pickTargets" | "releaseVoice">>;
  longToneHoldRef: MutableRef<boolean>;
  getNoiseBuffer: () => AudioBuffer | null | undefined;
  refucktorAudioGuardRef: MutableRef<RefucktorAudioGuardState>;
  particleRuntime: {
    getParticlePreset: () => string;
    getParticleGradientX: () => Parameters<typeof runParticleNexusToneOrchestrator>[0]["particleGradientX"];
    getParticleGradientY: () => Parameters<typeof runParticleNexusToneOrchestrator>[0]["particleGradientY"];
    getParticleSampleProfileMode: () => Parameters<typeof runParticleNexusToneOrchestrator>[0]["particleSampleProfileMode"];
  };
  particleFx: {
    ensureCollectiveMemoryFx: EnsureVoidAudioDevice;
    ensurePsychedelicSpiralDevice: EnsureVoidAudioDevice;
    ensureTransientDriveDevice: EnsureVoidAudioDevice;
    ensureEnterHoldPsyFxDevice: EnsureVoidAudioDevice;
    ensureSchwarmdeuterDevice: EnsureVoidAudioDevice;
    ensureMyzelPostFxRouter: EnsureVoidAudioDevice;
  };
  particleAuxTargets: {
    getTransientDriveParticles: () => AudioNode | null | undefined;
    getPsychedelicSpiralParticles: () => AudioNode | null | undefined;
    getCollectiveMemoryParticles: () => AudioNode | null | undefined;
    getSchwarmdeuterParticles: () => AudioNode | null | undefined;
    getMyzelPostFxParticles: () => AudioNode | null | undefined;
  };
  room3BodyRuntime: {
    getEnabled: () => boolean;
    getBodyEnabled: () => boolean;
    getTopologyMode: () => string;
    getDestination: () => GainNode | null;
    getModal: () => Parameters<typeof triggerRoom3BodyExciterPlayback>[0]["modal"];
    getControls: () => Parameters<typeof triggerRoom3BodyExciterPlayback>[0]["controls"];
  };
  beginTransientEvent: Parameters<typeof runParticleNexusToneOrchestrator>[0]["beginTransientEvent"];
  ensureFinalMixBus: EnsureAudioNode;
  recordAudioPressureCount?: RecordAudioPressureCount;
  recordAudioPressureAdaptiveAction?: RecordAudioPressureAdaptiveAction;
  silentHotPathSources?: Partial<Record<TransientSource, boolean>>;
  noWaveStarterPolicyOwnedHere: true;
  noRootFollowPolicyOwnedHere: true;
}

export function useAppNexusAudioActionSurfaceBoundary(
  deps: AppNexusAudioActionSurfaceBoundaryDeps,
) {
  return useMemo(() => {
    const recordCount = deps.recordAudioPressureCount ?? recordAudioPressureCount;
    const recordAdaptive = deps.recordAudioPressureAdaptiveAction ?? recordAudioPressureAdaptiveAction;

    const playScheduledTone: AppScheduledToneAction = (
      freq,
      offset,
      dur,
      type,
      volume,
      q = 1,
      cutoff = 2400,
      targetDestinations,
      options,
    ) => {
      const ctx = deps.getAudioCtx();
      if (!ctx) return false;
      return playScheduledToneWithLifecycle({
        ctx,
        activeScheduledTonesRef: deps.activeScheduledTonesRef,
        transientRuntime: deps.transientRuntimeRef.current,
        getMainOutput: deps.ensureFinalMixBus,
        heldLong: deps.longToneHoldRef.current,
        recordCount,
        recordAdaptiveAction: recordAdaptive,
        silentHotPathSources: deps.silentHotPathSources,
      }, {
        freq,
        offset,
        dur,
        type,
        volume,
        q,
        cutoff,
        targetDestinations,
        options,
      });
    };

    const playParticleNoiseAccent: AppParticleNoiseAccentAction = (
      baseFreq,
      offset,
      volume,
      psyBias,
      targetDestinations,
      acquireVoice,
      intendedStartTimeSec,
    ) => {
      const ctx = deps.getAudioCtx();
      if (!ctx) return false;
      return playParticleNoiseAccentWithLifecycle({
        ctx,
        noiseBuffer: deps.getNoiseBuffer() ?? null,
        getMainOutput: deps.ensureFinalMixBus,
        recordAudioPressureCount: recordCount,
      }, {
        baseFreq,
        offset,
        volume,
        psyBias,
        targetDestinations,
        acquireVoice,
        intendedStartTimeSec,
      });
    };

    const triggerRoom3BodyExciter: AppRoom3BodyExciterAction = (
      profile,
      freq,
      intensity,
      options,
    ) => {
      triggerRoom3BodyExciterPlayback({
        audioCtx: deps.audioCtx,
        enabled: deps.room3BodyRuntime.getEnabled(),
        bodyEnabled: deps.room3BodyRuntime.getBodyEnabled(),
        topologyMode: deps.room3BodyRuntime.getTopologyMode(),
        destination: deps.room3BodyRuntime.getDestination(),
        noiseBuffer: deps.getNoiseBuffer() ?? null,
        modal: deps.room3BodyRuntime.getModal(),
        controls: deps.room3BodyRuntime.getControls(),
        recordAudioPressureCount: recordCount,
      }, profile, freq, intensity, options);
    };

    const releaseHeldScheduledTones = () => {
      const ctx = deps.audioCtx;
      if (!ctx) return;
      const now = ctx.currentTime;
      for (const entry of deps.activeScheduledTonesRef.current) {
        try {
          const current = Math.max(0.0001, entry.gain.gain.value || 0.0001);
          entry.gain.gain.cancelScheduledValues(now);
          entry.gain.gain.setValueAtTime(current, now);
          entry.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
          entry.osc.stop(now + 0.22);
        } catch {}
      }
    };

    const playNexusAgentTone: AppNexusAgentToneAction = (
      freq,
      volume,
      targetDestination,
      when,
      presetOverride,
      impactPosition,
      sourceKind = "particle",
      rootFreq,
    ) => {
      const requestedAtMs = readLiveSampleClockMs();
      const ctx = deps.getAudioCtx();
      if (!ctx) return;
      runParticleNexusToneOrchestrator({
        ctx,
        guardState: deps.refucktorAudioGuardRef.current,
        recordAudioPressureCount: recordCount,
        particlePreset: deps.particleRuntime.getParticlePreset(),
        particleGradientX: deps.particleRuntime.getParticleGradientX(),
        particleGradientY: deps.particleRuntime.getParticleGradientY(),
        particleSampleProfileMode: deps.particleRuntime.getParticleSampleProfileMode(),
        fx: deps.particleFx,
        auxTargets: {
          transientDriveParticles: deps.particleAuxTargets.getTransientDriveParticles(),
          psychedelicSpiralParticles: deps.particleAuxTargets.getPsychedelicSpiralParticles(),
          collectiveMemoryParticles: deps.particleAuxTargets.getCollectiveMemoryParticles(),
          schwarmdeuterParticles: deps.particleAuxTargets.getSchwarmdeuterParticles(),
          myzelPostFxParticles: deps.particleAuxTargets.getMyzelPostFxParticles(),
        },
        beginTransientEvent: deps.beginTransientEvent,
        getMainOutput: deps.ensureFinalMixBus,
        playScheduledTone,
        playNoiseAccent: playParticleNoiseAccent,
        triggerBodyExciter: triggerRoom3BodyExciter,
        transientRuntime: deps.transientRuntimeRef.current,
      }, {
        freq,
        volume,
        requestedAtMs,
        targetDestination,
        when,
        presetOverride,
        impactPosition,
        sourceKind,
        rootFreq,
      });
    };

    return {
      playScheduledTone,
      playParticleNoiseAccent,
      triggerRoom3BodyExciter,
      releaseHeldScheduledTones,
      playNexusAgentTone,
    };
  }, [deps]);
}
