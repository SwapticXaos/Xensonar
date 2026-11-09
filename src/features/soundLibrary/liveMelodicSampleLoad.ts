import { loadMelodicSampleBuffer } from '@/features/l3lab/canonicalForge/melodicSampleLibrary';
import {
  MELODIC_SAMPLE_LIBRARY_UPDATED_EVENT,
  type MelodicSampleLibraryUpdatedDetail,
} from '@/features/l3lab/melodicSamples/melodicSampleLibraryEvents';

type LoadedMelodicSample = Awaited<ReturnType<typeof loadMelodicSampleBuffer>>;
type ReadyMelodicSample = NonNullable<LoadedMelodicSample>;
type PendingLiveSample = {
  generation: string;
  promise: Promise<LoadedMelodicSample>;
};

type ReadyLiveSample = {
  generation: string;
  loaded: ReadyMelodicSample;
  decodedBytes: number;
};

const MAX_READY_SAMPLE_PROFILES = 16;
const MAX_READY_DECODED_BYTES = 96 * 1024 * 1024;

/** Shares in-flight loads per context and keeps complete, metadata-ready live profiles hot. */
const pendingByContext = new WeakMap<
  BaseAudioContext,
  Map<string, PendingLiveSample>
>();
const readyBySampleId = new Map<string, ReadyLiveSample>();
const generationBySampleId = new Map<string, number>();
let libraryGeneration = 0;
let readyDecodedBytes = 0;

function sampleGeneration(sampleId: string) {
  return `${libraryGeneration}:${generationBySampleId.get(sampleId) ?? 0}`;
}

function decodedBufferBytes(loaded: ReadyMelodicSample): number {
  const buffer = loaded.buffer;
  const frames = Number.isFinite(buffer.length) ? Math.max(0, buffer.length) : 0;
  const channels = Number.isFinite(buffer.numberOfChannels) ? Math.max(1, buffer.numberOfChannels) : 1;
  return frames * channels * Float32Array.BYTES_PER_ELEMENT;
}

function removeReadySample(sampleId: string): void {
  const previous = readyBySampleId.get(sampleId);
  if (!previous) return;
  readyDecodedBytes = Math.max(0, readyDecodedBytes - previous.decodedBytes);
  readyBySampleId.delete(sampleId);
}

function cacheReadySample(sampleId: string, generation: string, loaded: ReadyMelodicSample): void {
  removeReadySample(sampleId);
  const entry: ReadyLiveSample = {
    generation,
    loaded,
    decodedBytes: decodedBufferBytes(loaded),
  };
  readyBySampleId.set(sampleId, entry);
  readyDecodedBytes += entry.decodedBytes;

  // Keep the most recently used decoded material. One oversized current sample
  // remains playable; older profiles yield before long sessions exhaust memory.
  while (
    readyBySampleId.size > 1
    && (readyBySampleId.size > MAX_READY_SAMPLE_PROFILES || readyDecodedBytes > MAX_READY_DECODED_BYTES)
  ) {
    const oldestId = readyBySampleId.keys().next().value as string | undefined;
    if (!oldestId) break;
    removeReadySample(oldestId);
  }
}

export function invalidateLiveMelodicSampleCache(sampleId?: string): void {
  if (sampleId) {
    generationBySampleId.set(sampleId, (generationBySampleId.get(sampleId) ?? 0) + 1);
    removeReadySample(sampleId);
    return;
  }
  libraryGeneration += 1;
  readyBySampleId.clear();
  readyDecodedBytes = 0;
}

if (typeof window !== 'undefined') {
  window.addEventListener(MELODIC_SAMPLE_LIBRARY_UPDATED_EVENT, (event) => {
    const detail = (event as CustomEvent<MelodicSampleLibraryUpdatedDetail>).detail;
    invalidateLiveMelodicSampleCache(detail?.sampleId);
  });
}

export function readLiveSampleClockMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

export type LiveSampleAttackFreshness = {
  fresh: boolean;
  reason: 'fresh' | 'context-not-running' | 'wall-clock-stale' | 'audio-clock-stale' | 'scheduled-onset-stale';
};

export function resolveLiveSampleAttackFreshness(args: {
  ctx: AudioContext;
  requestedAtMs: number;
  requestedAudioTime?: number;
  scheduledStartTime?: number;
  maxWallAgeMs?: number;
  maxAudioAgeSec?: number;
  maxScheduledLatenessSec?: number;
}): LiveSampleAttackFreshness {
  if (args.ctx.state !== 'running') return { fresh: false, reason: 'context-not-running' };
  const scheduled = Number.isFinite(args.scheduledStartTime ?? NaN)
    ? Number(args.scheduledStartTime)
    : null;
  if (scheduled !== null && args.ctx.currentTime - scheduled > (args.maxScheduledLatenessSec ?? 0.04)) {
    return { fresh: false, reason: 'scheduled-onset-stale' };
  }
  if (scheduled === null && readLiveSampleClockMs() - args.requestedAtMs > (args.maxWallAgeMs ?? 48)) {
    return { fresh: false, reason: 'wall-clock-stale' };
  }
  if (
    Number.isFinite(args.requestedAudioTime ?? NaN)
    && args.ctx.currentTime - Number(args.requestedAudioTime) > (args.maxAudioAgeSec ?? 0.08)
  ) {
    return { fresh: false, reason: 'audio-clock-stale' };
  }
  return { fresh: true, reason: 'fresh' };
}

export function loadLiveMelodicSampleBuffer(sampleId: string, ctx: BaseAudioContext) {
  const generation = sampleGeneration(sampleId);
  const ready = readyBySampleId.get(sampleId);
  if (ready?.generation === generation) return Promise.resolve(ready.loaded);
  let pending = pendingByContext.get(ctx);
  if (!pending) {
    pending = new Map();
    pendingByContext.set(ctx, pending);
  }
  const existing = pending.get(sampleId);
  if (existing?.generation === generation) return existing.promise;
  const promise = loadMelodicSampleBuffer(sampleId, ctx).catch(() => null);
  const entry = { generation, promise };
  pending.set(sampleId, entry);
  void promise.then((loaded) => {
    if (loaded && sampleGeneration(sampleId) === generation) {
      cacheReadySample(sampleId, generation, loaded);
    }
    if (pending?.get(sampleId) === entry) pending.delete(sampleId);
  });
  return promise;
}

export function readReadyLiveMelodicSampleBuffer(sampleId: string): ReadyMelodicSample | null {
  const ready = readyBySampleId.get(sampleId);
  if (ready?.generation !== sampleGeneration(sampleId)) return null;
  // Map insertion order doubles as a small LRU without touching the audio data.
  readyBySampleId.delete(sampleId);
  readyBySampleId.set(sampleId, ready);
  return ready.loaded;
}

/**
 * Immediate gestures never resume after cold I/O. A note with enough explicit
 * audio-time lead may await the shared preparation without moving its onset.
 */
export function resolveLiveMelodicSampleForAttack(args: {
  sampleId: string;
  ctx: BaseAudioContext;
  scheduledStartTime?: number;
  minPreparationLeadSec?: number;
}): Promise<ReadyMelodicSample | null> {
  const ready = readReadyLiveMelodicSampleBuffer(args.sampleId);
  if (ready) return Promise.resolve(ready);
  const preparation = loadLiveMelodicSampleBuffer(args.sampleId, args.ctx);
  const scheduledStartTime = Number.isFinite(args.scheduledStartTime ?? NaN)
    ? Number(args.scheduledStartTime)
    : null;
  const hasPreparationWindow = scheduledStartTime !== null
    && scheduledStartTime - args.ctx.currentTime >= (args.minPreparationLeadSec ?? 0.06);
  if (hasPreparationWindow) return preparation;
  void preparation;
  return Promise.resolve(null);
}

function sampleIdFromSelection(selectionId: string | null | undefined): string | null {
  if (!selectionId) return null;
  for (const prefix of ['resident-elastic-sample:', 'resident-sample:', 'sample:'] as const) {
    if (!selectionId.startsWith(prefix)) continue;
    const sampleId = selectionId.slice(prefix.length).trim();
    return sampleId || null;
  }
  return null;
}

/** Decode the currently selected live samples while the instrument is warming up. */
export async function prewarmLiveMelodicSampleSelections(
  ctx: BaseAudioContext,
  selectionIds: ReadonlyArray<string | null | undefined>,
): Promise<void> {
  const sampleIds = [...new Set(selectionIds.map(sampleIdFromSelection).filter((id): id is string => !!id))];
  await Promise.all(sampleIds.map((sampleId) => loadLiveMelodicSampleBuffer(sampleId, ctx)));
}
