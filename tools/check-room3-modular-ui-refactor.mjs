#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const room3StateHookPath = 'src/features/xensonar/room3/useRoom3TopologyUiState.ts';
const roomSceneBoundaryPath = 'src/features/xensonar/room3/useAppRoomSceneRuntimeBoundary.ts';
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

requireFile('src/features/topology/MyzelRoom3SynthControls.tsx');
requireFile('src/features/topology/MyzelTopologyPanel.tsx');
requireFile('src/features/topology/MyzelEnhancerControls.tsx');
requireFile('src/features/topology/MyzelInstallationControls.tsx');

requireFile('src/features/topology/useMyzelResidentWorkbenchUiState.ts');
for (const marker of [
  'useMyzelResidentWorkbenchUiState',
  'residentSoundMenuGroups',
  'markResidentWorkbenchSent',
]) requireContains('src/features/topology/MyzelTopologyPanel.tsx', marker);
for (const marker of [
  'myzel-sample-list-refresh',
  'MELODIC_SAMPLE_LIBRARY_UPDATED_EVENT',
  'residentWorkbenchSendConfirmed',
]) requireContains('src/features/topology/useMyzelResidentWorkbenchUiState.ts', marker);

const topologyLines = exists('src/features/topology/MyzelTopologyPanel.tsx') ? read('src/features/topology/MyzelTopologyPanel.tsx').split('\n').length : 99999;
if (topologyLines >= 400) failures.push(`MyzelTopologyPanel.tsx ${topologyLines} lines; expected below 400 after mode-owner split.`);

for (const marker of [
  'data-xensonar-room3-synth-controls="modular"',
  'data-xensonar-room3-synth-section="central-color-voice"',
  'data-xensonar-room3-synth-section="nodal-device-matrix"',
  'data-xensonar-room3-synth-section="nodal-modulation-matrix"',
  'TOPOLOGY_VIEW_FOCUS_OPTIONS',
  'NODAL_DEVICE_DEFINITIONS',
  'DEFAULT_NODAL_MOD_ROUTES',
]) requireContains('src/features/topology/MyzelRoom3SynthControls.tsx', marker);

for (const marker of [
  'MyzelEnhancerControls',
  'MyzelInstallationControls',
  'myzelCentralColorMixer',
  'onNodalDeviceTargetChange',
]) requireContains('src/features/topology/MyzelTopologyPanel.tsx', marker);

for (const owner of [
  'src/features/topology/MyzelEnhancerControls.tsx',
  'src/features/topology/MyzelInstallationControls.tsx',
]) {
  for (const marker of [
    'MyzelRoom3SynthControls',
    'myzelCentralColorMixer',
    'onNodalDeviceTargetChange',
  ]) requireContains(owner, marker);
}

for (const marker of [
  'nodalDeviceMatrix',
  'handleNodalDeviceEnabledChange',
  'handleNodalDeviceAmountChange',
  'handleNodalDeviceTargetChange',
]) requireContains('src/App.tsx', marker);

// The central color mixer setter moved with the Room-III state cluster.  The
// modular UI contract should follow current ownership rather than requiring the
// setter to leak back into App.tsx merely to satisfy a historical marker.
requireContains(room3StateHookPath, 'const [myzelCentralColorMixer, setMyzelCentralColorMixer]');
requireContains(room3StateHookPath, 'setMyzelCentralColorMixer,');
requireContains(roomSceneBoundaryPath, 'setMyzelCentralColorMixer: room3Topology.setMyzelCentralColorMixer');
requireNotContains('src/App.tsx', 'setMyzelCentralColorMixer', 'Room-III state setters should remain owned by the dedicated state hook.');

for (const marker of [
  'myzelCentralColorMixer',
  'nodalDeviceMatrix',
  'onNodalDeviceTargetChange',
]) {
  requireContains('src/features/xensonar/rooms/appRoomSceneBindings.ts', marker);
  requireContains('src/features/xensonar/rooms/appRoomSceneRuntimeBindings.ts', marker);
  requireContains('src/features/xensonar/rooms/appRoomViewportProps.ts', marker);
}

requireNotContains('src/App.tsx', 'data-xensonar-room3-synth-section', 'Room-III synth UI must stay in topology component files, not App.tsx.');
requireNotContains('src/App.tsx', 'NODAL_DEVICE_DEFINITIONS.map', 'Nodal-device UI loops must stay outside App.tsx.');

const appLines = exists('src/App.tsx') ? read('src/App.tsx').split('\n').length : 99999;
if (appLines >= 7765) failures.push(`App.tsx ${appLines} lines; expected below 6.8.7 baseline after modular Room III UI refactor.`);

if (failures.length) {
  console.error('[room3-modular-ui-refactor] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`[room3-modular-ui-refactor] ok · App.tsx ${appLines} lines · MyzelTopologyPanel ${topologyLines} lines`);
