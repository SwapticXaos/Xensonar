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
const helperPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerStepVoiceValuesBuilderProbe.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-stable-rhythm-lane-step-voice-values-builder-probe';

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
requireCheck('package script exists', pkg.scripts?.[scriptName] === 'node tools/check-app-stable-rhythm-lane-step-voice-values-builder-probe.mjs');
requireCheck('boundary imports helper builders', boundary.includes('buildAppStableRhythmLaneSchedulerDrumStepVoiceValuesProbe') && boundary.includes('buildAppStableRhythmLaneSchedulerBassStepVoiceValuesProbe'));
requireCheck('boundary builds drum and bass voice values before action port', boundary.indexOf('const stableRhythmLaneSchedulerDrumStepVoiceValues = buildAppStableRhythmLaneSchedulerDrumStepVoiceValuesProbe') > boundary.indexOf('const stableRhythmLaneSchedulerStepLocals = buildAppStableRhythmLaneSchedulerStepLocalsProbe') && boundary.indexOf('const stableRhythmLaneSchedulerBassStepVoiceValues = buildAppStableRhythmLaneSchedulerBassStepVoiceValuesProbe') > boundary.indexOf('const stableRhythmLaneSchedulerDrumStepVoiceValues = buildAppStableRhythmLaneSchedulerDrumStepVoiceValuesProbe') && boundary.indexOf('const stableRhythmLaneSchedulerActionPort = buildAppStableRhythmLaneSchedulerInlineActionPort') > boundary.indexOf('const stableRhythmLaneSchedulerBassStepVoiceValues = buildAppStableRhythmLaneSchedulerBassStepVoiceValuesProbe'));
requireCheck('helper defaults remain explicit', helper.includes("drumKit: args.drumKit ?? 'dusty_tape'") && helper.includes('bassGrit: args.bassGrit ?? 0.18'));
requireCheck('helper keeps scheduling boundary flags', helper.includes('schedulingStillBoundaryOwned: true') && helper.includes('audioOwned: false') && helper.includes('runtimeOwned: false'));
requireCheck('helper stays pure/static enough', forbiddenHelperNeedles.every((needle) => !helper.includes(needle)), forbiddenHelperNeedles.filter((needle) => helper.includes(needle)).join(', '));
requireCheck('drum scheduler uses drum voice values', boundary.includes('stableRhythmLaneSchedulerDrumStepVoiceValues.drumLevel') && boundary.includes('stableRhythmLaneSchedulerDrumStepVoiceValues.drumKit') && boundary.includes('stableRhythmLaneSchedulerDrumStepVoiceValues.drumLaneKitOverrides'));
requireCheck('bass scheduler uses bass voice values', boundary.includes('const v = stableRhythmLaneSchedulerBassStepVoiceValues.bassLevel;') && boundary.includes('stableRhythmLaneSchedulerBassStepVoiceValues.bassGrit') && boundary.includes('stableRhythmLaneSchedulerBassStepVoiceValues.rootHz') && boundary.includes('stableRhythmLaneSchedulerBassStepVoiceValues.stepDurationSec'));
requireCheck('drum/bass scheduling remains split', boundary.includes('scheduleRhythmForgeDrumStep({') && boundary.includes('scheduleRhythmForgeBassStep({') && boundary.indexOf('scheduleRhythmForgeDrumStep({') < boundary.indexOf('scheduleRhythmForgeBassStep({'));
requireCheck('cache writes still explicit outside voice values helper', (boundary.includes('cacheRefs.rhythmForgeDrumPatternRef.current = rhythmForgeDrumCacheCandidate.nextPattern;') || boundary.includes("kind: 'rhythmforge-drum'")) && (boundary.includes('cacheRefs.rhythmForgeBassPatternRef.current = rhythmForgeBassCacheCandidate.nextPattern;') || boundary.includes("kind: 'rhythmforge-bass'")) && (boundary.includes('cacheRefs.psyBassPatternRef.current = psyBassCacheCandidate.nextPattern;') || boundary.includes("kind: 'psybass'"))); 
requireCheck('monolith map updated', monolithMap.includes('buildAppStableRhythmLaneSchedulerDrumStepVoiceValuesProbe') && monolithMap.includes('buildAppStableRhythmLaneSchedulerBassStepVoiceValuesProbe') && (monolithMap.includes("status: 'stable-rhythm-lane-step-voice-values-grouped'") || monolithMap.includes("status: 'stable-rhythm-lane-step-branch-classifiers-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-pattern-cache-commit-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-bass-clip-root-binding-commit-probed'")));
requireCheck('suite includes script', suite.includes(`script: '${scriptName}'`) && suiteContract.includes(`'${scriptName}'`));

if (failures.length) {
  console.error('app stable rhythm lane step voice values builder probe check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('app stable rhythm lane step voice values builder probe OK');
console.log(' - drum/bass voice values are grouped');
console.log(' - scheduling and audio remain in the existing boundary paths');
