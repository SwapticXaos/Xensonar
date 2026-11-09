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
const auditPath = 'validation/contracts/xensonar/audio/appResonanceNexusMainLoopSegmentAudit.ts';
const mapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-resonance-nexus-main-loop-segment-audit';

for (const rel of [appPath, auditPath, mapPath, pkgPath, suitePath, suiteContractPath]) {
  if (!exists(rel)) failures.push(`missing ${rel}`);
}

const app = exists(appPath) ? read(appPath) : '';
const audit = exists(auditPath) ? read(auditPath) : '';
const map = exists(mapPath) ? read(mapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {}, version: '' };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;

for (const marker of [
  'APP_RESONANCE_NEXUS_MAIN_LOOP_SEGMENT_AUDIT',
  'primaryDroneGraphSetup',
  'primaryDroneParameterFrame',
  'canvasFieldAndCursorRender',
  'waveRippleSectorField',
  'particleSimulationAndRender',
  'residentInstallationTrafficQuantizeBridge',
  'gridKeyboardWindowVisualization',
  'cleanupAndRefOwnership',
  'auditOnly: true',
  'runtimeBoundaryExtracted: false',
  'noUiChangedByAudit: true',
  'noAudioNodeLifecycleMoved: true',
  'noRouteRewrite: true',
  'noGainNormalization: true',
  'noVisualClockSplit: true',
  'noResidentTrafficPolicyMoved: true',
  'noWellenstarterOrRootFollowPolicyOwnedHere: true',
  'noNewEventQueueOrCallPlan: true',
  'appMainLoopStillInline: true',
]) requireText('Resonance Nexus main loop segment audit source', audit, marker);

for (const marker of [
  'const osc = ctx.createOscillator();',
  'const filter = ctx.createBiquadFilter();',
  'const loop = () => {',
  'const fieldMotionFrame = resolveResonanceFieldMotionFrame',
  'const particleSimulationFrame = resolveResonanceParticleSimulationFrame',
  'state.ripples = state.ripples.filter',
  'state.sectorPulses = state.sectorPulses.filter',
  'playNexusAgentTone(',
  'buildKeyboardGridFrequencies(',
  'cancelAnimationFrame(rafId);',
  'nexusRefs.current.jiOscs = {};',
]) requireText('App.tsx main loop still inline for audit lineage', app, marker);
const residentTrafficInline = app.includes('collectMyzelResidentFieldRuntimeWaveEvents({')
  && app.includes('resolveTrafficQuantizeSchedule({')
  && app.includes('mergeQueuedCollisionTrigger(waveCollisionQueueRef.current');
const residentTrafficBoundary = app.includes('runAppResidentTrafficBridgeFrameBoundary({')
  && exists('src/features/xensonar/audio/appResidentTrafficBridgeFrameBoundary.ts');
if (!residentTrafficInline && !residentTrafficBoundary) {
  failures.push('App.tsx main loop must still contain resident traffic internals or call the 9.244 resident traffic frame boundary successor from the same loop slot');
}
if (residentTrafficBoundary) {
  const boundary = read('src/features/xensonar/audio/appResidentTrafficBridgeFrameBoundary.ts');
  for (const marker of [
    'collectMyzelResidentFieldRuntimeWaveEvents({',
    'resolveTrafficQuantizeSchedule({',
    'mergeQueuedCollisionTrigger(args.waveCollisionQueueRef.current',
    'args.playNexusAgentTone(',
  ]) requireText('Resident traffic frame boundary successor preserves main-loop segment internals', boundary, marker);
}

for (const forbidden of [
  'useAppResonanceNexusMainLoopBoundary',
  'useAppResidentTrafficBridgeBoundary',
  'useAppNexusCanvasRenderBoundary',
  'resonanceNexusMainLoopRuntimeBoundaryExtractedFromAppTsx: true',
  'document.createElement',
  'setRoom(',
]) forbidText('audit patch must not introduce runtime/UI boundary for main loop', app, forbidden);

for (const marker of [
  "| 'resonance-nexus-main-loop-segment-audited'",
  "status: 'resonance-nexus-main-loop-segment-audited'",
  'Resonance Nexus main loop segmented as audit-only; no UI changed, no audio node lifecycle moved, no visual clock split, no resident traffic policy moved, no Wellenstarter/Root-Follow live policy change',
  "firstSafeMove: 'resonance-nexus-main-loop-segment-audited'",
]) requireText('monolith partition map updated for Resonance Nexus segment audit', map, marker);

if (!String(pkg.version || '').startsWith('3.2.91.6.9.')) failures.push(`package version expected 3.2.91.6.9.x successor, got ${pkg.version}`);
if (pkg.scripts?.[scriptName] !== 'node tools/check-app-resonance-nexus-main-loop-segment-audit.mjs') failures.push(`package script missing ${scriptName}`);
requireText('sanity suite', suite, scriptName);
requireText('sanity suite contract', suiteContract, scriptName);
if (appLines > 3005) failures.push(`App.tsx line count should stay near the 9.240 post-boundary size, got ${appLines}`);

const report = {
  ok: failures.length === 0,
  appLines,
  auditLines: audit.split(/\r?\n/).length,
  contract: {
    auditOnly: true,
    noUiChangedByAudit: true,
    noAudioNodeLifecycleMoved: true,
    noVisualClockSplit: true,
    noResidentTrafficPolicyMoved: true,
    noWaveStarterOrRootFollowPolicyOwnedHere: true,
  },
  failures,
};

if (failures.length) {
  console.error('[check-app-resonance-nexus-main-loop-segment-audit] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('[check-app-resonance-nexus-main-loop-segment-audit] ok');
console.log(JSON.stringify(report, null, 2));
