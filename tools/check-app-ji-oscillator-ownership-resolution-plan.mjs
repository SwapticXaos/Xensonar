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

const planPath = 'src/features/xensonar/audio/appJiOscillatorOwnershipResolutionPlan.ts';
const auditPath = 'validation/contracts/xensonar/audio/appDroneOvertoneOwnershipAudit.ts';
const manualBoundaryPath = 'src/features/xensonar/audio/useAppManualJiOvertoneLifecycleBoundary.ts';
const appPath = 'src/App.tsx';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-ji-oscillator-ownership-resolution-plan';

for (const rel of [planPath, auditPath, manualBoundaryPath, appPath, pkgPath, suitePath, suiteContractPath]) {
  if (!exists(rel)) failures.push(`missing ${rel}`);
}

const plan = exists(planPath) ? read(planPath) : '';
const audit = exists(auditPath) ? read(auditPath) : '';
const manualBoundary = exists(manualBoundaryPath) ? read(manualBoundaryPath) : '';
const app = exists(appPath) ? read(appPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {}, version: '' };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

for (const marker of [
  'APP_JI_OSCILLATOR_OWNERSHIP_RESOLUTION_PLAN',
  '3.2.91.6.9.234_ji_oscillator_ownership_resolution_plan',
  'planOnly: true',
  'noRuntimeCodeMoved: true',
  'noAudioSemanticsChanged: true',
  'noJiManualCollapse: true',
  'noWaveStarterPolicyOwnedHere: true',
  'noRootFollowPolicyOwnedHere: true',
  'futureWorkletBranchAuthorityForWellenstarterPreserved: true',
  'Similar sounding overtone layers are not duplicates by default',
  'Only technically exact same-result paths may be standardized without listening proof',
  'manualJiOscs',
  'jiOscs',
  'jiGains',
  'overtoneMaster',
  'overtoneMaster effect',
  'Resonance Nexus main loop fallback',
  'jiGain -> overtoneMaster -> droneGroupBus/LiveMaster',
  'jiGain -> filter -> gain -> drone graph',
  'overtoneMaster effect cleanup',
  'Resonance Nexus main loop cleanup',
  'preserveSeparateOvertoneVoice',
  'singleOvertoneMasterOwner',
  'legacyFallbackOnly',
  'collapseIntoManualJiLayer',
  'rejected-without-explicit-musical-proof',
  'Do not delete or merge jiOscs into manualJiOscs merely because both are JI/overtone oscillators',
]) {
  requireText('ownership plan', plan, marker);
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
  forbidText('ownership plan must be static and non-runtime', plan, forbidden);
}

for (const marker of [
  'id: "jiOscillatorLayer"',
  'useAppJiOvertoneMasterLifecycleBoundary plus Resonance Nexus main loop fallback still recorded',
  'legacy fallback recorded',
  'manualJiLayerSeparatedFromJiOscillatorLayer: true',
]) {
  requireText('existing drone overtone audit still records jiOsc ambiguity', audit, marker);
}

for (const marker of [
  'useAppManualJiOvertoneLifecycleBoundary({',
  'useAppJiOvertoneMasterLifecycleBoundary({',
  'noJiOscillatorOwnershipResolvedHere: true',
  'noWaveStarterOrRootFollowPolicyOwnedHere: true',
  'mainLoopFallbackStillRecorded: true',
  'if (Object.keys(nexusRefs.current.jiOscs).length === 0)',
]) {
  requireText('App.tsx still preserves current jiOsc ownership ambiguity for plan-only patch', app, marker);
}

for (const forbidden of [
  'useAppJiOscillatorLifecycleBoundary({',
  'collapseJiOscsIntoManualJiOscs',
  'delete nexusRefs.current.jiOscs',
]) {
  forbidText('App.tsx must not implement ownership resolution in this plan patch', app, forbidden);
}

for (const marker of [
  'noJiOscillatorOwnershipResolvedHere: true',
  'noWaveStarterOrRootFollowPolicyOwnedHere: true',
]) {
  requireText('manual JI boundary remains separated from jiOsc ownership', manualBoundary, marker);
}

if (!String(pkg.version || '').startsWith('3.2.91.6.9.')) failures.push(`package version expected 3.2.91.6.9.x successor, got ${pkg.version}`);
if (pkg.scripts?.[scriptName] !== 'node tools/check-app-ji-oscillator-ownership-resolution-plan.mjs') failures.push(`package script missing ${scriptName}`);
requireText('sanity suite', suite, scriptName);
requireText('sanity suite contract', suiteContract, scriptName);

const report = {
  ok: failures.length === 0,
  appLines: app.split(/\r?\n/).length,
  planLines: plan.split(/\r?\n/).length,
  contract: {
    planOnly: true,
    noRuntimeCodeMoved: true,
    noAudioSemanticsChanged: true,
    noJiManualCollapse: true,
    noWaveStarterPolicyOwnedHere: true,
    noRootFollowPolicyOwnedHere: true,
    futureWorkletBranchAuthorityForWellenstarterPreserved: true,
  },
  failures,
};

if (failures.length) {
  console.error('[check-app-ji-oscillator-ownership-resolution-plan] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('[check-app-ji-oscillator-ownership-resolution-plan] ok');
console.log(JSON.stringify(report, null, 2));
