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
const boundaryPath = 'src/features/xensonar/audio/useAppManualJiOvertoneLifecycleBoundary.ts';
const auditPath = 'validation/contracts/xensonar/audio/appDroneOvertoneOwnershipAudit.ts';
const mapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-manual-ji-overtone-lifecycle-boundary';

for (const rel of [appPath, boundaryPath, auditPath, mapPath, pkgPath, suitePath, suiteContractPath]) {
  if (!exists(rel)) failures.push(`missing ${rel}`);
}

const app = exists(appPath) ? read(appPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const audit = exists(auditPath) ? read(auditPath) : '';
const map = exists(mapPath) ? read(mapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {}, version: '' };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;

for (const marker of [
  'import { useAppManualJiOvertoneLifecycleBoundary }',
  'useAppManualJiOvertoneLifecycleBoundary({',
  'nexusParamsRef,',
  'noJiOscillatorOwnershipResolvedHere: true',
  'noWaveStarterOrRootFollowPolicyOwnedHere: true',
]) {
  requireText('App.tsx manual JI boundary callsite', app, marker);
}
for (const forbidden of [
  'if (!refs.manualJiMaster) {\n      const master = audioCtx.createGain();',
  'refs.manualJiOscs[node.label] = osc;',
  'refs.manualJiGains[node.label] = g;',
  'Object.values(refs.manualJiOscs).forEach((osc) => {',
]) {
  forbidText('App.tsx should no longer own manual JI oscillator lifecycle', app, forbidden);
}
for (const marker of [
  'export function useAppManualJiOvertoneLifecycleBoundary',
  'manualJiOvertoneLifecycleBoundaryExtractedFromAppTsx: true',
  'ownsManualJiOscillatorLifecycleOnly: true',
  'doesNotOwnJiOscillatorLayer: true',
  'noWaveStarterOrRootFollowPolicyOwnedHere: true',
  'DRONE_JI_OVERTONES.forEach((node) => {',
  'refs.manualJiMaster = master;',
  'refs.manualJiOscs[node.label] = osc;',
  'refs.manualJiGains[node.label] = g;',
  'osc.frequency.setTargetAtTime(baseFreq * node.ratio, audioCtx.currentTime, 0.03)',
  'refs.manualJiMaster = null;',
]) {
  requireText('manual JI lifecycle boundary source', boundary, marker);
}
for (const forbidden of [
  'refs.jiOscs[node.label]',
  'refs.jiGains[node.label]',
  'refs.overtoneMaster',
  'requestWaveStarterLaneAttack',
  'emitWaveStarterAttack',
  'startQuantizedCollisionRuntime',
  'playScheduledTone',
]) {
  forbidText('manual JI boundary must not absorb unrelated hotpaths or jiOsc layer', boundary, forbidden);
}
for (const marker of [
  'manualJiOvertoneLifecycleBoundaryExtracted: true',
  'manualJiLayerSeparatedFromJiOscillatorLayer: true',
  'jiOscOwnershipAmbiguityRecorded: true',
  'futureWorkletBranchAuthorityForWellenstarterPreserved: true',
]) {
  requireText('drone overtone ownership audit updated for manual JI boundary', audit, marker);
}
for (const marker of [
  'manual JI lifecycle boundary extracted without collapsing jiOscs/manualJiOscs or Wellenstarter/Root-Follow live policy',
]) {
  requireText('monolith partition map updated for manual JI boundary', map, marker);
}
if (appLines > 3325) failures.push(`App.tsx expected <= 3325 lines after manual JI lifecycle boundary, got ${appLines}`);
if (!String(pkg.version || '').startsWith('3.2.91.6.9.')) failures.push(`package version expected 3.2.91.6.9.x successor, got ${pkg.version}`);
if (pkg.scripts?.[scriptName] !== 'node tools/check-app-manual-ji-overtone-lifecycle-boundary.mjs') failures.push(`package script missing ${scriptName}`);
requireText('sanity suite', suite, scriptName);
requireText('sanity suite contract', suiteContract, scriptName);

const report = {
  ok: failures.length === 0,
  appLines,
  boundaryLines: boundary.split(/\r?\n/).length,
  contract: {
    manualJiOvertoneLifecycleBoundaryExtractedFromAppTsx: true,
    ownsManualJiOscillatorLifecycleOnly: true,
    doesNotOwnJiOscillatorLayer: true,
    noWaveStarterOrRootFollowPolicyOwnedHere: true,
  },
  failures,
};

if (failures.length) {
  console.error('[check-app-manual-ji-overtone-lifecycle-boundary] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('[check-app-manual-ji-overtone-lifecycle-boundary] ok');
console.log(JSON.stringify(report, null, 2));
