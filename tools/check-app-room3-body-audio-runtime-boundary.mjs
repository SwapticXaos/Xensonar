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
const boundaryPath = 'src/features/xensonar/audio/useAppRoom3BodyAudioRuntimeBoundary.ts';
const auditPath = 'validation/contracts/xensonar/audio/appRoom3BodyAudioAudit.ts';
const mapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-room3-body-audio-runtime-boundary';

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
  'import { useAppRoom3BodyAudioRuntimeBoundary }',
  'useAppRoom3BodyAudioRuntimeBoundary({',
  'room3BodyControlsRef,',
  'room3BodyEnabledRef,',
  'room3BodyCurveRef,',
  'noUiChangedByBoundary: true',
  'noRouteRewrite: true',
  'noModalBodyNormalization: true',
  'noWaveStarterOrRootFollowPolicyOwnedHere: true',
]) requireText('App.tsx Room3 Body Audio runtime boundary callsite', app, marker);

for (const forbidden of [
  'const noiseSource = ctx.createBufferSource();',
  'const pulseOsc = ctx.createOscillator();',
  'const modeFilters: BiquadFilterNode[] = [];',
  'const modField = deriveRoom3ModField(snapshot, gate, controls);',
  'const timbreState = deriveRoom3TimbreState(snapshot, modField, controls);',
  'const modalState = deriveRoom3ModalBody(snapshot, baseHz, timbreState, modField, nParamsUI.dronePreset);',
  'refs.room3BodyModeFilters.forEach((filter, idx) => {',
  'try { refs.room3BodyNoiseSource?.stop(); } catch {}',
]) forbidText('App.tsx should no longer own Room3 Body Audio runtime body', app, forbidden);

for (const marker of [
  'export function useAppRoom3BodyAudioRuntimeBoundary',
  'room3BodyAudioRuntimeBoundaryExtractedFromAppTsx: true',
  'ownsCreationRafAndCleanupAsOneBody: true',
  'preservesBodyExciterInletSemantics: true',
  'preservesWarmGraphBypassSemantics: true',
  'noUiChangedByBoundary: true',
  'noWaveStarterOrRootFollowPolicyOwnedHere: true',
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
]) requireText('Room3 Body Audio runtime boundary source', boundary, marker);

for (const forbidden of [
  'setRoom(',
  'document.createElement',
  'emitWaveStarterAttack',
  'requestWaveStarterLaneAttack',
  'startQuantizedCollisionRuntime',
  'setFamilyRequestedActive',
]) forbidText('Room3 Body Audio runtime boundary must not own UI, Wellenstarter, traffic, or room routing policy', boundary, forbidden);

for (const marker of [
  'APP_ROOM3_BODY_AUDIO_AUDIT',
  'noUiChangedByAudit: true',
  'noRouteRewrite: true',
  'noModalBodyNormalization: true',
  'noWellenstarterOrRootFollowPolicyOwnedHere: true',
]) requireText('Room3 Body Audio audit lineage retained', audit, marker);

for (const marker of [
  "| 'room3-body-audio-runtime-boundary-extracted'",
  "status: 'room3-body-audio-runtime-boundary-extracted'",
  'Room3 Body Audio runtime boundary extracted as pure refactor; creation, RAF, and cleanup move together; no UI changed, no route rewrite, no modal-body normalization, no Wellenstarter/Root-Follow live policy change',
  "firstSafeMove: 'room3-body-audio-runtime-boundary-extracted'",
]) requireText('monolith partition map updated for Room3 Body Audio runtime boundary', map, marker);

if (!String(pkg.version || '').startsWith('3.2.91.6.9.')) failures.push(`package version expected 3.2.91.6.9.x successor, got ${pkg.version}`);
if (pkg.scripts?.[scriptName] !== 'node tools/check-app-room3-body-audio-runtime-boundary.mjs') failures.push(`package script missing ${scriptName}`);
requireText('sanity suite', suite, scriptName);
requireText('sanity suite contract', suiteContract, scriptName);
if (appLines > 3005) failures.push(`App.tsx should shrink after Room3 Body Audio runtime boundary, got ${appLines}`);

const report = {
  ok: failures.length === 0,
  appLines,
  boundaryLines: boundary.split(/\r?\n/).length,
  contract: {
    runtimeBoundaryExtracted: true,
    noUiChangedByBoundary: true,
    noRouteRewrite: true,
    noModalBodyNormalization: true,
    noWaveStarterOrRootFollowPolicyOwnedHere: true,
  },
  failures,
};

if (failures.length) {
  console.error('[check-app-room3-body-audio-runtime-boundary] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('[check-app-room3-body-audio-runtime-boundary] ok');
console.log(JSON.stringify(report, null, 2));
