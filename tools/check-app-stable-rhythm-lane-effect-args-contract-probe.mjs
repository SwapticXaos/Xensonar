#!/usr/bin/env node
import { createCheck } from './lib/check-kit.mjs';

const check = createCheck('check-app-stable-rhythm-lane-effect-args-contract-probe');
const { read, exists, requireText, forbidText, failures } = check;

const appPath = 'src/App.tsx';
const contractPath = 'src/features/xensonar/input/appStableRhythmLaneEffectArgsContractProbe.ts';
const loopPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerLoopProbe.ts';
const boundaryPortsBuilderPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerBoundaryPortsBuilderProbe.ts';
const bassActionPath = 'src/features/xensonar/input/appStableRhythmLaneBassNoteActionProbe.ts';
const myzelActionPath = 'src/features/xensonar/input/appStableRhythmLaneMyzelLayerStepActionProbe.ts';
const mapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-stable-rhythm-lane-effect-args-contract-probe';

for (const rel of [appPath, contractPath, loopPath, boundaryPortsBuilderPath, bassActionPath, myzelActionPath, mapPath, pkgPath, suitePath, suiteContractPath]) {
  if (!exists(rel)) failures.push(`missing ${rel}`);
}

const app = exists(appPath) ? read(appPath) : '';
const contract = exists(contractPath) ? read(contractPath) : '';
const loop = exists(loopPath) ? read(loopPath) : '';
const boundaryPortsBuilder = exists(boundaryPortsBuilderPath) ? read(boundaryPortsBuilderPath) : '';
const bassAction = exists(bassActionPath) ? read(bassActionPath) : '';
const myzelAction = exists(myzelActionPath) ? read(myzelActionPath) : '';
const map = exists(mapPath) ? read(mapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

if (app.includes('useAppStableRhythmLaneSchedulerEffectProbe({')) {
  requireText('App.tsx successor hook', app, 'useAppStableRhythmLaneSchedulerEffectProbe({');
  requireText('App.tsx successor hook', app, 'stableRhythmLaneSchedulerEffectExtractedFromAppTsx: true');
  requireText('App.tsx successor hook', app, 'reactLifecycleNowHookOwned: true');
  requireText('App.tsx successor hook', app, 'schedulerLoopStillProbeOwned: true');
  requireText('App.tsx successor hook', app, 'hotPathAddsNoPerStepBuilder: true');
  const hookPath = 'src/features/xensonar/input/useAppStableRhythmLaneSchedulerEffectProbe.ts';
  const hook = exists(hookPath) ? read(hookPath) : '';
  requireText('successor hook', hook, 'buildAppStableRhythmLaneEffectArgsContractProbe({');
  requireText('successor hook', hook, 'return startAppStableRhythmLaneSchedulerLoopProbe(stableRhythmLaneEffectArgs.schedulerLoopArgs);');
  requireText('successor hook', hook, 'readDrumStyle: () => readDrumStyle({');
  requireText('successor hook', hook, 'resolveCurrentBassRootHz: () => resolveBassRootHz({');
} else {
  requireText('App.tsx', app, 'buildAppStableRhythmLaneEffectArgsContractProbe({');
  requireText('App.tsx', app, 'return startAppStableRhythmLaneSchedulerLoopProbe(stableRhythmLaneEffectArgs.schedulerLoopArgs);');
  requireText('App.tsx', app, 'effectArgsContractExtractedFromAppTsx: true');
  requireText('App.tsx', app, 'reactLifecycleStillAppEffectOwned: true');
  requireText('App.tsx', app, 'schedulerLoopStillProbeOwned: true');
  requireText('App.tsx', app, 'hotPathAddsNoPerStepBuilder: true');
  requireText('App.tsx stable rhythm loop still called', app, 'startAppStableRhythmLaneSchedulerLoopProbe(');
}
forbidText('App.tsx direct bass note action builder', app, 'buildAppStableRhythmLaneBassNoteActionProbe({');
forbidText('App.tsx direct Myzel layer action builder', app, 'buildAppStableRhythmLaneMyzelLayerStepActionProbe({');
forbidText('App.tsx direct boundary ports builder', app, 'buildAppStableRhythmLaneSchedulerBoundaryPortsProbe({');

requireText('Effect args contract', contract, 'export const buildAppStableRhythmLaneEffectArgsContractProbe');
requireText('Effect args contract', contract, 'buildAppStableRhythmLaneBassNoteActionProbe({');
requireText('Effect args contract', contract, 'buildAppStableRhythmLaneMyzelLayerStepActionProbe({');
requireText('Effect args contract', contract, 'buildAppStableRhythmLaneSchedulerBoundaryPortsProbe({');
requireText('Effect args contract', contract, 'schedulerLoopArgs: {');
requireText('Effect args contract', contract, 'boundaryPorts,');
requireText('Effect args contract', contract, 'liveAudioHotPathAddsNoObserver: true');
requireText('Effect args contract', contract, 'hotPathAddsNoPerStepBuilder: true');
for (const forbidden of [
  'useEffect(',
  'window.setTimeout(',
  'window.clearTimeout(',
  'requestAnimationFrame(',
  'executeAppStableRhythmLaneSchedulerStepActionBoundary',
  'recordAudioPressureAdaptiveAction',
  'createOscillator(',
  'createGain(',
  '.current.nextAbsoluteStep =',
]) {
  forbidText('Effect args contract', contract, forbidden);
}

requireText('Scheduler loop still owns loop body', loop, 'window.setTimeout(schedule');
requireText('Boundary ports builder still pure port assembly', boundaryPortsBuilder, 'export const buildAppStableRhythmLaneSchedulerBoundaryPortsProbe');
requireText('Bass note action still audio body', bassAction, 'export const buildAppStableRhythmLaneBassNoteActionProbe');
requireText('Myzel layer action still audio body', myzelAction, 'export const buildAppStableRhythmLaneMyzelLayerStepActionProbe');
if (map.includes("status: 'stable-rhythm-lane-scheduler-effect-hook-probed'")) {
  requireText('Monolith map successor hook status', map, "status: 'stable-rhythm-lane-scheduler-effect-hook-probed'");
  requireText('Monolith map successor hook text', map, 'Stable rhythm lane scheduler effect hook wraps the previously grouped effect args contract');
} else {
  requireText('Monolith map', map, "status: 'stable-rhythm-lane-effect-args-contract-probed'");
  requireText('Monolith map', map, 'Stable rhythm lane effect args contract groups bass/Myzel actions, boundary ports, and scheduler loop args without hook extraction');
}
if (pkg.scripts?.[scriptName] !== 'node tools/check-app-stable-rhythm-lane-effect-args-contract-probe.mjs') {
  failures.push(`package script missing ${scriptName}`);
}
requireText('sanity suite', suite, scriptName);
requireText('sanity suite contract', suiteContract, scriptName);

const report = {
  ok: failures.length === 0,
  appLines: app.split(/\r?\n/).length,
  effectArgsContractLines: contract.split(/\r?\n/).length,
  contract: {
    effectArgsContractExtractedFromAppTsx: true,
    reactLifecycleStillAppEffectOwned: true,
    schedulerLoopStillProbeOwned: true,
    hotPathAddsNoPerStepBuilder: true,
    liveAudioHotPathAddsNoObserver: true,
  },
  failures,
};

check.finish(report);
