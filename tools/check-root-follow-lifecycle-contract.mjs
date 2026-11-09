#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const read = (path) => readFileSync(join(root, path), 'utf8');
const exists = (path) => existsSync(join(root, path));
const requireFile = (path) => { if (!exists(path)) failures.push(`missing file: ${path}`); };
const requireContains = (path, needle) => {
  if (!exists(path)) { failures.push(`missing file for content check: ${path}`); return; }
  if (!read(path).includes(needle)) failures.push(`${path} missing required text: ${needle}`);
};
const requireNotContains = (path, needle) => {
  if (exists(path) && read(path).includes(needle)) failures.push(`${path} contains forbidden text: ${needle}`);
};

const pkg = JSON.parse(read('package.json'));
const version = pkg.version;
const probe = 'src/features/xensonar/rootFollow/rootFollowLifecycleContractProbe.ts';
const playback = 'src/features/xensonar/material/useRootFollowLoopPlayback.ts';
const diagnostics = 'src/features/xensonar/diagnostics/burstDiagnosticsRuntime.ts';
const panel = 'src/features/xensonar/rooms/ResonanceBurstDiagnosticsPanel.tsx';
const manifest = `XENSONAR_SOURCE_MANIFEST_${version}.json`;

requireFile(probe);
requireFile(playback);
requireFile(diagnostics);
requireFile(panel);
requireFile(manifest);
requireFile('docs/ROOT_FOLLOW_LIFECYCLE_CONTRACT_PROBE_3.2.91.4.114.43.md');

for (const needle of [
  'beginRootFollowLifecycleSession',
  'closeRootFollowLifecycleSession',
  'markRootFollowLifecycleSchedulerTick',
  'summarizeRootFollowLifecycleContractProbe',
  'retuneSamplesWithoutRestart',
  'sameLoopRestartSuspicions',
  'transportAnchorWarnings',
]) requireContains(probe, needle);

for (const needle of [
  'beginRootFollowLifecycleSession({',
  'closeRootFollowLifecycleSession({',
  'markRootFollowLifecycleSchedulerTick({',
  'summarizeRootFollowLifecycleContractProbe()',
  'dynamicRefs.current.getCurrentRootHzRef.current = getCurrentRootHz',
]) requireContains(playback, needle);

for (const forbidden of [
  'window.setTimeout',
  'window.clearTimeout',
  'setInterval',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  '.disconnect(',
  '.stop(',
  'URL.revokeObjectURL',
  'AudioNode.prototype',
]) requireNotContains(probe, forbidden);

requireContains(diagnostics, 'rootFollowLifecycle: summarizeRootFollowLifecycleContractProbe()');
requireContains(panel, 'RF Vertrag');
requireContains('package.json', 'xensonar:check-root-follow-lifecycle-contract');

const playbackText = read(playback);
const effectDepsTail = playbackText.slice(playbackText.lastIndexOf('  }, ['));
for (const forbiddenDep of ['getCurrentRootHz,', 'rootFollowLoopVolume,', 'rootFollowLoopGranulationMode,']) {
  if (effectDepsTail.includes(forbiddenDep)) failures.push(`main Root-Follow playback effect dependency list contains ${forbiddenDep}`);
}

if (exists(manifest)) {
  const manifestObj = JSON.parse(read(manifest));
  if (manifestObj.version !== version) failures.push(`${manifest} version mismatch`);
  if (!['shared_sound_particle_type_fix_1', 'core_room_boundary_prep_1', 'core_entry_boundary_split_1', 'vite_test_build_prereq'].includes(manifestObj.patch)) failures.push(`${manifest} patch mismatch: ${manifestObj.patch}`);
  if (!manifestObj.validation?.includes('xensonar:check-root-follow-lifecycle-contract')) failures.push(`${manifest} validation missing xensonar:check-root-follow-lifecycle-contract`);
}

if (failures.length) {
  console.error('[xensonar-root-follow-lifecycle-contract] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[xensonar-root-follow-lifecycle-contract] ok');
console.log(JSON.stringify({ version, probe, passive: true }, null, 2));
