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
const helperPath = 'src/features/xensonar/input/appRhythmForgeBassCacheHelperProbe.ts';
const sharedHelperPath = 'src/features/xensonar/input/appRhythmForgePatternCacheHelperProbe.ts';
const drumHelperPath = 'src/features/xensonar/input/appRhythmForgeDrumCacheHelperProbe.ts';
const bassClipHelperPath = 'src/features/xensonar/input/appBassClipRootBindingHelperProbe.ts';
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
const scriptName = 'xensonar:check-app-rhythm-forge-bass-cache-helper-probe';

const appIndex = (needle) => schedulerBody.indexOf(needle);
const drumHelperIndex = Math.max(
  appIndex('const rhythmForgeDrumCacheCandidate = resolveAppRhythmForgeDrumCacheHelperProbe({'),
  appIndex('const rhythmForgeDrumCacheCandidate = resolveAppRhythmForgeDrumCacheHelperProbe(rhythmForgeDrumCacheRequest.request);'),
);
const bassClipHelperIndex = appIndex('const bassClipRootBindingCandidate = resolveAppBassClipRootBindingHelperProbe({');
const helperCallIndex = Math.max(
  appIndex('const rhythmForgeBassCacheCandidate = resolveAppRhythmForgeBassCacheHelperProbe({'),
  appIndex('const rhythmForgeBassCacheCandidate = resolveAppRhythmForgeBassCacheHelperProbe(rhythmForgeBassCacheRequest.request);'),
);
const helperWriteIndex = Math.max(appIndex('rhythmForgeBassPatternRef.current = rhythmForgeBassCacheCandidate.nextPattern;'), appIndex('cacheRefs.rhythmForgeBassPatternRef.current = rhythmForgeBassCacheCandidate.nextPattern;'));
const helperBarWriteIndex = Math.max(appIndex('rhythmForgeBassBarIndexRef.current = rhythmForgeBassCacheCandidate.nextBarIndex;'), appIndex('cacheRefs.rhythmForgeBassBarIndexRef.current = rhythmForgeBassCacheCandidate.nextBarIndex;'));
const scheduleIndex = appIndex('scheduleRhythmForgeBassStep({');

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
  'scheduleRhythmForgeBassStep(',
  'scheduleRhythmForgeDrumStep(',
  'scheduleBassClipStep(',
  'playBassNote(',
  'nexusRefs.current.nextAbsoluteStep',
  '.current =',
];

requireCheck('expected files exist', [appPath, helperPath, sharedHelperPath, drumHelperPath, bassClipHelperPath, monolithMapPath, pkgPath, suitePath, suiteContractPath].every(exists));
requireCheck('package script exists', pkg.scripts?.[scriptName] === 'node tools/check-app-rhythm-forge-bass-cache-helper-probe.mjs');
requireCheck('App imports helper', schedulerBody.includes('resolveAppRhythmForgeBassCacheHelperProbe'));
requireCheck('bass helper delegates but does not write/generate directly', helper.includes('resolveAppRhythmForgePatternCacheHelperProbe') && helper.includes("kind: 'bass'") && !helper.includes('generateRhythmForgePattern') && !helper.includes('.current ='));
requireCheck('shared helper generates but does not write', sharedHelper.includes('generateRhythmForgePattern({') && sharedHelper.includes('cacheWriteRequired') && sharedHelper.includes('writerStillAppOwned: true') && !sharedHelper.includes('.current ='));
requireCheck('helper stays pure/static enough', forbiddenHelperNeedles.every((needle) => !helper.includes(needle)), forbiddenHelperNeedles.filter((needle) => helper.includes(needle)).join(', '));
requireCheck('helper order remains drum then bass-clip then rhythmforge-bass', drumHelperIndex >= 0 && bassClipHelperIndex > drumHelperIndex && helperCallIndex > bassClipHelperIndex);
requireCheck('App/boundary writes helper result inline', helperCallIndex >= 0 && helperWriteIndex > helperCallIndex && helperBarWriteIndex > helperWriteIndex);
requireCheck('App/boundary schedules from helper candidate pattern', scheduleIndex > helperBarWriteIndex && schedulerBody.includes('const rhythmForgeBassPattern = rhythmForgeBassCacheCandidate.pattern;'));
requireCheck('App no longer directly generates rhythmforge bass cache inline', !schedulerBody.includes('rhythmForgeBassPatternRef.current = generateRhythmForgePattern({'));
requireCheck('rhythmforge generation removed from App import', !app.includes('import { generateRhythmForgePattern }'));
requireCheck('psybass cache family helper-probed as ordered successor', schedulerBody.includes('cacheRefs.psyBassPatternRef.current = psyBassCacheCandidate.nextPattern;'));
requireCheck('monolith map updated', monolithMap.includes("| 'rhythm-forge-bass-cache-helper-probed'") && monolithMap.includes('resolveAppRhythmForgeBassCacheHelperProbe'));
requireCheck('suite includes script', suite.includes(`script: '${scriptName}'`) && suiteContract.includes(`'${scriptName}'`));

if (failures.length) {
  console.error('app rhythm forge bass cache helper probe check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('app rhythm forge bass cache helper probe OK');
console.log(' - bass helper delegates to shared RhythmForge pattern cache helper');
console.log(' - rhythmforge bass cache Ref writes remain App/boundary-owned');
console.log(' - stable scheduler runtime remains inline');
