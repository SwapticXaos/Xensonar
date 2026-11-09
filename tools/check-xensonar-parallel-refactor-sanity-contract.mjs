#!/usr/bin/env node
import fs from 'node:fs';

const failures = [];
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const pkg = JSON.parse(read('package.json'));
const scripts = pkg.scripts || {};
const suitePath = 'tools/run-xensonar-parallel-refactor-sanity.mjs';
const suite = read(suitePath);
const roundtrip = read('tools/prove-package-complete-musical-payload-roundtrip.mjs');
const strategy = read('docs/PARALLEL_REFACTOR_STRATEGY_3.2.91.6.9.27.md');

function requireFile(file) { if (!fs.existsSync(file)) failures.push(`missing ${file}`); }
function requireScript(name) { if (!scripts[name]) failures.push(`package.json missing script ${name}`); }
function requireText(label, content, needle) { if (!content.includes(needle)) failures.push(`${label} missing ${needle}`); }

requireFile(suitePath);
requireFile('tools/check-xensonar-parallel-refactor-sanity-contract.mjs');
requireFile('docs/PARALLEL_REFACTOR_STRATEGY_3.2.91.6.9.27.md');
requireScript('xensonar:sanity:parallel-refactor');
requireScript('xensonar:sanity:parallel-refactor:build');
requireScript('xensonar:check-parallel-refactor-sanity-contract');
requireScript('xensonar:check-transport-bar-boundary');
requireScript('xensonar:check-grid-tuning-rack-boundary');
requireScript('xensonar:check-material-intake-panel-boundary');
requireScript('xensonar:check-spectral-canvas-boundary');
requireScript('xensonar:check-spectralforge-audio-engine-utility-boundary');
requireScript('xensonar:check-spectralforge-store-support-boundary');
requireScript('xensonar:sanity:spectralforge-carrier-integral');
requireScript('xensonar:check-canonical-forge-room-contract-boundary');

for (const marker of [
  'xensonar:check-package-complete-musical-payload-contract',
  'xensonar:prove-package-complete-musical-payload-roundtrip',
  'xensonar:check-loop-import-fragment-contract',
  'xensonar:check-material-fragmentation-boundary',
  'xensonar:check-loop-lane-ui-state-contract',
  'xensonar:check-material-loop-panel-boundary',
  'xensonar:check-groove-bass-panel-boundary',
  'xensonar:check-transport-bar-boundary',
  'xensonar:check-grid-tuning-rack-boundary',
  'xensonar:check-material-intake-panel-boundary',
  'xensonar:check-spectral-canvas-boundary',
  'xensonar:check-spectralforge-audio-engine-utility-boundary',
  'xensonar:check-spectralforge-store-support-boundary',
  'xensonar:sanity:spectralforge-carrier-integral',
  'xensonar:check-canonical-forge-room-contract-boundary',
  'xensonar:check-event-channels-contract',
  'xensonar:check-room3-ui-node-aura-audio-layer',
  'xensonar:check-room3-legacy-audio-graph-boundary',
  'xensonar:check-room3-879-node-device-audio-path',
  'xensonar:check-myzel-synth-registry-boundary',
  'xensonar:check-wave-starter-micro-orchestrator',
  'xensonar:check-wave-overtone-arp-contract',
  'xensonar:check-performance-crisis-management-contract',
  'check-hauptraum-power-sanity.mjs',
  'check-synthetic-forge-mount-sanity.mjs',
  'check-room3-built-html-sanity.mjs',
]) requireText('parallel sanity suite', suite, marker);

if (/xensonar:check-app-[a-z0-9-]+-refactor/.test(suite)) failures.push('parallel sanity suite must not run App.tsx refactor extraction gates');
requireText('parallel sanity suite', suite, 'appBaselineSha256');
requireText('parallel sanity suite', suite, 'App.tsx is only measured as a boundary surface');
requireText('roundtrip proof', roundtrip, 'reportSpawnFailure');
requireText('roundtrip proof', roundtrip, 'missing esbuild');
requireText('strategy doc', strategy, 'A) Sofort sicher refactorbar');
requireText('strategy doc', strategy, 'B) Refactorbar mit kleinem Adapter-Risiko');
requireText('strategy doc', strategy, 'C) Besser nach dem App.tsx-Refactor mergen');
requireText('strategy doc', strategy, 'Menschliche qualitative Tests');

if (failures.length) {
  console.error('[parallel-refactor-sanity-contract] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  suite: scripts['xensonar:sanity:parallel-refactor'],
  suiteBuild: scripts['xensonar:sanity:parallel-refactor:build'],
}, null, 2));
