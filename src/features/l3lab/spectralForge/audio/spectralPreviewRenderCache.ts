import type { SynthMode, WaveformMix } from '../state/storeTypes';
import type { SpectralData } from './SpectralData';

export const SPECTRAL_FORGE_PREVIEW_RENDER_CACHE_VERSION =
  'spectral-forge-preview-render-cache-7.5.157-content-addressed-serial-after-paint' as const;

export const SPECTRAL_FORGE_PREVIEW_RENDER_CACHE_MAX_ENTRIES = 8;

export type SpectralForgePreviewRenderCacheKeyArgs = {
  spectralData: SpectralData;
  synthMode: SynthMode;
  waveformMix: WaveformMix;
  sampleRate: number;
  durationSec: number;
};

export type SpectralForgePreviewRenderBufferResult = {
  buffer: AudioBuffer;
  cacheHit: boolean;
};

let previewCacheGeneration = 0;
const spectralForgePreviewRenderBufferCache = new Map<string, AudioBuffer>();
const spectralForgePreviewRenderInflightCache = new Map<string, Promise<AudioBuffer>>();

function hashFloat32Layer(layer: Float32Array): string {
  const words = new Uint32Array(
    layer.buffer,
    layer.byteOffset,
    Math.floor(layer.byteLength / 4),
  );
  let hash = 2166136261 ^ (layer.length >>> 0);
  for (let index = 0; index < words.length; index += 1) {
    hash ^= words[index]!;
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return `${layer.length}:${hash.toString(36)}`;
}

export function buildSpectralForgePreviewDataSignature(spectralData: SpectralData): string {
  return [
    spectralData.width,
    spectralData.height,
    hashFloat32Layer(spectralData.data),
    hashFloat32Layer(spectralData.grainData),
  ].join(':');
}

function buildWaveformMixSignature(waveformMix: WaveformMix): string {
  return [
    `sine=${Math.round((waveformMix.sine ?? 0) * 10000)}`,
    `triangle=${Math.round((waveformMix.triangle ?? 0) * 10000)}`,
    `sawtooth=${Math.round((waveformMix.sawtooth ?? 0) * 10000)}`,
    `square=${Math.round((waveformMix.square ?? 0) * 10000)}`,
  ].join(',');
}

export function buildSpectralForgePreviewRenderCacheKey(
  args: SpectralForgePreviewRenderCacheKeyArgs,
): string {
  return [
    SPECTRAL_FORGE_PREVIEW_RENDER_CACHE_VERSION,
    buildSpectralForgePreviewDataSignature(args.spectralData),
    args.synthMode,
    buildWaveformMixSignature(args.waveformMix),
    Math.round(args.durationSec * 1000),
    Math.round(args.sampleRate),
  ].join('|');
}

function storeSpectralForgePreviewBuffer(key: string, buffer: AudioBuffer): AudioBuffer {
  spectralForgePreviewRenderBufferCache.set(key, buffer);
  while (spectralForgePreviewRenderBufferCache.size > SPECTRAL_FORGE_PREVIEW_RENDER_CACHE_MAX_ENTRIES) {
    const first = spectralForgePreviewRenderBufferCache.keys().next().value;
    if (!first) break;
    spectralForgePreviewRenderBufferCache.delete(first);
  }
  return buffer;
}

export function hasSpectralForgePreviewBuffer(key: string): boolean {
  return spectralForgePreviewRenderBufferCache.has(key);
}

export async function getOrRenderSpectralForgePreviewBuffer(
  key: string,
  renderer: () => Promise<AudioBuffer>,
): Promise<SpectralForgePreviewRenderBufferResult> {
  const cached = spectralForgePreviewRenderBufferCache.get(key);
  if (cached) return { buffer: cached, cacheHit: true };

  const inflight = spectralForgePreviewRenderInflightCache.get(key);
  if (inflight) return { buffer: await inflight, cacheHit: true };

  const generation = previewCacheGeneration;
  const renderPromise = renderer()
    .then((buffer) => {
      // Clearing a session invalidates cache ownership, not the original caller's result.
      if (generation === previewCacheGeneration) storeSpectralForgePreviewBuffer(key, buffer);
      return buffer;
    })
    .finally(() => {
      // An older render must not delete a newer in-flight render for the same key.
      if (spectralForgePreviewRenderInflightCache.get(key) === renderPromise) {
        spectralForgePreviewRenderInflightCache.delete(key);
      }
    });
  spectralForgePreviewRenderInflightCache.set(key, renderPromise);
  return { buffer: await renderPromise, cacheHit: false };
}

export async function prewarmSpectralForgePreviewBuffer(
  key: string,
  renderer: () => Promise<AudioBuffer>,
): Promise<SpectralForgePreviewRenderBufferResult> {
  return getOrRenderSpectralForgePreviewBuffer(key, renderer);
}

export function getSpectralForgePreviewRenderCacheSize(): number {
  return spectralForgePreviewRenderBufferCache.size;
}

export function getSpectralForgePreviewRenderInflightSize(): number {
  return spectralForgePreviewRenderInflightCache.size;
}

export function clearSpectralForgePreviewRenderCache(): void {
  previewCacheGeneration += 1;
  spectralForgePreviewRenderBufferCache.clear();
  spectralForgePreviewRenderInflightCache.clear();
}
