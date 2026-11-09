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
const boundaryPath = 'src/features/xensonar/meta/useAppMetaPresetActionBoundary.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-meta-preset-action-boundary';

for (const rel of [appPath, boundaryPath, pkgPath, suitePath, suiteContractPath]) {
  if (!exists(rel)) failures.push(`missing ${rel}`);
}

const app = exists(appPath) ? read(appPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

requireText('App.tsx', app, 'useAppMetaPresetActionBoundary({');
requireText('App.tsx', app, 'const metaPresetActionBoundary = useAppMetaPresetActionBoundary({');
requireText('App.tsx', app, 'const { applyMetaPreset } = metaPresetActionBoundary;');
requireText('App.tsx', app, 'useState<MetaPresetSessionOverrides>({});');
requireText('App.tsx', app, 'useAppMetaPresetRouletteBoundary({');
requireText('App.tsx', app, 'const { randomizeMetaPresetForSession, startMetaPresetRoulette } = metaPresetRouletteBoundary;');

for (const forbidden of [
  'const applyMetaPreset = (presetId: MetaPresetId) => {',
  'const preset = resolveMetaPreset(presetId, sessionMetaOverrides);',
  'buildMetaPresetNexusContract(nexusParamsRef.current, preset)',
  'createMetaOvertoneMix({\n      ...defaultDroneMix',
  'setCollectiveMemoryUi((prev) => ({',
  'setPsychedelicSpiralUi((prev) => ({',
  'setTransientDriveUi((prev) => ({',
]) {
  forbidText('App.tsx meta-preset body', app, forbidden);
}

requireText('meta preset boundary', boundary, 'export function useAppMetaPresetActionBoundary');
for (const required of [
  'resolveMetaPreset(presetId, args.sessionMetaOverrides)',
  'buildMetaPresetNexusContract(args.nexusParamsRef.current, preset)',
  'mergeSourceGroupUiPatch(prev, preset.collectiveMemory)',
  'mergeSpiralUiPatch(prev, preset.spiral)',
  'mergeSourceGroupUiPatch(prev, preset.transientDrive)',
  'createMetaOvertoneMix({',
  'args.nexusRefs.current.agents.forEach',
  'args.updateNParams({',
  'args.primeMyzelFromY(args.nexusRefs.current.cursorY, "toggle")',
  'args.applyRealtimeDroneOvertones(refNow.droneJIOvertones, refNow.droneTimbre)',
  'metaPresetActionBoundaryExtractedFromAppTsx: true',
  'sourceGroupMergeRitualUnified: true',
  'noWaveStarterBassRootFollowOrRoom3BodyHotPathMoved: true',
]) {
  requireText('meta preset boundary', boundary, required);
}

for (const forbidden of [
  'requestWaveStarterLaneAttack',
  'emitWaveStarterAttack',
  'playWaveStartSound',
  'playBassNote',
  'useRootFollow',
  'startQuantizedCollisionRuntime',
  'startWaveOvertoneArpRuntime',
  'triggerRoom3BodyExciterPlayback',
  'runParticleNexusToneOrchestrator',
  'window.addEventListener',
  'new AudioContext',
  'createOscillator',
  'createGain',
  '.connect(',
]) {
  forbidText('meta preset boundary should not absorb live instrument hot paths', boundary, forbidden);
}

if (pkg.scripts?.[scriptName] !== 'node tools/check-app-meta-preset-action-boundary.mjs') {
  failures.push(`package script missing ${scriptName}`);
}
requireText('sanity suite', suite, scriptName);
requireText('sanity suite contract', suiteContract, scriptName);

const report = {
  ok: failures.length === 0,
  appLines: app.split(/\r?\n/).length,
  boundaryLines: boundary.split(/\r?\n/).length,
  contract: {
    metaPresetActionBoundaryExtractedFromAppTsx: true,
    sourceGroupMergeRitualUnified: true,
    noWaveStarterBassRootFollowOrRoom3BodyHotPathMoved: true,
  },
  failures,
};

if (failures.length) {
  console.error('[check-app-meta-preset-action-boundary] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('[check-app-meta-preset-action-boundary] ok');
console.log(JSON.stringify(report, null, 2));
