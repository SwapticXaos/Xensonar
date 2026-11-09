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
const boundaryPath = 'src/features/xensonar/audio/useAppDroneGraphRoutingBoundary.ts';
const auditPath = 'validation/contracts/xensonar/audio/appDroneOvertoneOwnershipAudit.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-drone-graph-routing-boundary';

for (const rel of [appPath, boundaryPath, auditPath, pkgPath, suitePath, suiteContractPath]) {
  if (!exists(rel)) failures.push(`missing ${rel}`);
}

const app = exists(appPath) ? read(appPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const audit = exists(auditPath) ? read(auditPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {}, version: '' };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;

function extractFunction(source, startNeedle, nextNeedle) {
  const start = source.indexOf(startNeedle);
  if (start < 0) return '';
  const end = source.indexOf(nextNeedle, start + startNeedle.length);
  return source.slice(start, end > start ? end : undefined);
}
const applyBlock = extractFunction(app, 'const applyRealtimeDroneOvertones = (', 'const ensureMyzelSynth = (');

for (const marker of [
  'import { useAppDroneGraphRoutingBoundary }',
  'const droneGraphRoutingBoundary = useAppDroneGraphRoutingBoundary({',
  'const { ensureDroneGraphRouting } = droneGraphRoutingBoundary;',
  'ensureDroneGraphRouting(ctx);',
  'const current = nexusParamsRef.current;',
  'refs.manualJiMaster',
  'nexusRefs.current.manualJiGains',
]) {
  requireText('App.tsx drone routing boundary callsite', app, marker);
}
for (const forbidden of [
  'createDroneDriveInsert',
  'const routeToGroupBus =',
  'const flangerDelay = ctx.createDelay(1.0)',
  'const flangerLfo = ctx.createOscillator()',
  'refs.droneGroupBus = groupBus',
  'flangerLfo.start()',
  'volBus.connect(getLiveMasterBus(ctx, "drone"))',
]) {
  forbidText('App.tsx should no longer own drone graph shell', applyBlock, forbidden);
}
for (const marker of [
  'export function useAppDroneGraphRoutingBoundary',
  'ensureDroneGraphRouting',
  'createDroneDriveInsert(ctx, rhythmBus, volBus, flangerDelay)',
  'routeToDroneGroupBus(refs.gain, refs.droneGroupBus)',
  'routeToDroneGroupBus(refs.gainB, refs.droneGroupBus)',
  'routeToDroneGroupBus(refs.overtoneMaster, refs.droneGroupBus)',
  'routeToDroneGroupBus(refs.manualJiMaster, refs.droneGroupBus)',
  'routeToDroneGroupBus(refs.myzelMasterGain, refs.droneGroupBus)',
  'args.getLiveMasterBus(ctx, "drone")',
  'args.ensureCollectiveMemoryFx(ctx)',
  'args.ensurePsychedelicSpiralDevice(ctx)',
  'args.myzelPostFxConnectionsRef.current.drone = true',
  'droneGraphRoutingBoundaryExtractedFromAppTsx: true',
  'routesExistingDroneVoicesOnly: true',
  'noJiOscillatorOwnershipResolvedHere: true',
  'noWaveStarterOrRootFollowPolicyOwnedHere: true',
]) {
  requireText('drone graph routing boundary source', boundary, marker);
}
for (const forbidden of [
  'DRONE_JI_OVERTONES',
  'manualJiGains[node.label]',
  'jiOscs',
  'requestAnimationFrame',
  'requestWaveStarterLaneAttack',
  'emitWaveStarterAttack',
  'startQuantizedCollisionRuntime',
  'window.addEventListener',
]) {
  forbidText('drone graph routing boundary should stay graph/routing-only', boundary, forbidden);
}
for (const auditMarker of [
    'droneGraphRoutingBoundaryExtracted: true',
  'droneGraphRoutingBoundaryOwnsBusShell: true',
  'manualJiOvertoneLifecycleBoundaryExtracted: true',
  'applyRealtimeDroneOvertonesManualMixRoleRecorded: true',
  'jiOscOwnershipAmbiguityRecorded: true',
  'futureWorkletBranchAuthorityForWellenstarterPreserved: true',
]) {
  requireText('drone overtone ownership audit updated for 9.232', audit, auditMarker);
}
if (appLines > 3380) failures.push(`App.tsx expected <= 3380 lines after drone graph routing boundary, got ${appLines}`);
if (!pkg.version.startsWith('3.2.91.6.9.')) failures.push(`package version expected 3.2.91.6.9.x successor, got ${pkg.version}`);
if (pkg.scripts?.[scriptName] !== 'node tools/check-app-drone-graph-routing-boundary.mjs') failures.push(`package script missing ${scriptName}`);
requireText('sanity suite', suite, scriptName);
requireText('sanity suite contract', suiteContract, scriptName);

const report = {
  ok: failures.length === 0,
  appLines,
  boundaryLines: boundary.split(/\r?\n/).length,
  applyRealtimeDroneOvertonesLines: applyBlock.split(/\r?\n/).length,
  contract: {
    droneGraphRoutingBoundaryExtractedFromAppTsx: true,
    routesExistingDroneVoicesOnly: true,
    noJiOscillatorOwnershipResolvedHere: true,
    noWaveStarterOrRootFollowPolicyOwnedHere: true,
  },
  failures,
};

if (failures.length) {
  console.error('[check-app-drone-graph-routing-boundary] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('[check-app-drone-graph-routing-boundary] ok');
console.log(JSON.stringify(report, null, 2));
