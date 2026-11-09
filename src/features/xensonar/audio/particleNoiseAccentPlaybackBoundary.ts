import type { AudioPressureEventKind, AudioPressureSource } from "../../../core/audio/audioPressureMap";
import { clamp, createSoftClipCurve } from "../rooms/resonanceRuntimeMath";
import type { TransientPlaybackLease } from "../../resonance/transientRuntime";
import { isAudioEventValid } from "../../../core/audio/safeAudioScheduling";

export interface ParticleNoiseAccentPlaybackRuntime {
  ctx: AudioContext;
  noiseBuffer: AudioBuffer | null | undefined;
  getMainOutput: (ctx: AudioContext) => AudioNode;
  recordAudioPressureCount: (source: AudioPressureSource, action: AudioPressureEventKind, count?: number) => void;
}

export interface ParticleNoiseAccentPlaybackRequest {
  baseFreq: number;
  offset: number;
  volume: number;
  psyBias: number;
  targetDestinations?: AudioNode | Array<AudioNode | null | undefined> | null;
  acquireVoice?: () => TransientPlaybackLease | null;
  intendedStartTimeSec?: number;
}

export function playParticleNoiseAccentWithLifecycle(
  runtime: ParticleNoiseAccentPlaybackRuntime,
  request: ParticleNoiseAccentPlaybackRequest,
): boolean {
  if (!runtime.noiseBuffer) return false;
  const intensity = clamp(request.psyBias, 0, 1);
  if (intensity <= 0.04 || request.volume <= 0.0001) return false;
  const hasOriginalIntent = request.intendedStartTimeSec !== undefined;
  const intendedStartTimeSec = request.intendedStartTimeSec ?? (runtime.ctx.currentTime + request.offset);
  if (
    hasOriginalIntent &&
    (!Number.isFinite(intendedStartTimeSec) || !isAudioEventValid(runtime.ctx, intendedStartTimeSec, 0.02))
  ) {
    runtime.recordAudioPressureCount("noise-accent-buffer", "voice-rejected", 1);
    return false;
  }

  const requestedTargets = Array.isArray(request.targetDestinations)
    ? request.targetDestinations
    : request.targetDestinations
      ? [request.targetDestinations]
      : [];
  const lease = request.acquireVoice?.();
  if (request.acquireVoice && !lease) return false;
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
    const mainOutput = runtime.getMainOutput(runtime.ctx);
    const auxTargets = lease?.auxTargets ?? requestedTargets;
    const startAt = Math.max(intendedStartTimeSec, runtime.ctx.currentTime + 0.005);
    source = own(runtime.ctx.createBufferSource());
    const highpass = own(runtime.ctx.createBiquadFilter());
    const bandpass = own(runtime.ctx.createBiquadFilter());
    const shaper = own(runtime.ctx.createWaveShaper());
    const gain = own(runtime.ctx.createGain());

    source.buffer = runtime.noiseBuffer;
    highpass.type = "highpass";
    highpass.frequency.setValueAtTime(clamp(request.baseFreq * (2.8 + intensity * 2.1), 1100, 6200), startAt);
    bandpass.type = "bandpass";
    bandpass.frequency.setValueAtTime(clamp(request.baseFreq * (4.8 + intensity * 3.8), 1800, 8400), startAt);
    bandpass.Q.setValueAtTime(0.8 + intensity * 4.6, startAt);
    shaper.curve = createSoftClipCurve(0.85 + intensity * 1.6);
    shaper.oversample = "2x";

    const peakAt = startAt + (0.0012 + (1 - intensity) * 0.0018);
    const endAt = startAt + (0.016 + intensity * 0.028);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, request.volume * (0.02 + intensity * 0.11) * (lease?.gainScale ?? 1)), peakAt);
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

    source.connect(highpass);
    highpass.connect(bandpass);
    bandpass.connect(shaper);
    shaper.connect(gain);
    gain.connect(mainOutput);
    auxTargets.forEach((target) => {
      if (target && target !== mainOutput) gain.connect(target);
    });

    source.onended = cleanup;
    runtime.recordAudioPressureCount("noise-accent-buffer", "buffer-source-start", 1);
    source.start(startAt);
    source.stop(endAt + 0.02);
    return true;
  } catch {
    try { source?.stop(); } catch {}
    cleanup();
    return false;
  }
}
