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
const sharedHelperPath = 'src/features/xensonar/input/appRhythmForgePatternCacheHelperProbe.ts';
const drumHelperPath = 'src/features/xensonar/input/appRhythmForgeDrumCacheHelperProbe.ts';
const bassHelperPath = 'src/features/xensonar/input/appRhythmForgeBassCacheHelperProbe.ts';
const boundaryPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerStepActionBoundary.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const app = exists(appPath) ? read(appPath) : '';
const sharedHelper = exists(sharedHelperPath) ? read(sharedHelperPath) : '';
const drumHelper = exists(drumHelperPath) ? read(drumHelperPath) : '';
const bassHelper = exists(bassHelperPath) ? read(bassHelperPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const monolithMap = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const scriptName = 'xensonar:check-app-rhythm-forge-pattern-cache-shared-helper-probe';

const sharedForbiddenNeedles = [
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
  'scheduleRhythmForgeBassStep(',
  'scheduleBassClipStep(',
  'schedulePsyBassStep(',
  'playBassNote(',
  'nexusRefs.current.nextAbsoluteStep',
  '.current =',
];

const schedulerBody = `${app}\n${boundary}`;
const appIndex = (needle) => schedulerBody.indexOf(needle);
const drumCallIndex = Math.max(
  appIndex('const rhythmForgeDrumCacheCandidate = resolveAppRhythmForgeDrumCacheHelperProbe({'),
  appIndex('const rhythmForgeDrumCacheCandidate = resolveAppRhythmForgeDrumCacheHelperProbe(rhythmForgeDrumCacheRequest.request);'),
);
const drumWriteIndex = appIndex('cacheRefs.rhythmForgeDrumPatternRef.current = rhythmForgeDrumCacheCandidate.nextPattern;');
const drumBarWriteIndex = appIndex('cacheRefs.rhythmForgeDrumBarIndexRef.current = rhythmForgeDrumCacheCandidate.nextBarIndex;');
const drumScheduleIndex = appIndex('scheduleRhythmForgeDrumStep({');
const bassCallIndex = Math.max(
  appIndex('const rhythmForgeBassCacheCandidate = resolveAppRhythmForgeBassCacheHelperProbe({'),
  appIndex('const rhythmForgeBassCacheCandidate = resolveAppRhythmForgeBassCacheHelperProbe(rhythmForgeBassCacheRequest.request);'),
);
const bassWriteIndex = appIndex('cacheRefs.rhythmForgeBassPatternRef.current = rhythmForgeBassCacheCandidate.nextPattern;');
const bassBarWriteIndex = appIndex('cacheRefs.rhythmForgeBassBarIndexRef.current = rhythmForgeBassCacheCandidate.nextBarIndex;');
const bassScheduleIndex = appIndex('scheduleRhythmForgeBassStep({');

requireCheck('expected files exist', [appPath, sharedHelperPath, drumHelperPath, bassHelperPath, boundaryPath, monolithMapPath, pkgPath, suitePath, suiteContractPath].every(exists));
requireCheck('package script exists', pkg.scripts?.[scriptName] === 'node tools/check-app-rhythm-forge-pattern-cache-shared-helper-probe.mjs');
requireCheck('shared helper owns only rhythmforge pattern generation', sharedHelper.includes("generateRhythmForgePattern({") && sharedHelper.includes("export type AppRhythmForgePatternCacheKind = 'drum' | 'bass';") && sharedHelper.includes('resolveAppRhythmForgePatternCacheHelperProbe'));
requireCheck('shared helper stays pure/static enough', sharedForbiddenNeedles.every((needle) => !sharedHelper.includes(needle)), sharedForbiddenNeedles.filter((needle) => sharedHelper.includes(needle)).join(', '));
requireCheck('shared helper returns App-owned cache flags', sharedHelper.includes('writerStillAppOwned: true') && sharedHelper.includes('schedulingStillAppOwned: true') && sharedHelper.includes('runtimeOwned: false'));
requireCheck('drum helper delegates to shared helper', drumHelper.includes('resolveAppRhythmForgePatternCacheHelperProbe') && drumHelper.includes("kind: 'drum'"));
requireCheck('bass helper delegates to shared helper', bassHelper.includes('resolveAppRhythmForgePatternCacheHelperProbe') && bassHelper.includes("kind: 'bass'"));
requireCheck('drum helper no longer directly imports generator', !drumHelper.includes("generateRhythmForgePattern"));
requireCheck('bass helper no longer directly imports generator', !bassHelper.includes("generateRhythmForgePattern"));
requireCheck('App no longer directly imports/generates RhythmForge patterns', !app.includes('generateRhythmForgePattern'));
requireCheck('boundary still calls semantic drum and bass wrappers', boundary.includes('resolveAppRhythmForgeDrumCacheHelperProbe') && boundary.includes('resolveAppRhythmForgeBassCacheHelperProbe'));
requireCheck('boundary does not call shared helper directly', !boundary.includes('resolveAppRhythmForgePatternCacheHelperProbe'));
requireCheck('drum cache writes remain in step-action boundary', drumCallIndex >= 0 && drumWriteIndex > drumCallIndex && drumBarWriteIndex > drumWriteIndex && drumScheduleIndex > drumBarWriteIndex);
requireCheck('bass cache writes remain in step-action boundary', bassCallIndex >= 0 && bassWriteIndex > bassCallIndex && bassBarWriteIndex > bassWriteIndex && bassScheduleIndex > bassBarWriteIndex);
requireCheck('drum and bass scheduling remain split', boundary.includes('scheduleRhythmForgeDrumStep({') && boundary.includes('scheduleRhythmForgeBassStep({'));
requireCheck('monolith map updated', monolithMap.includes('rhythm-forge-pattern-cache-shared-helper-probed') && monolithMap.includes('resolveAppRhythmForgePatternCacheHelperProbe'));
requireCheck('suite includes shared helper script', suite.includes(`script: '${scriptName}'`) && suiteContract.includes(`'${scriptName}'`));

if (failures.length) {
  console.error('app rhythm forge pattern cache shared helper probe check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('app rhythm forge pattern cache shared helper probe OK');
console.log(' - shared helper owns read/generate/return pattern-cache decision only');
console.log(' - drum/bass wrapper semantics remain split');
console.log(' - cache Ref writes and rhythm scheduling remain boundary/App-owned');
