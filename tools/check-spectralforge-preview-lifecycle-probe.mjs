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
const allowedPatchNames = new Set(['shared_sound_particle_type_fix_1', 'core_room_boundary_prep_1', 'core_entry_boundary_split_1', 'vite_test_build_prereq']);
const registry = 'src/features/l3lab/spectralForge/lifecycle/spectralForgePreviewLifecycleRegistry.ts';
const audioEngine = 'src/features/l3lab/spectralForge/audio/AudioEngine.ts';
const room = 'src/features/l3lab/spectralForge/SpectralForgeRoom.tsx';
const imageImporter = 'src/features/l3lab/spectralForge/audio/ImageImporter.ts';
const transportBar = 'src/features/l3lab/spectralForge/components/TransportBar.tsx';
const carrierLab = 'docs/legacy/spectralForge/CarrierDonorLab.legacy.tsx';
const diagnostics = 'src/features/xensonar/diagnostics/burstDiagnosticsRuntime.ts';
const panel = 'src/features/xensonar/rooms/ResonanceBurstDiagnosticsPanel.tsx';
const liveRegistry = 'src/features/xensonar/runtime/liveRuntimeDisposalRegistry.ts';
const doc = 'docs/SPECTRALFORGE_PREVIEW_LIFECYCLE_PROBE_3.2.91.4.114.45.md';
const manifest = `XENSONAR_SOURCE_MANIFEST_${expectedVersion}.json`;

if (version !== expectedVersion) failures.push(`package version ${version} != ${expectedVersion}`);
if (!pkg.scripts?.['xensonar:check-spectralforge-preview-lifecycle-probe']) failures.push('missing script: xensonar:check-spectralforge-preview-lifecycle-probe');
for (const file of [registry, audioEngine, room, imageImporter, transportBar, carrierLab, diagnostics, panel, liveRegistry, doc, manifest]) requireFile(file);
for (const needle of [
  'registerSpectralForgeSourceAsset',
  'markSpectralForgeSourceAssetReleased',
  'registerSpectralForgePreviewAudioSource',
  'markSpectralForgePreviewAudioSourceReleased',
  'registerSpectralForgePreviewAnimationFrame',
  'markSpectralForgePreviewAnimationFrameReleased',
  'registerSpectralForgeDownloadObjectUrl',
  'markSpectralForgeDownloadObjectUrlReleased',
  'registerSpectralForgeImageObjectUrl',
  'markSpectralForgeImageObjectUrlReleased',
  'summarizeSpectralForgePreviewLifecycleRegistry',
]) requireContains(registry, needle);
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
requireContains(liveRegistry, "| 'source-asset'");
requireContains(liveRegistry, "'source-asset': 0");
requireContains(audioEngine, 'registerSpectralForgePreviewAudioSource({');
requireContains(audioEngine, 'registerSpectralForgePreviewAnimationFrame({');
requireContains(audioEngine, 'markSpectralForgePreviewAudioSourceReleased(');
requireContains(audioEngine, 'markSpectralForgePreviewAnimationFrameReleased(');
requireContains(audioEngine, 'lifecycleMode: `source-asset-${previewMode}`');
requireContains(room, "registerSpectralForgeSourceAsset(sourceAsset, 'main')");
requireContains(room, "registerSpectralForgeSourceAsset(spectralEmbodimentSourceAsset, 'embodiment')");
requireContains(room, 'registerSpectralForgeDownloadObjectUrl(url, blob, fileName');
requireContains(imageImporter, 'registerSpectralForgeImageObjectUrl');
requireContains(transportBar, 'triggerSpectralForgeDownloadUrl');
requireContains(carrierLab, 'registerSpectralForgeDownloadObjectUrl(url, blob, fileName');
requireContains(diagnostics, 'spectralForgeRuntime: summarizeSpectralForgePreviewLifecycleRegistry()');
requireContains(panel, 'SpectralForge aktiv');
for (const protectedPath of [
  'src/features/xensonar/rootFollow/useRootFollowLoopPlayback.ts',
  'src/features/xensonar/material/materialLoopPlaybackWorkflow.ts',
  'src/features/xensonar/audioTraffic/waveOvertoneArpRuntime.ts',
]) {
  requireNotContains(protectedPath, 'summarizeSpectralForgePreviewLifecycleRegistry');
  requireNotContains(protectedPath, 'registerSpectralForgePreviewAudioSource');
}
requireContains(doc, '3.2.91.4.114.45');
requireContains(doc, 'passive Lifecycle-Probe');
requireContains(doc, 'no V2 rendering change');
requireContains(doc, 'CarrierDonorLab');
requireContains(doc, 'Root Follow');
requireContains(doc, 'Wellenstarter-Arp');
if (exists(manifest)) {
  const data = JSON.parse(read(manifest));
  if (data.version !== expectedVersion) failures.push(`${manifest} version ${data.version} != ${expectedVersion}`);
  if (!allowedPatchNames.has(data.patch)) failures.push(`${manifest} patch ${data.patch} not in allowed lineage: ${Array.from(allowedPatchNames).join(', ')}`);
  for (const required of [
    'xensonar:check-spectralforge-preview-lifecycle-probe',
    'xensonar:check-root-follow-lifecycle-contract',
    'xensonar:check-wave-overtone-arp-contract',
    'xensonar:check-wave-overtone-arp-traffic-contract',
  ]) {
    if (!data.validation?.includes(required)) failures.push(`${manifest} validation does not include ${required}`);
  }
}
if (failures.length) {
  console.error('[xensonar-spectralforge-preview-lifecycle-probe] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[xensonar-spectralforge-preview-lifecycle-probe] ok');
console.log(JSON.stringify({ version, registry, note: 'passive SpectralForge preview/source/object-url lifecycle evidence only; no V2 rendering or event-density change' }, null, 2));
