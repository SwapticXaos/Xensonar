import { resolveParticleSampleAnchorHz } from './particleSampleAnchor';
import { resolveSamplePlaybackProfile } from './samplePlaybackProfile';
import { readLiveSampleClockMs, resolveLiveMelodicSampleForAttack, resolveLiveSampleAttackFreshness } from './liveMelodicSampleLoad';
import type { TransientPlaybackLease } from '@/features/resonance/transientRuntime';
import { recordAudioPressureCount } from '../../core/audio/audioPressureMap';
import { scheduleElasticResidentSample } from './residentGranularPlaybackScheduler';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export async function playResidentSample(args: {
  ctx: AudioContext;
  sampleId: string;
  targetHz: number;
  rootFreq?: number;
  volume: number;
  output: AudioNode;
  auxTargets?: Array<AudioNode | null | undefined>;
  startTime?: number;
  elasticPitchStable?: boolean;
  requestedAtMs?: number;
  acquireVoice?: () => TransientPlaybackLease | null;
}) {
  const requestedAtMs = Number.isFinite(args.requestedAtMs ?? NaN)
    ? Number(args.requestedAtMs)
    : readLiveSampleClockMs();
  const loaded = await resolveLiveMelodicSampleForAttack({
    sampleId: args.sampleId,
    ctx: args.ctx,
    scheduledStartTime: args.startTime,
  });
  if (!loaded?.buffer) return false;

  if (!resolveLiveSampleAttackFreshness({
    ctx: args.ctx,
    requestedAtMs,
    scheduledStartTime: args.startTime,
  }).fresh) {
    recordAudioPressureCount('resident-sample-tone', 'async-sample-late-start', 1);
    return false;
  }
  const lease = args.acquireVoice?.();
  if (args.acquireVoice && !lease) return false;

  const now = Math.max(args.ctx.currentTime + 0.002, args.startTime ?? 0);
  const anchor = resolveParticleSampleAnchorHz({
    loadedBaseHz: loaded.baseHz,
    loadedBaseHzSource: loaded.baseHzSource,
    rootFreq: args.rootFreq,
    baseFreq: args.targetHz,
  });
  const playbackProfile = resolveSamplePlaybackProfile({
    loaded,
    targetHz: args.targetHz,
    minRate: 0.125,
    maxRate: 8,
    fallbackHz: args.rootFreq ?? args.targetHz,
    requestedDurationSec: clamp(loaded.playbackDurationSec ?? loaded.buffer.duration, 0.16, 0.72),
  });
  const owned: AudioNode[] = [];
  let cancelGranular: (() => void) | null = null;
  let cleanupTimer: number | null = null;
  let released = false;
  const cleanup = () => {
    if (released) return;
    released = true;
    if (cleanupTimer !== null) window.clearTimeout(cleanupTimer);
    cancelGranular?.();
    owned.forEach((node) => { try { node.disconnect(); } catch {} });
    lease?.release();
  };
  const own = <T extends AudioNode>(node: T): T => { owned.push(node); return node; };
  try {
    const tone = own(args.ctx.createBiquadFilter());
    const pan = own(args.ctx.createStereoPanner());
    const gain = own(args.ctx.createGain());
    tone.type = 'lowpass';
    tone.frequency.setValueAtTime(2800, now);
    tone.Q.setValueAtTime(0.78, now);
    pan.pan.setValueAtTime(0, now);
    gain.gain.setValueAtTime(0.0001, now);
    const nominalDur = clamp(playbackProfile.targetDurationSec, 0.12, 0.75);
    const attack = 0.003;
    const release = 0.05;
    const peak = Math.max(0.0002, args.volume * 0.9 * (lease?.gainScale ?? 1));
    gain.gain.linearRampToValueAtTime(peak, now + attack);
    gain.gain.setValueAtTime(peak, Math.max(now + attack + 0.01, now + nominalDur - release));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + nominalDur);
    tone.connect(pan);
    pan.connect(gain);
    gain.connect(args.output);
    (lease?.auxTargets ?? args.auxTargets ?? []).forEach((target) => {
      if (target && target !== args.output) gain.connect(target);
    });

    if (args.elasticPitchStable) {
      cancelGranular = scheduleElasticResidentSample({
        ctx: args.ctx,
        destination: tone,
        buffer: loaded.buffer,
        noteStart: now,
        noteEnd: now + nominalDur,
        nominalDur,
        playbackRate: clamp(args.targetHz / anchor.anchorHz, 0.125, 8),
      });
    } else {
      const source = own(args.ctx.createBufferSource());
      source.buffer = loaded.buffer;
      source.playbackRate.setValueAtTime(clamp(args.targetHz / anchor.anchorHz, 0.125, 8), now);
      source.connect(tone);
      source.onended = cleanup;
      source.start(now, 0, Math.min(loaded.buffer.duration, nominalDur * Math.max(source.playbackRate.value, 0.125)));
      source.stop(now + nominalDur + 0.03);
      recordAudioPressureCount('resident-sample-tone', 'buffer-source-start', 1);
    }

    cleanupTimer = window.setTimeout(cleanup, Math.max(60, nominalDur * 1000 + 160));
    return true;
  } catch {
    cleanup();
    return false;
  }
}
