#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const scripts = pkg.scripts ?? {};
const failures = [];

const mustHaveScripts = [
  // meta/ledger
  'xensonar:check-smart-merge-879-ledger',
  'xensonar:check-smart-merge-879-completion-matrix',
  'xensonar:check-smart-merge-patchflow-sanity',
  // workflow fixes
  'xensonar:check-package-station-bridge-contract',
  'xensonar:check-package-ledger',
  'xensonar:check-labor-import-fragment-sanity',
  'xensonar:check-loop-import-fragment-contract',
  'xensonar:check-material-fragmentation-boundary',
  'xensonar:check-random-demo-preset-contract',
  // performance & runtime boundaries
  'xensonar:check-performance-crisis-management-contract',
  'xensonar:check-performance-crisis-particle-wave-binding',
  'xensonar:check-performance-crisis-soft-style-granular-mirror',
  'xensonar:check-particle-simulation-lane-boundary',
  'xensonar:check-wave-starter-runtime-boundary',
  'xensonar:check-audio-lane-shared-time-boundary',
  'xensonar:check-protected-material-lane-contract',
  'xensonar:sanity:spectralforge-carrier-integral',
  'xensonar:check-myzel-synth-registry-boundary',
  'xensonar:check-room3-frame-runtime-boundary',
  'xensonar:check-room3-modular-ui-refactor',
  'xensonar:check-room3-built-html-sanity',
  'xensonar:check-room3-aura-emergence-runtime',
  // built HTML boot sanity / artifact hygiene
  'xensonar:check-synthetic-forge-mount-sanity',
  'xensonar:check-hauptraum-power-sanity',
  'patch:html:core',
  'xensonar:verify-source-artifact',
];

for (const script of mustHaveScripts) {
  if (!scripts[script]) failures.push(`missing patchflow sanity script: ${script}`);
}

const requiredTools = [
  'tools/check-smart-merge-879-completion-matrix.mjs',
  'tools/check-smart-merge-patchflow-sanity.mjs',
  'tools/check-synthetic-forge-mount-sanity.mjs',
  'tools/check-hauptraum-power-sanity.mjs',
  'tools/check-performance-crisis-soft-style-granular-mirror.mjs',
  'tools/check-labor-import-fragment-sanity-6909.mjs',
  'tools/check-particle-simulation-lane-boundary.mjs',
  'tools/run-wavestarter-boundary-sanity.mjs',
  'tools/check-audio-lane-shared-time-boundary.mjs',
  'tools/check-protected-material-lane-contract.mjs',
  'tools/run-spectralforge-carrier-integral-sanity.mjs',
  'tools/check-myzel-synth-registry-boundary.mjs',
  'tools/check-room3-frame-runtime-boundary.mjs',
  'tools/check-room3-modular-ui-refactor.mjs',
  'tools/check-room3-built-html-sanity.mjs',
  'tools/check-room3-aura-emergence-runtime.mjs',
];
for (const tool of requiredTools) {
  if (!existsSync(join(root, tool))) failures.push(`missing required sanity tool: ${tool}`);
}

const matrix = JSON.parse(readFileSync(join(root, 'tools/smartMerge/879CompletionMatrix.json'), 'utf8'));
const missingCoverage = [];
for (const slice of matrix.slices ?? []) {
  if (String(slice.status).startsWith('active')) {
    for (const script of slice.sanityScripts ?? []) {
      if (!scripts[script]) missingCoverage.push(`${slice.id}:${script}`);
    }
  } else if (slice.status === 'pending') {
    if (!Array.isArray(slice.plannedSanityScripts) || slice.plannedSanityScripts.length === 0) missingCoverage.push(`${slice.id}:planned sanity missing`);
  }
}
if (missingCoverage.length) failures.push(`matrix sanity coverage incomplete: ${missingCoverage.join(', ')}`);

if (failures.length) {
  console.error('[smart-merge-patchflow-sanity] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[smart-merge-patchflow-sanity] ok');
console.log(JSON.stringify({
  version: pkg.version,
  requiredScripts: mustHaveScripts.length,
  matrixSlices: matrix.slices?.length ?? 0,
}, null, 2));
