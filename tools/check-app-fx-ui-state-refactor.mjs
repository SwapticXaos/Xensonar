#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const app = read('src/App.tsx');
const hookPath = 'src/features/xensonar/rooms/useResonanceFxUiState.ts';
const hook = read(hookPath);

const protectedFiles = [
  'src/features/resonance/refactorTopologyLegacyAudio.ts',
  'src/features/resonance/refactorTopologyNodeAura.ts',
  'src/features/resonance/refactorTopologyLegacyAudioFrame.ts',
  'src/features/resonance/refactorTopologyLegacyAudioGraph.ts',
  'src/features/xensonar/room3/room3NodeDeviceAudioPath.ts',
  'src/features/xensonar/audio/waveStarterMicroOrchestrator.ts',
  'tools/prove-package-complete-musical-payload-roundtrip.mjs',
];

const movedMarkers = [
  'getDefaultCollectiveMemoryUi',
  'getDefaultPsychedelicSpiralUi',
  'getDefaultEnterHoldPsyFxUi',
  'getDefaultTransientDriveUi',
  'getDefaultSchwarmUi',
  'getDefaultControlPerfMonitor',
  'getDefaultTransientRuntimeMonitor',
  'mergeNestedUiSection',
  'updateCollectiveMemoryUi',
  'updatePsychedelicSpiralSource',
  'updateTransientDriveSource',
  'updateSchwarmSource',
];

const checks = {
  hookExists: fs.existsSync(path.join(root, hookPath)),
  appUsesHook: app.includes('useResonanceFxUiState()'),
  hookOwnsFxDefaults: movedMarkers.every((marker) => hook.includes(marker)),
  appNoLongerImportsFxDefaults: !app.includes('getDefaultCollectiveMemoryUi') && !app.includes('getDefaultTransientRuntimeMonitor') && !app.includes('mergeNestedUiSection'),
  appStillUsesFxStateNames: ['collectiveMemoryUi', 'psychedelicSpiralUi', 'transientDriveUi', 'schwarmUi'].every((marker) => app.includes(marker)),
  packageRoundtripProofEmitsPackageJson: read('tools/prove-package-complete-musical-payload-roundtrip.mjs').includes('--package-out') && read('tools/prove-package-complete-musical-payload-roundtrip.mjs').includes('packageJsonProofPath'),
  protectedFilesPresent: protectedFiles.every((rel) => fs.existsSync(path.join(root, rel))),
  room3AudioMarkersPresent: read('src/features/resonance/refactorTopologyLegacyAudio.ts').includes('nodeColorOsc') && read('src/features/resonance/refactorTopologyNodeAura.ts').includes('getNodeAuraSignature'),
  waveStarterMicroMarkersPresent: read('src/features/xensonar/audio/waveStarterMicroOrchestrator.ts').includes('emit-micro'),
  appLineCountUnder7155: app.split(/\r?\n/).length < 7155,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines: app.split(/\r?\n/).length,
  hookLines: hook.split(/\r?\n/).length,
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
