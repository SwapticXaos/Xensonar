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
const helperPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerDrumStepBranchClassifierProbe.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-stable-rhythm-lane-drum-step-branch-classifier-probe';

const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const helper = exists(helperPath) ? read(helperPath) : '';
const monolithMap = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
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
  'scheduleExportedDrumConfigStep(',
  'scheduleRhythmForgeDrumStep(',
  'scheduleRhythmForgeBassStep(',
  'schedulePsyBassStep(',
  'scheduleBassClipStep(',
  'schedulePattern(',
  'playBassNote(',
  'readQuantizeBpm',
  'nexusRefs.current.nextAbsoluteStep',
  '.current =',
];

const classifierIndex = boundary.indexOf('const drumStepBranch = resolveAppStableRhythmLaneSchedulerDrumStepBranchProbe({');
const switchIndex = boundary.indexOf('switch (drumStepBranch.kind) {');
const exportedIndex = boundary.indexOf("case 'exported':", switchIndex);
const rhythmIndex = boundary.indexOf("case 'rhythmforge':", switchIndex);
const classicIndex = boundary.indexOf("case 'classic':", switchIndex);
const cacheWriteIndex = Math.max(
  boundary.indexOf('cacheRefs.rhythmForgeDrumPatternRef.current = rhythmForgeDrumCacheCandidate.nextPattern;'),
  boundary.indexOf("kind: 'rhythmforge-drum'"),
);
const cacheCommitHelperUsed = boundary.includes('commitAppStableRhythmLanePatternCacheCandidateProbe({');

requireCheck('expected files exist', [boundaryPath, helperPath, monolithMapPath, pkgPath, suitePath, suiteContractPath].every(exists));
requireCheck('package version updated', /^3\.2\.91\.6\.9\.(197|198|19[9]|[2-9][0-9]{2,})$/.test(pkg.version));
requireCheck('package script exists', pkg.scripts?.[scriptName] === 'node tools/check-app-stable-rhythm-lane-drum-step-branch-classifier-probe.mjs');
requireCheck('helper exports discriminated branch union', helper.includes('AppStableRhythmLaneSchedulerDrumStepBranch') && helper.includes("kind: 'inactive'") && helper.includes("kind: 'exported'") && helper.includes("kind: 'rhythmforge'") && helper.includes("kind: 'classic'"));
requireCheck('helper preserves drum branch priority', helper.indexOf('if (!args.drumActive)') >= 0 && helper.indexOf("if (args.drumConfigMode === 'exported' && args.selectedExportedDrumConfig)") > helper.indexOf('if (!args.drumActive)') && helper.indexOf('if (isRhythmForgePattern(args.drumPattern))') > helper.indexOf("if (args.drumConfigMode === 'exported' && args.selectedExportedDrumConfig)"));
requireCheck('helper stays pure/static enough', forbiddenHelperNeedles.every((needle) => !helper.includes(needle)), forbiddenHelperNeedles.filter((needle) => helper.includes(needle)).join(', '));
requireCheck('boundary imports and uses classifier', boundary.includes('resolveAppStableRhythmLaneSchedulerDrumStepBranchProbe') && classifierIndex >= 0 && switchIndex > classifierIndex);
requireCheck('boundary preserves exported before rhythmforge before classic', exportedIndex > switchIndex && rhythmIndex > exportedIndex && classicIndex > rhythmIndex);
requireCheck('boundary still schedules in boundary', boundary.includes('scheduleExportedDrumConfigStep({') && boundary.includes('scheduleRhythmForgeDrumStep({') && boundary.includes('args.drumMachine.schedulePattern('));
requireCheck('boundary cache mutation remains explicit after rhythm branch', cacheWriteIndex > rhythmIndex && (helper.includes('cacheWritesStillBoundaryOwned: true') || cacheCommitHelperUsed));
requireCheck('boundary uses classifier branch payloads', boundary.includes('entry: drumStepBranch.entry') && boundary.includes('pattern: drumStepBranch.pattern') && boundary.includes('drumStepBranch.pattern,'));
requireCheck('boundary switch is exhaustiveness-guarded', boundary.includes('const exhaustive: never = drumStepBranch;'));
requireCheck('monolith map updated', monolithMap.includes("| 'stable-rhythm-lane-drum-step-branch-classifier-probed'") && (monolithMap.includes("status: 'stable-rhythm-lane-drum-step-branch-classifier-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-step-branch-classifiers-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-pattern-cache-commit-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-bass-clip-root-binding-commit-probed'")) && monolithMap.includes('resolveAppStableRhythmLaneSchedulerDrumStepBranchProbe'));
requireCheck('sanity suite includes guard', suite.includes(`script: '${scriptName}'`) && suite.includes('Stable rhythm lane drum step branch classifier probe'));
requireCheck('sanity contract includes guard', suiteContract.includes(`'${scriptName}'`));

if (failures.length) {
  console.error('app stable rhythm lane drum step branch classifier probe check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('app stable rhythm lane drum step branch classifier probe OK');
console.log(' - drum branch map is explicit');
console.log(' - drum scheduling and cache writes remain boundary-owned');
