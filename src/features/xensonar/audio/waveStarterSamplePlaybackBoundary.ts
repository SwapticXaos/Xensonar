import type { TransientPlaybackLease } from '../../resonance/transientRuntime';
import { playWaveStarterSample } from '../../soundLibrary/waveStarterSamplePlayback';
import { primeWaveStarterSampleBufferTokenShadow } from './waveStarterSampleBufferTokenShadow';
import type { WaveStarterPlaybackSelection } from '../../soundLibrary/waveStarterSoundAdapter';

export type WaveStarterSampleSelection = Extract<WaveStarterPlaybackSelection, { kind: 'sample' }>;

export type PlayWaveStarterSampleSelectionArgs = {
  acquireVoice?: () => TransientPlaybackLease | null;
  requestedAtMs?: number;
  ctx: AudioContext;
  selection: WaveStarterSampleSelection;
  baseFreq: number;
  volume: number;
  isSector: boolean;
  output: AudioNode;
  auxTargets: Array<AudioNode | null | undefined>;
  /** False for the 90.61 direct Wellenstarter hot path: no token-shadow side effects before playback. */
  primeTokenShadow?: boolean;
};

export function isWaveStarterSampleSelection(
  selection: WaveStarterPlaybackSelection,
): selection is WaveStarterSampleSelection {
  return selection.kind === 'sample';
}

export function playWaveStarterSampleSelection(args: PlayWaveStarterSampleSelectionArgs): Promise<boolean> {
  if (args.primeTokenShadow !== false) {
    void primeWaveStarterSampleBufferTokenShadow({
      ctx: args.ctx,
      sampleId: args.selection.sampleId,
      targetFreqHz: args.baseFreq,
    });
  }
  return playWaveStarterSample({
    ctx: args.ctx,
    acquireVoice: args.acquireVoice,
    requestedAtMs: args.requestedAtMs,
    sampleId: args.selection.sampleId,
    baseFreq: args.baseFreq,
    volume: args.volume,
    isSector: args.isSector,
    output: args.output,
    auxTargets: args.auxTargets,
  });
}
