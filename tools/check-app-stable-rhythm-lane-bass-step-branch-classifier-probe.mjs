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
const helperPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerBassStepBranchClassifierProbe.ts';
const drumHelperPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerDrumStepBranchClassifierProbe.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-stable-rhythm-lane-bass-step-branch-classifier-probe';

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
  'scheduleClassicBassPatternStep(',
  'playBassNote(',
  'readQuantizeBpm',
  'nexusRefs.current.nextAbsoluteStep',
  '.current =',
];

const classifierIndex = boundary.indexOf('const bassStepBranch = resolveAppStableRhythmLaneSchedulerBassStepBranchProbe({');
const switchIndex = boundary.indexOf('switch (bassStepBranch.kind) {');
const clipIndex = boundary.indexOf("case 'clip':", switchIndex);
const rhythmIndex = boundary.indexOf("case 'rhythmforge':", switchIndex);
const psyIndex = boundary.indexOf("case 'psybass':", switchIndex);
const classicIndex = boundary.indexOf("case 'classic':", switchIndex);
const clipWriteIndex = Math.max(boundary.indexOf('cacheRefs.bassClipPlaybackCacheRef.current = bassClipRootBindingCandidate.nextPlaybackCache;'), boundary.indexOf('commitAppStableRhythmLaneBassClipRootBindingProbe({'));
const rhythmWriteIndex = Math.max(
  boundary.indexOf('cacheRefs.rhythmForgeBassPatternRef.current = rhythmForgeBassCacheCandidate.nextPattern;'),
  boundary.indexOf("kind: 'rhythmforge-bass'"),
);
const psyWriteIndex = Math.max(
  boundary.indexOf('cacheRefs.psyBassPatternRef.current = psyBassCacheCandidate.nextPattern;'),
  boundary.indexOf("kind: 'psybass'"),
);
const cacheCommitHelperUsed = boundary.includes('commitAppStableRhythmLanePatternCacheCandidateProbe({');

requireCheck('expected files exist', [boundaryPath, helperPath, drumHelperPath, monolithMapPath, pkgPath, suitePath, suiteContractPath].every(exists));
requireCheck('package version updated', /^3\.2\.91\.6\.9\.(198|199|[2-9][0-9]{2,})$/.test(pkg.version));
requireCheck('package script exists', pkg.scripts?.[scriptName] === 'node tools/check-app-stable-rhythm-lane-bass-step-branch-classifier-probe.mjs');
requireCheck('helper exports discriminated branch union', helper.includes('AppStableRhythmLaneSchedulerBassStepBranch') && helper.includes("kind: 'inactive'") && helper.includes("kind: 'clip'") && helper.includes("kind: 'rhythmforge'") && helper.includes("kind: 'psybass'") && helper.includes("kind: 'classic'"));
requireCheck('helper preserves bass branch priority', helper.indexOf('if (!args.bassActive)') >= 0 && helper.indexOf("if (args.bassPatternMode === 'clip' && args.bassClipId)") > helper.indexOf('if (!args.bassActive)') && helper.indexOf('if (isRhythmForgePattern(args.bassPattern))') > helper.indexOf("if (args.bassPatternMode === 'clip' && args.bassClipId)") && helper.indexOf('if (isPsyBassPattern(args.bassPattern))') > helper.indexOf('if (isRhythmForgePattern(args.bassPattern))'));
requireCheck('helper stays pure/static enough', forbiddenHelperNeedles.every((needle) => !helper.includes(needle)), forbiddenHelperNeedles.filter((needle) => helper.includes(needle)).join(', '));
requireCheck('boundary imports and uses classifier', boundary.includes('resolveAppStableRhythmLaneSchedulerBassStepBranchProbe') && classifierIndex >= 0 && switchIndex > classifierIndex);
requireCheck('boundary preserves clip before rhythmforge before psybass before classic', clipIndex > switchIndex && rhythmIndex > clipIndex && psyIndex > rhythmIndex && classicIndex > psyIndex);
requireCheck('boundary still schedules in boundary', boundary.includes('scheduleBassClipStep({') && boundary.includes('scheduleRhythmForgeBassStep({') && boundary.includes('schedulePsyBassStep({') && boundary.includes('scheduleClassicBassPatternStep({'));
requireCheck('boundary cache mutations remain explicit after branch selection', clipWriteIndex > clipIndex && rhythmWriteIndex > rhythmIndex && psyWriteIndex > psyIndex && (helper.includes('cacheWritesStillBoundaryOwned: true') || cacheCommitHelperUsed));
requireCheck('boundary uses classifier branch payloads', boundary.includes('bassClipId: bassStepBranch.bassClipId') && boundary.includes('pattern: bassStepBranch.pattern') && boundary.includes('pattern: bassStepBranch.pattern,'));
requireCheck('boundary switch is exhaustiveness-guarded', boundary.includes('const exhaustive: never = bassStepBranch;'));
requireCheck('monolith map updated', monolithMap.includes("| 'stable-rhythm-lane-bass-step-branch-classifier-probed'") && (monolithMap.includes("status: 'stable-rhythm-lane-step-branch-classifiers-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-pattern-cache-commit-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-bass-clip-root-binding-commit-probed'")) && monolithMap.includes('resolveAppStableRhythmLaneSchedulerBassStepBranchProbe'));
requireCheck('sanity suite includes guard', suite.includes(`script: '${scriptName}'`) && suite.includes('Stable rhythm lane bass step branch classifier probe'));
requireCheck('sanity contract includes guard', suiteContract.includes(`'${scriptName}'`));

if (failures.length) {
  console.error('app stable rhythm lane bass step branch classifier probe check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('app stable rhythm lane bass step branch classifier probe OK');
console.log(' - bass branch map is explicit');
console.log(' - bass scheduling and cache writes remain boundary-owned');
