import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    console.error(`[xensonar][spectralforge-general-preview-render-cache] FAIL: ${message}`);
    process.exit(1);
  }
}

function mustContain(text, needle, label) {
  assert(text.includes(needle), `${label} must contain ${needle}`);
}

function mustMatch(text, regex, label) {
  assert(regex.test(text), `${label} must match ${regex}`);
}

const cache = read('src/features/l3lab/spectralForge/audio/spectralPreviewRenderCache.ts');
const audioEngine = read('src/features/l3lab/spectralForge/audio/AudioEngine.ts');
const routes = read('src/features/l3lab/spectralForge/integral/carrierIntegralAuditionRoutes.ts');

mustContain(cache, 'SPECTRAL_FORGE_PREVIEW_RENDER_CACHE_VERSION', 'cache module');
mustContain(cache, 'buildSpectralForgePreviewDataSignature', 'cache module');
mustContain(cache, 'spectralData.data', 'cache signature');
mustContain(cache, 'spectralData.grainData', 'cache signature');
mustContain(cache, 'buildSpectralForgePreviewRenderCacheKey', 'cache module');
mustContain(cache, 'getOrRenderSpectralForgePreviewBuffer', 'cache module');
mustMatch(cache, /synthMode/, 'cache key');
mustMatch(cache, /waveformMix/, 'cache key');
mustMatch(cache, /sampleRate/, 'cache key');
mustMatch(cache, /durationSec/, 'cache key');

mustContain(audioEngine, "from './spectralPreviewRenderCache'", 'AudioEngine');
mustContain(audioEngine, 'private renderedBufferCacheKey: string | null = null;', 'AudioEngine state');
mustContain(audioEngine, 'buildSpectralForgePreviewRenderCacheKey({', 'AudioEngine play');
mustContain(audioEngine, 'getOrRenderSpectralForgePreviewBuffer(', 'AudioEngine play');
mustContain(audioEngine, "lifecycleMode: cacheHit ? 'spectral-data-cached-preview' : 'spectral-data-rendered-preview'", 'AudioEngine play lifecycle');
mustMatch(audioEngine, /invalidateBuffer\(\): void \{\s*this\.renderedBuffer = null;\s*this\.renderedBufferCacheKey = null;/s, 'AudioEngine invalidation');

mustContain(routes, 'buildCarrierIntegralRenderedPreviewCacheKey', 'Carrier Integral cache remains separate');
mustContain(routes, 'getOrRenderCarrierIntegralRenderedPreviewBuffer', 'Carrier Integral cache remains separate');

console.log('[xensonar][spectralforge-general-preview-render-cache] OK');
