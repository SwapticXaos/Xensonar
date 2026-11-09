#!/usr/bin/env node
import fs from 'node:fs';

const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const pkgPath = 'package.json';
const failures = [];
const read = (file) => fs.readFileSync(file, 'utf8');
const suite = fs.existsSync(suitePath) ? read(suitePath) : '';
const manifest = fs.existsSync('tools/current-line-gate-manifest.mjs') ? read('tools/current-line-gate-manifest.mjs') : '';
const suiteAndManifest = `${suite}\n${manifest}`;
const pkg = JSON.parse(read(pkgPath));
const scripts = pkg.scripts || {};

const requireText = (label, content, needle) => {
  if (!content.includes(needle)) failures.push(`${label} missing ${needle}`);
};
const requireScript = (name) => {
  if (!scripts[name]) failures.push(`package.json missing script ${name}`);
};

for (const script of [
  'xensonar:sanity:refactor-suite',
  'xensonar:sanity:refactor-suite:build',
  'xensonar:check-refactor-sanity-suite-contract',
]) requireScript(script);

for (const marker of [
  'xensonar:sanity:parallel-refactor',
  'xensonar:check-diagnostic-surfaces-build-gate',
  'xensonar:check-xenpolar-extras-runtime-build-gate',
  'check-xenpolar-extras-bridge-profile.mjs',
  'xensonar:check-burst-diagnostics-source-audit-sediment-boundary',
  'xensonar:check-package-complete-musical-payload-contract',
  'xensonar:prove-package-complete-musical-payload-roundtrip',
  'xensonar:sanity:spectralforge-ui-boundary',
  'historical 6.9.x App.tsx extraction matrix',
  'claimBoundaries',
  'What this suite can claim',
  'What this suite cannot claim',
  'Creative Director handoff',
  '--with-typecheck',
  '--with-oracle',
]) requireText('current-line refactor sanity suite/manifest', suiteAndManifest, marker);

for (const legacyMarker of [
  'xensonar:check-melodic-random-demo-default',
  'xensonar:check-app-root-follow-storage-refactor',
  'xensonar:check-app-live-master-bus-refs-refactor',
  'xensonar:check-app-resonance-action-hold-refactor',
]) {
  if (suite.includes(legacyMarker)) failures.push(`suite still directly runs historical false-red marker ${legacyMarker}`);
}

if (failures.length) {
  console.error('[refactor-sanity-suite-contract] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, currentLineBridge: true }, null, 2));
