#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const failures = [];
const requireCheck = (name, condition, detail = '') => {
  if (!condition) failures.push(detail ? `${name}: ${detail}` : name);
};

const appPath = 'src/App.tsx';
const helperPath = 'src/features/xensonar/input/appBassClipRootBindingHelperProbe.ts';
const drumHelperPath = 'src/features/xensonar/input/appRhythmForgeDrumCacheHelperProbe.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const boundaryPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerStepActionBoundary.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const app = exists(appPath) ? read(appPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const schedulerBody = `${app}\n${boundary}`;
const helper = exists(helperPath) ? read(helperPath) : '';
const monolithMap = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const scriptName = 'xensonar:check-app-bass-clip-root-binding-helper-probe';

const appIndex = (needle) => schedulerBody.indexOf(needle);
const helperCallIndex = appIndex('const bassClipRootBindingCandidate = resolveAppBassClipRootBindingHelperProbe({');
const playbackWriteIndex = Math.max(appIndex('bassClipPlaybackCacheRef.current = bassClipRootBindingCandidate.nextPlaybackCache;'), appIndex('cacheRefs.bassClipPlaybackCacheRef.current = bassClipRootBindingCandidate.nextPlaybackCache;'), appIndex('commitAppStableRhythmLaneBassClipRootBindingProbe({'));
const rootWriteIndex = Math.max(appIndex('bassClipBarRootRef.current = bassClipRootBindingCandidate.nextBarRoot;'), appIndex('cacheRefs.bassClipBarRootRef.current = bassClipRootBindingCandidate.nextBarRoot;'), appIndex('commitAppStableRhythmLaneBassClipRootBindingProbe({'));
const scheduleIndex = appIndex('scheduleBassClipStep({');
const actionPortIndex = appIndex('const stableRhythmLaneSchedulerActionPort = buildAppStableRhythmLaneSchedulerInlineActionPort({');
const rhythmDrumHelperIndex = Math.max(appIndex('const rhythmForgeDrumCacheCandidate = resolveAppRhythmForgeDrumCacheHelperProbe({'), appIndex('const rhythmForgeDrumCacheCandidate = resolveAppRhythmForgeDrumCacheHelperProbe(rhythmForgeDrumCacheRequest.request);'));

const forbiddenHelperNeedles = [
  'import React',
  'useEffect(',
  'useMemo(',
  'useCallback(',
  'useState(',
  'useRef(',
  'window.setTimeout(',
  'window.clearTimeout(',
  'requestAnimationFrame(',
  'cancelAnimationFrame(',
  'createOscillator(',
  'createGain(',
  '.connect(',
  '.start(',
  'ensureAudioReady(',
  'executeStableRhythmLaneStepPlan(',
  'scheduleBassClipStep(',
  'scheduleRhythmForgeDrumStep(',
  'playBassNote(',
  'nexusRefs.current.nextAbsoluteStep',
  '.current =',
];

requireCheck('expected files exist', [appPath, helperPath, drumHelperPath, monolithMapPath, pkgPath, suitePath, suiteContractPath].every(exists));
requireCheck('package script exists', pkg.scripts?.[scriptName] === 'node tools/check-app-bass-clip-root-binding-helper-probe.mjs');
requireCheck('App imports helper', schedulerBody.includes('resolveAppBassClipRootBindingHelperProbe'));
requireCheck('helper reads clip and resolves root binding', helper.includes('readBassClipById') && helper.includes("rootBinding === 'free'") && helper.includes("rootBinding === 'bar-frozen'") && helper.includes("'live-step-root'"));
requireCheck('helper stays pure/static enough', forbiddenHelperNeedles.every((needle) => !helper.includes(needle)), forbiddenHelperNeedles.filter((needle) => helper.includes(needle)).join(', '));
requireCheck('drum helper and bass helper both remain inside scheduler action port', actionPortIndex >= 0 && rhythmDrumHelperIndex > actionPortIndex && helperCallIndex > actionPortIndex);
requireCheck('App commits playback/root binding helper results in boundary', helperCallIndex >= 0 && playbackWriteIndex > helperCallIndex && rootWriteIndex >= playbackWriteIndex);
requireCheck('App schedules from helper-resolved root after commit', scheduleIndex > rootWriteIndex && (schedulerBody.includes('const { clip, clipRootHz } = bassClipRootBindingCandidate;') || schedulerBody.includes('const { clip, clipRootHz } = bassClipRootBindingCommit;')));
requireCheck('App no longer directly reads/writes bass clip cache inline', !app.includes('bassClipPlaybackCacheRef.current = { id: p.bassClipId, clip: readBassClipById(p.bassClipId) };') && !app.includes('bassClipBarRootRef.current = { clipId: p.bassClipId, barIndex, rootHz: root };'));
requireCheck('remaining ordered cache families status', (schedulerBody.includes('rhythmForgeBassPatternRef.current = generateRhythmForgePattern({') || schedulerBody.includes('rhythmForgeBassPatternRef.current = rhythmForgeBassCacheCandidate.nextPattern;') || schedulerBody.includes('cacheRefs.rhythmForgeBassPatternRef.current = rhythmForgeBassCacheCandidate.nextPattern;') || schedulerBody.includes("kind: 'rhythmforge-bass'")) && (app.includes('psyBassPatternRef.current = generatePsyBassPattern(buildPsyBassPatternRequest({') || schedulerBody.includes('psyBassPatternRef.current = psyBassCacheCandidate.nextPattern;') || schedulerBody.includes('cacheRefs.psyBassPatternRef.current = psyBassCacheCandidate.nextPattern;') || schedulerBody.includes("kind: 'psybass'")));
requireCheck('monolith map updated', monolithMap.includes("| 'bass-clip-root-binding-helper-probed'") && (((monolithMap.includes("status: 'bass-clip-root-binding-helper-probed'") || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || monolithMap.includes("status: 'psy-bass-cache-helper-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-scheduler-step-action-boundary-extracted'") || monolithMap.includes("status: 'stable-rhythm-lane-bass-clip-root-binding-commit-probed'")) || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || (monolithMap.includes("status: 'psy-bass-cache-helper-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-scheduler-step-action-boundary-extracted'"))) || monolithMap.includes("status: 'rhythm-forge-bass-cache-helper-probed'") || (monolithMap.includes("status: 'psy-bass-cache-helper-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-scheduler-step-action-boundary-extracted'"))) && monolithMap.includes('resolveAppBassClipRootBindingHelperProbe'));
requireCheck('suite includes new script', suite.includes(`script: '${scriptName}'`) && suiteContract.includes(`'${scriptName}'`));

if (failures.length) {
  console.error('app bass clip root-binding helper probe check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('app bass clip root-binding helper probe OK');
console.log(' - helper resolves playback cache and root binding');
console.log(' - playback/root Ref writes remain App-owned');
console.log(' - stable scheduler runtime remains inline');
