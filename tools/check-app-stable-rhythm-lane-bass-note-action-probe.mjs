#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const failures = [];

const appPath = 'src/App.tsx';
const actionPath = 'src/features/xensonar/input/appStableRhythmLaneBassNoteActionProbe.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

for (const rel of [appPath, actionPath, pkgPath, suitePath, suiteContractPath]) {
  if (!exists(rel)) failures.push(`missing ${rel}`);
}

const app = exists(appPath) ? read(appPath) : '';
const action = exists(actionPath) ? read(actionPath) : '';
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
  requireText('App.tsx successor hook call', app, 'bassNoteAction: {');
  const hook = exists('src/features/xensonar/input/useAppStableRhythmLaneSchedulerEffectProbe.ts') ? read('src/features/xensonar/input/useAppStableRhythmLaneSchedulerEffectProbe.ts') : '';
  requireText('successor hook builds effect args', hook, 'buildAppStableRhythmLaneEffectArgsContractProbe({');
  requireText('successor hook carries bass action', hook, 'bassNoteAction: {');
  const effectArgs = exists('src/features/xensonar/input/appStableRhythmLaneEffectArgsContractProbe.ts') ? read('src/features/xensonar/input/appStableRhythmLaneEffectArgsContractProbe.ts') : '';
  requireText('effect args contract successor', effectArgs, 'buildAppStableRhythmLaneBassNoteActionProbe({');
  requireText('effect args contract successor', effectArgs, 'stableRhythmLaneBassNoteActionExtractedFromAppTsx: true');
  requireText('effect args contract successor', effectArgs, 'audioBodyNowActionProbeOwned: true');
} else if (app.includes('buildAppStableRhythmLaneEffectArgsContractProbe({')) {
  requireText('App.tsx', app, 'buildAppStableRhythmLaneEffectArgsContractProbe({');
  requireText('App.tsx', app, 'bassNoteAction: {');
  const effectArgs = exists('src/features/xensonar/input/appStableRhythmLaneEffectArgsContractProbe.ts') ? read('src/features/xensonar/input/appStableRhythmLaneEffectArgsContractProbe.ts') : '';
  requireText('effect args contract successor', effectArgs, 'buildAppStableRhythmLaneBassNoteActionProbe({');
  requireText('effect args contract successor', effectArgs, 'stableRhythmLaneBassNoteActionExtractedFromAppTsx: true');
  requireText('effect args contract successor', effectArgs, 'audioBodyNowActionProbeOwned: true');
} else {
  requireText('App.tsx', app, 'buildAppStableRhythmLaneBassNoteActionProbe({');
  requireText('App.tsx', app, 'const playBassNote = stableRhythmLaneBassNoteAction.playBassNote;');
  requireText('App.tsx', app, 'stableRhythmLaneBassNoteActionExtractedFromAppTsx: true');
  requireText('App.tsx', app, 'audioBodyNowActionProbeOwned: true');
  requireText('App.tsx', app, 'finalMixBusStillAppSupplied: true');
  requireText('App.tsx', app, 'enterHoldFxDeviceStillAppSupplied: true');
}
forbidText('App.tsx stable rhythm bass note inline', app, 'const playBassNote = (time: number, freq: number, vol: number, dur: number');

requireText('bass note action probe', action, 'export const buildAppStableRhythmLaneBassNoteActionProbe');
requireText('bass note action probe', action, 'args.audioCtx.createOscillator()');
requireText('bass note action probe', action, 'args.audioCtx.createWaveShaper()');
requireText('bass note action probe', action, 'gain.connect(args.ensureFinalMixBus(args.audioCtx))');
requireText('bass note action probe', action, 'args.ensureEnterHoldPsyFxDevice(args.audioCtx)');
requireText('bass note action probe', action, 'args.enterHoldPsyFxSendsRef.current.bass');
requireText('bass note action probe', action, 'osc.start(time)');
requireText('bass note action probe', action, 'osc.stop(time + dur)');
requireText('bass note action probe', action, 'audioBodyNowActionProbeOwned: true');
requireText('bass note action probe', action, 'schedulerStillLoopProbeOwned: true');
requireText('bass note action probe', action, 'transportStillAppNexusRefOwned: true');
for (const forbidden of [
  'useEffect(',
  'window.setTimeout(',
  'window.clearTimeout(',
  'requestAnimationFrame(',
  'executeAppStableRhythmLaneSchedulerStepActionBoundary',
  'startAppStableRhythmLaneSchedulerLoopProbe',
  'nexusRefs.current.nextAbsoluteStep',
]) {
  forbidText('bass note action probe', action, forbidden);
}

if (pkg.scripts?.['xensonar:check-app-stable-rhythm-lane-bass-note-action-probe'] !== 'node tools/check-app-stable-rhythm-lane-bass-note-action-probe.mjs') {
  failures.push('package script missing xensonar:check-app-stable-rhythm-lane-bass-note-action-probe');
}
requireText('sanity suite', suite, 'xensonar:check-app-stable-rhythm-lane-bass-note-action-probe');
requireText('sanity suite contract', suiteContract, 'xensonar:check-app-stable-rhythm-lane-bass-note-action-probe');

const report = {
  ok: failures.length === 0,
  appLines: app.split(/\r?\n/).length,
  actionProbeLines: action.split(/\r?\n/).length,
  contract: {
    stableRhythmLaneBassNoteActionExtractedFromAppTsx: true,
    audioBodyNowActionProbeOwned: true,
    finalMixBusStillAppSupplied: true,
    enterHoldFxDeviceStillAppSupplied: true,
    schedulerStillLoopProbeOwned: true,
    transportStillAppNexusRefOwned: true,
  },
  failures,
};

if (failures.length) {
  console.error('[check-app-stable-rhythm-lane-bass-note-action-probe] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('[check-app-stable-rhythm-lane-bass-note-action-probe] ok');
console.log(JSON.stringify(report, null, 2));
