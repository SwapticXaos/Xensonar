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
  if (exists(path) && read(path).includes(needle)) failures.push(`${path} contains forbidden text: ${needle}`);
};

const pkg = JSON.parse(read('package.json'));
const version = String(pkg.version ?? '').trim();
const expectedVersion = version;
const registry = 'src/features/xensonar/material/materialTrackLifecycleRegistry.ts';
const workflow = 'src/features/xensonar/material/materialLoopPlaybackWorkflow.ts';
const boundary = 'src/features/xensonar/material/materialLoopRuntimeBoundary.ts';
const diagnostics = 'src/features/xensonar/diagnostics/burstDiagnosticsRuntime.ts';
const panel = 'src/features/xensonar/rooms/ResonanceBurstDiagnosticsPanel.tsx';
const doc = 'docs/MATERIAL_TRACK_LIFECYCLE_PROBE_3.2.91.4.114.42.md';
const manifest = `XENSONAR_SOURCE_MANIFEST_${expectedVersion}.json`;

if (version !== expectedVersion) failures.push(`package version ${version} != ${expectedVersion}`);
if (!pkg.scripts?.['xensonar:check-material-track-lifecycle-probe']) failures.push('missing script: xensonar:check-material-track-lifecycle-probe');

for (const file of [registry, workflow, boundary, diagnostics, panel, doc, manifest]) requireFile(file);

for (const needle of [
  'MATERIAL_TRACK_AUDIO_SOURCE_RESOURCE_ID',
  'MATERIAL_TRACK_GAIN_NODE_RESOURCE_ID',
  'MATERIAL_TRACK_CACHE_ENTRY_LABEL',
  'registerMaterialTrackCacheEntry',
  'registerMaterialTrackAudioSource',
  'registerMaterialTrackGainNode',
  'markMaterialTrackPlaybackNodesReleased',
  'markMaterialTrackAllCacheEntriesReleased',
  'summarizeMaterialTrackLifecycleRegistry',
]) requireContains(registry, needle);

for (const forbidden of [
  'clearTimeout(',
  'clearInterval(',
  'cancelAnimationFrame(',
  'revokeObjectURL(',
  'AudioNode.prototype',
  'disposeAll',
]) requireNotContains(registry, forbidden);

requireNotContains(registry, '.disconnect(');
requireNotContains(registry, '.stop(');

requireContains(workflow, 'registerMaterialTrackCacheEntry(entry, buffer)');
requireContains(workflow, 'registerMaterialTrackAudioSource({');
requireContains(workflow, 'registerMaterialTrackGainNode(entry, volume)');
requireContains(workflow, 'markMaterialTrackAudioSourceReleased(');
requireContains(workflow, 'markMaterialTrackGainNodeReleased(');
requireContains(workflow, 'markMaterialTrackPlaybackFailed(');
requireContains(boundary, 'markMaterialTrackAllCacheEntriesReleased(refs.cacheRef.current');
requireContains(diagnostics, 'summarizeMaterialTrackLifecycleRegistry()');
requireContains(diagnostics, 'materialTrackRuntime');
requireContains(panel, 'Materialspur aktiv');
requireContains(panel, 'activeCacheEntries');

requireContains(doc, '3.2.91.4.114.42');
requireContains(doc, 'passive Lifecycle-Probe');
requireContains(doc, 'no playback scheduling change');
requireContains(doc, 'Root Follow');
requireContains(doc, 'Wellenstarter-Arp');

if (exists(manifest)) {
  const data = JSON.parse(read(manifest));
  if (data.version !== expectedVersion) failures.push(`${manifest} version ${data.version} != ${expectedVersion}`);
  if (!['shared_sound_particle_type_fix_1', 'core_room_boundary_prep_1', 'core_entry_boundary_split_1'].includes(data.patch)) failures.push(`${manifest} patch ${data.patch} not in allowed lineage: shared_sound_particle_type_fix_1, core_room_boundary_prep_1, core_entry_boundary_split_1`);
  if (!data.validation?.includes('xensonar:check-material-track-lifecycle-probe')) failures.push(`${manifest} validation does not include xensonar:check-material-track-lifecycle-probe`);
}

if (failures.length) {
  console.error('[xensonar-material-track-lifecycle-probe] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[xensonar-material-track-lifecycle-probe] ok');
console.log(JSON.stringify({ version, registry, note: 'passive material-track lifecycle evidence only; no playback scheduling or event-density change' }, null, 2));
