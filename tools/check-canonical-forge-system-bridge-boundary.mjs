#!/usr/bin/env node
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = (message) => {
  console.error(`[canonical-forge-system-bridge-boundary] ${message}`);
  process.exit(1);
};
const expect = (condition, message) => { if (!condition) fail(message); };

const roomPath = 'src/features/l3lab/canonicalForge/CanonicalForgeRoom.tsx';
const logicBridgePath = 'src/features/l3lab/canonicalForge/useCanonicalForgeLogicViewBridge.ts';
const importBridgePath = 'src/features/l3lab/canonicalForge/useCanonicalForgeMaterialImportRequestBridge.ts';
const packageBridgePath = 'src/features/l3lab/canonicalForge/useCanonicalForgePackageStationBridge.ts';

for (const path of [roomPath, logicBridgePath, importBridgePath, packageBridgePath]) {
  expect(fs.existsSync(path), `${path} is missing`);
}

const room = read(roomPath);
const logicBridge = read(logicBridgePath);
const importBridge = read(importBridgePath);
const packageBridge = read(packageBridgePath);

expect(room.includes('useCanonicalForgeLogicViewBridge'), 'CanonicalForgeRoom must use the logic view bridge hook');
expect(room.includes('useCanonicalForgeMaterialImportRequestBridge'), 'CanonicalForgeRoom must use the material import request bridge hook');
expect(room.includes('useCanonicalForgePackageStationBridge'), 'CanonicalForgeRoom must use the package station bridge hook');

for (const forbidden of [
  'registerXensonarPackageStationHandler',
  'REQUEST_MATERIAL_IMPORT_DIALOG_EVENT',
  'usePackageImportLauncher',
  'readMelodicWorkspaceExternalPackageContentSummary',
]) {
  expect(!room.includes(forbidden), `CanonicalForgeRoom must not own ${forbidden} directly`);
}

expect(logicBridge.includes('externalLogicView'), 'logic view bridge must own externalLogicView synchronization');
expect(logicBridge.includes('onExternalLogicViewChange'), 'logic view bridge must notify external logic view changes');
expect(importBridge.includes('REQUEST_MATERIAL_IMPORT_DIALOG_EVENT'), 'material import request bridge must own the request event name');
expect(importBridge.includes("setActiveWorkspace('microtonal-logic')"), 'material import request bridge must route to microtonal logic workspace');
expect(importBridge.includes("applyLogicView('melodic')"), 'material import request bridge must route to melodic logic view');
expect(packageBridge.includes('usePackageImportLauncher'), 'package bridge must own the package import launcher');
expect(packageBridge.includes('registerXensonarPackageStationHandler'), 'package bridge must register the package station handler');
expect(packageBridge.includes('readMelodicWorkspaceExternalPackageContentSummary'), 'package bridge must include external archive content in has-content status');
expect(packageBridge.includes('isMelodicLoopImportableMaterialEntry'), 'package bridge must keep melodic material content detection');

for (const [name, source] of [
  [logicBridgePath, logicBridge],
  [importBridgePath, importBridge],
  [packageBridgePath, packageBridge],
]) {
  for (const forbidden of ['audioEngine', 'createCanonicalSourcePreviewController', 'createCanonicalMaterialTransferController', 'requestAnimationFrame']) {
    expect(!source.includes(forbidden), `${name} must stay a system bridge and must not own ${forbidden}`);
  }
}

console.log('[canonical-forge-system-bridge-boundary] OK');
