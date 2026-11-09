export type SilentWarmupToneSpec = {
  freq: number;
  offsetSec: number;
  cutoffHz: number;
};

export const XENSONAR_SILENT_WARMUP_TONES: readonly SilentWarmupToneSpec[] = [
  { freq: 220, offsetSec: 0.0, cutoffHz: 1800 },
  { freq: 660, offsetSec: 0.03, cutoffHz: 2600 },
  { freq: 110, offsetSec: 0.06, cutoffHz: 900 },
  { freq: 1800, offsetSec: 0.09, cutoffHz: 5200 },
  { freq: 440, offsetSec: 0.12, cutoffHz: 2400 },
] as const;

export const SILENT_AUDIO_WARMUP_CONTRACT = {
  outputGain: 0,
  reason: 'Prime oscillator/filter/envelope paths without emitting a UI-navigation sound.',
  forbiddenCouplings: ['Hauptraum navigation', 'room tab click', 'route change'],
} as const;

export function scheduleSilentAudioWarmupTone(
  ctx: AudioContext,
  destination: AudioNode,
  spec: SilentWarmupToneSpec,
) {
  const now = ctx.currentTime + Math.max(0, spec.offsetSec);
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  osc.type = spec.freq > 1200 ? 'triangle' : 'sine';
  osc.frequency.setValueAtTime(spec.freq, now);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(spec.cutoffHz, now);
  filter.Q.setValueAtTime(spec.freq > 1000 ? 1.2 : 0.8, now);

  // This path is a graph-allocation warmup only. It must never create the small
  // audible tick that can otherwise be mistaken for a Hauptraum navigation sound.
  gain.gain.setValueAtTime(SILENT_AUDIO_WARMUP_CONTRACT.outputGain, now);
  gain.gain.setValueAtTime(SILENT_AUDIO_WARMUP_CONTRACT.outputGain, now + 0.18);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  osc.onended = () => {
    try { osc.disconnect(); } catch {}
    try { filter.disconnect(); } catch {}
    try { gain.disconnect(); } catch {}
  };
  osc.start(now);
  osc.stop(now + 0.18);
}

export function scheduleSilentAudioWarmupSweep(
  ctx: AudioContext,
  destinations: readonly AudioNode[],
  specs: readonly SilentWarmupToneSpec[] = XENSONAR_SILENT_WARMUP_TONES,
) {
  if (destinations.length === 0) return;
  specs.forEach((spec, index) => {
    const destination = destinations[Math.min(index, destinations.length - 1)];
    if (destination) scheduleSilentAudioWarmupTone(ctx, destination, spec);
  });
}
