#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const exists = (p) => existsSync(join(root, p));
const read = (p) => readFileSync(join(root, p), 'utf8');
const requireFile = (p) => { if (!exists(p)) failures.push(`missing ${p}`); };
const requireContains = (p, needle, note = '') => {
  if (!exists(p)) return;
  if (!read(p).includes(needle)) failures.push(`${p} missing ${needle}${note ? ` · ${note}` : ''}`);
};
const requireNotContains = (p, needle, note = '') => {
  if (!exists(p)) return;
  if (read(p).includes(needle)) failures.push(`${p} must not contain ${needle}${note ? ` · ${note}` : ''}`);
};

const required = [
  'src/features/xensonar/myzelSynth/myzelSynthRegistry.ts',
  'src/features/resonance/myzelCentralColorMixer.ts',
  'src/features/resonance/nodalDeviceMatrix.ts',
  'src/features/resonance/nodalModulationMatrix.ts',
  'src/features/resonance/semanticInteractionDevice.ts',
  'src/features/resonance/topologicalResonanceMatrix.ts',
  'src/features/topology/myzelSpatialEffectField.ts',
  'src/features/topology/nodalRelationLayer.ts',
];
required.forEach(requireFile);

for (const marker of [
  'MYZEL_SYNTH_DEVICE_REGISTRY',
  'central-color-voice',
  'nodal-device-matrix',
  'semantic-interaction-device',
  'topological-resonance-matrix',
  'spatial-aura-field',
  'resident-field-frame',
  'createDefaultMyzelSynthRuntimePolicy',
  'describeMyzelSynthRuntime',
  'ensureMyzelSynthRegisteredAudioDevices',
  'MyzelSynthAudioDeviceRefs',
  'MyzelSynthRegisteredAudioDevices',
]) requireContains('src/features/xensonar/myzelSynth/myzelSynthRegistry.ts', marker);

for (const marker of ['DEFAULT_MYZEL_CENTRAL_COLOR_MIXER', 'normalizeMyzelCentralColorMixer']) {
  requireContains('src/features/resonance/myzelCentralColorMixer.ts', marker);
}
for (const marker of ['NODAL_DEVICE_DEFINITIONS', 'NODAL_TARGET_DEFINITIONS', 'DEFAULT_NODAL_DEVICE_MATRIX', 'deriveNodalConstellationFingerprint']) {
  requireContains('src/features/resonance/nodalDeviceMatrix.ts', marker);
}
for (const marker of ['DEFAULT_NODAL_MOD_ROUTES', 'NODAL_MOD_SOURCE_LABELS', 'NODAL_MOD_TARGET_LABELS']) {
  requireContains('src/features/resonance/nodalModulationMatrix.ts', marker);
}
for (const marker of ['calculateSemanticProfile', 'ensureSemanticInteractionDevice', 'updateSemanticInteractionDevice']) {
  requireContains('src/features/resonance/semanticInteractionDevice.ts', marker);
}
for (const marker of ['ensureTopologicalResonator', 'updateTopologicalResonator', 'TopologicalResonanceTelemetry']) {
  requireContains('src/features/resonance/topologicalResonanceMatrix.ts', marker);
}
for (const marker of [
  'ensureSemanticInteractionDevice(ctx, refs, targetBus, noiseBuffer)',
  'ensureTopologicalResonator(ctx, refs, targetBus)',
]) {
  requireContains('src/features/xensonar/myzelSynth/myzelSynthRegistry.ts', marker);
}

requireNotContains('src/App.tsx', 'ensureSemanticInteractionDevice(', 'Semantic Interaction Device must be behind Myzel synth runtime/registry, not App.tsx inline.');
requireNotContains('src/App.tsx', 'ensureTopologicalResonator(', 'Topological Resonator must be behind Myzel synth runtime/registry, not App.tsx inline.');
requireNotContains('src/App.tsx', 'DEFAULT_NODAL_MOD_ROUTES', 'Nodal modulation matrix should not be rebuilt inline in App.tsx.');

const matrix = exists('tools/smartMerge/879CompletionMatrix.json') ? JSON.parse(read('tools/smartMerge/879CompletionMatrix.json')) : null;
const slice = matrix?.slices?.find((entry) => entry.id === 'myzel_synth_and_room3');
if (!slice) failures.push('smart-merge matrix missing myzel_synth_and_room3 slice');
else {
  if (!String(slice.status).startsWith('active')) failures.push(`myzel_synth_and_room3 slice must be active, got ${slice.status}`);
  for (const script of ['xensonar:check-myzel-synth-registry-boundary', 'xensonar:check-room3-frame-runtime-boundary']) {
    if (!slice.sanityScripts?.includes(script)) failures.push(`myzel_synth_and_room3 slice missing sanity script ${script}`);
  }
}

if (failures.length) {
  console.error('[myzel-synth-registry-boundary] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('[myzel-synth-registry-boundary] ok');
console.log(JSON.stringify({ files: required.length, devices: 6 }, null, 2));
