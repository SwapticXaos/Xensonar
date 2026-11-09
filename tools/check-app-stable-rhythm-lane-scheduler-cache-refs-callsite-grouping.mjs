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
const boundaryPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerStepActionBoundary.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const app = exists(appPath) ? read(appPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const monolithMap = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const scriptName = 'xensonar:check-app-stable-rhythm-lane-scheduler-cache-refs-callsite-grouping';

const appIndex = (needle) => app.indexOf(needle);
const boundaryIndex = (needle) => boundary.indexOf(needle);
const cacheGroupIndex = Math.max(appIndex('const stableRhythmLaneSchedulerCacheRefs: AppStableRhythmLaneSchedulerCacheRefs = {'), appIndex('const stableRhythmLaneSchedulerBoundaryPorts = buildAppStableRhythmLaneSchedulerBoundaryPortsProbe({'));
const scheduleIndex = appIndex('const schedule = () => {');
const whileIndex = appIndex('while (nextStep * stepMs < prefillWindow.scheduleUntilSec');
const staleIndex = appIndex('if (stationaryPlan.stale) {');
const boundaryCallIndex = appIndex('executeAppStableRhythmLaneSchedulerStepActionBoundary({');
const cachePassIndex = Math.max(appIndex('cacheRefs: stableRhythmLaneSchedulerCacheRefs,'), appIndex('cacheRefs: stableRhythmLaneSchedulerBoundaryPorts.cacheRefs,'));
const nextStepWriteIndex = appIndex('nexusRefs.current.nextAbsoluteStep = nextStep;');
const timeoutIndex = appIndex('timerID = window.setTimeout(schedule, stableRhythmLaneSchedulerSource.tickConfig.timerIntervalMs);');

const expectedRefs = [
  'rhythmForgeDrumPatternRef',
  'rhythmForgeBassPatternRef',
  'rhythmForgeDrumBarIndexRef',
  'rhythmForgeBassBarIndexRef',
  'rhythmForgeSeedRef',
  'psyBassPatternRef',
  'psyBassBarIndexRef',
  'bassClipPlaybackCacheRef',
  'bassClipBarRootRef',
];

const cacheGroupEndIndex = app.indexOf('};', cacheGroupIndex);
const cacheGroupBody = cacheGroupIndex >= 0 && cacheGroupEndIndex > cacheGroupIndex ? app.slice(cacheGroupIndex, cacheGroupEndIndex) : '';
const boundaryCallEndIndex = app.indexOf('});', boundaryCallIndex);
const boundaryCallBody = boundaryCallIndex >= 0 && boundaryCallEndIndex > boundaryCallIndex ? app.slice(boundaryCallIndex, boundaryCallEndIndex) : '';

const forbiddenBoundaryNeedles = [
  'window.setTimeout(',
  'window.clearTimeout(',
  'resolveStableRhythmLaneTimeWindow(',
  'buildStableRhythmLaneStepPlan(',
  'recordAudioPressureAdaptiveAction(',
  'nexusRefs.current.nextAbsoluteStep',
  'requestAnimationFrame(',
  'cancelAnimationFrame(',
  'useEffect(',
  'useMemo(',
  'useCallback(',
  'useState(',
  'useRef(',
  'ensureAudioReady(',
];

requireCheck('expected files exist', [appPath, boundaryPath, monolithMapPath, pkgPath, suitePath, suiteContractPath].every(exists));
requireCheck('package version updated', /^3\.2\.91\.6\.9\.(189|19[0-9]|[2-9][0-9]{2,})$/.test(pkg.version));
requireCheck('package script exists', pkg.scripts?.[scriptName] === 'node tools/check-app-stable-rhythm-lane-scheduler-cache-refs-callsite-grouping.mjs');
requireCheck('boundary exports cache refs type', boundary.includes('export type AppStableRhythmLaneSchedulerCacheRefs = Pick<') && expectedRefs.every((ref) => boundary.includes(`'${ref}'`)) && boundary.includes('readonly cacheRefs: AppStableRhythmLaneSchedulerCacheRefs;'));
requireCheck('App imports cache refs type or boundary ports builder', (app.includes('type AppStableRhythmLaneSchedulerCacheRefs') || app.includes('buildAppStableRhythmLaneSchedulerBoundaryPortsProbe')) && app.includes('executeAppStableRhythmLaneSchedulerStepActionBoundary'));
requireCheck('App creates typed cacheRefs group before scheduler loop', cacheGroupIndex >= 0 && cacheGroupIndex < scheduleIndex && scheduleIndex < whileIndex && expectedRefs.every((ref) => (cacheGroupBody || app.slice(cacheGroupIndex, scheduleIndex)).includes(ref)));
requireCheck('App passes named cacheRefs group into boundary', boundaryCallIndex > staleIndex && cachePassIndex > boundaryCallIndex && cachePassIndex < boundaryCallEndIndex);
requireCheck('boundary call no longer allocates cacheRefs literal per step', !boundaryCallBody.includes('cacheRefs: {') && expectedRefs.every((ref) => cacheGroupBody.includes(ref)));
requireCheck('App still owns outer transport order', scheduleIndex >= 0 && whileIndex > scheduleIndex && staleIndex > whileIndex && boundaryCallIndex > staleIndex && nextStepWriteIndex > boundaryCallIndex && timeoutIndex > nextStepWriteIndex);
requireCheck('App still owns stale path', app.includes('executeStableRhythmLaneStepPlan(stationaryPlan, {});') && app.includes('continue;'));
requireCheck('boundary still owns cache writes or explicit commit calls, not App callsite group', (boundary.includes('commitAppStableRhythmLanePatternCacheCandidateProbe({') && boundary.includes('commitAppStableRhythmLaneBassClipRootBindingProbe({')) || [
  'cacheRefs.rhythmForgeDrumPatternRef.current = rhythmForgeDrumCacheCandidate.nextPattern;',
  'cacheRefs.rhythmForgeBassPatternRef.current = rhythmForgeBassCacheCandidate.nextPattern;',
  'cacheRefs.psyBassPatternRef.current = psyBassCacheCandidate.nextPattern;',
  'cacheRefs.bassClipPlaybackCacheRef.current = bassClipRootBindingCandidate.nextPlaybackCache;',
].every((needle) => boundary.includes(needle)));
requireCheck('boundary does not absorb outer runtime ownership', forbiddenBoundaryNeedles.every((needle) => !boundary.includes(needle)), forbiddenBoundaryNeedles.filter((needle) => boundary.includes(needle)).join(', '));
requireCheck('monolith map updated', monolithMap.includes("| 'stable-rhythm-lane-scheduler-cache-refs-callsite-grouped'") && (monolithMap.includes("status: 'stable-rhythm-lane-scheduler-cache-refs-callsite-grouped'") || monolithMap.includes("status: 'stable-rhythm-lane-boundary-ports-builder-probed'")) && (monolithMap.includes('stableRhythmLaneSchedulerCacheRefs') || monolithMap.includes('stableRhythmLaneSchedulerBoundaryPorts')) && monolithMap.includes('outer scheduler transport and nextAbsoluteStep remain App-owned'));
requireCheck('sanity suite includes guard', suite.includes(`script: '${scriptName}'`) && suite.includes('Stable rhythm lane scheduler cacheRefs callsite grouping'));
requireCheck('sanity contract includes guard', suiteContract.includes(`'${scriptName}'`));

if (failures.length) {
  console.error('Stable rhythm lane scheduler cacheRefs callsite grouping check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('Stable rhythm lane scheduler cacheRefs callsite grouping OK');
console.log(JSON.stringify({ version: pkg.version, cacheRefsGroupedBeforeSchedule: true, transportMoved: false, runtimeMoved: false }, null, 2));
