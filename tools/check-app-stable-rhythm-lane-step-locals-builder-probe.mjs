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

const boundaryPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerStepActionBoundary.ts';
const helperPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerStepLocalsBuilderProbe.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-stable-rhythm-lane-step-locals-builder-probe';

const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const helper = exists(helperPath) ? read(helperPath) : '';
const monolithMap = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

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
  'executeStableRhythmLaneStepPlan(',
  'scheduleRhythmForgeDrumStep(',
  'scheduleRhythmForgeBassStep(',
  'schedulePsyBassStep(',
  'scheduleBassClipStep(',
  'playBassNote(',
  '.current =',
  'nexusRefs.current.nextAbsoluteStep',
];

requireCheck('expected files exist', [boundaryPath, helperPath, monolithMapPath, pkgPath, suitePath, suiteContractPath].every(exists));
requireCheck('package script exists', pkg.scripts?.[scriptName] === 'node tools/check-app-stable-rhythm-lane-step-locals-builder-probe.mjs');
requireCheck('boundary imports helper', boundary.includes("buildAppStableRhythmLaneSchedulerStepLocalsProbe"));
requireCheck('boundary builds locals from prestep context', boundary.includes('const stableRhythmLaneSchedulerStepLocals = buildAppStableRhythmLaneSchedulerStepLocalsProbe(stableRhythmLaneSchedulerPrestepContext);'));
requireCheck('boundary destructures derived locals', boundary.includes('grooveDescriptors') && boundary.includes('rhythmForgeBaseSwing') && boundary.includes('stableRhythmLaneSchedulerStepLocals.locals'));
requireCheck('helper derives descriptors and base swing', helper.includes('grooveDescriptors: groove.descriptors') && helper.includes('rhythmForgeBaseSwing: 0.04 + drumStyle.swing * 0.1'));
requireCheck('helper keeps ownership flags explicit', helper.includes('preStepContextStillBoundaryOwned: true') && helper.includes('cacheRequestsStillBoundaryOwned: true') && helper.includes('cacheWritesStillBoundaryOwned: true') && helper.includes('schedulingStillBoundaryOwned: true') && helper.includes('runtimeOwned: false') && helper.includes('audioOwned: false'));
requireCheck('helper stays pure/static enough', forbiddenHelperNeedles.every((needle) => !helper.includes(needle)), forbiddenHelperNeedles.filter((needle) => helper.includes(needle)).join(', '));
requireCheck('boundary still schedules after helper', boundary.indexOf('const stableRhythmLaneSchedulerStepLocals = buildAppStableRhythmLaneSchedulerStepLocalsProbe') < boundary.indexOf('const stableRhythmLaneSchedulerActionPort = buildAppStableRhythmLaneSchedulerInlineActionPort'));
requireCheck('cache writes still boundary owned or explicitly committed from boundary', boundary.includes('commitAppStableRhythmLanePatternCacheCandidateProbe({') || (boundary.includes('cacheRefs.rhythmForgeDrumPatternRef.current = rhythmForgeDrumCacheCandidate.nextPattern;') && boundary.includes('cacheRefs.rhythmForgeBassPatternRef.current = rhythmForgeBassCacheCandidate.nextPattern;') && boundary.includes('cacheRefs.psyBassPatternRef.current = psyBassCacheCandidate.nextPattern;')));
requireCheck('monolith map updated', monolithMap.includes('buildAppStableRhythmLaneSchedulerStepLocalsProbe') && /(status: 'stable-rhythm-lane-step-locals-builder-probed'|status: 'stable-rhythm-lane-step-voice-values-grouped'|status: 'stable-rhythm-lane-boundary-ports-builder-probed')/.test(monolithMap));
requireCheck('suite includes script', suite.includes(`script: '${scriptName}'`) && suiteContract.includes(`'${scriptName}'`));

if (failures.length) {
  console.error('app stable rhythm lane step locals builder probe check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('app stable rhythm lane step locals builder probe OK');
console.log(' - derived step locals are named after pre-step context');
console.log(' - cache writes and scheduling stay boundary-owned');
