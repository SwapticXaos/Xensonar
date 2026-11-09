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
const helperPath = 'src/features/xensonar/input/appBassClipRootBindingHelperProbe.ts';
const commitPath = 'src/features/xensonar/input/appStableRhythmLaneBassClipRootBindingCommitProbe.ts';
const patternCommitPath = 'src/features/xensonar/input/appStableRhythmLanePatternCacheCommitProbe.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-stable-rhythm-lane-bass-clip-root-binding-commit-probe';

const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const helper = exists(helperPath) ? read(helperPath) : '';
const commit = exists(commitPath) ? read(commitPath) : '';
const patternCommit = exists(patternCommitPath) ? read(patternCommitPath) : '';
const monolithMap = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

const forbiddenCommitNeedles = [
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

const directClipWrites = [
  'cacheRefs.bassClipPlaybackCacheRef.current = bassClipRootBindingCandidate.nextPlaybackCache;',
  'cacheRefs.bassClipBarRootRef.current = bassClipRootBindingCandidate.nextBarRoot;',
];
const helperWriteNeedles = [
  '.current =',
  'playbackCacheRef.current',
  'barRootRef.current',
];

const commitCallIndex = boundary.indexOf('const bassClipRootBindingCommit = commitAppStableRhythmLaneBassClipRootBindingProbe({');
const helperCallIndex = boundary.indexOf('const bassClipRootBindingCandidate = resolveAppBassClipRootBindingHelperProbe({');
const scheduleIndex = boundary.indexOf('scheduleBassClipStep({');
const clipDestructureIndex = boundary.indexOf('const { clip, clipRootHz } = bassClipRootBindingCommit;');

requireCheck('expected files exist', [boundaryPath, helperPath, commitPath, patternCommitPath, monolithMapPath, pkgPath, suitePath, suiteContractPath].every(exists));
requireCheck('package version updated', /^3\.2\.91\.6\.9\.(200|[2-9][0-9]{2,})$/.test(pkg.version));
requireCheck('package script exists', pkg.scripts?.[scriptName] === 'node tools/check-app-stable-rhythm-lane-bass-clip-root-binding-commit-probe.mjs');
requireCheck('commit helper exports bass clip commit contract', commit.includes('AppStableRhythmLaneBassClipRootBindingCommitProbeArgs') && commit.includes('commitAppStableRhythmLaneBassClipRootBindingProbe') && commit.includes('AppBassClipRootBindingHelperProbeResult'));
requireCheck('commit helper owns only explicit bass clip root-binding writes', commit.includes('args.playbackCacheRef.current = args.candidate.nextPlaybackCache;') && commit.includes('args.barRootRef.current = args.candidate.nextBarRoot;'));
requireCheck('commit helper writes only after candidate flags', commit.indexOf('if (args.candidate.playbackCacheWriteRequired)') >= 0 && commit.indexOf('args.playbackCacheRef.current = args.candidate.nextPlaybackCache;') > commit.indexOf('if (args.candidate.playbackCacheWriteRequired)') && commit.indexOf('if (args.candidate.barRootWriteRequired)') >= 0 && commit.indexOf('args.barRootRef.current = args.candidate.nextBarRoot;') > commit.indexOf('if (args.candidate.barRootWriteRequired)'));
requireCheck('commit helper returns scheduling values without scheduling', commit.includes('clip: args.candidate.clip') && commit.includes('clipRootHz: args.candidate.clipRootHz') && commit.includes('rootBinding: args.candidate.rootBinding'));
requireCheck('commit helper stays pure except explicit ref commit writes', forbiddenCommitNeedles.every((needle) => !commit.includes(needle)), forbiddenCommitNeedles.filter((needle) => commit.includes(needle)).join(', '));
requireCheck('root-binding helper remains write-free', helperWriteNeedles.every((needle) => !helper.includes(needle)), helperWriteNeedles.filter((needle) => helper.includes(needle)).join(', '));
requireCheck('pattern commit remains pattern-only', !patternCommit.includes('AppBassClipPlaybackCache') && !patternCommit.includes('AppBassClipBarRootBinding') && !patternCommit.includes('bassClip'));
requireCheck('boundary imports bass clip commit helper', boundary.includes("import { commitAppStableRhythmLaneBassClipRootBindingProbe } from './appStableRhythmLaneBassClipRootBindingCommitProbe';"));
requireCheck('boundary commits after helper before scheduling', helperCallIndex >= 0 && commitCallIndex > helperCallIndex && clipDestructureIndex > commitCallIndex && scheduleIndex > clipDestructureIndex);
requireCheck('boundary no longer writes bass clip root-binding inline', directClipWrites.every((needle) => !boundary.includes(needle)), directClipWrites.filter((needle) => boundary.includes(needle)).join(', '));
requireCheck('boundary still schedules bass clip in boundary', boundary.includes('scheduleBassClipStep({') && boundary.includes('playBassNote: actionPorts.playBassNote') && boundary.includes('quantizeBpm: readPorts.readQuantizeBpm()'));
requireCheck('boundary passes explicit commit ownership flags', boundary.includes('playbackCacheRef: cacheRefs.bassClipPlaybackCacheRef,') && boundary.includes('barRootRef: cacheRefs.bassClipBarRootRef,') && boundary.includes('cacheMutationExplicitlyCommitted: true,'));
requireCheck('monolith map updated', monolithMap.includes("| 'stable-rhythm-lane-bass-clip-root-binding-commit-probed'") && monolithMap.includes("status: 'stable-rhythm-lane-bass-clip-root-binding-commit-probed'") && monolithMap.includes('commitAppStableRhythmLaneBassClipRootBindingProbe'));
requireCheck('sanity suite includes guard', suite.includes(`script: '${scriptName}'`) && suite.includes('Stable rhythm lane bass clip root-binding commit probe'));
requireCheck('sanity contract includes guard', suiteContract.includes(`'${scriptName}'`));

if (failures.length) {
  console.error('app stable rhythm lane bass clip root-binding commit probe check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('app stable rhythm lane bass clip root-binding commit probe OK');
console.log(' - bass clip playback/root writes moved to explicit commit helper');
console.log(' - bass clip sound scheduling remains boundary-owned');
