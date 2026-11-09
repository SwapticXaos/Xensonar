#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`[carrier-integral-audition-route-boundary] ${message}`);
    process.exit(1);
  }
};

const auditionPath = 'src/features/l3lab/spectralForge/integral/carrierIntegralAudition.ts';
const routesPath = 'src/features/l3lab/spectralForge/integral/carrierIntegralAuditionRoutes.ts';
const requestPath = 'src/features/l3lab/spectralForge/integral/carrierIntegralAuditionRequest.ts';
const indexPath = 'src/features/l3lab/spectralForge/integral/index.ts';

for (const relative of [auditionPath, routesPath, requestPath, indexPath]) {
  assert(fs.existsSync(path.join(root, relative)), `Missing ${relative}`);
}

const audition = read(auditionPath);
const routes = read(routesPath);
const request = read(requestPath);
const index = read(indexPath);

assert(
  audition.includes('auditionCarrierIntegralDonatelloRoute') &&
    audition.includes('auditionCarrierIntegralRawRenderedRoute') &&
    audition.includes('auditionCarrierIntegralDieterV2Route') &&
    audition.includes('auditionCarrierIntegralSyntheticRootFollowRoute'),
  'carrierIntegralAudition.ts must delegate audible audition branches to the route boundary.',
);

assert(!audition.includes("import { audioEngine }"), 'carrierIntegralAudition.ts must not import audioEngine after route extraction.');
assert(!audition.includes('playRenderedAudioBufferPreview('), 'carrierIntegralAudition.ts must not inline rendered-preview playback.');
assert(!audition.includes('playRootFollowSynthPreview('), 'carrierIntegralAudition.ts must not inline root-follow preview playback.');
assert(!audition.includes('renderCarrierLoopBodyPreviewSamples('), 'carrierIntegralAudition.ts must not inline CarrierLoopBody preview rendering.');
assert(!audition.includes('analyzeActualizedAudioBuffer('), 'carrierIntegralAudition.ts must not inline Dieter V2 audio actualization diagnostics.');

for (const symbol of [
  'auditionCarrierIntegralDonatelloRoute',
  'auditionCarrierIntegralRawRenderedRoute',
  'auditionCarrierIntegralDieterV2Route',
  'auditionCarrierIntegralSyntheticRootFollowRoute',
]) {
  assert(routes.includes(`export async function ${symbol}`), `Routes boundary must export ${symbol}.`);
}

assert(routes.includes("import { audioEngine }"), 'Routes boundary must own existing AudioEngine preview calls.');
assert(routes.includes('buildCarrierIntegralRenderedPreviewCacheKey'), 'Routes boundary must preserve rendered-preview cache key usage.');
assert(routes.includes('getOrRenderCarrierIntegralRenderedPreviewBuffer'), 'Routes boundary must preserve rendered-preview cache reuse.');
assert(routes.includes('buildCarrierLoopBodyPreviewAuditionHookPlan'), 'Routes boundary must preserve CarrierLoopBody preview hook plan.');
assert(routes.includes('buildDieterV2EmbodimentRuntime'), 'Routes boundary must preserve explicit Dieter V2 runtime boundary usage.');

assert(request.includes('CarrierIntegralAuditionRequest'), 'Shared audition request type must live in carrierIntegralAuditionRequest.ts.');
assert(index.includes("export * from './carrierIntegralAuditionRequest';"), 'index.ts must export the shared audition request type.');
assert(index.includes("export * from './carrierIntegralAuditionRoutes';"), 'index.ts must export the audition route boundary.');

console.log('[carrier-integral-audition-route-boundary] ok');
