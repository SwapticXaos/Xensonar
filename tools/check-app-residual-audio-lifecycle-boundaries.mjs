#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const failures = [];
const requireText = (label, haystack, needle) => {
  if (!haystack.includes(needle)) failures.push(`${label} missing ${needle}`);
};
const forbidText = (label, haystack, needle) => {
  if (haystack.includes(needle)) failures.push(`${label} must not contain ${needle}`);
};

const appPath = 'src/App.tsx';
const capturePath = 'src/features/xensonar/audio/useAppSharedAudioOutputBridgeRuntimeBoundary.ts';
const dronePath = 'src/features/xensonar/audio/useAppSecondaryDroneOscillatorLifecycleBoundary.ts';
const pkgPath = 'package.json';
const scriptName = 'xensonar:check-app-residual-audio-lifecycle-boundaries';

for (const rel of [appPath, capturePath, dronePath, pkgPath]) {
  if (!exists(rel)) failures.push(`missing ${rel}`);
}

const app = exists(appPath) ? read(appPath) : '';
const capture = exists(capturePath) ? read(capturePath) : '';
const drone = exists(dronePath) ? read(dronePath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {} };

requireText('App.tsx', app, 'useAppSharedAudioOutputBridgeRuntimeBoundary({');
requireText('App.tsx', app, 'useAppSecondaryDroneOscillatorLifecycleBoundary({');
for (const forbidden of [
  'type ExternalPcmQueuedBlock = {',
  'createScriptProcessor(1024, 0, 2)',
  'registerXensonarSharedAudioOutputBridge({',
  'if (!refs.oscB || !refs.gainB)',
  'if (!refs.lfo || !refs.lfoGain)',
]) forbidText('App.tsx residual audio lifecycle bodies', app, forbidden);

requireText('shared output bridge owner', capture, 'export function useAppSharedAudioOutputBridgeRuntimeBoundary');
requireText('shared output bridge owner', capture, 'registerXensonarSharedAudioOutputBridge({');
requireText('shared output bridge owner', capture, 'createScriptProcessor(1024, 0, 2)');
requireText('shared output bridge owner', capture, 'registerXensonarSharedAudioOutputBridge(null);');
requireText('shared output bridge owner', capture, 'noInstrumentSchedulingPolicyOwnedHere: true');
for (const forbidden of [
  'requestAnimationFrame',
  'emitWaveStarterAttack',
  'requestWaveStarterLaneAttack',
  'useRootFollow',
  'rootFollowMaterialRenderer',
  'scheduleRootFollow',
]) forbidText('shared output bridge owner must stay capture-only', capture, forbidden);
if (capture.split(/\r?\n/).length > 220) failures.push('shared output bridge owner must stay <= 220 lines');

requireText('secondary drone owner', drone, 'export function useAppSecondaryDroneOscillatorLifecycleBoundary');
requireText('secondary drone owner', drone, 'ownsOscBAndFilterLfoLifecycleOnly: true');
requireText('secondary drone owner', drone, 'irrelevantInstallationRestartDependenciesRemoved: true');
requireText('secondary drone owner', drone, 'if (!refs.oscB || !refs.gainB)');
requireText('secondary drone owner', drone, 'if (!refs.lfo || !refs.lfoGain)');
requireText(
  'secondary drone owner minimal restart dependencies',
  drone,
  '[room, nexusActive, audioCtx]',
);
for (const forbidden of [
  'installationSharedFieldActive',
  'installAttractCursor',
  'installAttractOscillatorBall',
]) forbidText('secondary drone owner must not restart for unrelated installation UI state', drone, forbidden);
for (const forbidden of [
  'emitWaveStarterAttack',
  'requestWaveStarterLaneAttack',
  'useRootFollow',
  'scheduleRootFollow',
  'createScriptProcessor',
]) forbidText('secondary drone owner must stay lifecycle-only', drone, forbidden);
if (drone.split(/\r?\n/).length > 110) failures.push('secondary drone lifecycle owner must stay <= 110 lines');

if (pkg.scripts?.[scriptName] !== 'node tools/check-app-residual-audio-lifecycle-boundaries.mjs') {
  failures.push(`package script missing ${scriptName}`);
}

const report = {
  ok: failures.length === 0,
  appLines: app.split(/\r?\n/).length,
  captureOwnerLines: capture.split(/\r?\n/).length,
  secondaryDroneOwnerLines: drone.split(/\r?\n/).length,
  contract: {
    sharedAudioCaptureLifecycleOwnedOutsideApp: true,
    secondaryDroneOscAndFilterLfoOwnedOutsideApp: true,
    irrelevantSecondaryDroneRestartDependenciesRemoved: true,
    noWaveStarterOrRootFollowPolicyMoved: true,
  },
  failures,
};

if (failures.length) {
  console.error('[check-app-residual-audio-lifecycle-boundaries] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('[check-app-residual-audio-lifecycle-boundaries] ok');
console.log(JSON.stringify(report, null, 2));
