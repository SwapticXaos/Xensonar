import type { ParticlePreset } from '@/features/xensonar/domain/instrumentData';
import { resolveParticlePlaybackSelection } from './particleSoundAdapter';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeHz(value: number | null | undefined, fallback: number) {
  if (!value || !Number.isFinite(value)) return fallback;
  return clamp(value, 24, 6000);
}

export type CollisionTriggerTargetKind = 'particle' | 'resident';

export type QueuedCollisionTrigger = {
  dueTime: number;
  macroDueTime?: number;
  sourceKey?: string;
  freq: number;
  rootFreq?: number;
  amp: number;
  preset: string;
  x: number;
  y: number;
  waveGain: number;
  targetKind: CollisionTriggerTargetKind;
};

export type ResolvedWaveStarterPitch = {
  rootFreq: number;
  playbackFreq: number;
  octaveScalar: number;
};

export function resolveWaveStarterPitch(args: {
  baseFreq: number;
  isSector?: boolean;
  octaveHeld?: boolean;
}): ResolvedWaveStarterPitch {
  const octaveScalar = args.octaveHeld ? 2 : 1;
  const rootFreq = normalizeHz((args.baseFreq / 2) * octaveScalar, 220);
  const playbackFreq = args.isSector ? clamp(rootFreq * 1.5, 24, 6000) : rootFreq;
  return {
    rootFreq,
    playbackFreq,
    octaveScalar,
  };
}

export type ResolvedParticleImpactPitch = {
  rootFreq: number;
  playbackFreq: number;
  ratio: number;
};

export function resolveParticleImpactPitch(args: {
  rootFreq: number;
  ratio: number;
  minHz?: number;
  maxHz?: number;
}): ResolvedParticleImpactPitch {
  const rootFreq = normalizeHz(args.rootFreq, 220);
  const minHz = args.minHz ?? 40;
  const maxHz = args.maxHz ?? 2400;
  return {
    rootFreq,
    playbackFreq: clamp(rootFreq * args.ratio, minHz, maxHz),
    ratio: args.ratio,
  };
}

export function createQueuedParticleCollisionTrigger(args: {
  dueTime: number;
  rootFreq: number;
  ratio: number;
  amp: number;
  preset: string;
  x: number;
  y: number;
  waveGain: number;
  minHz?: number;
  maxHz?: number;
}): QueuedCollisionTrigger {
  const resolvedPitch = resolveParticleImpactPitch({
    rootFreq: args.rootFreq,
    ratio: args.ratio,
    minHz: args.minHz,
    maxHz: args.maxHz,
  });

  return {
    dueTime: args.dueTime,
    freq: resolvedPitch.playbackFreq,
    rootFreq: resolvedPitch.rootFreq,
    amp: args.amp,
    preset: args.preset,
    x: args.x,
    y: args.y,
    waveGain: args.waveGain,
    targetKind: 'particle',
  };
}

export type ParticlePlaybackRoute =
  | {
      kind: 'synth';
      selectionId: string;
      synthPresetId: ParticlePreset;
    }
  | {
      kind: 'sample';
      selectionId: string;
      sampleId: string;
      fallbackPresetId: ParticlePreset;
      synthPresetId: ParticlePreset;
      elasticPitchStable?: boolean;
    };

export function resolveParticlePlaybackRoute(selectionId: string | undefined): ParticlePlaybackRoute {
  const selection = resolveParticlePlaybackSelection(selectionId);
  if (selection.kind === 'sample') {
    return {
      kind: 'sample',
      selectionId: selection.selectionId,
      sampleId: selection.sampleId,
      fallbackPresetId: selection.fallbackPresetId,
      synthPresetId: selection.fallbackPresetId,
      elasticPitchStable: !!selection.elasticPitchStable,
    };
  }

  return {
    kind: 'synth',
    selectionId: selection.selectionId,
    synthPresetId: selection.presetId,
  };
}
