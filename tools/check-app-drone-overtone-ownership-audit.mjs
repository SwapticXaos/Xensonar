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
const auditPath = 'validation/contracts/xensonar/audio/appDroneOvertoneOwnershipAudit.ts';
const boundaryPath = 'src/features/xensonar/audio/useAppDroneGraphRoutingBoundary.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-drone-overtone-ownership-audit';

for (const rel of [appPath, auditPath, boundaryPath, pkgPath, suitePath, suiteContractPath]) {
  if (!exists(rel)) failures.push(`missing ${rel}`);
}

const app = exists(appPath) ? read(appPath) : '';
const audit = exists(auditPath) ? read(auditPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {}, version: '' };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

requireText('audit source', audit, 'APP_DRONE_OVERTONE_OWNERSHIP_AUDIT');
requireText('audit source', audit, 'APP_DRONE_OVERTONE_OWNERSHIP_AUDIT_CONTRACT');
for (const id of [
  'id: "droneGraphRouting"',
  'id: "primaryDroneVoice"',
  'id: "manualJiOvertoneLayer"',
  'id: "jiOscillatorLayer"',
  'id: "droneFrameMixSync"',
  'id: "myzelOvertoneLayer"',
  'id: "room3ModalCoupling"',
]) {
  requireText('audit source covers ownership layer', audit, id);
}
for (const marker of [
  'manualJiMaster',
  'manualJiOscs',
  'manualJiGains',
  'overtoneMaster',
  'jiOscs',
  'jiGains',
  'droneVolumeBus',
  'droneGroupBus',
  'droneRhythmGain',
  'droneDriveRefs',
  'flangerDelay',
  'flangerFeedback',
  'flangerWet',
  'myceliumFormantFilter',
  'myzelMasterGain',
  'myzelOvertoneOscs',
  'myzelConstellationOscs',
  'room3ModalStateRef',
  'room3BodyControlsRef',
  'room3TimbreStateRef',
]) {
  requireText('audit source ref coverage', audit, marker);
}
for (const semanticMarker of [
  'useAppDroneGraphRoutingBoundary ensureDroneGraphRouting',
  'syncDroneMix frame-sync effect',
  'Resonance Nexus main loop fallback',
  'useAppJiOvertoneMasterLifecycleBoundary',
  'overtoneMaster effect',
  'DRONE_JI_OVERTONES',
  'legacy fallback recorded',
  'Wellenstarter Live-Aktionsfläche',
  'Root Follow',
  'futureWorkletBranchAuthorityForWellenstarterPreserved: true',
]) {
  requireText('audit source semantic coverage', audit, semanticMarker);
}
for (const contract of [
  'auditOnly: false',
  'droneGraphRoutingBoundaryExtracted: true',
  'noAudioSemanticsChanged: true',
  'noWaveStarterPolicyOwnedHere: true',
  'noRootFollowPolicyOwnedHere: true',
  'manualJiLayerPreserved: true',
  'myzelOvertoneLayerNotCollapsed: true',
  'jiOscOwnershipAmbiguityRecorded: true',
  'mainLoopJiFallbackRecorded: true',
  'applyRealtimeDroneOvertonesManualMixRoleRecorded: true',
  'droneGraphRoutingBoundaryOwnsBusShell: true',
  'syncDroneMixFrameAuthorityRecorded: true',
  'manualJiOvertoneLifecycleBoundaryExtracted: true',
  'manualJiLayerSeparatedFromJiOscillatorLayer: true',
  'jiOvertoneMasterLifecycleBoundaryExtracted: true',
  'droneFrameMixSyncBoundaryExtracted: true',
  'syncDroneMixStillInlineInApp: false',
]) {
  requireText('audit contract', audit, contract);
}
for (const forbidden of [
  'new AudioContext',
  'createOscillator(',
  'createGain(',
  '.connect(',
  '.start(',
  'requestAnimationFrame(',
  'window.addEventListener',
  'localStorage.',
]) {
  forbidText('audit source must remain static and non-runtime', audit, forbidden);
}

for (const marker of [
  'useAppDroneGraphRoutingBoundary({',
  'const applyRealtimeDroneOvertones = (',
  'ensureDroneGraphRouting(ctx)',
  'useAppDroneFrameMixSyncBoundary({',
  'refs.manualJiMaster',
  'useAppManualJiOvertoneLifecycleBoundary({',
  'useAppJiOvertoneMasterLifecycleBoundary({',
  'if (Object.keys(nexusRefs.current.jiOscs).length === 0)',
  'useAppNexusAudioActionSurfaceBoundary({',
]) {
  requireText('App.tsx keeps audited runtime bodies in expected state', app, marker);
}
for (const forbidden of [
  'useAppDroneOvertoneOwnershipBoundary',
  'DroneOvertoneQueue',
]) {
  forbidText('App.tsx no broader drone/overtone runtime extraction yet', app, forbidden);
}

for (const marker of [
  'createDroneDriveInsert',
  'routeToDroneGroupBus',
  'droneGraphRoutingBoundaryExtractedFromAppTsx: true',
  'routesExistingDroneVoicesOnly: true',
  'noJiOscillatorOwnershipResolvedHere: true',
  'noWaveStarterOrRootFollowPolicyOwnedHere: true',
]) {
  requireText('drone graph routing boundary source', boundary, marker);
}
for (const forbidden of [
  'requestWaveStarterLaneAttack',
  'emitWaveStarterAttack',
  'startRootFollow',
  'RootFollowLoop',
  'startQuantizedCollisionRuntime',
]) {
  forbidText('drone graph routing boundary no unrelated live policy', boundary, forbidden);
}

if (!pkg.version.startsWith('3.2.91.6.9.')) failures.push(`package version expected 3.2.91.6.9.x successor, got ${pkg.version}`);
if (pkg.scripts?.[scriptName] !== 'node tools/check-app-drone-overtone-ownership-audit.mjs') failures.push(`package script missing ${scriptName}`);
requireText('sanity suite', suite, scriptName);
requireText('sanity suite contract', suiteContract, scriptName);

const report = {
  ok: failures.length === 0,
  appLines: app.split(/\r?\n/).length,
  auditLines: audit.split(/\r?\n/).length,
  boundaryLines: boundary.split(/\r?\n/).length,
  contract: {
    auditOnly: false,
    droneGraphRoutingBoundaryExtracted: true,
    noAudioSemanticsChanged: true,
    manualJiLayerPreserved: true,
    myzelOvertoneLayerNotCollapsed: true,
    jiOscOwnershipAmbiguityRecorded: true,
    futureWorkletBranchAuthorityForWellenstarterPreserved: true,
    droneFrameMixSyncBoundaryExtracted: true,
  },
  failures,
};

if (failures.length) {
  console.error('[check-app-drone-overtone-ownership-audit] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('[check-app-drone-overtone-ownership-audit] ok');
console.log(JSON.stringify(report, null, 2));
