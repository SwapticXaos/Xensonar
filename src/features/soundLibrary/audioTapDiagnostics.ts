import type { AudioEventIntakeState, AudioTapPoint, AudioTapSnapshot } from './audioEventIntake';

export type AudioTapMeterSummary = {
  tap: AudioTapPoint;
  rms: number;
  peak: number;
  activeVoices: number;
  timestampSec: number;
};

export type AudioTapMonitorSummary = {
  taps: Record<AudioTapPoint, AudioTapMeterSummary | null>;
  diagnosis: string;
  hottestTap: AudioTapPoint | null;
};

export const analyseTapMeter = (analyser: AnalyserNode, scratch: Uint8Array) => {
  analyser.getByteTimeDomainData(scratch as Uint8Array<ArrayBuffer>);
  let sum = 0;
  let peak = 0;
  for (let i = 0; i < scratch.length; i += 1) {
    const sample = (scratch[i] - 128) / 128;
    sum += sample * sample;
    peak = Math.max(peak, Math.abs(sample));
  }
  return {
    rms: Math.sqrt(sum / Math.max(1, scratch.length)),
    peak,
  };
};

export const createAudioTapSnapshot = (
  tap: AudioTapPoint,
  analyser: AnalyserNode | null,
  scratch: Uint8Array | null,
  timestampSec: number,
  activeVoices: number,
): AudioTapSnapshot | null => {
  if (!analyser || !scratch) return null;
  const { rms, peak } = analyseTapMeter(analyser, scratch);
  return {
    tap,
    activeVoices,
    timestampSec,
    rms,
    peak,
  };
};

export const pushAudioTapSnapshot = (
  state: AudioEventIntakeState,
  snapshot: AudioTapSnapshot,
  maxSnapshots = 24,
): AudioEventIntakeState => ({
  ...state,
  latestTapSnapshots: [...state.latestTapSnapshots, snapshot].slice(-maxSnapshots),
});

const latestByTap = (snapshots: AudioTapSnapshot[]): Record<AudioTapPoint, AudioTapSnapshot | null> => ({
  pre_fx: [...snapshots].reverse().find((entry) => entry.tap === 'pre_fx') ?? null,
  post_fx: [...snapshots].reverse().find((entry) => entry.tap === 'post_fx') ?? null,
  monitor: [...snapshots].reverse().find((entry) => entry.tap === 'monitor') ?? null,
});

export const summarizeAudioTapState = (state: AudioEventIntakeState): AudioTapMonitorSummary => {
  const taps = latestByTap(state.latestTapSnapshots);
  const hottestTap = (['pre_fx', 'post_fx', 'monitor'] as AudioTapPoint[])
    .filter((tap) => taps[tap])
    .sort((a, b) => (taps[b]?.peak ?? 0) - (taps[a]?.peak ?? 0))[0] ?? null;

  const pre = taps.pre_fx;
  const post = taps.post_fx;
  const monitor = taps.monitor;

  let diagnosis = 'Kein klarer Engpass sichtbar.';
  if (pre && post && monitor) {
    if (monitor.peak > post.peak + 0.06 || monitor.rms > post.rms + 0.04) {
      diagnosis = 'Monitor wirkt unruhiger als Nach-FX. Das spricht eher für outputnahe Endstufe oder Monitoring.';
    } else if (post.peak > pre.peak + 0.06 || post.rms > pre.rms + 0.04) {
      diagnosis = 'Nach-FX wirkt nervöser als Vor-FX. Das spricht eher für Limiter-, Clip- oder Master-Schicht.';
    } else if (pre.peak > 0.92 || (pre.activeVoices >= 4 && pre.rms > 0.18)) {
      diagnosis = 'Schon vor FX kommt dichter Druck an. Eher Ereignisballung oder Voice-Churn als reines Endstufenproblem.';
    }
  }

  return {
    taps,
    diagnosis,
    hottestTap,
  };
};
