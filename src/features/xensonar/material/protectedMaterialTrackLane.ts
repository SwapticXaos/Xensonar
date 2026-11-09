import type { AudioTimeContext } from '../../../core/time/unifiedTime';
import type { MaterialEntry } from '../../l3lab/materialLibrary';
import { AUDIO_LANE_IDS } from '../audio/audioLaneContracts';
import { createSharedAudioTimeSnapshot, type SharedAudioTimeSnapshot } from '../audioTraffic/sharedAudioTimeContract';
import { getEffectiveMaterialLoopBars, type MaterialLoopTimeMode } from './materialLoopMath';

export type ProtectedMaterialTrackPlaybackPlan = {
  sharedTime: SharedAudioTimeSnapshot;
  barDurationSec: number;
  interpretedBars: number;
  desiredLoopDurationSec: number;
  loopStartSec: number;
  loopEndSec: number;
  sourceDurationSec: number;
  playbackRate: number;
  gainValue: number;
  startAtSec: number;
  syncToBeat: boolean;
};

const MATERIAL_TRACK_TRANSPORT_ANCHOR_SEC = 0;
const MATERIAL_TRACK_BAR_QUANTIZE_GRID = 16;

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function resolveMaterialTrackBpm(bpm: number): number {
  return Math.max(40, Number.isFinite(bpm) && bpm > 0 ? bpm : 108);
}

export function resolveProtectedMaterialTrackPlaybackPlan(args: {
  audioCtx: AudioTimeContext;
  entry: MaterialEntry;
  bufferDurationSec: number;
  bpm: number;
  timeMode: MaterialLoopTimeMode;
  volume: number;
  syncToBeat: boolean;
}): ProtectedMaterialTrackPlaybackPlan {
  const bpm = resolveMaterialTrackBpm(args.bpm);
  const sharedTime = createSharedAudioTimeSnapshot({
    audioCtx: args.audioCtx,
    bpm,
    quantizeGrid: MATERIAL_TRACK_BAR_QUANTIZE_GRID,
    currentAnchorSec: MATERIAL_TRACK_TRANSPORT_ANCHOR_SEC,
    laneId: AUDIO_LANE_IDS.MATERIAL_TRACK,
  });
  const barDurationSec = sharedTime.quantizeStepSec * MATERIAL_TRACK_BAR_QUANTIZE_GRID;
  const interpretedBars = getEffectiveMaterialLoopBars(args.entry, args.timeMode);
  const desiredLoopDurationSec = Math.max(0.25, barDurationSec * interpretedBars);
  const bufferDurationSec = Math.max(0.01, Number.isFinite(args.bufferDurationSec) ? args.bufferDurationSec : 0.01);
  const loopStartSec = Math.max(0, Math.min(bufferDurationSec - 0.01, args.entry.loopStartSec ?? 0));
  const loopEndSec = Math.max(loopStartSec + 0.01, Math.min(bufferDurationSec, args.entry.loopEndSec ?? bufferDurationSec));
  const sourceDurationSec = Math.max(0.01, loopEndSec - loopStartSec);
  const playbackRate = clampNumber(sourceDurationSec / desiredLoopDurationSec, 0.125, 8);
  const gainValue = Math.max(0.0001, args.volume);
  const startAtSec = args.syncToBeat
    ? Math.ceil((sharedTime.audioNowSec + 1e-6) / barDurationSec) * barDurationSec
    : sharedTime.audioNowSec + 0.01;

  return {
    sharedTime,
    barDurationSec,
    interpretedBars,
    desiredLoopDurationSec,
    loopStartSec,
    loopEndSec,
    sourceDurationSec,
    playbackRate,
    gainValue,
    startAtSec,
    syncToBeat: args.syncToBeat,
  };
}
