#!/usr/bin/env node
import { createCheck } from './lib/check-kit.mjs';

const check = createCheck('check-app-resident-traffic-bridge-io-snapshot');
const { read, exists, requireText, forbidText, failures } = check;

const appPath = 'src/App.tsx';
const auditPath = 'validation/contracts/xensonar/audio/appResidentTrafficBridgeAudit.ts';
const snapshotPath = 'src/features/xensonar/audio/appResidentTrafficBridgeIoSnapshot.ts';
const mapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-resident-traffic-bridge-io-snapshot';

for (const rel of [appPath, auditPath, snapshotPath, mapPath, pkgPath, suitePath, suiteContractPath]) {
  if (!exists(rel)) failures.push(`missing ${rel}`);
}

const app = exists(appPath) ? read(appPath) : '';
const audit = exists(auditPath) ? read(auditPath) : '';
const snapshot = exists(snapshotPath) ? read(snapshotPath) : '';
const map = exists(mapPath) ? read(mapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {}, version: '' };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;

for (const marker of [
  'APP_RESIDENT_TRAFFIC_BRIDGE_IO_SNAPSHOT',
  'frameInputSnapshot',
  'residentEventCollectionSnapshot',
  'quantizedBranchIoSnapshot',
  'directBranchIoSnapshot',
  'sharedResidentSoundResolutionSnapshot',
  'queueProvenanceSnapshot',
  'frameOrderSnapshot',
  'snapshotOnly: true',
  'runtimeBoundaryExtracted: false',
  'noUiChangedBySnapshot: true',
  'noRuntimeCodeMoved: true',
  'noAudioNodeLifecycleMoved: true',
  'noResidentTrafficPolicyMoved: true',
  'noFrameOrderMoved: true',
  'noQuantizeAnchorRewrite: true',
  'noQueuePolicyRewrite: true',
  'noDirectVsQueuedBranchCollapse: true',
  'noResidentSoundNormalization: true',
  'noWellenstarterOrRootFollowPolicyOwnedHere: true',
  'noStableLanePolicyOwnedHere: true',
  'noNewEventQueueOrCallPlan: true',
  'residentTrafficBridgeStillInlineInMainLoop: true',
]) requireText('Resident traffic bridge IO snapshot source', snapshot, marker);

for (const marker of [
  'APP_RESIDENT_TRAFFIC_BRIDGE_AUDIT',
  'resident traffic bridge input/output snapshot before extraction',
  'direct-vs-queued resident branch helper only after proving equivalent residentSound resolution',
]) requireText('Resident traffic bridge audit predecessor still present', audit, marker);

const residentTrafficBridgeStillInline = app.includes('const residentFieldFrame = buildMyzelResidentFieldRuntimeFrame({');
const residentTrafficBridgeSuccessorBoundary = app.includes('runAppResidentTrafficBridgeFrameBoundary({')
  && exists('src/features/xensonar/audio/appResidentTrafficBridgeFrameBoundary.ts');
if (!residentTrafficBridgeStillInline && !residentTrafficBridgeSuccessorBoundary) {
  failures.push('resident traffic bridge must remain inline for 9.243 snapshot or be delegated to the 9.244 frame boundary successor');
}
if (residentTrafficBridgeStillInline) {
  for (const marker of [
    'const residentFieldFrame = buildMyzelResidentFieldRuntimeFrame({',
    'const residentWaveEvents = collectMyzelResidentFieldRuntimeWaveEvents({',
    'if (residentWaveEvents.length > 0) {',
    'if (p.quantizeOn) {',
    'const ctx = audioCtxRef.current ?? audioCtx;',
    'const now = getAudioNowSec(ctx);',
    'const step = getQuantizeStepSeconds(gridTempoBpm, quantizeGrid);',
    'const anchor = resolveQuantizeAnchor(quantizeAnchorRef.current, now);',
    'quantizeAnchorRef.current = anchor;',
    'const sourceKey = `resident:${event.targetId}:${event.sourceKind}`;',
    'const schedule = resolveTrafficQuantizeSchedule({ nowSec: now, stepSec: step, anchorSec: anchor, sourceKey, targetKind: "resident" });',
    'mergeQueuedCollisionTrigger(waveCollisionQueueRef.current, {',
    'targetKind: "resident",',
    '} else {',
    'playNexusAgentTone(',
    '"resident",',
  ]) requireText('App.tsx resident traffic bridge still inline for snapshot-only patch', app, marker);
} else {
  const successorBoundary = read('src/features/xensonar/audio/appResidentTrafficBridgeFrameBoundary.ts');
  for (const marker of [
    'buildMyzelResidentFieldRuntimeFrame({',
    'collectMyzelResidentFieldRuntimeWaveEvents({',
    'if (args.quantizeOn) {',
    'const now = getAudioNowSec(ctx);',
    'const step = getQuantizeStepSeconds(args.gridTempoBpm, args.quantizeGrid);',
    'const anchor = resolveQuantizeAnchor(args.quantizeAnchorRef.current, now);',
    'args.quantizeAnchorRef.current = anchor;',
    'const sourceKey = `resident:${event.targetId}:${event.sourceKind}`;',
    'resolveTrafficQuantizeSchedule({',
    'mergeQueuedCollisionTrigger(args.waveCollisionQueueRef.current, {',
    "targetKind: 'resident',",
    'args.playNexusAgentTone(',
  ]) requireText('resident traffic bridge frame boundary successor preserves 9.243 IO snapshot internals', successorBoundary, marker);
}

for (const forbidden of [
  'useAppResidentTrafficBridgeBoundary',
  'useAppResidentTrafficBridgeRuntimeBoundary',
  'useAppResidentTrafficBridgeIoBoundary',
  'residentTrafficBridgeRuntimeBoundaryExtractedFromAppTsx: true',
  'residentTrafficBridgePolicyMoved: true',
  'document.createElement',
  'setRoom(',
]) forbidText('snapshot patch must not introduce runtime/UI boundary for resident traffic bridge', app, forbidden);

for (const marker of [
  "| 'resident-traffic-bridge-io-snapshotted'",
  'Resident traffic bridge IO snapshotted as audit-only follow-up; no UI changed, no runtime moved, no frame-order move, no quantize-anchor rewrite, no queue policy rewrite, no direct-vs-queued branch collapse, no Wellenstarter/Root-Follow live policy change',
]) requireText('monolith partition map preserves resident traffic bridge IO snapshot lineage', map, marker);
if (!map.includes("status: 'resident-traffic-bridge-io-snapshotted'") && !map.includes("status: 'resident-traffic-bridge-frame-boundary-extracted'")) {
  failures.push('monolith partition map missing resident traffic bridge IO snapshot status or successor frame-boundary status');
}
if (!map.includes("splitTarget: 'resident-traffic-bridge-io-snapshot'") && !map.includes("splitTarget: 'resident-traffic-bridge-frame-boundary'")) {
  failures.push('monolith partition map missing resident traffic bridge IO snapshot splitTarget or successor frame-boundary splitTarget');
}
if (!map.includes("firstSafeMove: 'resident-traffic-bridge-io-snapshotted'") && !map.includes("firstSafeMove: 'resident-traffic-bridge-frame-boundary-extracted'")) {
  failures.push('monolith partition map missing resident traffic bridge IO snapshot firstSafeMove or successor frame-boundary firstSafeMove');
}

if (!String(pkg.version || '').startsWith('3.2.91.6.9.243') && !String(pkg.version || '').startsWith('3.2.91.6.9.244') && !String(pkg.version || '').startsWith('3.2.91.6.9.245')) failures.push(`package version expected 3.2.91.6.9.243 or successor 3.2.91.6.9.244/245, got ${pkg.version}`);
if (pkg.scripts?.[scriptName] !== 'node tools/check-app-resident-traffic-bridge-io-snapshot.mjs') failures.push(`package script missing ${scriptName}`);
requireText('sanity suite', suite, scriptName);
requireText('sanity suite contract', suiteContract, scriptName);
if (appLines > 3005) failures.push(`App.tsx line count should stay near the post-boundary size, got ${appLines}`);

const report = {
  ok: failures.length === 0,
  appLines,
  snapshotLines: snapshot.split(/\r?\n/).length,
  contract: {
    snapshotOnly: true,
    noUiChangedBySnapshot: true,
    noRuntimeCodeMoved: true,
    noFrameOrderMoved: true,
    noQuantizeAnchorRewrite: true,
    noQueuePolicyRewrite: true,
    noDirectVsQueuedBranchCollapse: true,
    noWaveStarterOrRootFollowPolicyOwnedHere: true,
  },
  failures,
};

check.finish(report);
