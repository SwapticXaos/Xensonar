export type PlayOneShotTone = (
  freq: number,
  offsetSeconds: number,
  durationSeconds: number,
  type: OscillatorType,
  volume: number,
  q?: number,
  cutoff?: number,
  destination?: AudioNode | null,
) => void;

/**
 * Create a reusable one-shot tone player.
 * Keeps oscillator/envelope wiring consistent across rooms while allowing custom destinations.
 */
export function createTonePlayer(getAudioCtx: () => AudioContext | null): PlayOneShotTone {
  return (
    freq,
    offsetSeconds,
    durationSeconds,
    type,
    volume,
    q = 1,
    cutoff = 2400,
    destination,
  ) => {
    const audioCtx = getAudioCtx();
    if (!audioCtx) return;

    const startAt = audioCtx.currentTime + offsetSeconds;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.type = type;
    osc.frequency.value = freq;

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cutoff, startAt);
    filter.Q.setValueAtTime(q, startAt);

    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0002, volume),
      startAt + Math.min(0.03, durationSeconds * 0.3),
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSeconds);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    if (destination) {
      gain.connect(destination);
    }

    osc.start(startAt);
    osc.stop(startAt + durationSeconds + 0.02);
  };
}
