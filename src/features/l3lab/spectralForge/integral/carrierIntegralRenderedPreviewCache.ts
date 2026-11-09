import type { ForgeProjectSnapshot } from '../state/storeTypes';
import type { CarrierIntegralMachineId } from './carrierIntegralContracts';
import { stableCarrierIntegralJson } from './carrierIntegralStableIdentity';

export const CARRIER_INTEGRAL_RENDERED_PREVIEW_CACHE_VERSION = 'carrier-integral-rendered-preview-cache-7.5.161-inflight-after-paint-truth' as const;
export const CARRIER_INTEGRAL_RENDERED_PREVIEW_CACHE_MAX_ENTRIES = 12;

export type CarrierIntegralRenderedPreviewSynthLabFingerprint = {
  presetId?: string | null;
  paramsPatch?: unknown;
};

export type CarrierIntegralRenderedPreviewCacheKeyArgs = {
  machineId: CarrierIntegralMachineId;
  snapshot: ForgeProjectSnapshot;
  durationSec: number;
  previewBpm: number;
  previewPitchSemitones?: number | null;
  synthLab?: CarrierIntegralRenderedPreviewSynthLabFingerprint | null;
  paramsHash?: string;
};

export type CarrierIntegralRenderedPreviewBufferResult = {
  buffer: AudioBuffer;
  cacheHit: boolean;
};

export type CarrierIntegralRenderedPreviewCacheProbeRecord = {
  key: string;
  cacheHits: number;
  inflightHits: number;
  rendersStarted: number;
  rendersCompleted: number;
  renderErrors: number;
  lastRenderStartedAt: number | null;
  lastRenderCompletedAt: number | null;
  lastCacheHitAt: number | null;
};

const renderedPreviewBufferCache = new Map<string, AudioBuffer>();
const renderedPreviewBufferInflightCache = new Map<string, Promise<AudioBuffer>>();
const renderedPreviewBufferProbeRecords = new Map<string, CarrierIntegralRenderedPreviewCacheProbeRecord>();
const renderedPreviewValueCache = new Map<string, unknown>();
const renderedPreviewValueInflightCache = new Map<string, Promise<unknown>>();

function nowForCarrierIntegralRenderedPreviewProbe(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function getOrCreateCarrierIntegralRenderedPreviewProbeRecord(
  key: string,
): CarrierIntegralRenderedPreviewCacheProbeRecord {
  const existing = renderedPreviewBufferProbeRecords.get(key);
  if (existing) return existing;
  const record: CarrierIntegralRenderedPreviewCacheProbeRecord = {
    key,
    cacheHits: 0,
    inflightHits: 0,
    rendersStarted: 0,
    rendersCompleted: 0,
    renderErrors: 0,
    lastRenderStartedAt: null,
    lastRenderCompletedAt: null,
    lastCacheHitAt: null,
  };
  renderedPreviewBufferProbeRecords.set(key, record);
  return record;
}

function trimCarrierIntegralRenderedPreviewProbeRecords(): void {
  while (renderedPreviewBufferProbeRecords.size > CARRIER_INTEGRAL_RENDERED_PREVIEW_CACHE_MAX_ENTRIES * 2) {
    const first = renderedPreviewBufferProbeRecords.keys().next().value;
    if (!first) break;
    renderedPreviewBufferProbeRecords.delete(first);
  }
}

export function buildCarrierIntegralSnapshotSpectralSignature(snapshot: ForgeProjectSnapshot): string {
  const raw = snapshot.spectralSnapshot;
  const length = typeof raw?.length === 'number' ? raw.length : 0;
  if (!length) return 'empty';

  // This signature is intentionally content-addressed over the full packed
  // amplitude+grain snapshot. The old sparse tap hash was cheap, but it could
  // miss local brush edits and keep a stale preview alive. A full FNV-style pass
  // is still far cheaper than rerendering a HarmonicXplore/Materialkörper buffer,
  // and it gives the preview cache the musical contract the UI implies:
  // unchanged drawing => replay cached body; changed drawing/grain => rerender.
  const words = new Uint32Array(raw.buffer, raw.byteOffset, Math.floor(raw.byteLength / 4));
  let hash = 2166136261 ^ (length >>> 0);
  for (let index = 0; index < words.length; index += 1) {
    hash ^= words[index]!;
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return `${length}:${hash.toString(36)}`;
}

export function buildCarrierIntegralRenderedPreviewCacheKey(args: CarrierIntegralRenderedPreviewCacheKeyArgs): string {
  return [
    CARRIER_INTEGRAL_RENDERED_PREVIEW_CACHE_VERSION,
    args.machineId,
    buildCarrierIntegralSnapshotSpectralSignature(args.snapshot),
    args.snapshot.synthMode,
    stableCarrierIntegralJson(args.snapshot.waveformMix),
    Math.round(args.durationSec * 1000),
    Math.round(args.previewBpm * 10),
    Math.round((args.previewPitchSemitones ?? 0) * 100),
    args.synthLab?.presetId ?? 'no-synth-lab',
    args.synthLab ? stableCarrierIntegralJson(args.synthLab.paramsPatch ?? {}) : '{}',
    args.paramsHash ?? 'no-params',
  ].join('|');
}

function trimCarrierIntegralRenderedPreviewBufferCache(): void {
  while (renderedPreviewBufferCache.size > CARRIER_INTEGRAL_RENDERED_PREVIEW_CACHE_MAX_ENTRIES) {
    const first = renderedPreviewBufferCache.keys().next().value;
    if (!first) break;
    renderedPreviewBufferCache.delete(first);
  }
}

function trimCarrierIntegralRenderedPreviewValueCache(): void {
  while (renderedPreviewValueCache.size > CARRIER_INTEGRAL_RENDERED_PREVIEW_CACHE_MAX_ENTRIES) {
    const first = renderedPreviewValueCache.keys().next().value;
    if (!first) break;
    renderedPreviewValueCache.delete(first);
  }
}

export function hasCarrierIntegralRenderedPreviewBuffer(key: string): boolean {
  return renderedPreviewBufferCache.has(key);
}

export function hasCarrierIntegralRenderedPreviewValue(key: string): boolean {
  return renderedPreviewValueCache.has(key);
}

export function hasCarrierIntegralRenderedPreviewInflight(key: string): boolean {
  return renderedPreviewBufferInflightCache.has(key) || renderedPreviewValueInflightCache.has(key);
}

export async function getOrRenderCarrierIntegralRenderedPreviewBuffer(
  key: string,
  renderer: () => Promise<AudioBuffer>,
): Promise<CarrierIntegralRenderedPreviewBufferResult> {
  const probe = getOrCreateCarrierIntegralRenderedPreviewProbeRecord(key);
  const cached = renderedPreviewBufferCache.get(key);
  if (cached) {
    probe.cacheHits += 1;
    probe.lastCacheHitAt = nowForCarrierIntegralRenderedPreviewProbe();
    return { buffer: cached, cacheHit: true };
  }

  const inflight = renderedPreviewBufferInflightCache.get(key);
  if (inflight) {
    probe.inflightHits += 1;
    return { buffer: await inflight, cacheHit: true };
  }

  probe.rendersStarted += 1;
  probe.lastRenderStartedAt = nowForCarrierIntegralRenderedPreviewProbe();
  const renderPromise = renderer()
    .then((buffer) => {
      probe.rendersCompleted += 1;
      probe.lastRenderCompletedAt = nowForCarrierIntegralRenderedPreviewProbe();
      renderedPreviewBufferCache.set(key, buffer);
      trimCarrierIntegralRenderedPreviewBufferCache();
      trimCarrierIntegralRenderedPreviewProbeRecords();
      return buffer;
    })
    .catch((error) => {
      probe.renderErrors += 1;
      throw error;
    })
    .finally(() => renderedPreviewBufferInflightCache.delete(key));
  renderedPreviewBufferInflightCache.set(key, renderPromise);
  return { buffer: await renderPromise, cacheHit: false };
}


export async function getOrRenderCarrierIntegralRenderedPreviewValue<T>(
  key: string,
  renderer: () => Promise<T> | T,
): Promise<{ value: T; cacheHit: boolean }> {
  if (renderedPreviewValueCache.has(key)) {
    return { value: renderedPreviewValueCache.get(key) as T, cacheHit: true };
  }

  const inflight = renderedPreviewValueInflightCache.get(key);
  if (inflight) return { value: await inflight as T, cacheHit: true };

  const renderPromise = Promise.resolve()
    .then(renderer)
    .then((value) => {
      renderedPreviewValueCache.set(key, value);
      trimCarrierIntegralRenderedPreviewValueCache();
      return value;
    })
    .finally(() => renderedPreviewValueInflightCache.delete(key));
  renderedPreviewValueInflightCache.set(key, renderPromise as Promise<unknown>);
  return { value: await renderPromise, cacheHit: false };
}

export function getCarrierIntegralRenderedPreviewCacheSize(): number {
  return renderedPreviewBufferCache.size + renderedPreviewValueCache.size;
}

export function getCarrierIntegralRenderedPreviewBufferProbeRecord(
  key: string,
): CarrierIntegralRenderedPreviewCacheProbeRecord | null {
  const record = renderedPreviewBufferProbeRecords.get(key);
  return record ? { ...record } : null;
}

export function getCarrierIntegralRenderedPreviewBufferProbeRecords(): CarrierIntegralRenderedPreviewCacheProbeRecord[] {
  return Array.from(renderedPreviewBufferProbeRecords.values(), (record) => ({ ...record }));
}

export function clearCarrierIntegralRenderedPreviewCacheProbeRecords(): void {
  renderedPreviewBufferProbeRecords.clear();
}

export function clearCarrierIntegralRenderedPreviewCache(): void {
  renderedPreviewBufferCache.clear();
  renderedPreviewBufferInflightCache.clear();
  renderedPreviewBufferProbeRecords.clear();
  renderedPreviewValueCache.clear();
  renderedPreviewValueInflightCache.clear();
}
