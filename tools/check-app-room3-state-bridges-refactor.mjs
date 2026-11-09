#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const count = (text, token) => text.split(token).length - 1;
const app = read('src/App.tsx');
const bridgePath = 'src/features/xensonar/room3/room3AppStateBridges.ts';
const installBodyPath = 'src/features/xensonar/room3/useRoom3InstallationAndBodyStateBridges.ts';
const myzelPath = 'src/features/xensonar/room3/useRoom3MyzelStateMirrors.ts';
const nodalMirrorPath = 'src/features/xensonar/room3/useRoom3NodalDeviceStateMirror.ts';
const bridge = read(bridgePath);
const installBody = read(installBodyPath);
const myzel = read(myzelPath);
const nodalMirror = read(nodalMirrorPath);

const checks = {
  hasBridgeFacade: exists(bridgePath),
  hasInstallationBodyOwner: exists(installBodyPath),
  hasMyzelMirrorOwner: exists(myzelPath),
  hasNodalMirrorOwner: exists(nodalMirrorPath),
  appUsesMirrorHook: app.includes('useRoom3StateMirrorEffects({'),
  appUsesNodalDeviceActionsHook: app.includes('useNodalDeviceMatrixActions(setNodalDeviceMatrix)'),
  facadeKeepsOwnerOrder:
    bridge.indexOf('useRoom3InstallationAndBodyStateBridges(args)') < bridge.indexOf('useRoom3MyzelStateMirrors(args)')
    && bridge.indexOf('useRoom3MyzelStateMirrors(args)') < bridge.indexOf('useRoom3NodalDeviceStateMirror(args)'),
  facadeOwnsNoEffects: !bridge.includes('useEffect('),
  installationBodyOwnsFourEffects: count(installBody, 'useEffect(') === 4,
  myzelOwnsFourEffects: count(myzel, 'useEffect(') === 4,
  nodalOwnsOneEffect: count(nodalMirror, 'useEffect(') === 1,
  totalMirrorEffectCountPreserved:
    count(installBody, 'useEffect(') + count(myzel, 'useEffect(') + count(nodalMirror, 'useEffect(') === 9,
  persistsResidentConstellations: installBody.includes('persistResidentConstellations(savedResidentConstellations)'),
  normalizesColorMixer: myzel.includes('normalizeMyzelCentralColorMixer(myzelCentralColorMixer)'),
  normalizesDeviceMatrix: nodalMirror.includes('normalizeNodalDeviceMatrix(nodalDeviceMatrix)'),
  bridgeOwnsNodalDeviceHandlers: bridge.includes('updateNodalDeviceEntry(prev, device') && bridge.includes('setNodalDeviceTarget(prev, device, target, value)'),
  appNoLongerImportsPersistResidentConstellations: !app.includes('persistResidentConstellations,'),
  appNoLongerImportsNodalDeviceMutators: !app.includes('setNodalDeviceTarget,') && !app.includes('updateNodalDeviceEntry,'),
  appNoLongerImportsRoom3Normalizers: !app.includes('normalizeMyzelCentralColorMixer') && !app.includes('normalizeNodalDeviceMatrix'),
  protectedUiNodeAuraLayerStillPresent: read('src/features/resonance/refactorTopologyLegacyAudio.ts').includes('nodeColorOsc')
    && read('src/features/resonance/refactorTopologyLegacyAudio.ts').includes('nodeDriveShaper')
    && read('src/features/resonance/refactorTopologyLegacyAudioFrame.ts').includes('myzelNearestPresetId')
    && read('src/features/resonance/refactorTopologyNodeAura.ts').includes('getNodeAuraSignature'),
};

const appLines = app.split('\n').length;
checks.appLineCountUnderBoundary = appLines <= 7263;

const failed = Object.entries(checks).filter(([, value]) => !value);
const result = {
  ok: failed.length === 0,
  appLines,
  mirrorEffectCount: count(installBody, 'useEffect(') + count(myzel, 'useEffect(') + count(nodalMirror, 'useEffect('),
  checks,
  failed: failed.map(([name]) => name),
};
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
