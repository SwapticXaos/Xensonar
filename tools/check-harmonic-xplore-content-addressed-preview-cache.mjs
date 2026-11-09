#!/usr/bin/env node
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const cache = read('src/features/l3lab/spectralForge/integral/carrierIntegralRenderedPreviewCache.ts');
const routes = read('src/features/l3lab/spectralForge/integral/carrierIntegralAuditionRoutes.ts');
const pkg = JSON.parse(read('package.json'));

const failures = [];
const requireContains = (haystack, needle, message) => {
  if (!haystack.includes(needle)) failures.push(message);
};
const requireRegex = (haystack, regex, message) => {
  if (!regex.test(haystack)) failures.push(message);
};
const requireNotContains = (haystack, needle, message) => {
  if (haystack.includes(needle)) failures.push(message);
};

if (!/^3\.2\.91-7\.5\.(154|15[5-9]|1[6-9][0-9])$/.test(pkg.version)) {
  failures.push('package version must preserve the 7.5.161+ content-addressed preview cache patch line.');
}

requireContains(cache, "carrier-integral-rendered-preview-cache-7.5.161-inflight-after-paint-truth", 'cache version must be bumped for content-addressed signatures.');
requireContains(cache, 'new Uint32Array(raw.buffer, raw.byteOffset', 'spectral signature must hash the full packed Float32 snapshot, not sparse taps.');
requireContains(cache, 'for (let index = 0; index < words.length; index += 1)', 'spectral signature must iterate over every packed snapshot word.');
requireNotContains(cache, 'Math.floor(length * 0.07)', 'old sparse tap signature must not remain.');
requireContains(cache, 'const renderedPreviewValueCache = new Map<string, unknown>();', 'value cache must exist for rendered preview objects with summaries.');
requireContains(cache, 'getOrRenderCarrierIntegralRenderedPreviewValue', 'generic preview value cache helper must be exported.');
requireContains(cache, 'renderedPreviewValueCache.clear();', 'cache clear must clear the generic value cache too.');

requireContains(routes, 'getOrRenderCarrierIntegralRenderedPreviewValue', 'HarmonicXplore route must use the value cache, not rerender every play.');
requireContains(routes, 'buildStableHarmonicXplorePreviewParamsHash(context)', 'HarmonicXplore route must use a stable audible params hash for prewarm and playback.');
requireContains(routes, "route: 'harmonic-xplore-direct-preview-cache-v2-stable-musical-params'", 'HarmonicXplore cache key must mark its stable musical params contract.');
requireContains(routes, 'profileId: harmonicXplore.profileId', 'HarmonicXplore profile must participate in the cache key.');
requireContains(routes, 'detailMode: harmonicXplore.detailMode', 'HarmonicXplore detail mode must participate in the cache key.');
requireNotContains(routes, "paramsHash: stableCarrierIntegralJson({\n      route: 'harmonic-xplore-direct-preview-cache-v1',\n      harmonicXplore: context.harmonicXplore", 'HarmonicXplore cache key must not include volatile updatedAt/source via the full object.');
requireContains(routes, 'previewDurationMs: Math.round(context.previewDurationSec * 1000)', 'preview duration must participate in the cache key.');
requireContains(routes, 'previewGain: Math.round(context.previewGain * 10000)', 'preview gain must participate in the cache key because the direct renderer bakes gain into the buffer.');
requireContains(routes, "'harmonic-xplore-direct-carrier-cached-preview'", 'cached HarmonicXplore playback lifecycle must be distinguishable.');
requireContains(routes, "'harmonic-xplore-direct-carrier-rendered-preview'", 'fresh HarmonicXplore render lifecycle must be distinguishable.');
requireRegex(routes, /cacheHit:\s*renderedPreview\.cacheHit/, 'audition result must report actual HarmonicXplore cache hits.');
requireNotContains(routes, /cacheHit: false,\n\s*\}\);\n\}/.source, 'stale fixed cacheHit false block should not remain.');

if (failures.length) {
  console.error('[harmonic-xplore-content-addressed-preview-cache] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[harmonic-xplore-content-addressed-preview-cache] OK');
