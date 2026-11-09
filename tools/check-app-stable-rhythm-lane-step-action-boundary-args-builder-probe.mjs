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
const builderPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerStepActionBoundaryArgsBuilderProbe.ts';
const portsBuilderPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerBoundaryPortsBuilderProbe.ts';
const boundaryPath = 'src/features/xensonar/input/appStableRhythmLaneSchedulerStepActionBoundary.ts';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const scriptName = 'xensonar:check-app-stable-rhythm-lane-step-action-boundary-args-builder-probe';

const app = exists(appPath) ? read(appPath) : '';
const builder = exists(builderPath) ? read(builderPath) : '';
const portsBuilder = exists(portsBuilderPath) ? read(portsBuilderPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const monolithMap = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

const forbiddenBuilderNeedles = [
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
  'executeAppStableRhythmLaneSchedulerStepActionBoundary(',
  'scheduleExportedDrumConfigStep(',
  'scheduleRhythmForgeDrumStep(',
  'scheduleRhythmForgeBassStep(',
  'schedulePsyBassStep(',
  'scheduleBassClipStep(',
  'scheduleClassicBassPatternStep(',
  'playBassNote(',
  '.current =',
  'nexusRefs.current.nextAbsoluteStep',
  'resolveStableRhythmLaneTimeWindow(',
  'buildStableRhythmLaneStepPlan(',
  'buildStableRhythmLaneStepPlanArgs(',
];

const portsBuilderIndex = app.indexOf('const stableRhythmLaneSchedulerBoundaryPorts = buildAppStableRhythmLaneSchedulerBoundaryPortsProbe({');
const scheduleIndex = app.indexOf('const schedule = () => {');
const argsBuilderIndex = app.indexOf('const stableRhythmLaneStepActionBoundaryArgs = buildAppStableRhythmLaneSchedulerStepActionBoundaryArgsProbe({');
const executeIndex = app.indexOf('executeAppStableRhythmLaneSchedulerStepActionBoundary(stableRhythmLaneStepActionBoundaryArgs.args);');

requireCheck('expected files exist', [appPath, builderPath, portsBuilderPath, boundaryPath, monolithMapPath, pkgPath, suitePath, suiteContractPath].every(exists));
requireCheck('package version updated', /^3\.2\.91\.6\.9\.(20[2-9]|21[0-9]|[3-9][0-9]{2,})$/.test(pkg.version));
requireCheck('package script exists', pkg.scripts?.[scriptName] === 'node tools/check-app-stable-rhythm-lane-step-action-boundary-args-builder-probe.mjs');
requireCheck('builder exports args contract', builder.includes('AppStableRhythmLaneSchedulerStepActionBoundaryArgsBuilderProbeArgs') && builder.includes('AppStableRhythmLaneSchedulerStepActionBoundaryArgsBuilderProbeResult') && builder.includes('buildAppStableRhythmLaneSchedulerStepActionBoundaryArgsProbe'));
requireCheck('builder imports boundary args type and boundary ports result', builder.includes('AppStableRhythmLaneSchedulerStepActionBoundaryArgs') && builder.includes('AppStableRhythmLaneSchedulerBoundaryPorts'));
requireCheck('builder returns executable boundary args', builder.includes('readonly args: AppStableRhythmLaneSchedulerStepActionBoundaryArgs;') && builder.includes('args: {') && builder.includes('readPorts: args.boundaryPorts.readPorts') && builder.includes('actionPorts: args.boundaryPorts.actionPorts') && builder.includes('cacheRefs: args.boundaryPorts.cacheRefs'));
requireCheck('builder includes app-owned flags', builder.includes('boundaryArgsOnly: true') && builder.includes('transportStillAppOwned: true') && builder.includes('nextAbsoluteStepStillAppOwned: true') && builder.includes('schedulerLoopStillAppOwned: true') && builder.includes('stepPlanningStillAppOwned: true'));
requireCheck('builder preserves boundary ownership flags', builder.includes('cacheWritesStillBoundaryOwned: true') && builder.includes('soundSchedulingStillBoundaryOwned: true') && builder.includes('runtimeOwned: false'));
requireCheck('builder stays pure/static enough', forbiddenBuilderNeedles.every((needle) => !builder.includes(needle)), forbiddenBuilderNeedles.filter((needle) => builder.includes(needle)).join(', '));
requireCheck('App imports step-action args builder', app.includes('buildAppStableRhythmLaneSchedulerStepActionBoundaryArgsProbe'));
requireCheck('App builds ports before schedule closure', portsBuilderIndex >= 0 && scheduleIndex > portsBuilderIndex);
requireCheck('App builds boundary args inside non-stale step path', argsBuilderIndex > scheduleIndex && executeIndex > argsBuilderIndex);
requireCheck('App passes compact boundary args into executor', app.includes('executeAppStableRhythmLaneSchedulerStepActionBoundary(stableRhythmLaneStepActionBoundaryArgs.args);'));
requireCheck('App no longer passes split ports inline at execute call', !app.includes('executeAppStableRhythmLaneSchedulerStepActionBoundary({\n          stationaryPlan,\n          params: p,\n          stepDurationSec: stepMs,') && !app.includes('readPorts: stableRhythmLaneSchedulerBoundaryPorts.readPorts,\n          actionPorts: stableRhythmLaneSchedulerBoundaryPorts.actionPorts,\n          cacheRefs: stableRhythmLaneSchedulerBoundaryPorts.cacheRefs,'));
requireCheck('transport and scheduler remain App-owned', app.includes('const schedule = () => {') && app.includes('window.setTimeout(schedule') && app.includes('window.clearTimeout(timerID)') && app.includes('nexusRefs.current.nextAbsoluteStep = nextStep;'));
requireCheck('time-window and step-plan remain App-owned', app.includes('resolveStableRhythmLaneTimeWindow(stableRhythmLaneSchedulerSource.timeWindowArgs)') && app.includes('buildStableRhythmLaneStepPlan(buildAppStableRhythmLaneSchedulerStepPlanArgs({'));
requireCheck('stale guard still precedes boundary args builder', app.indexOf('if (stationaryPlan.stale) {') >= 0 && argsBuilderIndex > app.indexOf('if (stationaryPlan.stale) {'));
requireCheck('boundary args type still split ports internally', boundary.includes('readonly readPorts: AppStableRhythmLaneSchedulerReadPorts;') && boundary.includes('readonly actionPorts: AppStableRhythmLaneSchedulerActionPorts;') && boundary.includes('readonly cacheRefs: AppStableRhythmLaneSchedulerCacheRefs;'));
requireCheck('boundary ports builder remains ports-only', portsBuilder.includes('boundaryPortsOnly: true') && portsBuilder.includes('transportStillAppOwned: true') && portsBuilder.includes('schedulerLoopStillAppOwned: true'));
requireCheck('monolith map updated', monolithMap.includes("| 'stable-rhythm-lane-step-action-boundary-args-builder-probed'") && (monolithMap.includes("status: 'stable-rhythm-lane-step-action-boundary-args-builder-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-boundary-ports-contract-probed'") || monolithMap.includes("status: 'stable-rhythm-lane-runner-call-plan-contract-registry-probed'")) && monolithMap.includes('buildAppStableRhythmLaneSchedulerStepActionBoundaryArgsProbe'));
requireCheck('sanity suite includes guard', suite.includes(`script: '${scriptName}'`) && suite.includes('Stable rhythm lane step-action boundary args builder probe'));
requireCheck('sanity contract includes guard', suiteContract.includes(`'${scriptName}'`));

if (failures.length) {
  console.error('app stable rhythm lane step-action boundary args builder probe check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('app stable rhythm lane step-action boundary args builder probe OK');
console.log(' - non-stale execute call uses one typed args builder');
console.log(' - transport, timer loop, and step planning remain App-owned');
