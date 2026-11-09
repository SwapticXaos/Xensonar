#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const paths = {
  cache: 'src/features/l3lab/spectralForge/integral/carrierIntegralRenderedPreviewCache.ts',
  audition: 'src/features/l3lab/spectralForge/integral/carrierIntegralAudition.ts',
  routes: 'src/features/l3lab/spectralForge/integral/carrierIntegralAuditionRoutes.ts',
  index: 'src/features/l3lab/spectralForge/integral/index.ts',
  tool: 'tools/spectralforge-carrier-integral-rendered-preview-cache.ts',
};
function read(rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    failures.push(`${rel} missing`);
    return '';
  }
  return fs.readFileSync(abs, 'utf8');
}
function has(label, text, marker) {
  if (!text.includes(marker)) failures.push(`${label} missing marker: ${marker}`);
}
function lacks(label, text, marker) {
  if (text.includes(marker)) failures.push(`${label} must not contain marker: ${marker}`);
}

const cache = read(paths.cache);
const audition = read(paths.audition);
const routes = read(paths.routes);
const index = read(paths.index);
const tool = read(paths.tool);

for (const marker of [
  'CARRIER_INTEGRAL_RENDERED_PREVIEW_CACHE_VERSION',
  'CARRIER_INTEGRAL_RENDERED_PREVIEW_CACHE_MAX_ENTRIES',
  'buildCarrierIntegralSnapshotSpectralSignature',
  'buildCarrierIntegralRenderedPreviewCacheKey',
  'getOrRenderCarrierIntegralRenderedPreviewBuffer',
  'clearCarrierIntegralRenderedPreviewCache',
]) has(paths.cache, cache, marker);

for (const forbidden of [
  'audioEngine',
  'playRenderedAudioBufferPreview',
  'renderCarrierLoopBodyPreviewSamples',
  'createCarrierLoopBodyPreviewAudioBufferFromSamples',
  'console.log',
  'document.',
  'window.',
]) lacks(paths.cache, cache, forbidden);

for (const oldLocal of [
  'function snapshotSpectralSignature',
  'function previewCacheKey',
  'function getOrRenderPreviewBuffer',
  'const renderedPreviewBufferCache',
]) lacks(paths.audition, audition, oldLocal);

for (const marker of [
  'carrierIntegralRenderedPreviewCache',
  'buildCarrierIntegralRenderedPreviewCacheKey({',
  'getOrRenderCarrierIntegralRenderedPreviewBuffer(',
]) has(paths.routes, routes, marker);

has(paths.index, index, "export * from './carrierIntegralRenderedPreviewCache';");
has(paths.tool, tool, 'buildCarrierIntegralRenderedPreviewCacheKey');
has(paths.tool, tool, 'clearCarrierIntegralRenderedPreviewCache');

if (failures.length) {
  console.error('[spectralforge-carrier-integral-rendered-preview-cache-boundary] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  cachePath: paths.cache,
  message: 'CarrierIntegral rendered preview cache/key logic is separated from the audition controller without audio/UI side effects.',
}, null, 2));
