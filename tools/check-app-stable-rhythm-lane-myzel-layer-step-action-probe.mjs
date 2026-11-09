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
const actionPath = 'src/features/xensonar/input/appStableRhythmLaneMyzelLayerStepActionProbe.ts';
const bassActionPath = 'src/features/xensonar/input/appStableRhythmLaneBassNoteActionProbe.ts';
const loopPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerLoopProbe.ts';
const mapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-stable-rhythm-lane-myzel-layer-step-action-probe';

for (const rel of [appPath, actionPath, bassActionPath, loopPath, mapPath, pkgPath, suitePath, suiteContractPath]) {
  if (!exists(rel)) failures.push(`missing ${rel}`);
}

const app = exists(appPath) ? read(appPath) : '';
const action = exists(actionPath) ? read(actionPath) : '';
const bassAction = exists(bassActionPath) ? read(bassActionPath) : '';
const loop = exists(loopPath) ? read(loopPath) : '';
const map = exists(mapPath) ? read(mapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

if (app.includes('useAppStableRhythmLaneSchedulerEffectProbe({')) {
  requireText('App.tsx successor hook call', app, 'useAppStableRhythmLaneSchedulerEffectProbe({');
  requireText('App.tsx successor hook call', app, 'myzelLayerStepAction: {');
  requireText('App.tsx successor hook call', app, 'hotPathAddsNoPerStepBuilder: true');
  const hook = exists('src/features/xensonar/input/useAppStableRhythmLaneSchedulerEffectProbe.ts') ? read('src/features/xensonar/input/useAppStableRhythmLaneSchedulerEffectProbe.ts') : '';
  requireText('successor hook builds effect args', hook, 'buildAppStableRhythmLaneEffectArgsContractProbe({');
  requireText('successor hook carries myzel layer action', hook, 'myzelLayerStepAction: {');
  requireText('Effect args contract successor', read('src/features/xensonar/input/appStableRhythmLaneEffectArgsContractProbe.ts'), 'buildAppStableRhythmLaneMyzelLayerStepActionProbe({');
  requireText('Effect args contract successor', read('src/features/xensonar/input/appStableRhythmLaneEffectArgsContractProbe.ts'), 'stableRhythmLaneMyzelLayerStepActionExtractedFromAppTsx: true');
  requireText('Effect args contract successor', read('src/features/xensonar/input/appStableRhythmLaneEffectArgsContractProbe.ts'), 'myzelSynthStillAppSupplied: true');
} else if (app.includes('buildAppStableRhythmLaneEffectArgsContractProbe({')) {
  requireText('App.tsx', app, 'buildAppStableRhythmLaneEffectArgsContractProbe({');
  requireText('App.tsx', app, 'myzelLayerStepAction: {');
  requireText('App.tsx', app, 'hotPathAddsNoPerStepBuilder: true');
  requireText('Effect args contract successor', read('src/features/xensonar/input/appStableRhythmLaneEffectArgsContractProbe.ts'), 'buildAppStableRhythmLaneMyzelLayerStepActionProbe({');
  requireText('Effect args contract successor', read('src/features/xensonar/input/appStableRhythmLaneEffectArgsContractProbe.ts'), 'stableRhythmLaneMyzelLayerStepActionExtractedFromAppTsx: true');
  requireText('Effect args contract successor', read('src/features/xensonar/input/appStableRhythmLaneEffectArgsContractProbe.ts'), 'myzelSynthStillAppSupplied: true');
} else {
  requireText('App.tsx', app, 'buildAppStableRhythmLaneMyzelLayerStepActionProbe({');
  requireText('App.tsx', app, 'const applyMyzelLayerStep = stableRhythmLaneMyzelLayerStepAction.applyMyzelLayerStep;');
  requireText('App.tsx', app, 'stableRhythmLaneMyzelLayerStepActionExtractedFromAppTsx: true');
  requireText('App.tsx', app, 'myzelSynthStillAppSupplied: true');
  requireText('App.tsx', app, 'hotPathAddsNoPerStepBuilder: true');
}
forbidText('App.tsx unused stable rhythm timer remnant', app, 'let timerID = 0;');
forbidText('App.tsx inline Myzel action body', app, 'const applyMyzelLayerStep = (time: number, step: number) => {');
forbidText('App.tsx inline Myzel synth mutation', app, 'refs.myzelCarrierOsc?.frequency.setTargetAtTime(mod.baseHz, time, 0.08);');

requireText('Myzel layer action', action, 'export const buildAppStableRhythmLaneMyzelLayerStepActionProbe');
requireText('Myzel layer action', action, 'const applyMyzelLayerStep = (time: number, step: number) => {');
requireText('Myzel layer action', action, 'args.ensureMyzelSynth(args.audioCtx);');
requireText('Myzel layer action', action, 'deriveMyzelLayerMod(');
requireText('Myzel layer action', action, 'getMyzelPatternLevel(args.myzelPattern, step)');
requireText('Myzel layer action', action, 'getDominantDroneRatios(args.readActiveDroneOvertoneMix())');
requireText('Myzel layer action', action, 'refs.myzelCarrierOsc?.frequency.setTargetAtTime(mod.baseHz, time, 0.08);');
requireText('Myzel layer action', action, 'refs.myzelMasterGain?.gain.setTargetAtTime');
requireText('Myzel layer action', action, 'stableRhythmLaneMyzelLayerStepActionExtractedFromAppTsx: true');
requireText('Myzel layer action', action, 'schedulerStillLoopProbeOwned: true');
requireText('Myzel layer action', action, 'transportStillAppNexusRefOwned: true');
requireText('Myzel layer action', action, 'hotPathAddsNoPerStepBuilder: true');
for (const forbidden of [
  'useEffect(',
  'window.setTimeout(',
  'window.clearTimeout(',
  'requestAnimationFrame(',
  'executeAppStableRhythmLaneSchedulerStepActionBoundary',
  'startAppStableRhythmLaneSchedulerLoopProbe',
  'nexusRefs.current.nextAbsoluteStep',
  'createOscillator(',
  'createGain(',
]) {
  forbidText('Myzel layer action', action, forbidden);
}

requireText('Bass note action still extracted', bassAction, 'export const buildAppStableRhythmLaneBassNoteActionProbe');
requireText('Scheduler loop still extracted', loop, 'export const startAppStableRhythmLaneSchedulerLoopProbe');
if (!map.includes("status: 'stable-rhythm-lane-myzel-layer-step-action-probed'") && !map.includes("successor lineage marker for older guards: status: 'stable-rhythm-lane-myzel-layer-step-action-probed'")) {
  failures.push("Monolith map missing stable-rhythm-lane-myzel-layer-step-action-probed status or successor marker");
}
requireText('Monolith map', map, 'Myzel layer step action extracted from App.tsx');
if (pkg.scripts?.[scriptName] !== 'node tools/check-app-stable-rhythm-lane-myzel-layer-step-action-probe.mjs') {
  failures.push(`package script missing ${scriptName}`);
}
requireText('sanity suite', suite, scriptName);
requireText('sanity suite contract', suiteContract, scriptName);

const report = {
  ok: failures.length === 0,
  appLines: app.split(/\r?\n/).length,
  actionProbeLines: action.split(/\r?\n/).length,
  contract: {
    stableRhythmLaneMyzelLayerStepActionExtractedFromAppTsx: true,
    myzelSynthStillAppSupplied: true,
    hotPathAddsNoPerStepBuilder: true,
    schedulerStillLoopProbeOwned: true,
    transportStillAppNexusRefOwned: true,
  },
  failures,
};

if (failures.length) {
  console.error('[check-app-stable-rhythm-lane-myzel-layer-step-action-probe] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('[check-app-stable-rhythm-lane-myzel-layer-step-action-probe] ok');
console.log(JSON.stringify(report, null, 2));
