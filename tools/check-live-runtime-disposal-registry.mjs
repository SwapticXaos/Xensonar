#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
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

function walkFiles(dir, out = []) {
  const full = join(root, dir);
  if (!existsSync(full)) return out;
  for (const name of readdirSync(full)) {
    if (name === 'node_modules' || name === 'dist') continue;
    const abs = join(full, name);
    const rel = join(dir, name).replaceAll('\\', '/');
    const stat = statSync(abs);
    if (stat.isDirectory()) walkFiles(rel, out);
    else if (/\.(ts|tsx|mjs|js)$/.test(name)) out.push(rel);
  }
  return out;
}

const pkg = JSON.parse(read('package.json'));
const version = String(pkg.version ?? '').trim();
const expectedVersion = version;
const allowedPatchNames = new Set(['shared_sound_particle_type_fix_1', 'core_room_boundary_prep_1', 'core_entry_boundary_split_1']);
const registry = 'src/features/xensonar/runtime/liveRuntimeDisposalRegistry.ts';
const registryTypes = 'src/features/xensonar/runtime/liveRuntimeDisposalRegistryTypes.ts';
const doc = 'docs/LIVE_RUNTIME_DISPOSAL_REGISTRY_PROBE_3.2.91.4.114.39.md';
const manifestPath = `XENSONAR_SOURCE_MANIFEST_${expectedVersion}.json`;

if (version !== expectedVersion) failures.push(`package version ${version} != ${expectedVersion}`);
if (!pkg.scripts?.['xensonar:check-live-runtime-disposal-registry']) failures.push('missing script: xensonar:check-live-runtime-disposal-registry');

requireFile(registry);
requireFile(registryTypes);
requireFile(doc);
requireFile(manifestPath);
requireFile('src/features/xensonar/recording/objectUrlUtils.ts');
requireFile('src/features/xensonar/recording/recordingEffectHandlers.ts');
requireFile('src/features/xensonar/recording/recordingRuntimeActions.ts');
requireFile('src/features/xensonar/recording/useRecordingRuntimeBoundary.ts');

for (const needle of [
  'registerLiveRuntimeResource',
  'markLiveRuntimeResourceReleased',
  'markLiveRuntimeResourceUnknown',
  'snapshotLiveRuntimeDisposalRegistry',
  'resetLiveRuntimeDisposalRegistryForTests',
  'activeResources',
  'recent',
]) requireContains(registry, needle);

for (const needle of [
  'LiveRuntimeResourceKind',
  'LiveRuntimeResourceSubsystem',
  'LiveRuntimeResourceStatus',
  'LiveRuntimeDisposalRegistrySnapshot',
]) requireContains(registryTypes, needle);

for (const forbidden of [
  'clearTimeout(',
  'clearInterval(',
  'cancelAnimationFrame(',
  'revokeObjectURL(',
  '.disconnect(',
  '.stop(',
  'AudioNode.prototype',
  'disposeAll',
]) requireNotContains(registry, forbidden);

requireContains('src/features/xensonar/recording/recordingDisposalRegistry.ts', 'registerLiveRuntimeResource({');
requireContains('src/features/xensonar/recording/recordingDisposalRegistry.ts', 'markLiveRuntimeResourceReleased(');
requireContains('src/features/xensonar/recording/recordingDisposalRegistry.ts', "label: 'recording.duration.display-second-tick'");
requireContains('src/features/xensonar/recording/recordingDisposalRegistry.ts', "label: 'recording.preview.playhead-raf'");
requireContains('src/features/xensonar/recording/recordingDisposalRegistry.ts', "label: 'recording.media-recorder'");
requireContains('src/features/xensonar/recording/recordingDisposalRegistry.ts', "label: 'recording.max-duration-timeout'");
requireContains('src/features/xensonar/recording/recordingDisposalRegistry.ts', "label: 'recording.marker.hotkey-listener'");
requireContains('src/features/xensonar/recording/objectUrlUtils.ts', 'registerRecordingPreviewObjectUrl');
requireContains('src/features/xensonar/recording/recordingRuntimeActions.ts', 'registerRecordingMediaRecorder');

for (const protectedPath of [
  'src/features/xensonar/rootFollow/useRootFollowLoopPlayback.ts',
  'src/features/xensonar/rootFollow/rootFollowRuntimeBoundary.ts',
  'src/features/xensonar/material/materialLoopRuntimeBoundary.ts',
  'src/features/xensonar/audioTraffic/waveOvertoneArpRuntime.ts',
]) {
  requireNotContains(protectedPath, 'registerLiveRuntimeResource');
  requireNotContains(protectedPath, 'snapshotLiveRuntimeDisposalRegistry');
}

requireContains(doc, '3.2.91.4.114.39');
requireContains(doc, 'passive registry');
requireContains(doc, 'no cleanup automation');
requireContains(doc, 'Recording first');
requireContains(doc, 'Root Follow');
requireContains(doc, 'Materialspur');

if (exists(manifestPath)) {
  const manifest = JSON.parse(read(manifestPath));
  if (manifest.version !== expectedVersion) failures.push(`${manifestPath} version ${manifest.version} != ${expectedVersion}`);
  if (!allowedPatchNames.has(manifest.patch)) failures.push(`${manifestPath} patch ${manifest.patch} not in allowed lineage: ${Array.from(allowedPatchNames).join(', ')}`);
  for (const required of [
    'xensonar:check-live-runtime-disposal-audit',
    'xensonar:check-live-runtime-disposal-registry',
    'xensonar:check-wave-overtone-arp-traffic-contract',
    'xensonar:check-recording-disposal-registry-integration',
    'xensonar:check-quantized-traffic-timer-registry',
  ]) {
    if (!manifest.validation?.includes(required)) failures.push(`${manifestPath} validation does not include ${required}`);
  }
}

const runtimeFiles = [
  registry,
  ...walkFiles('src/features/xensonar/recording'),
];
const text = runtimeFiles.map(read).join('\n');
const registrations = (text.match(/registerLiveRuntimeResource\s*\(/g) ?? []).length;
const releases = (text.match(/markLiveRuntimeResourceReleased\s*\(/g) ?? []).length + (text.match(/\.markReleased\s*\(/g) ?? []).length;
if (registrations < 6) failures.push(`unexpectedly low live-runtime registrations: ${registrations}`);
if (releases < 6) failures.push(`unexpectedly low live-runtime releases: ${releases}`);

if (failures.length) {
  console.error('[xensonar-live-runtime-disposal-registry] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[xensonar-live-runtime-disposal-registry] ok');
console.log(JSON.stringify({ version, registry, registrations, releases, note: 'passive registry only; no cleanup automation or musical event reduction' }, null, 2));
