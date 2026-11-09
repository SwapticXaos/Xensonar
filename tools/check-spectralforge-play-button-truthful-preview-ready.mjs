#!/usr/bin/env node
import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const fail = (msg) => {
  console.error(`[xensonar][play-button-truthful-preview-ready] FAIL: ${msg}`);
  process.exit(1);
};
const ok = (msg) => console.log(`[xensonar][play-button-truthful-preview-ready] OK: ${msg}`);
const has = (src, needle, label = needle) => {
  if (!src.includes(needle)) fail(`missing ${label}`);
};
const notHas = (src, needle, label = needle) => {
  if (src.includes(needle)) fail(`unexpected ${label}`);
};

const transport = read('src/features/l3lab/spectralForge/components/TransportBar.tsx');
const basis = read('src/features/l3lab/spectralForge/components/transportBar/spectralForgeBasisHearingPreview.ts');
const audition = read('src/features/l3lab/spectralForge/integral/carrierIntegralAudition.ts');
const routes = read('src/features/l3lab/spectralForge/integral/carrierIntegralAuditionRoutes.ts');
const cache = read('src/features/l3lab/spectralForge/integral/carrierIntegralRenderedPreviewCache.ts');
const pkg = read('package.json');

if (!/3\.2\.91-7\.5\.(175|176|177|178)/.test(pkg)) failures.push('missing package version 7.5.175+');
has(transport, 'previewReadyForImmediatePlay', 'ready-state driven play button');
has(transport, 'preparedPreviewToken === currentPreviewPreparedToken', 'full-green token equality contract');
has(transport, 'Vorschau bereit · startet sofort', 'truthful full-green tooltip');
has(transport, 'Vorschau noch nicht vorgerechnet', 'not-ready idle tooltip');
has(basis, 'prewarmSpectralForgeBasisHearingPreview', 'basis-hearing prewarm API remains available outside pointer lifecycle');
has(transport, 'prewarmSpectralForgeBasisHearingPreview', 'basis hearing after-paint prewarm is wired');
has(transport, 'Hörweise wird fertig vorgerechnet', 'basis hearing render status is no longer play-only');
has(transport, 'const previewIsPrepared = preparedPreviewToken === currentPreviewPreparedToken', 'play path checks prepared token');
has(transport, 'const playNeedsRenderFeedback = false', 'no fake play animation when already prepared');
has(transport, 'if (playNeedsRenderFeedback) {', 'render feedback branch remains gated');
has(transport, 'markPlaybackStarted();', 'isPlaying set after playback path schedules');
notHas(transport, 'setIsPlaying(true);\n      setShowPlayheadMarker(true);\n      const playFrom = 0;', 'old fake-playing-before-render sequence');

has(basis, 'export async function prewarmSpectralForgeBasisHearingPreview', 'basis hearing render-only prewarm API');
has(basis, 'prewarmForgeProjectCarrierIntegralPreview', 'basis prewarm routes through carrier cache');
has(basis, 'standalone-basis-hearing-preview-cache-v1', 'standalone/Strange Attractor basis-hearing cache key');
has(basis, 'spectralforge-basis-strange-attractor-cached-preview', 'standalone preview cached lifecycle');
has(basis, 'cacheHit: result.cacheHit', 'play result exposes cacheHit');
has(audition, 'export async function prewarmForgeProjectCarrierIntegralPreview', 'carrier integral prewarm coordinator');
has(routes, 'export async function prewarmCarrierIntegralHarmonicXploreDirectRoute', 'HarmonicXplore render-only prewarm route');
has(routes, 'export async function prewarmCarrierIntegralRawRenderedRoute', 'Pure Dieter render-only prewarm route');
has(cache, 'renderedPreviewValueInflightCache', 'carrier integral value inflight cache');
has(cache, 'renderedPreviewBufferInflightCache', 'carrier integral buffer inflight cache');
has(cache, 'carrier-integral-rendered-preview-cache-7.5.161-inflight-after-paint-truth', 'new cache version');

ok('full-green means prepared preview token; successful Play marks rendered previews prepared; after-paint basis prewarm is separately wired');
