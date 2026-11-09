#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const failures = [];

const appPath = 'src/App.tsx';
const loopPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerLoopProbe.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

for (const rel of [appPath, loopPath, pkgPath, suitePath, suiteContractPath]) {
  if (!exists(rel)) failures.push(`missing ${rel}`);
}

const app = exists(appPath) ? read(appPath) : '';
const loop = exists(loopPath) ? read(loopPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

const requireText = (label, haystack, needle) => {
  if (!haystack.includes(needle)) failures.push(`${label} missing ${needle}`);
};
const forbidText = (label, haystack, needle) => {
  if (haystack.includes(needle)) failures.push(`${label} must not contain ${needle}`);
};

if (app.includes('useAppStableRhythmLaneSchedulerEffectProbe({')) {
  requireText('App.tsx successor hook call', app, 'useAppStableRhythmLaneSchedulerEffectProbe({');
  requireText('App.tsx successor hook call', app, 'stableRhythmLaneSchedulerEffectExtractedFromAppTsx: true');
  const hookPath = 'src/features/xensonar/input/useAppStableRhythmLaneSchedulerEffectProbe.ts';
  const hook = exists(hookPath) ? read(hookPath) : '';
  requireText('successor hook starts loop', hook, 'startAppStableRhythmLaneSchedulerLoopProbe(stableRhythmLaneEffectArgs.schedulerLoopArgs)');
  requireText('successor hook builds contract', hook, 'buildAppStableRhythmLaneEffectArgsContractProbe({');
} else if (app.includes('buildAppStableRhythmLaneEffectArgsContractProbe({')) {
  requireText('App.tsx', app, 'buildAppStableRhythmLaneEffectArgsContractProbe({');
  requireText('App.tsx', app, 'reactLifecycleStillAppEffectOwned: true');
  const effectContract = exists('src/features/xensonar/input/appStableRhythmLaneEffectArgsContractProbe.ts') ? read('src/features/xensonar/input/appStableRhythmLaneEffectArgsContractProbe.ts') : '';
  requireText('Effect args contract successor', effectContract, 'schedulerLoopExtractedFromAppTsx: true');
  requireText('Effect args contract successor', effectContract, 'browserFunctionalSanityRequiredAfterThisCut: true');
} else {
  requireText('App.tsx', app, 'startAppStableRhythmLaneSchedulerLoopProbe(');
  requireText('App.tsx', app, 'reactLifecycleStillAppEffectOwned: true');
  requireText('App.tsx', app, 'schedulerLoopExtractedFromAppTsx: true');
  requireText('App.tsx', app, 'browserFunctionalSanityRequiredAfterThisCut: true');
}
forbidText('App.tsx stable scheduler imports', app, 'buildStableRhythmLaneStepPlan, executeStableRhythmLaneStepPlan, resolveStableRhythmLaneTimeWindow');
forbidText('App.tsx stable scheduler imports', app, 'buildAppStableRhythmLaneSchedulerCompactCallsiteSource');
forbidText('App.tsx stable scheduler imports', app, 'executeAppStableRhythmLaneSchedulerStepActionBoundary');
forbidText('App.tsx stable scheduler imports', app, 'buildAppStableRhythmLaneSchedulerStepActionBoundaryArgsProbe');

requireText('loop probe', loop, 'export const startAppStableRhythmLaneSchedulerLoopProbe');
requireText('loop probe', loop, 'buildAppStableRhythmLaneSchedulerCompactCallsiteSource');
requireText('loop probe', loop, 'resolveStableRhythmLaneTimeWindow');
requireText('loop probe', loop, 'buildStableRhythmLaneStepPlan');
requireText('loop probe', loop, 'executeStableRhythmLaneStepPlan(stationaryPlan, {})');
requireText('loop probe', loop, 'buildAppStableRhythmLaneSchedulerStepActionBoundaryArgsProbe');
requireText('loop probe', loop, 'executeAppStableRhythmLaneSchedulerStepActionBoundary');
requireText('loop probe', loop, "recordAudioPressureAdaptiveAction('stable-rhythm-prefill-capped'");
requireText('loop probe', loop, 'args.nexusRefs.current.nextAbsoluteStep = nextStep');
requireText('loop probe', loop, 'window.setTimeout(schedule');
requireText('loop probe', loop, 'window.clearTimeout(timerID)');
requireText('loop probe', loop, 'args.clearStableRhythmMetronomeTimeouts()');
requireText('loop probe', loop, 'nextAbsoluteStepTimeTruthStillAppNexusRef: true');
requireText('loop probe', loop, 'reactLifecycleStillAppEffectOwned: true');
requireText('loop probe', loop, 'timerResponsibilityNowInLoopProbe: true');

for (const forbidden of [
  'createOscillator(',
  'createGain(',
  'ensureMyzelSynth(',
  'ensureEnterHoldPsyFxDevice(',
  'requestAnimationFrame(',
  'localStorage.',
  'document.',
  'useEffect(',
]) {
  forbidText('loop probe', loop, forbidden);
}

if (pkg.scripts?.['xensonar:check-app-stable-rhythm-lane-scheduler-loop-probe'] !== 'node tools/check-app-stable-rhythm-lane-scheduler-loop-probe.mjs') {
  failures.push('package script missing xensonar:check-app-stable-rhythm-lane-scheduler-loop-probe');
}
requireText('sanity suite', suite, 'xensonar:check-app-stable-rhythm-lane-scheduler-loop-probe');
requireText('sanity suite contract', suiteContract, 'xensonar:check-app-stable-rhythm-lane-scheduler-loop-probe');

const report = {
  ok: failures.length === 0,
  appLines: app.split(/\r?\n/).length,
  loopProbeLines: loop.split(/\r?\n/).length,
  contract: {
    reactLifecycleStillAppEffectOwned: true,
    schedulerLoopExtractedFromAppTsx: true,
    timerResponsibilityNowInLoopProbe: true,
    nextAbsoluteStepTimeTruthStillAppNexusRef: true,
    audioBodyMoved: false,
    browserFunctionalSanityRequiredAfterThisCut: true,
  },
  failures,
};

if (failures.length) {
  console.error('[check-app-stable-rhythm-lane-scheduler-loop-probe] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('[check-app-stable-rhythm-lane-scheduler-loop-probe] ok');
console.log(JSON.stringify(report, null, 2));
