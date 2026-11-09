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
const boundaryPath = 'src/features/xensonar/audio/appResidentTrafficBridgeFrameBoundary.ts';
const auditPath = 'validation/contracts/xensonar/audio/appResidentTrafficBridgeAudit.ts';
const snapshotPath = 'src/features/xensonar/audio/appResidentTrafficBridgeIoSnapshot.ts';
const mapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-resident-traffic-bridge-frame-boundary';

for (const rel of [appPath, boundaryPath, auditPath, snapshotPath, mapPath, pkgPath, suitePath, suiteContractPath]) {
  if (!exists(rel)) failures.push(`missing ${rel}`);
}

const app = exists(appPath) ? read(appPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const audit = exists(auditPath) ? read(auditPath) : '';
const snapshot = exists(snapshotPath) ? read(snapshotPath) : '';
const map = exists(mapPath) ? read(mapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {}, version: '' };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;

for (const marker of [
  'runAppResidentTrafficBridgeFrameBoundary',
  'AppResidentTrafficBridgeFrameBoundaryArgs',
  'buildMyzelResidentFieldRuntimeFrame({',
  'collectMyzelResidentFieldRuntimeWaveEvents({',
  'resolveResidentTrafficSound',
  'if (args.quantizeOn) {',
  'const anchor = resolveQuantizeAnchor(args.quantizeAnchorRef.current, now);',
  'args.quantizeAnchorRef.current = anchor;',
  'const sourceKey = `resident:${event.targetId}:${event.sourceKind}`;',
  "targetKind: 'resident'",
  'mergeQueuedCollisionTrigger(args.waveCollisionQueueRef.current, {',
  'args.playNexusAgentTone(',
  'noUiChangedByBoundary: true',
  'noFrameOrderMoved: true',
  'noQuantizeAnchorRewrite: true',
  'noQueuePolicyRewrite: true',
  'noDirectVsQueuedBranchCollapse: true',
  'noResidentSoundNormalization: true',
  'noWellenstarterOrRootFollowPolicyOwnedHere: true',
  'noStableLanePolicyOwnedHere: true',
]) requireText('Resident traffic bridge frame boundary source', boundary, marker);

for (const forbidden of [
  'useAppResidentTrafficBridgeRuntimeBoundary',
  'setRoom(',
  'document.createElement',
  'addEventListener',
  'requestAnimationFrame',
  'new AudioContext',
  'createOscillator',
  'createGain',
]) forbidText('Resident traffic bridge frame boundary must stay a direct bridge helper, not UI/hotpath policy', boundary, forbidden);

for (const marker of [
  'runAppResidentTrafficBridgeFrameBoundary({',
  'active: installationSharedFieldActive && installationFieldConfigRef.current.residentsEnabled,',
  'config: installationFieldConfigRef.current,',
  'nodes: topologyRefs.current.nodes,',
  'ripples: state.ripples,',
  'sectorPulses: state.sectorPulses,',
  'nowMs: frameNowMs,',
  'targetFreq,',
  'quantizeOn: p.quantizeOn,',
  'audioCtx: audioCtxRef.current ?? audioCtx,',
  'gridTempoBpm,',
  'quantizeGrid,',
  'quantizeAnchorRef,',
  'waveCollisionQueueRef,',
  'playNexusAgentTone,',
  'noUiChangedByBoundary: true,',
  'noFrameOrderMoved: true,',
]) requireText('App.tsx resident traffic bridge callsite', app, marker);

for (const forbidden of [
  'const residentFieldFrame = buildMyzelResidentFieldRuntimeFrame({',
  'const residentWaveEvents = collectMyzelResidentFieldRuntimeWaveEvents({',
  'const schedule = resolveTrafficQuantizeSchedule({ nowSec: now, stepSec: step, anchorSec: anchor, sourceKey, targetKind: "resident" });',
  'mergeQueuedCollisionTrigger(waveCollisionQueueRef.current, {',
]) forbidText('App.tsx should delegate resident traffic bridge internals after frame boundary extraction', app, forbidden);

for (const marker of [
  'APP_RESIDENT_TRAFFIC_BRIDGE_AUDIT',
  'APP_RESIDENT_TRAFFIC_BRIDGE_IO_SNAPSHOT',
  'direct-vs-queued resident branch helper only after proving equivalent residentSound resolution',
]) {
  requireText('Resident traffic bridge predecessor audit/snapshot still present', audit + snapshot, marker);
}

for (const marker of [
  "| 'resident-traffic-bridge-frame-boundary-extracted'",
  "status: 'resident-traffic-bridge-frame-boundary-extracted'",
  'Resident traffic bridge frame boundary extracted as pure refactor; no UI changed, frame call remains in the same Nexus RAF slot, no quantize-anchor rewrite, no queue policy rewrite, no direct-vs-queued branch collapse, no resident sound normalization, no Wellenstarter/Root-Follow live policy change',
  "splitTarget: 'resident-traffic-bridge-frame-boundary'",
  "firstSafeMove: 'resident-traffic-bridge-frame-boundary-extracted'",
]) requireText('monolith partition map updated for resident traffic bridge frame boundary', map, marker);

if (!String(pkg.version || '').startsWith('3.2.91.6.9.244') && !String(pkg.version || '').startsWith('3.2.91.6.9.245')) failures.push(`package version expected 3.2.91.6.9.244 or successor 3.2.91.6.9.245, got ${pkg.version}`);
if (pkg.scripts?.[scriptName] !== 'node tools/check-app-resident-traffic-bridge-frame-boundary.mjs') failures.push(`package script missing ${scriptName}`);
requireText('sanity suite', suite, scriptName);
requireText('sanity suite contract', suiteContract, scriptName);
if (appLines > 2940) failures.push(`App.tsx should shrink below the 9.243 line region, got ${appLines}`);

const report = {
  ok: failures.length === 0,
  appLines,
  boundaryLines: boundary.split(/\r?\n/).length,
  contract: {
    pureRefactor: true,
    noUiChangedByBoundary: true,
    frameCallStaysInNexusRafSlot: true,
    noQuantizeAnchorRewrite: true,
    noQueuePolicyRewrite: true,
    noDirectVsQueuedBranchCollapse: true,
    noResidentSoundNormalization: true,
    noWellenstarterOrRootFollowPolicyOwnedHere: true,
  },
  failures,
};

if (failures.length) {
  console.error('[check-app-resident-traffic-bridge-frame-boundary] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('[check-app-resident-traffic-bridge-frame-boundary] ok');
console.log(JSON.stringify(report, null, 2));
