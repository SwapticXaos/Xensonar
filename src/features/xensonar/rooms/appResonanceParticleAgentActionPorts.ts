import type { MutableRefObject } from 'react';
import { resolveParticleImpactPitch } from '../../soundLibrary/particlePitchRouting';
import {
  getParticleNodes,
  type ParticleSystem,
} from '../domain/instrumentData';
import type { AppNexusAgentToneAction } from '../audio/useAppNexusAudioActionSurfaceBoundary';
import type { AppNexusParams, NexusUiPatch } from './nexusParamsInitialState';
import type { ResonanceNexusRuntimeRefObject } from './resonanceNexusRuntimeRefs';
import { freqFromY } from './resonanceRuntimeMath';

export type AppResonanceParticleAgentActionPorts = {
  readonly activeParticleNodes: ReturnType<typeof getParticleNodes>;
  readonly toggleNexusAgent: (index: number, options?: { pingOnEnable?: boolean }) => void;
  readonly setNexusAgentVolume: (index: number, value: number) => void;
};

export type BuildAppResonanceParticleAgentActionPortsInput = {
  readonly particleSystem: ParticleSystem;
  readonly audioCtx: AudioContext | null;
  readonly audioCtxRef: MutableRefObject<AudioContext | null>;
  readonly nexusParamsRef: MutableRefObject<AppNexusParams>;
  readonly nexusRefs: ResonanceNexusRuntimeRefObject;
  readonly updateNParams: (partial: NexusUiPatch) => void;
  readonly playNexusAgentTone: AppNexusAgentToneAction;
};

export const APP_RESONANCE_PARTICLE_AGENT_ACTION_PORTS_PROBE = {
  cleanupKind: 'app-resonance-particle-agent-action-ports',
  ownsRuntime: false,
  ownsEffects: false,
  ownsAudioGraph: false,
  ownsParticleSimulationFrame: false,
  ownsQuantizedCollisionRuntime: false,
  onlyMovesExistingParticleAgentUiActions: true,
  movedFromAppCallsite: [
    'activeParticleNodes derivation',
    'triggerParticleEnablePing helper',
    'toggleNexusAgent',
    'setNexusAgentVolume',
  ] as const,
  explicitlyNotMoved: [
    'particle simulation loop',
    'quantized collision runtime',
    'particle preset preview action',
    'Room III body exciter routing',
    'Wellenstarter, keyboard and Root-Follow behavior',
  ] as const,
} as const;

export function buildAppResonanceParticleAgentActionPorts({
  particleSystem,
  audioCtx,
  audioCtxRef,
  nexusParamsRef,
  nexusRefs,
  updateNParams,
  playNexusAgentTone,
}: BuildAppResonanceParticleAgentActionPortsInput): AppResonanceParticleAgentActionPorts {
  const activeParticleNodes = getParticleNodes(particleSystem);

  const triggerParticleEnablePing = (index: number) => {
    const agent = nexusRefs.current.agents[index];
    const ctx = audioCtxRef.current ?? audioCtx;
    if (!agent || !ctx) return;
    const p = nexusParamsRef.current;
    const rootFreq = freqFromY(nexusRefs.current.cursorY);
    const impactPitch = resolveParticleImpactPitch({
      rootFreq,
      ratio: agent.ratio,
      minHz: 80,
      maxHz: 2400,
    });
    playNexusAgentTone(
      impactPitch.playbackFreq,
      p.particleVolume * (p.agentVolumes[index] ?? 1) * 0.72,
      p.echoOn && nexusRefs.current.delayNode ? nexusRefs.current.delayNode : undefined,
      undefined,
      undefined,
      { x: agent.x, y: agent.y },
      'particle',
      rootFreq,
    );
  };

  const toggleNexusAgent = (index: number, options?: { pingOnEnable?: boolean }) => {
    const nextEnabled = [...nexusParamsRef.current.agentEnabled];
    const wasEnabled = !!nextEnabled[index];
    nextEnabled[index] = !nextEnabled[index];
    const agent = nexusRefs.current.agents[index];
    if (agent) {
      agent.lastHit = nextEnabled[index] ? 0 : Number.POSITIVE_INFINITY;
      agent.lastHitAudioTimeSec = undefined;
    }
    updateNParams({ agentEnabled: nextEnabled });
    if (options?.pingOnEnable && !wasEnabled && nextEnabled[index]) {
      triggerParticleEnablePing(index);
    }
  };

  const setNexusAgentVolume = (index: number, value: number) => {
    const nextVolumes = [...nexusParamsRef.current.agentVolumes];
    nextVolumes[index] = value;
    updateNParams({ agentVolumes: nextVolumes });
  };

  return {
    activeParticleNodes,
    toggleNexusAgent,
    setNexusAgentVolume,
  };
}
