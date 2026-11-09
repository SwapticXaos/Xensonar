#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const read = (path) => readFileSync(join(root, path), 'utf8');
const exists = (path) => existsSync(join(root, path));
const requireFile = (path) => { if (!exists(path)) failures.push(`missing file: ${path}`); };
const requireContains = (path, needle) => {
  if (!exists(path)) { failures.push(`missing file for content check: ${path}`); return; }
  if (!read(path).includes(needle)) failures.push(`${path} does not contain required text: ${needle}`);
};
const requireNotContains = (path, needle) => {
  if (exists(path) && read(path).includes(needle)) failures.push(`${path} still contains stale/forbidden text: ${needle}`);
};

const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
const version = String(pkg.version ?? '').trim();
const patchName = 'core_entry_boundary_split_1';
const manifestPath = `XENSONAR_SOURCE_MANIFEST_${version}.json`;

if (!version) failures.push('package.json version is empty');
if (String(lock.version ?? '') !== version) failures.push(`package-lock.json top-level version ${lock.version} != package version ${version}`);
if (String(lock.packages?.['']?.version ?? '') !== version) failures.push(`package-lock packages[""].version ${lock.packages?.['']?.version} != package version ${version}`);

for (const file of [
  manifestPath,
  'docs/HANDOFF_NEXT_CHAT.md',
  'docs/BUILD_AND_TEST_PROTOCOL.md',
  'docs/KNOWN_BAD_PATCHES.md',
  `docs/APP_RUNTIME_DETANGLE_STATUS_${version}.md`,
  `docs/SPECTRALFORGE_PREVIEW_LIFECYCLE_PROBE_3.2.91.4.114.45.md`,
  `docs/SPECTRALFORGE_LIVE_PATH_CLEANUP_3.2.91.4.114.46.md`,
  `docs/SPECTRALFORGE_LEGACY_EMBODIMENT_PRUNE_${version}.md`,
  'docs/ROOT_FOLLOW_LIFECYCLE_CONTRACT_PROBE_3.2.91.4.114.43.md',
  'docs/MATERIAL_TRACK_LIFECYCLE_PROBE_3.2.91.4.114.42.md',
  'docs/QUANTIZED_TRAFFIC_TIMER_REGISTRY_3.2.91.4.114.41.md',
  'docs/RECORDING_DISPOSAL_REGISTRY_INTEGRATION_3.2.91.4.114.40.md',
  'tools/check-handoff-consistency.mjs',
  'tools/check-spectralforge-preview-lifecycle-probe.mjs',
  'tools/check-spectralforge-live-path-cleanup.mjs',
  'tools/check-spectralforge-legacy-embodiment-prune.mjs',
  'tools/check-wave-overtone-arp-contract.mjs',
  'tools/check-wave-overtone-arp-traffic-contract.mjs',
]) requireFile(file);

if (exists(manifestPath)) {
  const manifest = JSON.parse(read(manifestPath));
  if (manifest.version !== version) failures.push(`${manifestPath} version ${manifest.version} != ${version}`);
  if (manifest.patch !== patchName) failures.push(`${manifestPath} patch ${manifest.patch} != ${patchName}`);
  for (const required of [
    'xensonar:verify-source-artifact',
    'xensonar:check-root-follow-contract',
    'xensonar:check-package-ledger',
    'xensonar:check-app-runtime-detangle',
    'xensonar:check-audio-graph-registry-contract',
    'xensonar:check-workspace-activation-contract',
    'xensonar:check-spectral-embodiment-artifact-builder',
    'xensonar:check-carrier-donor-lab-quarantine',
    'xensonar:check-spectralforge-live-path-cleanup',
    'xensonar:check-spectralforge-legacy-embodiment-prune',
    'xensonar:check-shared-sound-particle-adapter',
    'xensonar:check-handoff-consistency',
    'xensonar:check-live-runtime-disposal-audit',
    'xensonar:check-live-runtime-disposal-registry',
    'xensonar:check-wave-overtone-arp-contract',
    'xensonar:check-wave-overtone-arp-traffic-contract',
    'xensonar:check-recording-disposal-registry-integration',
    'xensonar:check-quantized-traffic-timer-registry',
    'xensonar:check-material-track-lifecycle-probe',
    'xensonar:check-root-follow-lifecycle-contract',
    'xensonar:check-spectralforge-preview-lifecycle-probe',
    'xensonar:check-shared-sound-particle-adapter',
    'xensonar:audit-core-room-profile-variants',
    'xensonar:check-core-room-boundary-prep',
    'xensonar:check-core-entry-boundary-split',
  ]) {
    if (!manifest.validation?.includes(required)) failures.push(`${manifestPath} validation does not include ${required}`);
  }
}

for (const scriptName of [
  'xensonar:verify-source-artifact',
  'xensonar:check-root-follow-contract',
  'xensonar:check-package-ledger',
  'xensonar:check-app-runtime-detangle',
  'xensonar:check-audio-graph-registry-contract',
  'xensonar:check-workspace-activation-contract',
  'xensonar:check-spectral-embodiment-artifact-builder',
  'xensonar:check-carrier-donor-lab-quarantine',
  'xensonar:check-spectralforge-live-path-cleanup',
  'xensonar:check-spectralforge-legacy-embodiment-prune',
  'xensonar:check-handoff-consistency',
  'xensonar:check-live-runtime-disposal-audit',
  'xensonar:check-live-runtime-disposal-registry',
  'xensonar:check-wave-overtone-arp-contract',
  'xensonar:check-wave-overtone-arp-traffic-contract',
  'xensonar:check-recording-disposal-registry-integration',
  'xensonar:check-quantized-traffic-timer-registry',
  'xensonar:check-root-follow-lifecycle-contract',
  'xensonar:check-material-track-lifecycle-probe',
  'xensonar:check-spectralforge-preview-lifecycle-probe',
  'xensonar:check-shared-sound-particle-adapter',
  'xensonar:audit-core-room-profile-variants',
  'xensonar:check-core-room-boundary-prep',
  'xensonar:check-core-entry-boundary-split',
  'build:core-test',
  'build:production',
  'inspect:html',
  'assert:html-budget',
]) {
  if (!pkg.scripts?.[scriptName]) failures.push(`package.json missing script: ${scriptName}`);
}

for (const doc of ['docs/HANDOFF_NEXT_CHAT.md', 'docs/BUILD_AND_TEST_PROTOCOL.md']) {
  requireContains(doc, version);
  requireContains(doc, 'npm run xensonar:check-handoff-consistency');
  requireContains(doc, 'npm run xensonar:check-live-runtime-disposal-audit');
  requireContains(doc, 'npm run xensonar:check-live-runtime-disposal-registry');
  requireContains(doc, 'npm run xensonar:check-wave-overtone-arp-contract');
  requireContains(doc, 'npm run xensonar:check-wave-overtone-arp-traffic-contract');
  requireContains(doc, 'npm run xensonar:check-recording-disposal-registry-integration');
  requireContains(doc, 'npm run xensonar:check-quantized-traffic-timer-registry');
  requireContains(doc, 'npm run xensonar:check-root-follow-lifecycle-contract');
  requireContains(doc, 'npm run xensonar:check-material-track-lifecycle-probe');
  requireContains(doc, 'npm run xensonar:check-carrier-donor-lab-quarantine');
  requireContains(doc, 'npm run xensonar:check-spectralforge-live-path-cleanup');
  requireContains(doc, 'npm run xensonar:check-spectralforge-legacy-embodiment-prune');
  requireContains(doc, 'npm run xensonar:check-spectral-embodiment-artifact-builder');
  requireContains(doc, 'npm run xensonar:check-workspace-activation-contract');
  requireContains(doc, 'npm run xensonar:check-audio-graph-registry-contract');
  requireContains(doc, 'npm run xensonar:check-spectralforge-preview-lifecycle-probe');
}

requireContains('docs/HANDOFF_NEXT_CHAT.md', `Xensonar_${version}_${patchName}_source.zip`);
requireContains('docs/HANDOFF_NEXT_CHAT.md', 'Variant A');
requireContains('docs/HANDOFF_NEXT_CHAT.md', 'Variant B');
requireContains('docs/HANDOFF_NEXT_CHAT.md', 'Jump-Run-Jam');
requireContains('docs/HANDOFF_NEXT_CHAT.md', 'Xensonar Refactor');
requireContains('docs/HANDOFF_NEXT_CHAT.md', '114.44 restores Wellenstarter mixer/Arp/Hybrid context freshness');
requireContains('docs/HANDOFF_NEXT_CHAT.md', 'adds passive SpectralForge preview/source/object-url lifecycle evidence');
requireContains('docs/HANDOFF_NEXT_CHAT.md', 'removes old CarrierDonorLab and legacy extract/apply wiring from the live SpectralForgeRoom path');
requireContains('docs/HANDOFF_NEXT_CHAT.md', 'removes legacy embodiment state and renderer files from the live SpectralForge src tree');
requireContains('docs/HANDOFF_NEXT_CHAT.md', 'Do not present a runtime-equivalent HTML as a fresh build.');
requireContains('docs/KNOWN_BAD_PATCHES.md', '3.2.91.4.114.4');
requireContains('docs/KNOWN_BAD_PATCHES.md', 'red / do not build on');
requireNotContains('docs/HANDOFF_NEXT_CHAT.md', 'Latest runtime boundaries after 114.32');

if (failures.length) {
  console.error('[xensonar-handoff-consistency] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[xensonar-handoff-consistency] ok');
console.log(JSON.stringify({ version, patch: patchName }, null, 2));
