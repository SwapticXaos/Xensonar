import type { MutableRefObject } from 'react';
import type { RefucktorVoiceKind } from '../resonance/refucktorAudioGuard';
import { loadLiveMelodicSampleBuffer } from './liveMelodicSampleLoad';
import { resolveParticlePlaybackSelection } from './particleSoundAdapter';
import { resolveWaveStarterPlaybackSelection } from './waveStarterSoundAdapter';

const wavePreviewGeneration = new WeakMap<object, number>();
const particlePreviewGeneration = new WeakMap<object, number>();

function beginLatestPreview(registry: WeakMap<object, number>, owner: object) {
  const generation = (registry.get(owner) ?? 0) + 1;
  registry.set(owner, generation);
  return {
    generation,
    isCurrent: () => registry.get(owner) === generation,
  };
}

type WaveSoundRuntimeState = {
  enabled: boolean;
  volume: number;
  preset: string;
};

type PreviewWaveStarterPresetSelectionArgs<TQueueEntry> = {
  initAudio: () => Promise<AudioContext | null | undefined>;
  waveSoundRuntimeRef: MutableRefObject<WaveSoundRuntimeState>;
  nexusParamsRef: MutableRefObject<{
    waveOvertonesEnabled: boolean;
  }>;
  waveOvertoneArpQueueRef: MutableRefObject<TQueueEntry[]>;
  playWaveStartSound: (freq: number, isSector: boolean) => void;
  selectionId: string;
};

export async function previewWaveStarterPresetSelection<TQueueEntry>(args: PreviewWaveStarterPresetSelectionArgs<TQueueEntry>) {
  const intent = beginLatestPreview(wavePreviewGeneration, args.waveSoundRuntimeRef);
  const ctx = await args.initAudio();
  if (!ctx || !intent.isCurrent()) return;
  const selection = resolveWaveStarterPlaybackSelection(args.selectionId);
  if (selection.kind === 'sample') {
    const loaded = await loadLiveMelodicSampleBuffer(selection.sampleId, ctx);
    if (!loaded || !intent.isCurrent()) return;
  }
  const runtimeBefore = { ...args.waveSoundRuntimeRef.current };
  const previousOvertonesEnabled = args.nexusParamsRef.current.waveOvertonesEnabled;
  const previousQueue = [...args.waveOvertoneArpQueueRef.current];
  args.waveSoundRuntimeRef.current = {
    ...runtimeBefore,
    enabled: true,
    preset: args.selectionId,
    volume: Math.max(runtimeBefore.volume, 0.22),
  };
  args.nexusParamsRef.current.waveOvertonesEnabled = false;
  args.waveOvertoneArpQueueRef.current = [];
  try {
    args.playWaveStartSound(220, false);
  } finally {
    args.waveOvertoneArpQueueRef.current = previousQueue;
    args.nexusParamsRef.current.waveOvertonesEnabled = previousOvertonesEnabled;
    args.waveSoundRuntimeRef.current = runtimeBefore;
  }
}

type PreviewParticlePresetSelectionArgs = {
  initAudio: () => Promise<AudioContext | null | undefined>;
  nexusParamsRef: MutableRefObject<{
    particleVolume: number;
  }>;
  playNexusAgentTone: (
    freq: number,
    volume: number,
    send: GainNode | undefined,
    dueTime: number | undefined,
    preset: string,
    position: { x: number; y: number },
    targetKind: RefucktorVoiceKind,
  ) => void;
  selectionId: string;
  gameWidth: number;
  gameHeight: number;
};

export async function previewParticlePresetSelection(args: PreviewParticlePresetSelectionArgs) {
  const intent = beginLatestPreview(particlePreviewGeneration, args.nexusParamsRef);
  const ctx = await args.initAudio();
  if (!ctx || !intent.isCurrent()) return;
  const selection = resolveParticlePlaybackSelection(args.selectionId);
  if (selection.kind === 'sample') {
    const loaded = await loadLiveMelodicSampleBuffer(selection.sampleId, ctx);
    if (!loaded || !intent.isCurrent()) return;
  }
  const previewVolume = Math.min(0.24, Math.max(0.08, Math.max(args.nexusParamsRef.current.particleVolume, 0.12)));
  args.playNexusAgentTone(
    330,
    previewVolume,
    undefined,
    undefined,
    args.selectionId,
    { x: args.gameWidth * 0.5, y: args.gameHeight * 0.45 },
    'preview',
  );
}
