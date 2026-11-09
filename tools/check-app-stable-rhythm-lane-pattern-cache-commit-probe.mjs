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
const helperPath = 'src/features/xensonar/input/appStableRhythmLanePatternCacheCommitProbe.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-stable-rhythm-lane-pattern-cache-commit-probe';

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
];

const commitCallCount = (boundary.match(/commitAppStableRhythmLanePatternCacheCandidateProbe\(\{/g) || []).length;
const directPatternWrites = [
  'cacheRefs.rhythmForgeDrumPatternRef.current = rhythmForgeDrumCacheCandidate.nextPattern;',
  'cacheRefs.rhythmForgeBassPatternRef.current = rhythmForgeBassCacheCandidate.nextPattern;',
  'cacheRefs.psyBassPatternRef.current = psyBassCacheCandidate.nextPattern;',
  'cacheRefs.rhythmForgeDrumBarIndexRef.current = rhythmForgeDrumCacheCandidate.nextBarIndex;',
  'cacheRefs.rhythmForgeBassBarIndexRef.current = rhythmForgeBassCacheCandidate.nextBarIndex;',
  'cacheRefs.psyBassBarIndexRef.current = psyBassCacheCandidate.nextBarIndex;',
];

const drumCommitIndex = boundary.indexOf("kind: 'rhythmforge-drum'");
const drumScheduleIndex = boundary.indexOf('scheduleRhythmForgeDrumStep({');
const bassCommitIndex = boundary.indexOf("kind: 'rhythmforge-bass'");
const bassScheduleIndex = boundary.indexOf('scheduleRhythmForgeBassStep({');
const psyCommitIndex = boundary.indexOf("kind: 'psybass'");
const psyScheduleIndex = boundary.indexOf('schedulePsyBassStep({');
const bassClipCommitIndex = boundary.indexOf('commitAppStableRhythmLaneBassClipRootBindingProbe({');

requireCheck('expected files exist', [boundaryPath, helperPath, monolithMapPath, pkgPath, suitePath, suiteContractPath].every(exists));
requireCheck('package version updated', /^3\.2\.91\.6\.9\.(199|[2-9][0-9]{2,})$/.test(pkg.version));
requireCheck('package script exists', pkg.scripts?.[scriptName] === 'node tools/check-app-stable-rhythm-lane-pattern-cache-commit-probe.mjs');
requireCheck('helper exports generic commit contract', helper.includes('AppStableRhythmLanePatternCacheCommitKind') && helper.includes('AppStableRhythmLanePatternCacheCommitCandidate<TPattern>') && helper.includes('commitAppStableRhythmLanePatternCacheCandidateProbe'));
requireCheck('helper owns only explicit pattern/bar ref writes', helper.includes('args.patternRef.current = args.candidate.nextPattern;') && helper.includes('args.barIndexRef.current = args.candidate.nextBarIndex;'));
requireCheck('helper writes only after cacheWriteRequired', helper.indexOf('if (args.candidate.cacheWriteRequired)') >= 0 && helper.indexOf('args.patternRef.current = args.candidate.nextPattern;') > helper.indexOf('if (args.candidate.cacheWriteRequired)'));
requireCheck('helper stays pure except explicit commit write', forbiddenHelperNeedles.every((needle) => !helper.includes(needle)), forbiddenHelperNeedles.filter((needle) => helper.includes(needle)).join(', '));
requireCheck('boundary imports commit helper', boundary.includes("import { commitAppStableRhythmLanePatternCacheCandidateProbe } from './appStableRhythmLanePatternCacheCommitProbe';"));
requireCheck('boundary commits three pattern caches', commitCallCount === 3, `commit calls ${commitCallCount}`);
requireCheck('boundary no longer writes pattern caches inline', directPatternWrites.every((needle) => !boundary.includes(needle)), directPatternWrites.filter((needle) => boundary.includes(needle)).join(', '));
requireCheck('boundary keeps bass clip root-binding outside pattern commit helper', bassClipCommitIndex >= 0 || boundary.includes('cacheRefs.bassClipPlaybackCacheRef.current = bassClipRootBindingCandidate.nextPlaybackCache;'));
requireCheck('boundary commits before scheduling each generated family', drumCommitIndex >= 0 && drumScheduleIndex > drumCommitIndex && bassCommitIndex >= 0 && bassScheduleIndex > bassCommitIndex && psyCommitIndex >= 0 && psyScheduleIndex > psyCommitIndex);
requireCheck('boundary schedules from committed pattern values', boundary.includes('const rhythmForgeDrumPattern = rhythmForgeDrumCacheCommit.pattern;') && boundary.includes('const rhythmForgeBassPattern = rhythmForgeBassCacheCommit.pattern;') && boundary.includes('const psyBassPattern = psyBassCacheCommit.pattern;'));
requireCheck('boundary still schedules in boundary', boundary.includes('scheduleRhythmForgeDrumStep({') && boundary.includes('scheduleRhythmForgeBassStep({') && boundary.includes('schedulePsyBassStep({'));
requireCheck('monolith map updated', monolithMap.includes("| 'stable-rhythm-lane-pattern-cache-commit-probed'") && (monolithMap.includes("status: 'stable-rhythm-lane-pattern-cache-commit-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-bass-clip-root-binding-commit-probed'")) && monolithMap.includes('commitAppStableRhythmLanePatternCacheCandidateProbe'));
requireCheck('sanity suite includes guard', suite.includes(`script: '${scriptName}'`) && suite.includes('Stable rhythm lane pattern cache commit probe'));
requireCheck('sanity contract includes guard', suiteContract.includes(`'${scriptName}'`));

if (failures.length) {
  console.error('app stable rhythm lane pattern cache commit probe check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('app stable rhythm lane pattern cache commit probe OK');
console.log(' - pattern cache writes moved to explicit commit helper');
console.log(' - sound scheduling remains boundary-owned');
