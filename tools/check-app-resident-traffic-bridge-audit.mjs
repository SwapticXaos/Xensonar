#!/usr/bin/env node
import { createCheck } from './lib/check-kit.mjs';

const check = createCheck('check-app-resident-traffic-bridge-audit');
const { read, exists, requireText, forbidText, failures } = check;

const appPath = 'src/App.tsx';
const auditPath = 'validation/contracts/xensonar/audio/appResidentTrafficBridgeAudit.ts';
const segmentAuditPath = 'validation/contracts/xensonar/audio/appResonanceNexusMainLoopSegmentAudit.ts';
const mapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-resident-traffic-bridge-audit';

for (const rel of [appPath, auditPath, segmentAuditPath, mapPath, pkgPath, suitePath, suiteContractPath]) {
  if (!exists(rel)) failures.push(`missing ${rel}`);
}

const app = exists(appPath) ? read(appPath) : '';
const audit = exists(auditPath) ? read(auditPath) : '';
const segmentAudit = exists(segmentAuditPath) ? read(segmentAuditPath) : '';
const map = exists(mapPath) ? read(mapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {}, version: '' };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;

for (const marker of [
  'APP_RESIDENT_TRAFFIC_BRIDGE_AUDIT',
  'residentFieldFrameSource',
  'residentWaveEventCollection',
  'quantizedResidentCollisionBranch',
  'directResidentToneBranch',
  'trafficAnchorAndQueueProvenance',
  'residentSoundDefinitionResolution',
  'frameOrderAndMutationBoundary',
  'auditOnly: true',
  'runtimeBoundaryExtracted: false',
  'noUiChangedByAudit: true',
  'noRuntimeCodeMoved: true',
  'noAudioNodeLifecycleMoved: true',
  'noResidentTrafficPolicyMoved: true',
  'noQuantizeAnchorRewrite: true',
  'noQueuePolicyRewrite: true',
  'noDirectVsQueuedBranchCollapse: true',
  'noResidentSoundNormalization: true',
  'noWellenstarterOrRootFollowPolicyOwnedHere: true',
  'noStableLanePolicyOwnedHere: true',
  'noNewEventQueueOrCallPlan: true',
  'residentTrafficBridgeStillInlineInMainLoop: true',
]) requireText('Resident traffic bridge audit source', audit, marker);

const residentTrafficBridgeStillInline = app.includes('buildMyzelResidentFieldRuntimeFrame({');
const residentTrafficBridgeSuccessorBoundary = app.includes('runAppResidentTrafficBridgeFrameBoundary({')
  && exists('src/features/xensonar/audio/appResidentTrafficBridgeFrameBoundary.ts');
if (!residentTrafficBridgeStillInline && !residentTrafficBridgeSuccessorBoundary) {
  failures.push('resident traffic bridge must remain inline for audit-only patch or be delegated to the 9.244 frame boundary successor');
}
if (residentTrafficBridgeStillInline) {
  for (const marker of [
    'buildMyzelResidentFieldRuntimeFrame({',
    'collectMyzelResidentFieldRuntimeWaveEvents({',
    'if (residentWaveEvents.length > 0) {',
    'if (p.quantizeOn) {',
    'const anchor = resolveQuantizeAnchor(quantizeAnchorRef.current, now);',
    'quantizeAnchorRef.current = anchor;',
    'const schedule = resolveTrafficQuantizeSchedule({ nowSec: now, stepSec: step, anchorSec: anchor, sourceKey, targetKind: "resident" });',
    'mergeQueuedCollisionTrigger(waveCollisionQueueRef.current, {',
    'targetKind: "resident",',
    'playNexusAgentTone(',
    '"resident",',
  ]) requireText('App.tsx resident traffic bridge still inline for audit-only patch', app, marker);
} else {
  const successorBoundary = read('src/features/xensonar/audio/appResidentTrafficBridgeFrameBoundary.ts');
  for (const marker of [
    'buildMyzelResidentFieldRuntimeFrame({',
    'collectMyzelResidentFieldRuntimeWaveEvents({',
    'if (args.quantizeOn) {',
    'const anchor = resolveQuantizeAnchor(args.quantizeAnchorRef.current, now);',
    'args.quantizeAnchorRef.current = anchor;',
    'resolveTrafficQuantizeSchedule({',
    'mergeQueuedCollisionTrigger(args.waveCollisionQueueRef.current, {',
    "targetKind: 'resident',",
    'args.playNexusAgentTone(',
    "'resident',",
  ]) requireText('resident traffic bridge frame boundary successor preserves audited internals', successorBoundary, marker);
}

for (const forbidden of [
  'useAppResidentTrafficBridgeBoundary',
  'useAppResidentTrafficBridgeRuntimeBoundary',
  'residentTrafficBridgeRuntimeBoundaryExtractedFromAppTsx: true',
  'residentTrafficBridgePolicyMoved: true',
  'document.createElement',
  'setRoom(',
]) forbidText('audit patch must not introduce runtime/UI boundary for resident traffic bridge', app, forbidden);

for (const marker of [
  'residentInstallationTrafficQuantizeBridge',
  'do a resident-traffic-bridge audit before any extraction',
]) requireText('segment audit still points to resident traffic follow-up', segmentAudit, marker);

for (const marker of [
  "| 'resident-traffic-bridge-audited'",
  'Resident traffic bridge audited as a pure follow-up to the Nexus main-loop segment audit; no UI changed, no runtime moved, no quantize-anchor rewrite, no queue policy rewrite, no direct-vs-queued branch collapse, no Wellenstarter/Root-Follow live policy change',
]) requireText('monolith partition map preserves resident traffic bridge audit lineage', map, marker);
if (!map.includes("status: 'resident-traffic-bridge-audited'") && !map.includes("status: 'resident-traffic-bridge-frame-boundary-extracted'")) {
  failures.push('monolith partition map missing resident traffic bridge audit status or successor frame-boundary status');
}
if (!map.includes("firstSafeMove: 'resident-traffic-bridge-audited'") && !map.includes("firstSafeMove: 'resident-traffic-bridge-frame-boundary-extracted'")) {
  failures.push('monolith partition map missing resident traffic bridge audit firstSafeMove or successor frame-boundary firstSafeMove');
}

if (!String(pkg.version || '').startsWith('3.2.91.6.9.242') && !String(pkg.version || '').startsWith('3.2.91.6.9.243') && !String(pkg.version || '').startsWith('3.2.91.6.9.244') && !String(pkg.version || '').startsWith('3.2.91.6.9.245')) failures.push(`package version expected 3.2.91.6.9.242/243 or successor 9.244/9.245 lineage, got ${pkg.version}`);
if (pkg.scripts?.[scriptName] !== 'node tools/check-app-resident-traffic-bridge-audit.mjs') failures.push(`package script missing ${scriptName}`);
requireText('sanity suite', suite, scriptName);
requireText('sanity suite contract', suiteContract, scriptName);
if (appLines > 3005) failures.push(`App.tsx line count should stay near the 9.240/9.241 post-boundary size, got ${appLines}`);

const report = {
  ok: failures.length === 0,
  appLines,
  auditLines: audit.split(/\r?\n/).length,
  contract: {
    auditOnly: true,
    noUiChangedByAudit: true,
    noRuntimeCodeMoved: true,
    noResidentTrafficPolicyMoved: true,
    noQuantizeAnchorRewrite: true,
    noQueuePolicyRewrite: true,
    noDirectVsQueuedBranchCollapse: true,
    noWaveStarterOrRootFollowPolicyOwnedHere: true,
  },
  failures,
};

check.finish(report);
