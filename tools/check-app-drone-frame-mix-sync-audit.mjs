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
const planPath = 'src/features/xensonar/audio/appJiOscillatorOwnershipResolutionPlan.ts';
const mapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-drone-frame-mix-sync-audit';
const successorScriptName = 'xensonar:check-app-drone-frame-mix-sync-boundary';

for (const rel of [appPath, boundaryPath, auditPath, ownershipAuditPath, planPath, mapPath, pkgPath, suitePath, suiteContractPath]) {
  if (!exists(rel)) failures.push(`missing ${rel}`);
}

const app = exists(appPath) ? read(appPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const audit = exists(auditPath) ? read(auditPath) : '';
const ownershipAudit = exists(ownershipAuditPath) ? read(ownershipAuditPath) : '';
const plan = exists(planPath) ? read(planPath) : '';
const map = exists(mapPath) ? read(mapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {}, version: '' };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;

for (const marker of [
  'useAppDroneFrameMixSyncBoundary({',
  'noUiChangedByBoundary: true',
  'noGainNormalization: true',
  'noManualJiCollapse: true',
  'noJiOscRouteResolution: true',
]) requireText('App.tsx successor callsite after frame mix audit', app, marker);
for (const forbidden of [
  'const syncDroneMix = () => {',
  'getDroneRhythmGain(nParamsUI.droneRhythm',
  'updateDroneDriveInsert(refs.droneDriveRefs, now, {',
]) forbidText('App.tsx should no longer contain audited frame-mix body after successor boundary', app, forbidden);

for (const marker of [
  'export function useAppDroneFrameMixSyncBoundary',
  'const syncDroneMix = () => {',
  'getDroneRhythmGain(nParamsUI.droneRhythm',
  'updateDroneDriveInsert(refs.droneDriveRefs, now, {',
  'const weaveMatch = myzelEnabled ? getWeaveMatch(overtone.label, weaveRatios) : 0;',
  'const bodyWeight = room3Modal ? getPartialGroupWeight(overtone.label, room3Modal.partialGroups) : 1;',
  'gain.gain.setTargetAtTime(target, now, 0.02);',
]) requireText('successor boundary preserves audited syncDroneMix body', boundary, marker);

for (const marker of [
  'export const APP_DRONE_FRAME_MIX_SYNC_AUDIT',
  'APP_DRONE_FRAME_MIX_SYNC_AUDIT_CONTRACT',
  'patch: "3.2.91.6.9.237_drone_frame_mix_sync_boundary"',
  'previousPatchLineage: \'patch: "3.2.91.6.9.236_drone_frame_mix_sync_audit"\'',
  'auditOnly: false',
  'runtimeBoundaryExtracted: true',
  'syncDroneMixStillInlineInApp: false',
  'syncDroneMixBoundaryExtractedFromAppTsx: true',
  'noUiChangedByBoundary: true',
  'noGainAuthorityChanged: true',
  'noManualJiCollapse: true',
  'noJiOscRouteResolution: true',
  'noWaveStarterOrRootFollowPolicyOwnedHere: true',
  'volumeAndRhythmBus',
  'manualJiFrameAuthority',
  'driveAndBodyCoupling',
  'flangerAndMyzelWeave',
  'partialGroupWeighting',
  'cross-body resonance binding',
]) requireText('Drone frame mix sync audit source updated for successor boundary', audit, marker);

for (const forbidden of [
  'createGain()',
  'createOscillator()',
  'emitWaveStarterAttack',
  'requestWaveStarterLaneAttack',
]) forbidText('Drone frame mix sync audit must stay cold and non-runtime', audit, forbidden);

for (const marker of [
  'patch: "3.2.91.6.9.237_drone_frame_mix_sync_boundary"',
  'droneFrameMixSyncAudited: true',
  'droneFrameMixSyncBoundaryExtracted: true',
  'syncDroneMixStillInlineInApp: false',
  'noGainAuthorityChanged: true',
]) requireText('drone overtone ownership audit updated for successor boundary', ownershipAudit, marker);

for (const marker of [
  'Similar sounding overtone layers are not duplicates by default.',
  'collapseIntoManualJiLayer',
]) requireText('JI ownership plan continues to protect musical variance', plan, marker);

for (const marker of [
  "status: 'drone-frame-mix-sync-boundary-extracted'",
  'Drone frame mix sync boundary extracted as a pure refactor; no UI changed, no gain normalization, no JI/manual collapse, no Wellenstarter/Root-Follow live policy change',
]) requireText('monolith partition map updated for frame mix boundary successor', map, marker);
if (!map.includes("firstSafeMove: 'drone-frame-mix-sync-boundary-extracted'") && !map.includes("firstSafeMove: 'myzel-topology-runtime-loop-boundary-extracted'") && !map.includes("firstSafeMove: 'room3-body-audio-audited'") && !map.includes("firstSafeMove: 'room3-body-audio-runtime-boundary-extracted'")) {
  failures.push('monolith partition map should preserve frame mix boundary lineage or Myzel topology successor firstSafeMove');
}

if (!String(pkg.version || '').startsWith('3.2.91.6.9.')) failures.push(`package version expected 3.2.91.6.9.x successor, got ${pkg.version}`);
if (pkg.scripts?.[scriptName] !== 'node tools/check-app-drone-frame-mix-sync-audit.mjs') failures.push(`package script missing ${scriptName}`);
if (pkg.scripts?.[successorScriptName] !== 'node tools/check-app-drone-frame-mix-sync-boundary.mjs') failures.push(`package script missing ${successorScriptName}`);
requireText('sanity suite', suite, scriptName);
requireText('sanity suite', suite, successorScriptName);
requireText('sanity suite contract', suiteContract, scriptName);
requireText('sanity suite contract', suiteContract, successorScriptName);
if (appLines > 3210) failures.push(`App.tsx should stay shrunk after frame mix boundary, got ${appLines}`);

const report = {
  ok: failures.length === 0,
  appLines,
  auditLines: audit.split(/\r?\n/).length,
  contract: {
    auditOnly: false,
    runtimeBoundaryExtracted: true,
    syncDroneMixStillInlineInApp: false,
    noUiChangedByBoundary: true,
    noGainAuthorityChanged: true,
    noManualJiCollapse: true,
    noJiOscRouteResolution: true,
    noWaveStarterOrRootFollowPolicyOwnedHere: true,
  },
  failures,
};

if (failures.length) {
  console.error('[check-app-drone-frame-mix-sync-audit] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('[check-app-drone-frame-mix-sync-audit] ok');
console.log(JSON.stringify(report, null, 2));
