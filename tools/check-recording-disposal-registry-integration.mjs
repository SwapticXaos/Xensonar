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
const allowedPatchNames = new Set(['shared_sound_particle_type_fix_1', 'core_room_boundary_prep_1', 'core_entry_boundary_split_1']);
const manifestPath = `XENSONAR_SOURCE_MANIFEST_${expectedVersion}.json`;
const docVersion = '3.2.91.4.114.40';
const doc = `docs/RECORDING_DISPOSAL_REGISTRY_INTEGRATION_${docVersion}.md`;
const bridge = 'src/features/xensonar/recording/recordingDisposalRegistry.ts';

if (version !== expectedVersion) failures.push(`package version ${version} != ${expectedVersion}`);
if (!pkg.scripts?.['xensonar:check-recording-disposal-registry-integration']) failures.push('missing script: xensonar:check-recording-disposal-registry-integration');

for (const file of [
  bridge,
  doc,
  manifestPath,
  'src/features/xensonar/recording/objectUrlUtils.ts',
  'src/features/xensonar/recording/recordingEffectHandlers.ts',
  'src/features/xensonar/recording/recordingRuntimeActions.ts',
  'src/features/xensonar/recording/recordingSessionWorkflow.ts',
  'src/features/xensonar/recording/useRecordingRuntimeBoundary.ts',
  'src/features/xensonar/recording/useRecordingRuntimeLifecycle.ts',
  'src/features/xensonar/diagnostics/burstDiagnosticsRuntime.ts',
  'src/features/xensonar/rooms/ResonanceBurstDiagnosticsPanel.tsx',
]) requireFile(file);

for (const needle of [
  'RECORDING_MEDIA_RECORDER_RESOURCE_ID',
  'registerRecordingPreviewObjectUrl',
  'registerRecordingDownloadObjectUrl',
  'registerRecordingDurationDisplaySecondTick',
  'registerRecordingPreviewPlayheadRaf',
  'registerRecordingMarkerHotkeyListener',
  'registerRecordingMediaRecorder',
  'registerRecordingMaxDurationTimeout',
  'summarizeRecordingDisposalRegistry',
]) requireContains(bridge, needle);

requireContains('src/features/xensonar/recording/objectUrlUtils.ts', 'registerRecordingPreviewObjectUrl');
requireContains('src/features/xensonar/recording/objectUrlUtils.ts', 'markRecordingPreviewObjectUrlReleased');
requireContains('src/features/xensonar/recording/objectUrlUtils.ts', 'registerRecordingDownloadObjectUrl');
requireContains('src/features/xensonar/recording/recordingEffectHandlers.ts', 'registerRecordingDurationDisplaySecondTick');
requireContains('src/features/xensonar/recording/recordingEffectHandlers.ts', 'registerRecordingPreviewPlayheadRaf');
requireContains('src/features/xensonar/recording/useRecordingRuntimeBoundary.ts', 'useRecordingRuntimeLifecycle({');
requireContains('src/features/xensonar/recording/useRecordingRuntimeLifecycle.ts', 'registerRecordingMarkerHotkeyListener');
requireContains('src/features/xensonar/recording/useRecordingRuntimeLifecycle.ts', 'cleanupRecordingRuntime({');
requireContains('src/features/xensonar/recording/recordingRuntimeActions.ts', 'registerRecordingMediaRecorder');
requireContains('src/features/xensonar/recording/recordingRuntimeActions.ts', 'registerRecordingMaxDurationTimeout');
requireContains('src/features/xensonar/recording/recordingRuntimeActions.ts', 'shouldWaitForStopEvent');
requireContains('src/features/xensonar/recording/recordingSessionWorkflow.ts', 'recording-media-recorder-onstop-completed');
requireContains('src/features/xensonar/diagnostics/burstDiagnosticsRuntime.ts', 'recordingRuntime: summarizeRecordingDisposalRegistry()');
requireContains('src/features/xensonar/diagnostics/burstDiagnosticsRuntime.ts', 'liveRuntime: snapshotLiveRuntimeDisposalRegistry()');
requireContains('src/features/xensonar/rooms/ResonanceBurstDiagnosticsPanel.tsx', 'Recording-Laufzeit');

for (const path of [
  'src/features/xensonar/rootFollow/useRootFollowLoopPlayback.ts',
  'src/features/xensonar/rootFollow/rootFollowRuntimeBoundary.ts',
  'src/features/xensonar/material/materialLoopRuntimeBoundary.ts',
  'src/features/xensonar/audioTraffic/waveOvertoneArpRuntime.ts',
]) {
  requireNotContains(path, 'summarizeRecordingDisposalRegistry');
  requireNotContains(path, 'registerRecordingMediaRecorder');
  requireNotContains(path, 'registerLiveRuntimeResource');
}

requireContains(doc, docVersion);
requireContains(doc, 'Recording-only');
requireContains(doc, 'no cleanup automation');
requireContains(doc, 'onstop');
requireContains(doc, 'Root Follow');
requireContains(doc, 'Materialspur');

if (exists(manifestPath)) {
  const manifest = JSON.parse(read(manifestPath));
  if (manifest.version !== expectedVersion) failures.push(`${manifestPath} version ${manifest.version} != ${expectedVersion}`);
  if (!allowedPatchNames.has(manifest.patch)) failures.push(`${manifestPath} patch ${manifest.patch} not in allowed lineage: ${Array.from(allowedPatchNames).join(', ')}`);
  for (const required of [
    'xensonar:check-live-runtime-disposal-registry',
    'xensonar:check-recording-disposal-registry-integration',
    'xensonar:check-quantized-traffic-timer-registry',
    'xensonar:check-wave-overtone-arp-traffic-contract',
  ]) {
    if (!manifest.validation?.includes(required)) failures.push(`${manifestPath} validation does not include ${required}`);
  }
}

if (failures.length) {
  console.error('[xensonar-recording-disposal-registry-integration] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[xensonar-recording-disposal-registry-integration] ok');
console.log(JSON.stringify({ version, bridge, note: 'Recording-only lifecycle refinement; no cleanup automation or musical event reduction' }, null, 2));
