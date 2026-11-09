#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const paths = {
  hook: 'src/features/l3lab/spectralForge/integral/carrierLoopBodyPreviewAuditionHook.ts',
  request: 'src/features/l3lab/spectralForge/integral/carrierLoopBodyPreviewAuditionRequest.ts',
  plan: 'src/features/l3lab/spectralForge/integral/carrierLoopBodyPreviewAuditionPlan.ts',
  audition: 'src/features/l3lab/spectralForge/integral/carrierIntegralAudition.ts',
  routes: 'src/features/l3lab/spectralForge/integral/carrierIntegralAuditionRoutes.ts',
  index: 'src/features/l3lab/spectralForge/integral/index.ts',
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
const hook = read(paths.hook);
const request = read(paths.request);
const plan = read(paths.plan);
const audition = read(paths.audition);
const routes = read(paths.routes);
const index = read(paths.index);

has(paths.hook, hook, "export * from './carrierLoopBodyPreviewAuditionRequest';");
has(paths.hook, hook, "export * from './carrierLoopBodyPreviewAuditionPlan';");
if (hook.split('\n').length > 12) failures.push('carrierLoopBodyPreviewAuditionHook.ts should remain a tiny re-export facade.');

for (const marker of [
  'CarrierLoopBodyPreviewAuditionHookRequest',
  'CECILIA_CARRIER_LOOP_BODY_PREVIEW_DEFAULT_REQUEST',
  'resolveCarrierLoopBodyPreviewAuditionRequestForMachine',
  'buildCarrierLoopBodyPreviewAuditionOptions',
]) has(paths.request, request, marker);
for (const marker of [
  'CarrierLoopBodyPreviewAuditionHookPlan',
  'buildCarrierLoopBodyPreviewAuditionCacheToken',
  'buildCarrierLoopBodyPreviewAuditionHookPlan',
  'CarrierLoopBodyPreviewAuditionHookPlaybackReport',
]) has(paths.plan, plan, marker);
for (const forbidden of [
  'renderCarrierLoopBodyPreviewSamples',
  'createCarrierLoopBodyPreviewAudioBufferFromSamples',
  'playRenderedAudioBufferPreview',
  'console.log',
  'document.',
  'window.',
]) {
  lacks(paths.request, request, forbidden);
  lacks(paths.plan, plan, forbidden);
}
for (const marker of [
  "export * from './carrierLoopBodyPreviewAuditionRequest';",
  "export * from './carrierLoopBodyPreviewAuditionPlan';",
  "export * from './carrierLoopBodyPreviewAuditionHook';",
]) has(paths.index, index, marker);
has(paths.routes, routes, 'carrierLoopBodyPreviewAuditionHook');

if (failures.length) {
  console.error('[spectralforge-carrier-loop-body-preview-audition-boundaries] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  requestPath: paths.request,
  planPath: paths.plan,
  hookPath: paths.hook,
  message: 'CarrierLoopBody preview audition request/defaults and plan/cache logic are separated behind the legacy hook facade.',
}, null, 2));
