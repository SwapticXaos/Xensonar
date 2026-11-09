import type { AudioTimeContext } from '../../../core/time/unifiedTime';
import { getAudioNowSec } from '../../../core/time/unifiedTime';
import type { AudioLaneId } from '../audio/audioLaneContracts';
import type { QuantizeGrid } from '../domain/instrumentData';
import { resolveQuantizeAnchor, getAnchoredQuantizeDueTime } from '../rooms/audioTrafficQuantize';
import { getQuantizeStepSeconds } from '../rooms/resonanceRuntimeMath';

export type SharedAudioTimeSource = 'audio-context' | 'visual-fallback';

export type SharedAudioTimeSnapshot = {
  audioNowSec: number;
  wallNowMs: number;
  bpm: number;
  quantizeGrid: QuantizeGrid;
  quantizeReferenceBars: number;
  quantizeStepSec: number;
  anchorSec: number;
  absoluteStepFloat: number;
  absoluteStepIndex: number;
  nextStepDueSec: number;
  phase01: number;
  source: SharedAudioTimeSource;
  laneId?: AudioLaneId;
};

export type SharedAudioTimeSnapshotArgs = {
  audioCtx?: AudioTimeContext;
  bpm: number;
  quantizeGrid: QuantizeGrid;
  quantizeReferenceBars?: number;
  currentAnchorSec: number | null;
  laneId?: AudioLaneId;
  wallNowMs?: number;
  audioNowSec?: number;
};

function resolveWallNowMs(explicitWallNowMs?: number): number {
  if (Number.isFinite(explicitWallNowMs ?? NaN)) return explicitWallNowMs as number;
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') return performance.now();
  return Date.now();
}

function resolveFiniteBpm(bpm: number): number {
  return Number.isFinite(bpm) ? Math.max(1, bpm) : 108;
}

export function createSharedAudioTimeSnapshot(args: SharedAudioTimeSnapshotArgs): SharedAudioTimeSnapshot {
  const audioNowSec = Number.isFinite(args.audioNowSec ?? NaN)
    ? args.audioNowSec as number
    : getAudioNowSec(args.audioCtx);
  const wallNowMs = resolveWallNowMs(args.wallNowMs);
  const bpm = resolveFiniteBpm(args.bpm);
  const quantizeReferenceBars = Math.max(0.125, Math.min(16, Number.isFinite(args.quantizeReferenceBars ?? NaN) ? Number(args.quantizeReferenceBars) : 1));
  const quantizeStepSec = getQuantizeStepSeconds(bpm, args.quantizeGrid, quantizeReferenceBars);
  const anchorSec = resolveQuantizeAnchor(args.currentAnchorSec, audioNowSec);
  const elapsedSec = Math.max(0, audioNowSec - anchorSec);
  const absoluteStepFloat = elapsedSec / Math.max(0.0001, quantizeStepSec);
  const absoluteStepIndex = Math.floor(absoluteStepFloat);
  const nextStepDueSec = getAnchoredQuantizeDueTime(audioNowSec, quantizeStepSec, anchorSec);
  const phase01 = absoluteStepFloat - Math.floor(absoluteStepFloat);

  return {
    audioNowSec,
    wallNowMs,
    bpm,
    quantizeGrid: args.quantizeGrid,
    quantizeReferenceBars,
    quantizeStepSec,
    anchorSec,
    absoluteStepFloat,
    absoluteStepIndex,
    nextStepDueSec,
    phase01,
    source: args.audioCtx?.currentTime === audioNowSec ? 'audio-context' : 'visual-fallback',
    laneId: args.laneId,
  };
}

export function commitSharedAudioTimeAnchor(ref: { current: number | null }, snapshot: Pick<SharedAudioTimeSnapshot, 'anchorSec'>): void {
  ref.current = snapshot.anchorSec;
}
