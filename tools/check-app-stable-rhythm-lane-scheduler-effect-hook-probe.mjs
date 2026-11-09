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
const hookPath = 'src/features/xensonar/input/useAppStableRhythmLaneSchedulerEffectProbe.ts';
const effectArgsPath = 'src/features/xensonar/input/appStableRhythmLaneEffectArgsContractProbe.ts';
const loopPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerLoopProbe.ts';
const mapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-stable-rhythm-lane-scheduler-effect-hook-probe';

for (const rel of [appPath, hookPath, effectArgsPath, loopPath, mapPath, pkgPath, suitePath, suiteContractPath]) {
  if (!exists(rel)) failures.push(`missing ${rel}`);
}

const app = exists(appPath) ? read(appPath) : '';
const hook = exists(hookPath) ? read(hookPath) : '';
const effectArgs = exists(effectArgsPath) ? read(effectArgsPath) : '';
const loop = exists(loopPath) ? read(loopPath) : '';
const map = exists(mapPath) ? read(mapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

requireText('App.tsx', app, 'useAppStableRhythmLaneSchedulerEffectProbe({');
requireText('App.tsx', app, 'stableRhythmLaneSchedulerEffectExtractedFromAppTsx: true');
requireText('App.tsx', app, 'reactLifecycleNowHookOwned: true');
requireText('App.tsx', app, 'appStillSuppliesEffectInputs: true');
requireText('App.tsx', app, 'hotPathAddsNoPerStepBuilder: true');
forbidText('App.tsx stable rhythm useEffect callsite', app, 'buildAppStableRhythmLaneEffectArgsContractProbe({');
forbidText('App.tsx stable rhythm scheduler loop callsite', app, 'startAppStableRhythmLaneSchedulerLoopProbe(');
forbidText('App.tsx stable rhythm local drum machine creation', app, 'createDrumMachine(audioCtx, ensureDrumMixBus(audioCtx))');
forbidText('App.tsx stable rhythm local readDrumStyle', app, 'const getDrumStyle = (): DrumStyle => readDrumStyle({');
forbidText('App.tsx stable rhythm local bass root resolver', app, 'const resolveCurrentBassRootHz = () => resolveBassRootHz({');

requireText('scheduler effect hook', hook, 'export const useAppStableRhythmLaneSchedulerEffectProbe');
requireText('scheduler effect hook', hook, 'useEffect(() => {');
requireText('scheduler effect hook', hook, 'if (!args.audioCtx || !args.nexusActive) return;');
requireText('scheduler effect hook', hook, 'createDrumMachine(audioCtx, args.ensureDrumMixBus(audioCtx))');
requireText('scheduler effect hook', hook, 'buildAppStableRhythmLaneEffectArgsContractProbe({');
requireText('scheduler effect hook', hook, 'return startAppStableRhythmLaneSchedulerLoopProbe(stableRhythmLaneEffectArgs.schedulerLoopArgs);');
requireText('scheduler effect hook', hook, 'readDrumStyle: () => readDrumStyle({');
requireText('scheduler effect hook', hook, 'resolveCurrentBassRootHz: () => resolveBassRootHz({');
requireText('scheduler effect hook', hook, 'resolveGrooveState: (timeSec) => grooveStateFromMycelium(args.myceliumSnapshotRef.current, timeSec)');
requireText('scheduler effect hook', hook, 'readQuantizeBpm: () => nexusParamsRef.current.quantizeBpm');
requireText('scheduler effect hook', hook, 'readMetronomeAudioNowSec: () => audioCtx.currentTime');
requireText('scheduler effect hook', hook, 'stableRhythmLaneSchedulerEffectExtractedFromAppTsx: true');
requireText('scheduler effect hook', hook, 'reactLifecycleNowHookOwned: true');
requireText('scheduler effect hook', hook, 'appStillSuppliesEffectInputs: true');
requireText('scheduler effect hook', hook, 'browserFunctionalSanityRequiredAfterThisCut: true');
for (const forbidden of [
  'createOscillator(',
  'createGain(',
  'window.setTimeout(',
  'window.clearTimeout(',
  'executeAppStableRhythmLaneSchedulerStepActionBoundary',
  'recordAudioPressureAdaptiveAction',
  'requestAnimationFrame(',
  'localStorage.',
  'document.',
]) {
  forbidText('scheduler effect hook', hook, forbidden);
}

requireText('Effect args contract still active', effectArgs, 'export const buildAppStableRhythmLaneEffectArgsContractProbe');
requireText('Scheduler loop still owns timer body', loop, 'window.setTimeout(schedule');
requireText('Scheduler loop still owns cleanup', loop, 'window.clearTimeout(timerID)');
requireText('Monolith map', map, "status: 'stable-rhythm-lane-scheduler-effect-hook-probed'");
requireText('Monolith map', map, 'Stable rhythm lane scheduler effect hook wraps the previously grouped effect args contract');
if (pkg.scripts?.[scriptName] !== 'node tools/check-app-stable-rhythm-lane-scheduler-effect-hook-probe.mjs') {
  failures.push(`package script missing ${scriptName}`);
}
requireText('sanity suite', suite, scriptName);
requireText('sanity suite contract', suiteContract, scriptName);

const report = {
  ok: failures.length === 0,
  appLines: app.split(/\r?\n/).length,
  hookLines: hook.split(/\r?\n/).length,
  contract: {
    stableRhythmLaneSchedulerEffectExtractedFromAppTsx: true,
    reactLifecycleNowHookOwned: true,
    appStillSuppliesEffectInputs: true,
    schedulerLoopStillProbeOwned: true,
    hotPathAddsNoPerStepBuilder: true,
    liveAudioHotPathAddsNoObserver: true,
    browserFunctionalSanityRequiredAfterThisCut: true,
  },
  failures,
};

if (failures.length) {
  console.error('[check-app-stable-rhythm-lane-scheduler-effect-hook-probe] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('[check-app-stable-rhythm-lane-scheduler-effect-hook-probe] ok');
console.log(JSON.stringify(report, null, 2));
