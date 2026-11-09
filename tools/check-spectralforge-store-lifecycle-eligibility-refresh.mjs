#!/usr/bin/env node
import fs from 'node:fs';

const failures = [];
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const requireFile = (file) => { if (!fs.existsSync(file)) failures.push(`missing ${file}`); };
const requireText = (label, content, needle) => { if (!content.includes(needle)) failures.push(`${label} missing ${needle}`); };
const forbidText = (label, content, needle) => { if (content.includes(needle)) failures.push(`${label} still contains ${needle}`); };

const lifecyclePath = 'src/features/l3lab/spectralForge/state/storeCarrierDonorV2Lifecycle.ts';
const boundaryPath = 'src/features/l3lab/spectralForge/state/storeCarrierDonorV2Boundary.ts';
const storePath = 'src/features/l3lab/spectralForge/state/store.ts';
const appPath = 'src/App.tsx';
const audioEnginePath = 'src/features/l3lab/spectralForge/audio/AudioEngine.ts';

for (const file of [lifecyclePath, boundaryPath, storePath, appPath, audioEnginePath]) requireFile(file);

const lifecycle = read(lifecyclePath);
const boundary = read(boundaryPath);
const pkg = read('package.json');

for (const marker of [
  'function withDerivedRenderEligibility(next: CarrierDonorV2State): CarrierDonorV2State',
  'next.freshness.renderEligibility = deriveCarrierDonorV2Eligibility(next);',
  'return withDerivedRenderEligibility(next);',
  'export function beginGestaltFieldBuildState',
  'export function finishGestaltFieldBuildState',
  'export function failGestaltFieldBuildState',
  'export function beginMaterialFieldBuildState',
  'export function finishMaterialFieldBuildState',
  'export function failMaterialFieldBuildState',
  'export function beginMaterialAllocationBuildState',
  'export function finishMaterialAllocationBuildState',
  'export function failMaterialAllocationBuildState',
  'export function failBindingBuildState',
]) requireText('storeCarrierDonorV2Lifecycle.ts', lifecycle, marker);

for (const marker of [
  'function describeNonReadyStage(meta: V2StageMeta, fallback: string): string',
  "if (meta.status === 'building') return 'v2-Ableitungen werden gerade aktualisiert.';",
  "if (meta.status === 'dirty') return 'v2-Ableitungen werden automatisch aktualisiert.';",
  "const requiredStages: Array<{ meta: V2StageMeta; fallback: string }>",
  "{ meta: f.skeletonMeta, fallback: 'Carrier-Lesung fehlt noch.' }",
  "{ meta: f.gestaltFieldMeta, fallback: 'Carrier-Lesung fehlt noch.' }",
  "{ meta: f.donorAnalysisMeta, fallback: 'Donor-Atlas fehlt noch.' }",
  "{ meta: f.donorAtlasMeta, fallback: 'Donor-Atlas fehlt noch.' }",
  "{ meta: f.bindingMeta, fallback: 'Synthetische Zuordnung fehlt noch.' }",
  "{ meta: f.materialFieldMeta, fallback: 'Rohtextur-Layer braucht zusätzlich das Donor-Materialfeld.' }",
  "{ meta: f.materialAllocationMeta, fallback: 'Rohtextur-Layer braucht zusätzlich Materialallokation.' }",
  "const nonReady = requiredStages.find(({ meta }) => meta.status !== 'ready');",
]) requireText('storeCarrierDonorV2Boundary.ts', boundary, marker);

for (const fn of [
  'beginCarrierSkeletonBuildState',
  'finishCarrierSkeletonBuildState',
  'failCarrierSkeletonBuildState',
  'beginDonorAnalysisBuildState',
  'finishDonorAnalysisBuildState',
  'failDonorAnalysisBuildState',
  'beginDonorAtlasBuildState',
  'finishDonorAtlasBuildState',
  'failDonorAtlasBuildState',
  'beginGestaltFieldBuildState',
  'finishGestaltFieldBuildState',
  'failGestaltFieldBuildState',
  'beginMaterialFieldBuildState',
  'finishMaterialFieldBuildState',
  'failMaterialFieldBuildState',
  'beginMaterialAllocationBuildState',
  'finishMaterialAllocationBuildState',
  'failMaterialAllocationBuildState',
  'beginBindingBuildState',
  'finishBindingBuildState',
  'failBindingBuildState',
]) {
  const start = lifecycle.indexOf(`export function ${fn}`);
  if (start < 0) {
    failures.push(`missing lifecycle function ${fn}`);
    continue;
  }
  const next = lifecycle.indexOf('\nexport function ', start + 1);
  const body = lifecycle.slice(start, next < 0 ? lifecycle.length : next);
  if (!body.includes('return withDerivedRenderEligibility(next);')) {
    failures.push(`${fn} does not refresh renderEligibility through helper`);
  }
}

forbidText('storeCarrierDonorV2Lifecycle.ts', lifecycle, 'deriveCarrierDonorV2Eligibility(current)');
forbidText('storeCarrierDonorV2Lifecycle.ts', lifecycle, 'return {\n    ...current,\n    freshness:');
requireText('package.json', pkg, 'xensonar:check-spectralforge-store-lifecycle-eligibility-refresh');

if (failures.length) {
  console.error('[spectralforge-store-lifecycle-eligibility-refresh] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  lifecyclePath,
  boundaryPath,
  message: 'Carrier/Donor-V2 lifecycle transitions refresh renderEligibility and the eligibility gate requires ready stages.',
}, null, 2));
