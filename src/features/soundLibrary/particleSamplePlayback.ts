import { readLiveSampleClockMs, resolveLiveMelodicSampleForAttack, resolveLiveSampleAttackFreshness } from './liveMelodicSampleLoad';
import type { TransientPlaybackLease } from '@/features/resonance/transientRuntime';
import { resolveParticleSampleAnchorHz } from './particleSampleAnchor';
import { recordAudioPressureCount } from '../../core/audio/audioPressureMap';

export type ParticleSampleGradientAxes = {
  brightness: number;
  attackHardness: number;
};

export type ParticleSampleProfileMode = 'current_db_v2' | 'legacy_90_40';

type PlayParticleSampleArgs = {
  acquireVoice?: () => TransientPlaybackLease | null;
  requestedAtMs?: number;
  ctx: AudioContext;
  sampleId: string;
  baseFreq: number;
  rootFreq?: number;
  volume: number;
  output: AudioNode;
  auxTargets?: Array<AudioNode | null | undefined>;
  axes?: ParticleSampleGradientAxes;
  startTime?: number;
  profileMode?: ParticleSampleProfileMode;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export async function playParticleSample(args: PlayParticleSampleArgs): Promise<boolean> {
  const requestedAtMs = Number.isFinite(args.requestedAtMs ?? NaN)
    ? Number(args.requestedAtMs)
    : readLiveSampleClockMs();
  const loaded = await resolveLiveMelodicSampleForAttack({
    sampleId: args.sampleId,
    ctx: args.ctx,
    scheduledStartTime: args.startTime,
  });
  if (!loaded?.buffer) return false;

  const { ctx, baseFreq, volume, output, auxTargets = [] } = args;
  const scheduledStartTime = args.startTime;
  if (!resolveLiveSampleAttackFreshness({ ctx, requestedAtMs, scheduledStartTime }).fresh) {
    recordAudioPressureCount('particle-sample-tone', 'async-sample-late-start', 1);
    return false;
  }
  const lease = args.acquireVoice?.();
  if (args.acquireVoice && !lease) return false;
  const owned: AudioNode[] = [];
  let released = false;
  let source: AudioBufferSourceNode | undefined;
  const cleanup = () => {
    if (released) return;
    released = true;
    owned.forEach((node) => { try { node.disconnect(); } catch {} });
    lease?.release();
  };
  const own = <T extends AudioNode>(node: T): T => { owned.push(node); return node; };
  try {
    const axes = args.axes ?? { brightness: 0, attackHardness: 0 };
    const now = Math.max(ctx.currentTime + 0.002, scheduledStartTime ?? 0);
    source = own(ctx.createBufferSource());
    const highpass = own(ctx.createBiquadFilter());
    const tone = own(ctx.createBiquadFilter());
    const pan = own(ctx.createStereoPanner());
    const gain = own(ctx.createGain());

    const brightness = clamp(axes.brightness, 0, 1);
    const attackHardness = clamp(axes.attackHardness, 0, 1);
    const resolvedAnchor = resolveParticleSampleAnchorHz({
      loadedBaseHz: loaded.baseHz,
      loadedBaseHzSource: loaded.baseHzSource,
      rootFreq: args.rootFreq,
      baseFreq,
    });
    const playbackRate = clamp(baseFreq / resolvedAnchor.anchorHz, 0.125, 8);
    const naturalDuration = loaded.buffer.duration / playbackRate;
    const gradientTargetDuration = clamp(0.28 + brightness * 0.18 - attackHardness * 0.08, 0.14, 0.5);
    const profileMode = args.profileMode ?? 'current_db_v2';
    const legacyDuration = clamp(0.75 + brightness * 0.2 - attackHardness * 0.12, 0.06, 0.8);
    const decoupledTargetDuration = loaded.tempoPitchLinked === false
      ? clamp(loaded.playbackDurationSec ?? 0.8, 0.06, 0.8)
      : null;
    const targetDuration = profileMode === 'legacy_90_40'
      ? legacyDuration
      : (decoupledTargetDuration ?? gradientTargetDuration);
    const playableDuration = Math.max(0.06, Math.min(naturalDuration, targetDuration));
    const attack = clamp(0.002 + (1 - attackHardness) * 0.005, 0.0015, 0.008);
    const release = clamp(0.03 + (1 - attackHardness) * 0.05, 0.025, 0.09);
    const peakLevel = Math.max(0.0002, volume * (0.72 + brightness * 0.18 + attackHardness * 0.08) * (lease?.gainScale ?? 1));
    const panValue = clamp((Math.random() * 2 - 1) * (0.14 + brightness * 0.18), -0.32, 0.32);

    source.buffer = loaded.buffer;
    source.playbackRate.setValueAtTime(playbackRate, now);
    source.loop = false;

    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(clamp(120 + attackHardness * 360, 80, 520), now);
    tone.type = 'lowpass';
    tone.frequency.setValueAtTime(clamp(1800 + brightness * 4200 + attackHardness * 600, 1400, 7600), now);
    tone.Q.setValueAtTime(0.7 + brightness * 0.6, now);
    pan.pan.setValueAtTime(panValue, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peakLevel, now + attack);
    gain.gain.setValueAtTime(peakLevel, Math.max(now + attack + 0.01, now + playableDuration - release));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + playableDuration);

    source.connect(highpass);
    highpass.connect(tone);
    tone.connect(pan);
    pan.connect(gain);
    gain.connect(output);
    (lease?.auxTargets ?? auxTargets).forEach((target) => {
      if (target && target !== output) gain.connect(target);
    });

    source.onended = cleanup;
    recordAudioPressureCount('particle-sample-tone', 'buffer-source-start', 1);
    source.start(now, 0, Math.min(loaded.buffer.duration, playableDuration * playbackRate));
    source.stop(now + playableDuration + 0.02);
    return true;
  } catch {
    try { source?.stop(); } catch {}
    cleanup();
    return false;
  }
}
