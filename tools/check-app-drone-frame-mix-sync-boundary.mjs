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
const boundaryPath = 'src/features/xensonar/audio/useAppDroneFrameMixSyncBoundary.ts';
const auditPath = 'validation/contracts/xensonar/audio/appDroneFrameMixSyncAudit.ts';
const ownershipAuditPath = 'validation/contracts/xensonar/audio/appDroneOvertoneOwnershipAudit.ts';
const mapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-drone-frame-mix-sync-boundary';

for (const rel of [appPath, boundaryPath, auditPath, ownershipAuditPath, mapPath, pkgPath, suitePath, suiteContractPath]) {
  if (!exists(rel)) failures.push(`missing ${rel}`);
}

const app = exists(appPath) ? read(appPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const audit = exists(auditPath) ? read(auditPath) : '';
const ownershipAudit = exists(ownershipAuditPath) ? read(ownershipAuditPath) : '';
const map = exists(mapPath) ? read(mapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {}, version: '' };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;

for (const marker of [
  'import { useAppDroneFrameMixSyncBoundary }',
  'useAppDroneFrameMixSyncBoundary({',
  'noUiChangedByBoundary: true',
  'noGainNormalization: true',
  'noManualJiCollapse: true',
  'noJiOscRouteResolution: true',
  'noWaveStarterOrRootFollowPolicyOwnedHere: true',
]) requireText('App.tsx frame mix boundary callsite', app, marker);

for (const forbidden of [
  'const syncDroneMix = () => {',
  'getDroneRhythmGain(nParamsUI.droneRhythm',
  'updateDroneDriveInsert(refs.droneDriveRefs, now, {',
  'const weaveMatch = myzelEnabled ? getWeaveMatch(overtone.label, weaveRatios) : 0;',
  'const bodyWeight = room3Modal ? getPartialGroupWeight(overtone.label, room3Modal.partialGroups) : 1;',
  'refs.flangerWet.gain.setTargetAtTime(flangerAmt * 0.8, now, 0.05)',
]) forbidText('App.tsx should no longer own syncDroneMix body', app, forbidden);

for (const marker of [
  'export function useAppDroneFrameMixSyncBoundary',
  'droneFrameMixSyncBoundaryExtractedFromAppTsx: true',
  'ownsFrameMixRafOnly: true',
  'preservesMyzelRoom3PartialWeighting: true',
  'noUiChangedByBoundary: true',
  'noWaveStarterOrRootFollowPolicyOwnedHere: true',
  'const syncDroneMix = () => {',
  'getDroneRhythmGain(nParamsUI.droneRhythm',
  'updateDroneDriveInsert(refs.droneDriveRefs, now, {',
  'refs.flangerWet.gain.setTargetAtTime(flangerAmt * 0.8, now, 0.05)',
  'const weaveMatch = myzelEnabled ? getWeaveMatch(overtone.label, weaveRatios) : 0;',
  'const bodyWeight = room3Modal ? getPartialGroupWeight(overtone.label, room3Modal.partialGroups) : 1;',
  'gain.gain.setTargetAtTime(target, now, 0.02);',
]) requireText('Drone frame mix sync boundary source', boundary, marker);

for (const forbidden of [
  'createGain()',
  'createOscillator()',
  'emitWaveStarterAttack',
  'requestWaveStarterLaneAttack',
  'startQuantizedCollisionRuntime',
  'setRoom(',
  'setFamilyRequestedActive',
]) forbidText('Drone frame mix boundary must not create nodes, UI, Wellenstarter, or traffic ownership', boundary, forbidden);

for (const marker of [
  'patch: "3.2.91.6.9.237_drone_frame_mix_sync_boundary"',
  'previousPatchLineage: \'patch: "3.2.91.6.9.236_drone_frame_mix_sync_audit"\'',
  'runtimeBoundaryExtracted: true',
  'syncDroneMixBoundaryExtractedFromAppTsx: true',
  'noUiChangedByBoundary: true',
  'noGainAuthorityChanged: true',
  'noManualJiCollapse: true',
  'noJiOscRouteResolution: true',
]) requireText('Drone frame mix sync audit updated for boundary', audit, marker);

for (const marker of [
  'patch: "3.2.91.6.9.237_drone_frame_mix_sync_boundary"',
  'droneFrameMixSyncBoundaryExtracted: true',
  'syncDroneMixStillInlineInApp: false',
  'noGainAuthorityChanged: true',
]) requireText('Drone overtone ownership audit updated for frame mix boundary', ownershipAudit, marker);

for (const marker of [
  "status: 'drone-frame-mix-sync-boundary-extracted'",
  'Drone frame mix sync boundary extracted as a pure refactor; no UI changed, no gain normalization, no JI/manual collapse, no Wellenstarter/Root-Follow live policy change',
]) requireText('monolith partition map updated for frame mix boundary', map, marker);
if (!map.includes("firstSafeMove: 'drone-frame-mix-sync-boundary-extracted'") && !map.includes("firstSafeMove: 'myzel-topology-runtime-loop-boundary-extracted'") && !map.includes("firstSafeMove: 'room3-body-audio-audited'") && !map.includes("firstSafeMove: 'room3-body-audio-runtime-boundary-extracted'")) {
  failures.push('monolith partition map should preserve frame mix boundary lineage or successor firstSafeMove');
}

if (!String(pkg.version || '').startsWith('3.2.91.6.9.')) failures.push(`package version expected 3.2.91.6.9.x successor, got ${pkg.version}`);
if (pkg.scripts?.[scriptName] !== 'node tools/check-app-drone-frame-mix-sync-boundary.mjs') failures.push(`package script missing ${scriptName}`);
requireText('sanity suite', suite, scriptName);
requireText('sanity suite contract', suiteContract, scriptName);
if (appLines > 3210) failures.push(`App.tsx should shrink after frame mix boundary, got ${appLines}`);

const report = {
  ok: failures.length === 0,
  appLines,
  boundaryLines: boundary.split(/\r?\n/).length,
  contract: {
    runtimeBoundaryExtracted: true,
    noUiChangedByBoundary: true,
    noGainNormalization: true,
    noManualJiCollapse: true,
    noJiOscRouteResolution: true,
    noWaveStarterOrRootFollowPolicyOwnedHere: true,
  },
  failures,
};

if (failures.length) {
  console.error('[check-app-drone-frame-mix-sync-boundary] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('[check-app-drone-frame-mix-sync-boundary] ok');
console.log(JSON.stringify(report, null, 2));
