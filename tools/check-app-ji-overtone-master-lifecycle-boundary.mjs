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
const boundaryPath = 'src/features/xensonar/audio/useAppJiOvertoneMasterLifecycleBoundary.ts';
const auditPath = 'validation/contracts/xensonar/audio/appDroneOvertoneOwnershipAudit.ts';
const planPath = 'src/features/xensonar/audio/appJiOscillatorOwnershipResolutionPlan.ts';
const mapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-ji-overtone-master-lifecycle-boundary';

for (const rel of [appPath, boundaryPath, auditPath, planPath, mapPath, pkgPath, suitePath, suiteContractPath]) {
  if (!exists(rel)) failures.push(`missing ${rel}`);
}

const app = exists(appPath) ? read(appPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const audit = exists(auditPath) ? read(auditPath) : '';
const plan = exists(planPath) ? read(planPath) : '';
const map = exists(mapPath) ? read(mapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {}, version: '' };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;

for (const marker of [
  'import { useAppJiOvertoneMasterLifecycleBoundary }',
  'useAppJiOvertoneMasterLifecycleBoundary({',
  'nexusParamsRef,',
  'noManualJiCollapse: true',
  'noRouteRewrite: true',
  'mainLoopFallbackStillRecorded: true',
  'noFrameMixSyncMoved: true',
  'noWaveStarterOrRootFollowPolicyOwnedHere: true',
]) {
  requireText('App.tsx JI overtone boundary callsite', app, marker);
}
for (const forbidden of [
  'if (!refs.overtoneMaster) {\n      const overtoneMaster = audioCtx.createGain();',
  'refs.jiOscs[node.label] = osc;\n        refs.jiGains[node.label] = gain;',
  'Object.values(refsNow.jiOscs).forEach((osc) => {',
  'gain.connect(refs.overtoneMaster);\n        osc.start();\n        refs.jiOscs',
]) {
  forbidText('App.tsx should no longer own overtoneMaster/jiOsc lifecycle effect', app, forbidden);
}
for (const marker of [
  'export function useAppJiOvertoneMasterLifecycleBoundary',
  'jiOvertoneMasterLifecycleBoundaryExtractedFromAppTsx: true',
  'ownsJiOscillatorLayerLifecycleOnly: true',
  'preservesManualJiLayerSeparation: true',
  'doesNotResolveMainLoopFallbackYet: true',
  'noWaveStarterOrRootFollowPolicyOwnedHere: true',
  'DRONE_JI_OVERTONES',
  'if (!refs.overtoneMaster) {',
  'refs.overtoneMaster = overtoneMaster;',
  'refs.jiOscs[node.label] = osc;',
  'refs.jiGains[node.label] = gain;',
  'osc.frequency.setTargetAtTime(targetFreq, now, 0.04)',
  'refsNow.overtoneMaster = null;',
]) {
  requireText('JI overtone master lifecycle boundary source', boundary, marker);
}
for (const forbidden of [
  'refs.manualJiOscs',
  'refs.manualJiGains',
  'refs.manualJiMaster',
  'requestWaveStarterLaneAttack',
  'emitWaveStarterAttack',
  'startQuantizedCollisionRuntime',
  'playScheduledTone',
  'syncDroneMix',
]) {
  forbidText('JI overtone boundary must not absorb manual JI, Wellenstarter, traffic, or frame-sync hotpaths', boundary, forbidden);
}
for (const marker of [
  'previousPatchLineage: \'patch: "3.2.91.6.9.236_drone_frame_mix_sync_audit"\'',
  'jiOvertoneMasterLifecycleBoundaryExtracted: true',
  'manualJiLayerSeparatedFromJiOscillatorLayer: true',
  'mainLoopJiFallbackRecorded: true',
  'futureWorkletBranchAuthorityForWellenstarterPreserved: true',
]) {
  requireText('drone overtone ownership audit updated for JI overtone boundary', audit, marker);
}
for (const marker of [
  'Similar sounding overtone layers are not duplicates by default.',
  'Do not delete or merge jiOscs into manualJiOscs merely because both are JI/overtone oscillators.',
  'collapseIntoManualJiLayer',
]) {
  requireText('JI ownership resolution plan still protects musical variance', plan, marker);
}
for (const marker of [
  "status: 'ji-overtone-master-lifecycle-boundary-extracted'",
  "firstSafeMove: 'ji-overtone-master-lifecycle-boundary-extracted'",
  'JI overtone master lifecycle boundary extracted without collapsing manualJiOscs/jiOscs, rewriting routes, moving syncDroneMix, or changing Wellenstarter/Root-Follow live policy',
]) {
  requireText('monolith partition map updated for JI overtone master boundary', map, marker);
}
if (appLines > 3270) failures.push(`App.tsx expected <= 3270 lines after JI overtone master lifecycle boundary, got ${appLines}`);
if (!String(pkg.version || '').startsWith('3.2.91.6.9.')) failures.push(`package version expected 3.2.91.6.9.x successor, got ${pkg.version}`);
if (pkg.scripts?.[scriptName] !== 'node tools/check-app-ji-overtone-master-lifecycle-boundary.mjs') failures.push(`package script missing ${scriptName}`);
requireText('sanity suite', suite, scriptName);
requireText('sanity suite contract', suiteContract, scriptName);

const report = {
  ok: failures.length === 0,
  appLines,
  boundaryLines: boundary.split(/\r?\n/).length,
  contract: {
    jiOvertoneMasterLifecycleBoundaryExtractedFromAppTsx: true,
    ownsJiOscillatorLayerLifecycleOnly: true,
    preservesManualJiLayerSeparation: true,
    doesNotResolveMainLoopFallbackYet: true,
    noWaveStarterOrRootFollowPolicyOwnedHere: true,
  },
  failures,
};

if (failures.length) {
  console.error('[check-app-ji-overtone-master-lifecycle-boundary] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('[check-app-ji-overtone-master-lifecycle-boundary] ok');
console.log(JSON.stringify(report, null, 2));
