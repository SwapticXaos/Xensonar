import { describeMelodicSamplePitchAnchor, type SavedMelodicSampleMeta } from './melodicSampleLibrary';

export function resolveSamplePlaybackDurationSec(sample: SavedMelodicSampleMeta) {
  return Math.max(0.02, sample.playbackDurationSec ?? sample.durationSec);
}

export function formatSampleTempoSummary(sample: SavedMelodicSampleMeta) {
  return sample.tempoPitchLinked
    ? 'Pitch/Tempo gekoppelt'
    : `Tempo frei · ${resolveSamplePlaybackDurationSec(sample).toFixed(2)} s`;
}

export function formatMelodicSampleCardSummary(sample: SavedMelodicSampleMeta) {
  const tempoSuffix = sample.tempoPitchLinked ? '' : ` · Tempo frei ${resolveSamplePlaybackDurationSec(sample).toFixed(2)} s`;
  return `${describeMelodicSamplePitchAnchor(sample)} · ${sample.durationSec.toFixed(2)} s${tempoSuffix}`;
}

export function formatSampleDurationDraft(sample: SavedMelodicSampleMeta) {
  return resolveSamplePlaybackDurationSec(sample).toFixed(2);
}
