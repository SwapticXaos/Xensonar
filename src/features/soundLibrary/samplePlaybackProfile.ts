
export type LoadedMelodicSampleLike = {
  baseHz: number | null;
  tempoPitchLinked?: boolean;
  playbackDurationSec?: number | null;
  buffer: AudioBuffer;
};

export type ResolvedSamplePlaybackProfile = {
  playbackRate: number;
  naturalDurationSec: number;
  targetDurationSec: number;
  shouldLoop: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function resolveSamplePlaybackProfile(args: {
  loaded: LoadedMelodicSampleLike;
  targetHz: number;
  minRate?: number;
  maxRate?: number;
  fallbackHz?: number;
  requestedDurationSec?: number | null;
}) : ResolvedSamplePlaybackProfile {
  const sourceBaseHz = args.loaded.baseHz && args.loaded.baseHz > 24 ? args.loaded.baseHz : (args.fallbackHz ?? null);
  const playbackRate = sourceBaseHz ? clamp(args.targetHz / sourceBaseHz, args.minRate ?? 0.125, args.maxRate ?? 8) : 1;
  const pitchTempoLinked = args.loaded.tempoPitchLinked !== false;
  const targetDurationSec = !pitchTempoLinked && (args.loaded.playbackDurationSec ?? null) != null
    ? Math.max(0.02, args.loaded.playbackDurationSec as number)
    : (args.requestedDurationSec ?? (args.loaded.buffer.duration / playbackRate));
  const naturalDurationSec = pitchTempoLinked ? (args.loaded.buffer.duration / playbackRate) : Math.max(0.02, targetDurationSec);
  return {
    playbackRate,
    naturalDurationSec,
    targetDurationSec: Math.max(0.02, targetDurationSec),
    shouldLoop: !pitchTempoLinked,
  };
}
