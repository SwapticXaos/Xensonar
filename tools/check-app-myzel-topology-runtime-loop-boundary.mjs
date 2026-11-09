#!/usr/bin/env node
import { createCheck } from './lib/check-kit.mjs';

const check = createCheck('check-app-myzel-topology-runtime-loop-boundary');
const { read, exists, requireText, forbidText, failures } = check;

const appPath = 'src/App.tsx';
const boundaryPath = 'src/features/xensonar/myzelSynth/useAppMyzelTopologyRuntimeLoopBoundary.ts';
const mapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-myzel-topology-runtime-loop-boundary';

for (const rel of [appPath, boundaryPath, mapPath, pkgPath, suitePath, suiteContractPath]) {
  if (!exists(rel)) failures.push(`missing ${rel}`);
}

const app = exists(appPath) ? read(appPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const map = exists(mapPath) ? read(mapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {}, version: '' };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;

for (const marker of [
  'import { useAppMyzelTopologyRuntimeLoopBoundary }',
  'useAppMyzelTopologyRuntimeLoopBoundary({',
  'bassRootMode: nParamsUI.bassRootMode',
  'noUiChangedByBoundary: true',
  'noAudioPolicyChangedByBoundary: true',
  'noWaveStarterOrRootFollowPolicyOwnedHere: true',
]) requireText('App.tsx myzel topology runtime loop boundary callsite', app, marker);

for (const forbidden of [
  'const frame = advanceMyzelSynthRoom3Runtime({',
  'renderMyzelSynthRoom3RuntimeCanvas({',
  'const setTopologyStatus = (next: string) => {',
  'topologyLoopErrorRef.current = message;',
  'setTopologyStatus(`Myzel Fehler: ${message}`);',
]) forbidText('App.tsx should no longer own Myzel topology RAF loop body', app, forbidden);

for (const marker of [
  'export function useAppMyzelTopologyRuntimeLoopBoundary',
  'myzelTopologyRuntimeLoopBoundaryExtractedFromAppTsx: true',
  'ownsTopologyRafOnly: true',
  'preservesSnapshotAndCanvasContracts: true',
  'noUiChangedByBoundary: true',
  'noAudioPolicyChangedByBoundary: true',
  'noWaveStarterOrRootFollowPolicyOwnedHere: true',
  'const frame = advanceMyzelSynthRoom3Runtime({',
  'myceliumSnapshotRef.current = frame.snapshot;',
  'const drawTopology = room === "TOPOLOGY" ? topologyCanvasRef.current : null;',
  'renderMyzelSynthRoom3RuntimeCanvas({',
  'topologyDragRef.current = { nodeIndex: null, offsetX: 0, offsetY: 0 };',
]) requireText('Myzel topology runtime loop boundary source', boundary, marker);

for (const forbidden of [
  'createGain()',
  'createOscillator()',
  'emitWaveStarterAttack',
  'requestWaveStarterLaneAttack',
  'startQuantizedCollisionRuntime',
  'setRoom(',
  'setFamilyRequestedActive',
  'document.createElement',
]) forbidText('Myzel topology loop boundary must not create audio nodes, UI, Wellenstarter, or traffic ownership', boundary, forbidden);

for (const marker of [
  'Myzel/Topology runtime loop boundary extracted as pure refactor; no UI changed, no audio policy changed, no Wellenstarter/Root-Follow live policy moved',
]) requireText('monolith partition map updated for Myzel topology runtime loop boundary', map, marker);
if (!map.includes("status: 'myzel-topology-runtime-loop-boundary-extracted'") && !map.includes("status: 'room3-body-audio-audited'") && !map.includes("status: 'room3-body-audio-runtime-boundary-extracted'")) {
  failures.push('monolith partition map should preserve Myzel topology status or Room3 Body Audio audit successor status');
}
if (!map.includes("firstSafeMove: 'myzel-topology-runtime-loop-boundary-extracted'") && !map.includes("firstSafeMove: 'room3-body-audio-audited'") && !map.includes("firstSafeMove: 'room3-body-audio-runtime-boundary-extracted'") && !map.includes("firstSafeMove: 'room3-body-audio-runtime-boundary-extracted'")) {
  failures.push('monolith partition map should preserve Myzel topology firstSafeMove lineage or Room3 Body Audio audit successor');
}

if (!String(pkg.version || '').startsWith('3.2.91.6.9.')) failures.push(`package version expected 3.2.91.6.9.x successor, got ${pkg.version}`);
if (pkg.scripts?.[scriptName] !== 'node tools/check-app-myzel-topology-runtime-loop-boundary.mjs') failures.push(`package script missing ${scriptName}`);
requireText('sanity suite', suite, scriptName);
requireText('sanity suite contract', suiteContract, scriptName);
if (appLines > 3155) failures.push(`App.tsx should shrink after Myzel topology runtime loop boundary, got ${appLines}`);

const report = {
  ok: failures.length === 0,
  appLines,
  boundaryLines: boundary.split(/\r?\n/).length,
  contract: {
    runtimeBoundaryExtracted: true,
    noUiChangedByBoundary: true,
    noAudioPolicyChangedByBoundary: true,
    noWaveStarterOrRootFollowPolicyOwnedHere: true,
  },
  failures,
};

check.finish(report);
