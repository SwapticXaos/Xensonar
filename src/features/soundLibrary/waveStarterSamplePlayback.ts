import { readLiveSampleClockMs, resolveLiveMelodicSampleForAttack, resolveLiveSampleAttackFreshness } from './liveMelodicSampleLoad';
import type { TransientPlaybackLease } from '@/features/resonance/transientRuntime';
import { resolveSamplePlaybackProfile } from './samplePlaybackProfile';

type PlayWaveStarterSampleArgs = {
  acquireVoice?: () => TransientPlaybackLease | null;
  requestedAtMs?: number;
  ctx: AudioContext;
  sampleId: string;
  baseFreq: number;
  volume: number;
  isSector?: boolean;
  output: AudioNode;
  auxTargets?: Array<AudioNode | null | undefined>;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export async function playWaveStarterSample(args: PlayWaveStarterSampleArgs): Promise<boolean> {
  const requestedAtMs = Number.isFinite(args.requestedAtMs ?? NaN)
    ? Number(args.requestedAtMs)
    : readLiveSampleClockMs();
  const requestedAudioTime = args.ctx.currentTime;
  const loaded = await resolveLiveMelodicSampleForAttack({ sampleId: args.sampleId, ctx: args.ctx });
  if (!loaded?.buffer) return false;

  const { ctx, baseFreq, volume, output, auxTargets = [], isSector = false } = args;
  // An unloaded direct hit must not become a delayed attack after I/O or a stall.
  // Wall time also detects stalls while the audio clock is suspended.
  if (!resolveLiveSampleAttackFreshness({
    ctx,
    requestedAtMs,
    requestedAudioTime,
  }).fresh) return false;
  const lease = args.acquireVoice?.();
  if (args.acquireVoice && !lease) return false;
  const nodes: AudioNode[] = [];
  let released = false;
  let source: AudioBufferSourceNode | undefined;
  const cleanup = () => {
    if (released) return;
    released = true;
    for (const node of nodes) { try { node.disconnect(); } catch {} }
    lease?.release();
  };
  const own = <T extends AudioNode>(node: T): T => { nodes.push(node); return node; };
  try {
    source = own(ctx.createBufferSource());
    const highpass = own(ctx.createBiquadFilter());
    const lowpass = own(ctx.createBiquadFilter());
    const pan = own(ctx.createStereoPanner());
    const gain = own(ctx.createGain());

    const playbackProfile = resolveSamplePlaybackProfile({
      loaded,
      targetHz: baseFreq,
      minRate: 0.25,
      maxRate: 4,
    });
    const playableDuration = clamp(playbackProfile.targetDurationSec, 0.18, 2.0);
    const attack = 0.005;
    const release = Math.min(0.08, playableDuration * 0.22);
    const now = ctx.currentTime + 0.002;
    const level = Math.max(0.0002, volume * (isSector ? 1.08 : 1) * (lease?.gainScale ?? 1));
    const panValue = clamp((Math.random() * 2 - 1) * 0.24, -0.3, 0.3);

    source.buffer = loaded.buffer;
    source.playbackRate.setValueAtTime(playbackProfile.playbackRate, now);
    source.loop = playbackProfile.shouldLoop;

    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(42, now);
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(clamp(2400 + baseFreq * 6, 1800, 7600), now);
    lowpass.Q.setValueAtTime(0.9, now);
    pan.pan.setValueAtTime(panValue, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(level, now + attack);
    gain.gain.setValueAtTime(level, Math.max(now + attack + 0.02, now + playableDuration - release));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + playableDuration);

    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(pan);
    pan.connect(gain);
    gain.connect(output);
    (lease?.auxTargets ?? auxTargets).forEach((target) => {
      if (target && target !== output) gain.connect(target);
    });

    source.onended = cleanup;
    source.start(now, 0, playbackProfile.shouldLoop ? undefined : Math.min(loaded.buffer.duration, playableDuration * playbackProfile.playbackRate));
    source.stop(now + playableDuration + 0.02);
    return true;
  } catch {
    try { source?.stop(); } catch {}
    cleanup();
    return false;
  }
}
