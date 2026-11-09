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
const helperPath = 'src/features/xensonar/input/appRhythmForgeDrumCacheHelperProbe.ts';
const sharedHelperPath = 'src/features/xensonar/input/appRhythmForgePatternCacheHelperProbe.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const boundaryPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerStepActionBoundary.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const app = exists(appPath) ? read(appPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const schedulerBody = `${app}\n${boundary}`;
const helper = exists(helperPath) ? read(helperPath) : '';
const sharedHelper = exists(sharedHelperPath) ? read(sharedHelperPath) : '';
const monolithMap = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const scriptName = 'xensonar:check-app-rhythm-forge-drum-cache-helper-probe';

const appIndex = (needle) => schedulerBody.indexOf(needle);
const helperCallIndex = Math.max(
  appIndex('const rhythmForgeDrumCacheCandidate = resolveAppRhythmForgeDrumCacheHelperProbe({'),
  appIndex('const rhythmForgeDrumCacheCandidate = resolveAppRhythmForgeDrumCacheHelperProbe(rhythmForgeDrumCacheRequest.request);'),
);
const helperWriteIndex = Math.max(appIndex('rhythmForgeDrumPatternRef.current = rhythmForgeDrumCacheCandidate.nextPattern;'), appIndex('cacheRefs.rhythmForgeDrumPatternRef.current = rhythmForgeDrumCacheCandidate.nextPattern;'));
const helperBarWriteIndex = Math.max(appIndex('rhythmForgeDrumBarIndexRef.current = rhythmForgeDrumCacheCandidate.nextBarIndex;'), appIndex('cacheRefs.rhythmForgeDrumBarIndexRef.current = rhythmForgeDrumCacheCandidate.nextBarIndex;'));
const scheduleIndex = appIndex('scheduleRhythmForgeDrumStep({');
const staleIndex = appIndex('if (stationaryPlan.stale) {');
const actionPortIndex = appIndex('const stableRhythmLaneSchedulerActionPort = buildAppStableRhythmLaneSchedulerInlineActionPort({');

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
  'scheduleRhythmForgeDrumStep(',
  'scheduleBassClipStep(',
  'playBassNote(',
  'nexusRefs.current.nextAbsoluteStep',
  '.current =',
];

requireCheck('expected files exist', [appPath, helperPath, sharedHelperPath, monolithMapPath, pkgPath, suitePath, suiteContractPath].every(exists));
requireCheck('package script exists', pkg.scripts?.[scriptName] === 'node tools/check-app-rhythm-forge-drum-cache-helper-probe.mjs');
requireCheck('App imports helper', schedulerBody.includes('resolveAppRhythmForgeDrumCacheHelperProbe'));
requireCheck('drum helper delegates but does not write/generate directly', helper.includes('resolveAppRhythmForgePatternCacheHelperProbe') && helper.includes("kind: 'drum'") && !helper.includes('generateRhythmForgePattern') && !helper.includes('.current ='));
requireCheck('shared helper generates but does not write', sharedHelper.includes('generateRhythmForgePattern({') && sharedHelper.includes('cacheWriteRequired') && sharedHelper.includes('writerStillAppOwned: true') && !sharedHelper.includes('.current ='));
requireCheck('helper stays pure/static enough', forbiddenHelperNeedles.every((needle) => !helper.includes(needle)), forbiddenHelperNeedles.filter((needle) => helper.includes(needle)).join(', '));
requireCheck('stale guard still precedes helper/action port', staleIndex >= 0 && actionPortIndex > staleIndex && helperCallIndex > actionPortIndex);
requireCheck('App/boundary writes helper result inline', helperCallIndex >= 0 && helperWriteIndex > helperCallIndex && helperBarWriteIndex > helperWriteIndex);
requireCheck('App/boundary schedules from helper candidate pattern', scheduleIndex > helperBarWriteIndex && schedulerBody.includes('const rhythmForgeDrumPattern = rhythmForgeDrumCacheCandidate.pattern;'));
requireCheck('App no longer directly generates drum cache inline', !schedulerBody.includes('rhythmForgeDrumPatternRef.current = generateRhythmForgePattern({'));
requireCheck('bass rhythm forge generation remains helper-probed', schedulerBody.includes('cacheRefs.rhythmForgeBassPatternRef.current = rhythmForgeBassCacheCandidate.nextPattern;'));
requireCheck('bass clip root-binding still helper-probed', (schedulerBody.includes('cacheRefs.bassClipPlaybackCacheRef.current = bassClipRootBindingCandidate.nextPlaybackCache;') && schedulerBody.includes('cacheRefs.bassClipBarRootRef.current = bassClipRootBindingCandidate.nextBarRoot;')) || schedulerBody.includes('commitAppStableRhythmLaneBassClipRootBindingProbe({'));
requireCheck('monolith map updated', monolithMap.includes("| 'rhythm-forge-drum-cache-helper-probed'") && monolithMap.includes('resolveAppRhythmForgeDrumCacheHelperProbe'));
requireCheck('suite includes script', suite.includes(`script: '${scriptName}'`) && suiteContract.includes(`'${scriptName}'`));

if (failures.length) {
  console.error('app rhythm forge drum cache helper probe check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('app rhythm forge drum cache helper probe OK');
console.log(' - drum helper delegates to shared RhythmForge pattern cache helper');
console.log(' - drum cache Ref writes remain App/boundary-owned');
console.log(' - stable scheduler runtime remains inline');
