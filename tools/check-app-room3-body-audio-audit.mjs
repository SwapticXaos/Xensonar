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
const auditPath = 'validation/contracts/xensonar/audio/appRoom3BodyAudioAudit.ts';
const mapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-room3-body-audio-audit';

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
const successorBoundaryExtracted = app.includes('useAppRoom3BodyAudioRuntimeBoundary({');

if (!successorBoundaryExtracted) {
for (const marker of [
  'if (!refs.room3BodyMaster) {',
  'const noiseSource = ctx.createBufferSource();',
  'const pulseOsc = ctx.createOscillator();',
  'const modeFilters: BiquadFilterNode[] = [];',
  'const modField = deriveRoom3ModField(snapshot, gate, controls);',
  'const timbreState = deriveRoom3TimbreState(snapshot, modField, controls);',
  'const modalState = deriveRoom3ModalBody(snapshot, baseHz, timbreState, modField, nParamsUI.dronePreset);',
  'const bypass = !myzelEnabled || !room3BodyEnabledRef.current || myzelTopologyModeRef.current === "installation";',
  'refs.room3BodyModeFilters.forEach((filter, idx) => {',
  'refs.room3BodyModeGains.forEach((gainNode, idx) => {',
  'try { refs.room3BodyNoiseSource?.stop(); } catch {}',
  'refs.room3BodyModeGains = [];',
]) requireText('App.tsx Room3 Body Audio loop must remain inline for audit-only patch', app, marker);

for (const forbidden of [
  'useAppRoom3BodyAudioRuntimeBoundary',
  'Room3 Body Audio Boundary',
  'room3BodyAudioRuntimeBoundaryExtracted: true',
]) forbidText('App.tsx must not extract Room3 Body Audio in audit-only patch', app, forbidden);
} else {
  requireText('App.tsx Room3 Body Audio successor boundary callsite', app, 'useAppRoom3BodyAudioRuntimeBoundary({');
}


for (const marker of [
  'export const APP_ROOM3_BODY_AUDIO_AUDIT',
  'APP_ROOM3_BODY_AUDIO_AUDIT_CONTRACT',
  'patch: "3.2.91.6.9.239_room3_body_audio_audit"',
  `previousPatchLineage: 'patch: "3.2.91.6.9.238_myzel_topology_runtime_loop_boundary"'`,
  'auditOnly: true',
  'runtimeBoundaryExtracted: false',
  'successorRuntimeBoundaryExtractedIn: "3.2.91.6.9.240_room3_body_audio_runtime_boundary"',
  'room3BodyAudioStillInlineInApp: false',
  'noUiChangedByAudit: true',
  'noAudioNodeLifecycleMoved: true',
  'noRouteRewrite: true',
  'noModalBodyNormalization: true',
  'noWellenstarterOrRootFollowPolicyOwnedHere: true',
  'noiseAndPulseExciter',
  'driveAndToneBus',
  'modalFilterBank',
  'frameDerivedBodyState',
  'bypassAndTopologyGate',
  'cleanupAndRefOwnership',
  'Hybrid noise/pulse Room3 body exciter',
  'Warm graph with bypass gate instead of UI mount/unmount behavior',
]) requireText('Room3 Body Audio audit source', audit, marker);

for (const forbidden of [
  'createGain()',
  'createOscillator()',
  'createBufferSource()',
  'requestAnimationFrame(',
  'setRoom3Body',
  'emitWaveStarterAttack',
  'requestWaveStarterLaneAttack',
]) forbidText('Room3 Body Audio audit must stay cold and non-runtime', audit, forbidden);

for (const marker of [
  "| 'room3-body-audio-audited'",
  "| 'room3-body-audio-runtime-boundary-extracted'",
  "status: 'room3-body-audio-runtime-boundary-extracted'",
  'Room3 Body Audio audited as a pure refactor-prep map; no UI changed, no audio node lifecycle moved, no route rewrite, no modal-body normalization, no Wellenstarter/Root-Follow live policy change',
  "firstSafeMove: 'room3-body-audio-runtime-boundary-extracted'",
]) requireText('monolith partition map updated for Room3 Body Audio audit', map, marker);

if (!String(pkg.version || '').startsWith('3.2.91.6.9.')) failures.push(`package version expected 3.2.91.6.9.x successor, got ${pkg.version}`);
if (pkg.scripts?.[scriptName] !== 'node tools/check-app-room3-body-audio-audit.mjs') failures.push(`package script missing ${scriptName}`);
requireText('sanity suite', suite, scriptName);
requireText('sanity suite contract', suiteContract, scriptName);
if (!successorBoundaryExtracted && appLines > 3150) failures.push(`App.tsx should remain near 9.238 size during audit-only patch, got ${appLines}`);

const report = {
  ok: failures.length === 0,
  appLines,
  auditLines: audit.split(/\r?\n/).length,
  contract: {
    auditOnly: true,
    runtimeBoundaryExtracted: false,
    room3BodyAudioStillInlineInApp: false,
    noUiChangedByAudit: true,
    noAudioNodeLifecycleMoved: true,
    noRouteRewrite: true,
    noModalBodyNormalization: true,
    noWellenstarterOrRootFollowPolicyOwnedHere: true,
  },
  failures,
};

if (failures.length) {
  console.error('[check-app-room3-body-audio-audit] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('[check-app-room3-body-audio-audit] ok');
console.log(JSON.stringify(report, null, 2));
