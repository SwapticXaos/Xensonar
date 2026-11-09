#!/usr/bin/env node
import { createCheck } from './lib/check-kit.mjs';

const check = createCheck('check-app-meta-preset-roulette-boundary');
const { read, exists, requireText, forbidText, failures } = check;

const appPath = 'src/App.tsx';
const roulettePath = 'src/features/xensonar/meta/useAppMetaPresetRouletteBoundary.ts';
const actionPath = 'src/features/xensonar/meta/useAppMetaPresetActionBoundary.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-meta-preset-roulette-boundary';

for (const rel of [appPath, roulettePath, actionPath, pkgPath, suitePath, suiteContractPath]) {
  if (!exists(rel)) failures.push(`missing ${rel}`);
}

const app = exists(appPath) ? read(appPath) : '';
const roulette = exists(roulettePath) ? read(roulettePath) : '';
const action = exists(actionPath) ? read(actionPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

requireText('App.tsx', app, 'useAppMetaPresetActionBoundary({');
requireText('App.tsx', app, 'useAppMetaPresetRouletteBoundary({');
requireText('App.tsx', app, 'const metaPresetRouletteBoundary = useAppMetaPresetRouletteBoundary({');
requireText('App.tsx', app, 'const { randomizeMetaPresetForSession, startMetaPresetRoulette } = metaPresetRouletteBoundary;');
requireText('App.tsx', app, 'applyMetaPreset,');
requireText('App.tsx', app, 'setSessionMetaOverrides,');

for (const forbidden of [
  'const readEntropySeed = () => {',
  'const randomizeMetaPresetForSession = (presetId: MetaPresetId) => {',
  'const startMetaPresetRoulette = () => {',
  'mixMouseEntropySeed(metaPresetRouletteState.mouseEntropyRef.current',
  'readMetaEntropySeed(',
  'createXorShift(readEntropySeed())',
  'buildRandomMetaSessionOverride(rand)',
  'META_PRESETS.map((preset) => preset.id)',
  'MANDALA_RANDOMIZER_COLORS[colorIndex',
]) {
  forbidText('App.tsx roulette body', app, forbidden);
}

requireText('roulette boundary', roulette, 'export function useAppMetaPresetRouletteBoundary');
for (const required of [
  'window.addEventListener("mousemove", handleMouseEntropy, { passive: true })',
  'mixMouseEntropySeed(',
  'readMetaEntropySeed(',
  'createXorShift(readEntropySeed())',
  'buildRandomMetaSessionOverride(rand)',
  'args.setSessionMetaOverrides((prev) => ({ ...prev, [presetId]: override }))',
  'args.applyMetaPreset(presetId)',
  'META_PRESETS.map((preset) => preset.id)',
  'args.applyMetaPreset(winner)',
  'metaPresetRouletteBoundaryExtractedFromAppTsx: true',
  'rouletteChoosesPresetButDoesNotApplyPresetSemantics: true',
  'noWaveStarterBassRootFollowOrRoom3BodyHotPathMoved: true',
]) {
  requireText('roulette boundary', roulette, required);
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
  'new AudioContext',
  'createOscillator',
  'createGain',
  '.connect(',
]) {
  forbidText('roulette boundary should not absorb live instrument hot paths', roulette, forbidden);
}

requireText('meta preset action boundary remains pure apply semantics', action, 'metaPresetActionBoundaryExtractedFromAppTsx: true');
requireText('meta preset action boundary remains apply surface', action, 'readonly applyMetaPreset: (presetId: MetaPresetId) => void;');

if (pkg.scripts?.[scriptName] !== 'node tools/check-app-meta-preset-roulette-boundary.mjs') {
  failures.push(`package script missing ${scriptName}`);
}
requireText('sanity suite', suite, scriptName);
requireText('sanity suite contract', suiteContract, scriptName);

const report = {
  ok: failures.length === 0,
  appLines: app.split(/\r?\n/).length,
  rouletteBoundaryLines: roulette.split(/\r?\n/).length,
  contract: {
    metaPresetRouletteBoundaryExtractedFromAppTsx: true,
    rouletteChoosesPresetButDoesNotApplyPresetSemantics: true,
    noWaveStarterBassRootFollowOrRoom3BodyHotPathMoved: true,
  },
  failures,
};

check.finish(report);
